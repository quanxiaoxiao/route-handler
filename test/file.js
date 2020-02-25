const path = require('path');
const { Readable } = require('stream');
const test = require('ava');
const createError = require('http-errors');
const file = require('../src/file');

test('file', (t) => {
  const ctx = {
    throw: (...args) => {
      throw createError(...args);
    },
  };
  t.throws(() => {
    file([])(ctx);
  });
  t.throws(() => {
    file({})(ctx);
  });
  t.throws(() => {
    file(1)(ctx);
  });
  t.throws(() => {
    file()(ctx);
  });
});

test('file string type', (t) => {
  const ctx = {
    throw: (...args) => {
      throw createError(...args);
    },
  };
  const error = t.throws(() => {
    file('./aaa')(ctx);
  });

  t.is(error.status, 500);
  t.is(error.statusCode, 500);

  file(path.resolve(__dirname, 'file.js'))(ctx);
  t.is(ctx.type, '.js');
  t.true(ctx.body instanceof Readable);
});

test('file function type', async (t) => {
  const ctx = {
    throw: (...args) => {
      throw createError(...args);
    },
  };

  await t.throwsAsync(async () => {
    await file(() => 1)(ctx);
  });
  await t.throwsAsync(async () => {
    await file(() => null)(ctx);
  });
  await t.throwsAsync(async () => {
    await file(() => [])(ctx);
  });
  const error = await t.throwsAsync(async () => {
    await file(() => './aa/bb/cc')(ctx);
  });
  t.is(error.status, 500);
  t.is(error.statusCode, 500);
  await file(() => path.resolve(__dirname, 'file.js'))(ctx);
  t.is(ctx.type, '.js');
  t.true(ctx.body instanceof Readable);
});
