// Backend Type Definitions
export interface StkRecord {
  checkoutRequestId: string;
  merchantRequestId: string;
  phone: string;
  amount: number;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  mpesaReceiptNumber?: string;
  resultDesc?: string;
  createdAt: string;
}

export interface StkPushPayload {
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

export interface StkPushResponse {
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

export interface DarajaCallbackPayload {
  Body?: {
    stkCallback?: {
      MerchantRequestID?: string;
      CheckoutRequestID: string;
      ResultCode: number;
      ResultDesc: string;
      CallbackMetadata?: {
        Item?: Array<{
          Name: string;
          Value?: string | number;
        }>;
      };
    };
  };
}
