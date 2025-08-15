import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ProductController } from './product.controller';

const mockService = {
  getProducts: async () => [{ id: 1, name: 'Item' }],
  searchProducts: async () => [],
  getProduct: async () => null,
  getProductsWithSerialControl: async () => [],
  findProductBySerial: async () => null,
};

test('ProductController.list returns products', async () => {
  const controller = new ProductController(mockService as any);
  let responseData: any;
  const res = { json: (data: any) => { responseData = data; } } as any;
  await controller.list({} as any, res);
  assert.deepEqual(responseData, [{ id: 1, name: 'Item' }]);
});
