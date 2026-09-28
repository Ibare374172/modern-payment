import { StkRecord } from '../types';

/**
 * In-memory transaction and STK status repository.
 * Keeps record of recent STK prompts dispatched to mobile handsets.
 */
class StkStore {
  private store: Map<string, StkRecord> = new Map();

  public save(record: StkRecord): void {
    this.store.set(record.checkoutRequestId, record);
  }

  public get(checkoutRequestId: string): StkRecord | undefined {
    return this.store.get(checkoutRequestId);
  }

  public update(checkoutRequestId: string, updates: Partial<StkRecord>): StkRecord | undefined {
    const existing = this.store.get(checkoutRequestId);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates };
    this.store.set(checkoutRequestId, updated);
    return updated;
  }

  public getAll(): StkRecord[] {
    return Array.from(this.store.values());
  }

  public clear(): void {
    this.store.clear();
  }
}

export const stkStore = new StkStore();
