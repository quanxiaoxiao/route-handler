const _ = require('lodash');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const file = (handle) => {
  const type = typeof handle;
  const handler = (ctx, pathname) => {
    if (!path.isAbsolute(pathname)) {
      ctx.throw(404);
    }
    try {
      const stats = fs.statSync(pathname);
      const hash = crypto
        .createHash('sha1')
        .update(`${pathname}_${stats.size}_${stats.mtime.getTime()}`)
        .digest('hex');
      if (ctx.get('if-none-match') === hash) {
        ctx.status = 304;
      } else {
        ctx.set('if-none-match', hash);
        ctx.type = path.extname(pathname);
        ctx.body = fs.createReadStream(pathname);
      }
    } catch (error) {
      ctx.throw(404);
    }
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
