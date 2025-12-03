import { describe, it } from 'node:test';
import assert from 'node:assert';
import { SimpleStorage } from './simple-storage';

class FakeRequest {
  private inputs: Record<string, any> = {};
  constructor(private onUpdateStatus: (status: string) => void) {}
  input(name: string, _typeOrVal: any, val?: any) {
    const value = val === undefined ? _typeOrVal : val;
    this.inputs[name] = value;
    return this;
  }
  async query(sql: string) {
    if (/UPDATE\s+inventories/i.test(sql)) {
      const status = this.inputs['status'];
      if (typeof status === 'string') {
        this.onUpdateStatus(status);
      }
      return { recordset: [] } as any;
    }
    return { recordset: [] } as any;
  }
}

class FakePool {
  public lastStatus: string | null = null;
  request() {
    return new FakeRequest((status) => {
      this.lastStatus = status;
    });
  }
}

class TestStorage extends SimpleStorage {
  constructor(pool: any) {
    // @ts-ignore
    super(pool);
  }
  async calculateFinalQuantities(_inventoryId: number) {
    return; // no-op for unit test
  }
  async getInventoryItemsByInventory(_inventoryId: number) {
    return [] as any;
  }
  async createAuditLog(_: any) {
    return;
  }
}

describe('transitionInventoryStatus', () => {
  it('should persist count2_closed when finishing 2nd count', async () => {
    const pool = new FakePool();
    const storage = new TestStorage(pool as any);
    await storage.transitionInventoryStatus(1, 'count2_closed', 123);
    assert.strictEqual(pool.lastStatus, 'count2_closed');
  });

  it('should transition count3_closed to audit_mode', async () => {
    const pool = new FakePool();
    const storage = new TestStorage(pool as any);
    await storage.transitionInventoryStatus(1, 'count3_closed', 123);
    assert.strictEqual(pool.lastStatus, 'audit_mode');
  });
});

