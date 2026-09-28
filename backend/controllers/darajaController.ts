import { Request, Response } from 'express';
import { DarajaService } from '../services/darajaService';

export class DarajaController {
  /**
   * POST /api/daraja/test
   * Validates Safaricom Daraja Consumer Key and Secret
   */
  public static async test(req: Request, res: Response) {
    try {
      const { consumerKey, consumerSecret, environment = 'sandbox' } = req.body;
      if (!consumerKey || !consumerSecret) {
        return res.status(400).json({ valid: false, error: 'Consumer Key and Consumer Secret are required.' });
      }

      const result = await DarajaService.testCredentials(consumerKey, consumerSecret, environment);
      if (!result.valid) {
        return res.status(400).json(result);
      }
      return res.json(result);
    } catch (err) {
      console.error('[DarajaController] Error testing credentials:', err);
      return res.status(500).json({
        valid: false,
        error: err instanceof Error ? err.message : 'Network error communicating with Safaricom Daraja.',
      });
    }
  }
}
