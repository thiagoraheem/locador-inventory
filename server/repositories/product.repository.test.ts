import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { BaseRepository } from './base.repository';
import { productRepository } from './product.repository';

test('findAll retrieves products from storage', async () => {
  const storageStub = { getProducts: async () => [{ id: 1, name: 'Widget' }] } as any;
  const getStorageMock = mock.method(BaseRepository.prototype, 'getStorage', async () => storageStub);
  const result = await productRepository.findAll();
  assert.deepEqual(result, [{ id: 1, name: 'Widget' }]);
  assert.equal(getStorageMock.mock.callCount(), 1);
  getStorageMock.mock.restore();
});

test('findBySerial delegates to storage', async () => {
  const storageStub = { findProductBySerial: async (s: string) => ({ id: 2, serial: s }) } as any;
  const getStorageMock = mock.method(BaseRepository.prototype, 'getStorage', async () => storageStub);
  const result = await productRepository.findBySerial('ABC123');
  assert.deepEqual(result, { id: 2, serial: 'ABC123' });
  assert.equal(getStorageMock.mock.callCount(), 1);
  getStorageMock.mock.restore();
});
