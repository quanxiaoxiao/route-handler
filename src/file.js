const _ = require('lodash');
const path = require('path');
const fs = require('fs');

const file = (handle) => {
  const type = typeof handle;
  const handler = (ctx, pathname) => {
    if (!path.isAbsolute(pathname)) {
      ctx.throw(500);
    }
    ctx.type = path.extname(pathname);
    ctx.body = fs.createReadStream(pathname);
  };
  if (type === 'string') {
    return (ctx) => {
      handler(ctx, handle);
    };
  }
  if (type === 'function') {
    return async (ctx) => {
      const pathname = await handle(ctx);
      if (!_.isString(pathname)) {
        ctx.throw(500);
      }
      handler(ctx, pathname);
    };
  }
  return (ctx) => {
    ctx.throw(500);
  };
};

module.exports = file;
