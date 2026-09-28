import { Router } from 'express';
import { StkController } from '../controllers/stkController';

export const stkRouter = Router();

// Dispatch STK Push
stkRouter.post('/', StkController.push);

// Query STK Push status
stkRouter.get('/query/:checkoutRequestId', StkController.query);

// Safaricom Webhook Callback
stkRouter.post('/callback', StkController.callback);
