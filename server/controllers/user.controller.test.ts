import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UserController } from './user.controller';

const mockService = {
  getUsers: async () => [{ id: 1, name: 'Alice' }],
  createUser: async () => ({}),
  updateUser: async () => ({}),
  deleteUser: async () => true
};

test('UserController.list returns users', async () => {
  const controller = new UserController(mockService as any);
  let responseData: any;
  const res = { json: (data: any) => { responseData = data; } } as any;
  await controller.list({} as any, res);
  assert.deepEqual(responseData, [{ id: 1, name: 'Alice' }]);
});
