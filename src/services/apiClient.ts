/**
 * Frontend API Client
 * Clean HTTP boundary communicating between React frontend and Express backend.
 */

export interface BackendStkPushPayload {
  phone: string;
  amount: number;
  accountReference?: string;
  transactionDesc?: string;
  consumerKey?: string;
  consumerSecret?: string;
  passkey?: string;
  shortcode?: string;
  environment?: 'sandbox' | 'production';
  forceSimulate?: boolean;
}

export interface BackendStkPushResponse {
  success: boolean;
  mode?: 'DARAJA_LIVE' | 'GATEWAY_SIMULATED';
  phone?: string;
  amount?: number;
  checkoutRequestId?: string;
  merchantRequestId?: string;
  responseDescription?: string;
  message?: string;
  error?: string;
  requiresCredentials?: boolean;
  darajaResponse?: unknown;
}

export interface BackendStkStatusRecord {
  checkoutRequestId: string;
  merchantRequestId: string;
  phone: string;
  amount: number;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  mpesaReceiptNumber?: string;
  resultDesc?: string;
  createdAt: string;
}

export interface BackendDarajaTestResponse {
  valid: boolean;
  message?: string;
  error?: string;
  expiresIn?: string;
}

export class ApiClient {
  /**
   * Health check on backend server
   */
  public static async checkHealth(): Promise<{ status: string; service: string }> {
    const res = await fetch('/api/health');
    if (!res.ok) {
      throw new Error(`Health check failed (${res.status})`);
    }
    return res.json();
  }

  /**
   * POST /api/stkpush - Requests backend to initiate STK push via Daraja
   */
  public static async dispatchStkPush(payload: BackendStkPushPayload): Promise<BackendStkPushResponse> {
    const res = await fetch('/api/stkpush', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      return {
        success: false,
        requiresCredentials: data.requiresCredentials,
        error: data.error || 'Failed to dispatch STK push from server.',
        darajaResponse: data.darajaResponse,
      };
    }
    return data as BackendStkPushResponse;
  }

  /**
   * GET /api/stkpush/query/:checkoutRequestId - Queries status of prompt
   */
  public static async queryStkStatus(checkoutRequestId: string): Promise<BackendStkStatusRecord | null> {
    const res = await fetch(`/api/stkpush/query/${encodeURIComponent(checkoutRequestId)}`);
    if (!res.ok) return null;
    return res.json();
  }

  /**
   * POST /api/daraja/test - Tests Daraja credentials on backend
   */
  public static async testDaraja(credentials: {
    consumerKey: string;
    consumerSecret: string;
    environment?: 'sandbox' | 'production';
  }): Promise<BackendDarajaTestResponse> {
    const res = await fetch('/api/daraja/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });
    return res.json();
  }
}
