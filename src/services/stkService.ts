import { saveGatewayConfigToDb, saveStkRequestToDb } from './dbService';
import { GatewayConfig, StkRequest } from '../types';

export type DarajaConfig = GatewayConfig;

const DARAJA_CONFIG_KEY = 'mpesa_daraja_credentials_v1';

// In-memory cache synced with Firestore
let cachedConfig: DarajaConfig | null = null;

export function getStoredDarajaConfig(): DarajaConfig {
  if (cachedConfig) return cachedConfig;
  try {
    const raw = localStorage.getItem(DARAJA_CONFIG_KEY);
    if (raw) {
      cachedConfig = JSON.parse(raw);
      return cachedConfig!;
    }
  } catch {
    // Ignore
  }
  return {
    environment: 'sandbox',
    shortcode: '174379',
    myPhoneNumber: '0712345678',
  };
}

export function setCachedDarajaConfig(config: DarajaConfig) {
  cachedConfig = config;
  try {
    localStorage.setItem(DARAJA_CONFIG_KEY, JSON.stringify(config));
  } catch {
    // Ignore
  }
}

export async function saveDarajaConfig(config: DarajaConfig): Promise<void> {
  setCachedDarajaConfig(config);
  try {
    // Persist permanently in Firestore database
    await saveGatewayConfigToDb(config);
  } catch (error) {
    console.warn('Could not save gateway settings to Firestore:', error);
  }
}

export interface StkPushResponse {
  success: boolean;
  mode?: 'DARAJA_LIVE' | 'GATEWAY_SIMULATED';
  phone?: string;
  amount?: number;
  checkoutRequestId?: string;
  merchantRequestId?: string;
  message?: string;
  error?: string;
  requiresCredentials?: boolean;
  darajaResponse?: unknown;
}

export async function sendStkPushRequest(params: {
  phone: string;
  amount: number;
  accountReference?: string;
  transactionDesc?: string;
  darajaConfig?: DarajaConfig;
  forceSimulate?: boolean;
  isMyPhone?: boolean;
}): Promise<StkPushResponse> {
  const config = params.darajaConfig || getStoredDarajaConfig();
  const requestId = `STK-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  try {
    const response = await fetch('/api/stkpush', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone: params.phone,
        amount: params.amount,
        accountReference: params.accountReference || 'ZawadiMart',
        transactionDesc: params.transactionDesc || 'Goods Payment',
        consumerKey: config.consumerKey,
        consumerSecret: config.consumerSecret,
        passkey: config.passkey || (config.shortcode === '174379' || !config.shortcode ? 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919' : ''),
        shortcode: config.shortcode || '174379',
        environment: config.environment || 'sandbox',
        forceSimulate: params.forceSimulate || false,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      // Record failed request in database
      const failedReq: StkRequest = {
        id: requestId,
        phone: params.phone,
        amount: params.amount,
        status: 'FAILED',
        responseDescription: data.error || 'Failed to dispatch STK push',
        timestamp: new Date().toISOString(),
        isMyPhone: params.isMyPhone ?? false,
      };
      saveStkRequestToDb(failedReq).catch(console.warn);

      return {
        success: false,
        requiresCredentials: data.requiresCredentials,
        error: data.error || 'Failed to dispatch STK push.',
        darajaResponse: data.darajaResponse,
      };
    }

    const successRes = data as StkPushResponse;

    // Record successful STK dispatch in database
    const reqRecord: StkRequest = {
      id: requestId,
      phone: params.phone,
      amount: params.amount,
      checkoutRequestId: successRes.checkoutRequestId,
      merchantRequestId: successRes.merchantRequestId,
      status: 'WAITING_PIN',
      responseDescription: successRes.message || 'Prompt sent to handset. Waiting for PIN.',
      timestamp: new Date().toISOString(),
      isMyPhone: params.isMyPhone ?? false,
    };
    saveStkRequestToDb(reqRecord).catch(console.warn);

    return successRes;
  } catch (err) {
    const errRecord: StkRequest = {
      id: requestId,
      phone: params.phone,
      amount: params.amount,
      status: 'FAILED',
      responseDescription: err instanceof Error ? err.message : 'Network error',
      timestamp: new Date().toISOString(),
      isMyPhone: params.isMyPhone ?? false,
    };
    saveStkRequestToDb(errRecord).catch(console.warn);

    return {
      success: false,
      error: err instanceof Error ? err.message : 'Network error communicating with STK gateway.',
    };
  }
}

export async function testDarajaCredentials(config: DarajaConfig): Promise<{ valid: boolean; message?: string; error?: string }> {
  try {
    const response = await fetch('/api/daraja/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        consumerKey: config.consumerKey,
        consumerSecret: config.consumerSecret,
        environment: config.environment || 'sandbox',
      }),
    });

    return await response.json();
  } catch (err) {
    return {
      valid: false,
      error: err instanceof Error ? err.message : 'Could not reach server endpoint.',
    };
  }
}
