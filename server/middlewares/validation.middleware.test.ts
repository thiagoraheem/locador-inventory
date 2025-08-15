import { test } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { validate } from './validation.middleware';

test('validate passes and replaces request data', () => {
  const middleware = validate(z.object({ name: z.string() }));
  const req = { body: { name: 'Alice' } } as any;
  let nextCalled = false;
  middleware(req, {} as any, () => {
    nextCalled = true;
  });
  assert.equal(nextCalled, true);
  assert.deepEqual(req.body, { name: 'Alice' });
});

test('validate responds with 400 on invalid data', () => {
  const middleware = validate(z.object({ name: z.string() }));
  const req = { body: {} } as any;
  let statusCode = 0;
  let jsonData: any;
  const res = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(data: any) {
      jsonData = data;
    },
  } as any;
  middleware(req, res, () => {});
  assert.equal(statusCode, 400);
  assert.equal(jsonData.message, 'Validation failed');
  assert.ok(Array.isArray(jsonData.errors));
});
