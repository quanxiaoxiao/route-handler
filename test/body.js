import test from 'ava';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import createError from 'http-errors';
import body from '../src/body';


test('body', async (t) => {
  const ctx = {
    throw: (...args) => {
      throw createError(...args);
    },
  };
  await body(1)(ctx);
  t.is(ctx.body, 1);
  await body('aa')(ctx);
  t.is(ctx.body, 'aa');
  await body({ name: 'quan' })(ctx);
  t.deepEqual(ctx.body, { name: 'quan' });
  await body(fs.createReadStream(path.resolve(__dirname, 'body.js')))(ctx);
  t.true(ctx.body instanceof Readable);
});


test('body type function', async (t) => {
  const ctx = {
    throw: (...args) => {
      throw createError(...args);
    },
  };
  await body(() => 1)(ctx);
  t.is(ctx.body, 1);
  await body(() => ({ name: 'quan' }))(ctx);
  t.deepEqual(ctx.body, { name: 'quan' });
  let error = await t.throwsAsync(async () => {
    await body(() => {
      throw new Error();
    })(ctx);
  });
  t.is(error.status, 500);
  t.is(error.statusCode, 500);
  error = await t.throwsAsync(async () => {
    await body(() => {
      throw createError(404);
    })(ctx);
  });
  t.is(error.status, 404);
  t.is(error.statusCode, 404);
});
