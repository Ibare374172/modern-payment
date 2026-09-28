import { Router, Request, Response } from 'express';
import { 
  TransactionModel, 
  CustomerModel, 
  AuditModel, 
  BusinessModel, 
  UserModel 
} from '../../src/db/models.ts';
import { realtimeEmitter, RealtimeChangeEvent } from '../../src/db/index.ts';

export const postgresRouter = Router();

/**
 * 1. REAL-TIME SERVER-SENT EVENTS (SSE) STREAM
 * Pushes live PostgreSQL table events (inserts, updates, reconciliations) to clients.
 */
postgresRouter.get('/realtime/stream', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  // Send initial handshake
  const welcomeEvent = {
    type: 'CONNECTED',
    message: 'PostgreSQL Real-Time Event Stream Active',
    timestamp: new Date().toISOString(),
  };
  res.write(`data: ${JSON.stringify(welcomeEvent)}\n\n`);

  // Event listener for live table mutations
  const onTableChange = (event: RealtimeChangeEvent) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  realtimeEmitter.on('change', onTableChange);

  // Keep-alive heartbeat every 20 seconds
  const heartbeat = setInterval(() => {
    res.write(`:heartbeat ${Date.now()}\n\n`);
  }, 20000);

  req.on('close', () => {
    clearInterval(heartbeat);
    realtimeEmitter.off('change', onTableChange);
  });
});

/**
 * 2. TRANSACTIONS ENDPOINTS
 */
postgresRouter.get('/transactions', async (req: Request, res: Response) => {
  try {
    const limitCount = Number(req.query.limit) || 100;
    const txns = await TransactionModel.getAll(limitCount);
    res.json({ success: true, count: txns.length, data: txns });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

postgresRouter.post('/transactions', async (req: Request, res: Response) => {
  try {
    const txn = await TransactionModel.create(req.body);
    res.status(201).json({ success: true, data: txn });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

postgresRouter.patch('/transactions/:id/status', async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    const updated = await TransactionModel.updateStatus(req.params.id, status);
    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * 3. CUSTOMERS ENDPOINTS
 */
postgresRouter.get('/customers', async (_req: Request, res: Response) => {
  try {
    const custs = await CustomerModel.getAll();
    res.json({ success: true, count: custs.length, data: custs });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

postgresRouter.post('/customers', async (req: Request, res: Response) => {
  try {
    const cust = await CustomerModel.create(req.body);
    res.status(201).json({ success: true, data: cust });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

postgresRouter.post('/customers/:id/adjust-balance', async (req: Request, res: Response) => {
  try {
    const { amountChange = 0, pointsChange = 0 } = req.body;
    const updated = await CustomerModel.adjustBalance(req.params.id, Number(amountChange), Number(pointsChange));
    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * 4. AUDITS ENDPOINTS
 */
postgresRouter.get('/audits', async (_req: Request, res: Response) => {
  try {
    const auditsList = await AuditModel.getAll();
    res.json({ success: true, count: auditsList.length, data: auditsList });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

postgresRouter.post('/audits', async (req: Request, res: Response) => {
  try {
    const audit = await AuditModel.create(req.body);
    res.status(201).json({ success: true, data: audit });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * 5. BUSINESS SETTINGS
 */
postgresRouter.get('/business', async (_req: Request, res: Response) => {
  try {
    const biz = await BusinessModel.get();
    res.json({ success: true, data: biz });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

postgresRouter.put('/business', async (req: Request, res: Response) => {
  try {
    const biz = await BusinessModel.update(req.body);
    res.json({ success: true, data: biz });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * 6. USER SYNC
 */
postgresRouter.post('/users/sync', async (req: Request, res: Response) => {
  try {
    const { uid, email, displayName, role } = req.body;
    const user = await UserModel.getOrCreateUser(uid, email, displayName, role);
    res.json({ success: true, data: user });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * 7. POSTGRES STATUS & METADATA
 */
postgresRouter.get('/status', (_req: Request, res: Response) => {
  res.json({
    status: 'ONLINE',
    dialect: 'PostgreSQL 15 / 16 Compatible',
    orm: 'Drizzle ORM (v0.38+)',
    realtimeEngine: 'SSE + EventEmitter CDC',
    database: process.env.SQL_DB_NAME || 'zawadi_mart_db',
    host: process.env.SQL_HOST || '127.0.0.1 (Cloud SQL Proxy Socket)',
    tables: [
      { name: 'users', description: 'Staff badges, roles, and auth credentials' },
      { name: 'businesses', description: 'Store till, paybill, float balances' },
      { name: 'customers', description: 'Customer loyalty, wallet balances, tiers' },
      { name: 'transactions', description: 'Real-time M-Pesa & Cash ledger' },
      { name: 'audits', description: 'Counter log reconciliation records' },
      { name: 'stk_requests', description: 'STK push telemetry & callbacks' },
      { name: 'realtime_events', description: 'Change Data Capture (CDC) stream' },
    ],
    timestamp: new Date().toISOString(),
  });
});
