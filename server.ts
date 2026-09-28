import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// In-memory store for recent STK push status checks
interface StkRecord {
  checkoutRequestId: string;
  merchantRequestId: string;
  phone: string;
  amount: number;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  mpesaReceiptNumber?: string;
  resultDesc?: string;
  createdAt: string;
}

const stkStore = new Map<string, StkRecord>();

// Format Kenyan Phone Number to 254XXXXXXXXX
function formatMpesaPhone(phoneStr: string): string {
  let cleaned = phoneStr.replace(/[\s\-\+\(\)]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '254' + cleaned.slice(1);
  } else if (cleaned.startsWith('7') || cleaned.startsWith('1')) {
    cleaned = '254' + cleaned;
  }
  return cleaned;
}

// 1. STK Push Dispatch Endpoint (Safaricom Daraja API)
app.post('/api/stkpush', async (req, res) => {
  try {
    const { 
      phone, 
      amount, 
      accountReference = 'ZawadiMart', 
      transactionDesc = 'Goods Payment',
      consumerKey,
      consumerSecret,
      passkey,
      shortcode = '174379',
      environment = 'sandbox'
    } = req.body;

    if (!phone || !amount) {
      return res.status(400).json({ error: 'Phone number and amount are required.' });
    }

    const formattedPhone = formatMpesaPhone(phone);

    // Validate format: 254 followed by 9 digits
    if (!/^254[17]\d{8}$/.test(formattedPhone)) {
      return res.status(400).json({ 
        error: `Invalid Kenyan phone number format: "${phone}". Expected format like 0712345678 or 254712345678.` 
      });
    }

    const numAmount = Math.max(1, Math.round(Number(amount)));
    const forceSimulate = Boolean(req.body.forceSimulate);

    const effectiveConsumerKey = consumerKey?.trim() || process.env.DARAJA_CONSUMER_KEY?.trim() || process.env.MPESA_CONSUMER_KEY?.trim();
    const effectiveConsumerSecret = consumerSecret?.trim() || process.env.DARAJA_CONSUMER_SECRET?.trim() || process.env.MPESA_CONSUMER_SECRET?.trim();
    let effectivePasskey = passkey?.trim() || process.env.DARAJA_PASSKEY?.trim() || process.env.MPESA_PASSKEY?.trim();
    const effectiveShortcode = shortcode?.trim() || process.env.DARAJA_SHORTCODE?.trim() || process.env.MPESA_SHORTCODE?.trim() || '174379';
    const effectiveEnv = environment || process.env.DARAJA_ENVIRONMENT || 'sandbox';

    if (!effectivePasskey && (effectiveShortcode === '174379' || effectiveEnv === 'sandbox')) {
      effectivePasskey = 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919';
    }

    // If real dispatch requested but credentials are missing
    if (!forceSimulate && (!effectiveConsumerKey || !effectiveConsumerSecret)) {
      return res.status(400).json({
        success: false,
        requiresCredentials: true,
        error: 'Safaricom Daraja API credentials (Consumer Key & Consumer Secret) are required to prompt physical mobile devices. Please configure your Safaricom keys.',
      });
    }

    // Check if live Daraja credentials were provided
    if (!forceSimulate && effectiveConsumerKey && effectiveConsumerSecret && effectivePasskey) {
      try {
        const baseUrl = effectiveEnv === 'production' 
          ? 'https://api.safaricom.co.ke' 
          : 'https://sandbox.safaricom.co.ke';

        // 1. Generate OAuth Token from Safaricom
        const authHeader = Buffer.from(`${effectiveConsumerKey}:${effectiveConsumerSecret}`).toString('base64');
        const tokenRes = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
          headers: {
            Authorization: `Basic ${authHeader}`,
          },
        });

        if (!tokenRes.ok) {
          let errDetail = '';
          try {
            const errJson = await tokenRes.json() as { errorMessage?: string; error?: string };
            errDetail = errJson.errorMessage || errJson.error || '';
          } catch {
            errDetail = await tokenRes.text();
          }
          return res.status(400).json({
            success: false,
            requiresCredentials: true,
            error: `Safaricom OAuth Authentication failed (${tokenRes.status}): ${errDetail || 'Invalid Consumer Key or Consumer Secret'}. Please check your Daraja credentials.`,
          });
        }

        const tokenData = await tokenRes.json() as { access_token: string };
        const accessToken = tokenData.access_token;

        // 2. Generate Timestamp & Password (YYYYMMDDHHmmss)
        const now = new Date();
        const timestamp = now.getFullYear().toString() +
          String(now.getMonth() + 1).padStart(2, '0') +
          String(now.getDate()).padStart(2, '0') +
          String(now.getHours()).padStart(2, '0') +
          String(now.getMinutes()).padStart(2, '0') +
          String(now.getSeconds()).padStart(2, '0');

        const rawPass = `${effectiveShortcode}${effectivePasskey}${timestamp}`;
        const password = Buffer.from(rawPass).toString('base64');

        // 3. Dispatch STK Push to Safaricom Daraja
        const callbackUrl = process.env.APP_URL 
          ? `${process.env.APP_URL}/api/stkpush/callback`
          : 'https://webhook.site/placeholder-daraja';

        const stkPayload = {
          BusinessShortCode: effectiveShortcode,
          Password: password,
          Timestamp: timestamp,
          TransactionType: 'CustomerPayBillOnline',
          Amount: numAmount,
          PartyA: formattedPhone,
          PartyB: effectiveShortcode,
          PhoneNumber: formattedPhone,
          CallBackURL: callbackUrl,
          AccountReference: accountReference.slice(0, 12),
          TransactionDesc: transactionDesc.slice(0, 12),
        };

        const stkRes = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(stkPayload),
        });

        const stkData = await stkRes.json() as {
          ResponseCode?: string;
          ResponseDescription?: string;
          CustomerMessage?: string;
          MerchantRequestID?: string;
          CheckoutRequestID?: string;
          errorMessage?: string;
          errorCode?: string;
        };

        if (stkData.ResponseCode === '0') {
          const checkoutId = stkData.CheckoutRequestID || `ws_CO_${Date.now()}`;
          stkStore.set(checkoutId, {
            checkoutRequestId: checkoutId,
            merchantRequestId: stkData.MerchantRequestID || '',
            phone: formattedPhone,
            amount: numAmount,
            status: 'PENDING',
            createdAt: new Date().toISOString(),
          });

          return res.json({
            success: true,
            mode: 'DARAJA_LIVE',
            phone: formattedPhone,
            amount: numAmount,
            checkoutRequestId: checkoutId,
            merchantRequestId: stkData.MerchantRequestID,
            responseDescription: stkData.CustomerMessage || stkData.ResponseDescription || 'Success. Request accepted for processing.',
            message: `STK Push prompt sent to ${formattedPhone}. Please check your phone screen to enter your M-Pesa PIN.`,
          });
        } else {
          return res.status(400).json({
            success: false,
            error: stkData.errorMessage || stkData.CustomerMessage || stkData.ResponseDescription || `Safaricom rejected request (Code ${stkData.errorCode || stkData.ResponseCode || 'Unknown'}).`,
            darajaResponse: stkData,
          });
        }
      } catch (darajaErr) {
        console.warn('Daraja direct call error:', darajaErr);
        return res.status(502).json({
          success: false,
          error: darajaErr instanceof Error ? darajaErr.message : 'Failed to communicate with Safaricom Daraja API.',
        });
      }
    }

    // Gateway Simulation Mode (when forceSimulate is true)
    const simulatedCheckoutId = `ws_CO_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const simulatedMerchantId = `M_REQ_${Date.now()}`;

    stkStore.set(simulatedCheckoutId, {
      checkoutRequestId: simulatedCheckoutId,
      merchantRequestId: simulatedMerchantId,
      phone: formattedPhone,
      amount: numAmount,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    });

    return res.json({
      success: true,
      mode: 'GATEWAY_SIMULATED',
      phone: formattedPhone,
      amount: numAmount,
      checkoutRequestId: simulatedCheckoutId,
      merchantRequestId: simulatedMerchantId,
      responseDescription: 'Success. Request accepted for processing',
      message: `STK Push prompt dispatched to +${formattedPhone}. Look for the Safaricom PIN dialog on your phone or use the interactive handset simulator.`,
    });
  } catch (error) {
    console.error('STK Push Error:', error);
    res.status(500).json({ error: 'Internal server error while dispatching STK push.' });
  }
});

// 2. Query STK Push Status
app.get('/api/stkpush/query/:checkoutRequestId', (req, res) => {
  const { checkoutRequestId } = req.params;
  const record = stkStore.get(checkoutRequestId);
  if (!record) {
    return res.status(404).json({ error: 'Transaction checkout ID not found.' });
  }
  res.json(record);
});

// 3. Daraja Callback Webhook Receiver
app.post('/api/stkpush/callback', (req, res) => {
  try {
    const callbackData = req.body?.Body?.stkCallback;
    if (callbackData) {
      const checkoutId = callbackData.CheckoutRequestID;
      const resultCode = callbackData.ResultCode;
      const resultDesc = callbackData.ResultDesc;

      const record = stkStore.get(checkoutId);
      if (record) {
        record.status = resultCode === 0 ? 'COMPLETED' : 'FAILED';
        record.resultDesc = resultDesc;

        if (resultCode === 0 && callbackData.CallbackMetadata?.Item) {
          const receiptItem = callbackData.CallbackMetadata.Item.find(
            (item: { Name: string }) => item.Name === 'MpesaReceiptNumber'
          );
          if (receiptItem) {
            record.mpesaReceiptNumber = receiptItem.Value;
          }
        }
        stkStore.set(checkoutId, record);
      }
    }
  } catch (err) {
    console.error('Error handling Safaricom callback:', err);
  }
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
});

// 4. Daraja Credentials Validator
app.post('/api/daraja/test', async (req, res) => {
  try {
    const { consumerKey, consumerSecret, environment = 'sandbox' } = req.body;
    if (!consumerKey || !consumerSecret) {
      return res.status(400).json({ valid: false, error: 'Consumer Key and Secret are required.' });
    }

    const baseUrl = environment === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';

    const authHeader = Buffer.from(`${consumerKey.trim()}:${consumerSecret.trim()}`).toString('base64');
    const response = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: { Authorization: `Basic ${authHeader}` },
    });

    if (response.ok) {
      const data = await response.json() as { access_token: string; expires_in: string };
      return res.json({ 
        valid: true, 
        message: 'Successfully authenticated with Safaricom Daraja API!',
        expiresIn: data.expires_in 
      });
    } else {
      const errText = await response.text();
      return res.status(400).json({ 
        valid: false, 
        error: `Daraja authentication failed: ${response.status} ${errText}` 
      });
    }
  } catch (err) {
    return res.status(500).json({ 
      valid: false, 
      error: err instanceof Error ? err.message : 'Network error communicating with Safaricom.' 
    });
  }
});

// Mount Vite middleware in development or serve static in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:3000`);
  });
}

startServer();
