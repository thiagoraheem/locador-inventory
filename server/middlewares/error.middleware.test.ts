import { test } from 'node:test';
import assert from 'node:assert/strict';
import { errorHandler } from './error.middleware';

test('errorHandler responds with status and message', () => {
  const err = new Error('boom');
  let statusCode = 0;
  let payload: any;
  const res = {
    headersSent: false,
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(data: any) {
      payload = data;
    },
  } as any;
  errorHandler(err, {} as any, res, () => {});
  assert.equal(statusCode, 500);
  assert.deepEqual(payload, { message: 'boom' });
});

test('errorHandler delegates when headers already sent', () => {
  const err = new Error('oops');
  let nextCalled = false;
  const res = {
    headersSent: true,
    status() { return this; },
    json() {},
  } as any;
  errorHandler(err, {} as any, res, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
});
