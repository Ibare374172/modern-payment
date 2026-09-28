import { StkPushPayload, StkPushResponse } from '../types';
import { stkStore } from './stkStore';

/**
 * Normalizes Kenyan mobile numbers to international format: 254XXXXXXXXX
 */
export function formatMpesaPhone(phoneStr: string): string {
  let cleaned = phoneStr.replace(/[\s\-\+\(\)]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '254' + cleaned.slice(1);
  } else if (cleaned.startsWith('7') || cleaned.startsWith('1')) {
    cleaned = '254' + cleaned;
  }
  return cleaned;
}

/**
 * Safaricom Daraja API Service
 * Handles OAuth authentication, STK push dispatch, and credentials testing.
 */
export class DarajaService {
  /**
   * Generates an OAuth bearer token from Safaricom API
   */
  public static async generateOAuthToken(
    consumerKey: string,
    consumerSecret: string,
    environment: 'sandbox' | 'production' = 'sandbox'
  ): Promise<{ accessToken: string; expiresIn: string }> {
    const baseUrl = environment === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';

    const authHeader = Buffer.from(`${consumerKey.trim()}:${consumerSecret.trim()}`).toString('base64');
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
      throw new Error(`Safaricom OAuth failed (${tokenRes.status}): ${errDetail || 'Invalid Consumer Key or Secret'}`);
    }

    const tokenData = await tokenRes.json() as { access_token: string; expires_in: string };
    return {
      accessToken: tokenData.access_token,
      expiresIn: tokenData.expires_in,
    };
  }

  /**
   * Generates Safaricom Daraja Password: Base64(Shortcode + Passkey + Timestamp)
   */
  public static generatePassword(shortcode: string, passkey: string): { timestamp: string; password: string } {
    const now = new Date();
    const timestamp = now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0') +
      String(now.getHours()).padStart(2, '0') +
      String(now.getMinutes()).padStart(2, '0') +
      String(now.getSeconds()).padStart(2, '0');

    const rawPass = `${shortcode}${passkey}${timestamp}`;
    const password = Buffer.from(rawPass).toString('base64');
    return { timestamp, password };
  }

  /**
   * Dispatches an STK Push to the Safaricom Daraja API or handles gateway simulation
   */
  public static async dispatchStkPush(payload: StkPushPayload): Promise<StkPushResponse> {
    const {
      phone,
      amount,
      accountReference = 'ZawadiMart',
      transactionDesc = 'Goods Payment',
      consumerKey,
      consumerSecret,
      passkey,
      shortcode = '174379',
      environment = 'sandbox',
      forceSimulate = false,
    } = payload;

    const formattedPhone = formatMpesaPhone(phone);
    if (!/^254[17]\d{8}$/.test(formattedPhone)) {
      throw new Error(`Invalid Kenyan phone number format: "${phone}". Expected format like 0712345678 or 254712345678.`);
    }

    const numAmount = Math.max(1, Math.round(Number(amount)));

    const effectiveConsumerKey = consumerKey?.trim() || process.env.DARAJA_CONSUMER_KEY?.trim() || process.env.MPESA_CONSUMER_KEY?.trim();
    const effectiveConsumerSecret = consumerSecret?.trim() || process.env.DARAJA_CONSUMER_SECRET?.trim() || process.env.MPESA_CONSUMER_SECRET?.trim();
    let effectivePasskey = passkey?.trim() || process.env.DARAJA_PASSKEY?.trim() || process.env.MPESA_PASSKEY?.trim();
    const effectiveShortcode = shortcode?.trim() || process.env.DARAJA_SHORTCODE?.trim() || process.env.MPESA_SHORTCODE?.trim() || '174379';
    const effectiveEnv = environment || (process.env.DARAJA_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox';

    if (!effectivePasskey && (effectiveShortcode === '174379' || effectiveEnv === 'sandbox')) {
      effectivePasskey = 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919';
    }

    // Require credentials for live dispatch
    if (!forceSimulate && (!effectiveConsumerKey || !effectiveConsumerSecret)) {
      return {
        success: false,
        requiresCredentials: true,
        error: 'Safaricom Daraja API credentials (Consumer Key & Consumer Secret) are required to prompt physical mobile devices. Please configure your Safaricom keys.',
      };
    }

    // Live Daraja Dispatch
    if (!forceSimulate && effectiveConsumerKey && effectiveConsumerSecret && effectivePasskey) {
      const baseUrl = effectiveEnv === 'production'
        ? 'https://api.safaricom.co.ke'
        : 'https://sandbox.safaricom.co.ke';

      const { accessToken } = await this.generateOAuthToken(effectiveConsumerKey, effectiveConsumerSecret, effectiveEnv);
      const { timestamp, password } = this.generatePassword(effectiveShortcode, effectivePasskey);

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
        stkStore.save({
          checkoutRequestId: checkoutId,
          merchantRequestId: stkData.MerchantRequestID || '',
          phone: formattedPhone,
          amount: numAmount,
          status: 'PENDING',
          createdAt: new Date().toISOString(),
        });

        return {
          success: true,
          mode: 'DARAJA_LIVE',
          phone: formattedPhone,
          amount: numAmount,
          checkoutRequestId: checkoutId,
          merchantRequestId: stkData.MerchantRequestID,
          responseDescription: stkData.CustomerMessage || stkData.ResponseDescription || 'Success. Request accepted for processing.',
          message: `STK Push prompt sent to ${formattedPhone}. Please check your phone screen to enter your M-Pesa PIN.`,
        };
      } else {
        return {
          success: false,
          error: stkData.errorMessage || stkData.CustomerMessage || stkData.ResponseDescription || `Safaricom rejected request (Code ${stkData.errorCode || stkData.ResponseCode || 'Unknown'}).`,
          darajaResponse: stkData,
        };
      }
    }

    // Gateway Simulation Mode
    const simulatedCheckoutId = `ws_CO_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const simulatedMerchantId = `M_REQ_${Date.now()}`;

    stkStore.save({
      checkoutRequestId: simulatedCheckoutId,
      merchantRequestId: simulatedMerchantId,
      phone: formattedPhone,
      amount: numAmount,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    });

    return {
      success: true,
      mode: 'GATEWAY_SIMULATED',
      phone: formattedPhone,
      amount: numAmount,
      checkoutRequestId: simulatedCheckoutId,
      merchantRequestId: simulatedMerchantId,
      responseDescription: 'Success. Request accepted for processing',
      message: `STK Push prompt dispatched to +${formattedPhone}. Look for the Safaricom PIN dialog on your phone or use the interactive handset simulator.`,
    };
  }

  /**
   * Tests whether provided Daraja credentials authenticate successfully
   */
  public static async testCredentials(
    consumerKey: string,
    consumerSecret: string,
    environment: 'sandbox' | 'production' = 'sandbox'
  ): Promise<{ valid: boolean; message?: string; error?: string; expiresIn?: string }> {
    try {
      const { expiresIn } = await this.generateOAuthToken(consumerKey, consumerSecret, environment);
      return {
        valid: true,
        message: 'Successfully authenticated with Safaricom Daraja API!',
        expiresIn,
      };
    } catch (err) {
      return {
        valid: false,
        error: err instanceof Error ? err.message : 'Daraja authentication failed.',
      };
    }
  }
}
