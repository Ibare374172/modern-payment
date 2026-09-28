import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import EventEmitter from 'events';
import * as schema from './schema.ts';

// Add global connection pool caching to persist across hot-reloads
declare global {
  var _postgresPool: Pool | undefined;
  var _realtimeEmitter: EventEmitter | undefined;
}

export const realtimeEmitter: EventEmitter = global._realtimeEmitter || new EventEmitter();
realtimeEmitter.setMaxListeners(100);
if (!global._realtimeEmitter) {
  global._realtimeEmitter = realtimeEmitter;
}

// Function to create or retrieve the connection pool using the Object Method
export const createPool = (): Pool => {
  if (!global._postgresPool) {
    global._postgresPool = new Pool({
      host: process.env.SQL_HOST || '127.0.0.1',
      user: process.env.SQL_USER || 'postgres',
      password: process.env.SQL_PASSWORD || 'postgres',
      database: process.env.SQL_DB_NAME || 'zawadi_mart_db',
      max: 10,
      connectionTimeoutMillis: 15000,
    });

    // Prevent unhandled pool-level errors from crashing the application
    global._postgresPool.on('error', (err) => {
      console.warn('PostgreSQL idle pool note:', err.message);
    });
  }
  return global._postgresPool;
};

// Create or retrieve the pool instance
const pool = createPool();

// Initialize Drizzle ORM with the pool and full PostgreSQL schema
export const db = drizzle(pool, { schema });

/**
 * Real-time event broadcasting helper
 */
export interface RealtimeChangeEvent {
  id: string;
  table: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE' | 'RECONCILE';
  timestamp: string;
  recordId: string;
  data: Record<string, unknown>;
}

export function broadcastPostgresEvent(event: Omit<RealtimeChangeEvent, 'id' | 'timestamp'>) {
  const fullEvent: RealtimeChangeEvent = {
    id: `EVT-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    ...event,
  };
  realtimeEmitter.emit('change', fullEvent);
  realtimeEmitter.emit(`table:${event.table}`, fullEvent);
  return fullEvent;
}
