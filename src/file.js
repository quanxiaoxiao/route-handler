const _ = require('lodash');
const path = require('path');
const fs = require('fs');

const file = (handle) => {
  const type = typeof handle;
  if (type === 'string') {
    return (ctx) => {
      if (!path.isAbsolute(handle)) {
        ctx.throw(500, 'path is not absolute');
      }
      ctx.type = path.extname(handle);
      ctx.body = fs.createReadStream(handle);
    };
  }
  if (type === 'function') {
    return async (ctx) => {
      const pathname = await handle(ctx);
      if (!_.isString(pathname)) {
        ctx.throw(500);
      }
      if (!path.isAbsolute(pathname)) {
        ctx.throw(500, 'path is not absolute');
      }
      ctx.type = path.extname(pathname);
      ctx.body = fs.createReadStream(pathname);
    };
  }
  return (ctx) => {
    ctx.throw(500);
  };
};

module.exports = file;
