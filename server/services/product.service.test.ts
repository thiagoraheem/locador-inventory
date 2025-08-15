import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { ProductService } from './product.service';
import { productRepository } from '../repositories/product.repository';

test('getProducts delegates to repository', async () => {
  const repoMock = mock.method(productRepository, 'findAll', async () => [{ id: 1, name: 'Item' }]);
  const service = new ProductService();
  const result = await service.getProducts();
  assert.deepEqual(result, [{ id: 1, name: 'Item' }]);
  assert.equal(repoMock.mock.callCount(), 1);
  repoMock.mock.restore();
});

test('searchProducts delegates parameters', async () => {
  const repoMock = mock.method(productRepository, 'search', async (q: string, l: number) => [{ id: 2, name: q, limit: l }]);
  const service = new ProductService();
  const result = await service.searchProducts('foo', 5);
  assert.deepEqual(result, [{ id: 2, name: 'foo', limit: 5 }]);
  assert.deepEqual(repoMock.mock.calls[0].arguments, ['foo', 5]);
  repoMock.mock.restore();
});
