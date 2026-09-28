import { Router } from 'express';
import { DarajaController } from '../controllers/darajaController';

export const darajaRouter = Router();

// Test Safaricom Daraja Credentials
darajaRouter.post('/test', DarajaController.test);
