import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { UserService } from './user.service';
import { userRepository } from '../repositories/user.repository';
import { auditRepository } from '../repositories/audit.repository';

test('getUsers delegates to repository', async () => {
  const repoMock = mock.method(userRepository, 'findAll', async () => [
    { id: 1, username: 'john' }
  ]);
  const service = new UserService();
  const result = await service.getUsers();
  assert.deepEqual(result, [{ id: 1, username: 'john' }]);
  assert.equal(repoMock.mock.callCount(), 1);
  repoMock.mock.restore();
});

test('createUser creates audit log and strips password', async () => {
  const repoMock = mock.method(userRepository, 'create', async (data: any) => ({
    id: 2,
    username: data.username,
    password: data.password
  }));
  const auditMock = mock.method(auditRepository, 'create', async () => undefined);
  const service = new UserService();
  const result = await service.createUser({ username: 'alice', password: 'secret' }, 42);
  assert.deepEqual(result, { id: 2, username: 'alice' });
  assert.equal(repoMock.mock.callCount(), 1);
  assert.equal(auditMock.mock.callCount(), 1);
  const auditArgs = auditMock.mock.calls[0].arguments[0];
  assert.equal(auditArgs.userId, 42);
  assert.equal(auditArgs.action, 'CREATE');
  assert.equal(auditArgs.entityType, 'USER');
  assert.equal(auditArgs.entityId, '2');
  assert.match(auditArgs.newValues, /"username":"alice"/);
  assert.match(auditArgs.newValues, /"password":"\[REDACTED\]"/);
  repoMock.mock.restore();
  auditMock.mock.restore();
});
