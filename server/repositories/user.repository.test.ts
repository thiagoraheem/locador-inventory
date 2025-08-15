import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { BaseRepository } from './base.repository';
import { userRepository } from './user.repository';

test('findAll returns users from storage', async () => {
  const storageStub = { getUsers: async () => [{ id: 1, username: 'john' }] } as any;
  const getStorageMock = mock.method(BaseRepository.prototype, 'getStorage', async () => storageStub);
  const result = await userRepository.findAll();
  assert.deepEqual(result, [{ id: 1, username: 'john' }]);
  assert.equal(getStorageMock.mock.callCount(), 1);
  getStorageMock.mock.restore();
});

test('create passes through to storage', async () => {
  const storageStub = { createUser: async (data: any) => ({ id: 2, ...data }) } as any;
  const getStorageMock = mock.method(BaseRepository.prototype, 'getStorage', async () => storageStub);
  const result = await userRepository.create({ username: 'alice' });
  assert.deepEqual(result, { id: 2, username: 'alice' });
  assert.equal(getStorageMock.mock.callCount(), 1);
  getStorageMock.mock.restore();
});
