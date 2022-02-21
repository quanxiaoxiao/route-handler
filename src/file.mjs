import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import _ from 'lodash';

const calcHash = (pathname) => {
  const stats = fs.statSync(pathname);
  return crypto
    .createHash('sha1')
    .update(`${pathname}_${stats.size}_${stats.mtime.getTime()}`)
    .digest('hex');
};

export default (handle) => {
  const type = typeof handle;
  const handler = (ctx, pathname) => {
    if (!path.isAbsolute(pathname)) {
      if (ctx.logger && ctx.logger.warn) {
        ctx.logger.warn(`pathname \`${pathname}\` invalid`);
      }
      ctx.throw(404);
    }
    try {
      const hash = calcHash(pathname);
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
        if (ctx.logger && ctx.logger.warn) {
          ctx.logger.warn('pathname invalid');
        }
        ctx.throw(500);
      }
      handler(ctx, pathname);
    };
  }
  return (ctx) => {
    ctx.throw(500);
  };
};
