import { Request, Response } from 'express';
import { DarajaService } from '../services/darajaService';
import { stkStore } from '../services/stkStore';
import { DarajaCallbackPayload } from '../types';

export class StkController {
  /**
   * POST /api/stkpush
   * Dispatch STK Push to mobile phone
   */
  public static async push(req: Request, res: Response) {
    try {
      const { phone, amount } = req.body;
      if (!phone || !amount) {
        return res.status(400).json({ error: 'Phone number and amount are required.' });
      }

      const result = await DarajaService.dispatchStkPush(req.body);
      if (!result.success) {
        return res.status(400).json(result);
      }
      return res.json(result);
    } catch (error) {
      console.error('[StkController] Error during STK push dispatch:', error);
      const msg = error instanceof Error ? error.message : 'Internal error during STK dispatch';
      return res.status(500).json({ error: msg });
    }
  }

  /**
   * GET /api/stkpush/query/:checkoutRequestId
   * Query status of a dispatched STK push
   */
  public static async query(req: Request, res: Response) {
    try {
      const { checkoutRequestId } = req.params;
      const record = stkStore.get(checkoutRequestId);
      if (!record) {
        return res.status(404).json({ error: 'Transaction checkout ID not found.' });
      }
      return res.json(record);
    } catch (error) {
      console.error('[StkController] Error querying STK status:', error);
      return res.status(500).json({ error: 'Internal error querying STK status.' });
    }
  }

  /**
   * POST /api/stkpush/callback
   * Webhook callback receiver for Safaricom Daraja responses
   */
  public static async callback(req: Request, res: Response) {
    try {
      const callbackData: DarajaCallbackPayload = req.body;
      const stkCallback = callbackData?.Body?.stkCallback;

      if (stkCallback) {
        const checkoutId = stkCallback.CheckoutRequestID;
        const resultCode = stkCallback.ResultCode;
        const resultDesc = stkCallback.ResultDesc;

        let mpesaReceiptNumber: string | undefined;
        if (resultCode === 0 && stkCallback.CallbackMetadata?.Item) {
          const receiptItem = stkCallback.CallbackMetadata.Item.find(
            (item) => item.Name === 'MpesaReceiptNumber'
          );
          if (receiptItem && receiptItem.Value) {
            mpesaReceiptNumber = String(receiptItem.Value);
          }
        }

        stkStore.update(checkoutId, {
          status: resultCode === 0 ? 'COMPLETED' : 'FAILED',
          resultDesc,
          ...(mpesaReceiptNumber ? { mpesaReceiptNumber } : {}),
        });
      }
    } catch (err) {
      console.error('[StkController] Error handling Safaricom callback webhook:', err);
    }

    return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  }
}
