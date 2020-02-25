const _ = require('lodash');
const { httpForward } = require('@quanxiaoxiao/about-http');
const { PassThrough } = require('stream');

const proxy = (handle) => {
  const type = typeof handle;
  if (type === 'function') {
    return async (ctx) => {
      const options = await handle(ctx);
      const passThrough = new PassThrough();
      passThrough.writeHead = (statusCode, headers) => {
        if (statusCode) {
          ctx.status = statusCode;
        }
        if (_.isPlainObject(headers)) {
          Object
            .keys(headers)
            .forEach((key) => {
              ctx.set(key, headers[key]);
            });
        }
        passThrough.headersSent = true;
      };
      passThrough.socket = ctx.socket;
      if (ctx.logger && ctx.logger.info) {
        ctx.logger.info(`forward: [${ctx.method}] ${options.url}`);
      }
      httpForward({
        method: ctx.method,
        ...options,
      }, passThrough);
      ctx.body = passThrough;
    };
  }
  if (type === 'string') {
    return (ctx) => {
      const passThrough = new PassThrough();
      passThrough.writeHead = (statusCode, headers) => {
        if (statusCode) {
          ctx.status = statusCode;
        }
        if (_.isPlainObject(headers)) {
          Object
            .keys(headers)
            .forEach((key) => {
              ctx.set(key, headers[key]);
            });
        }
        passThrough.headersSent = true;
      };
      passThrough.socket = ctx.socket;
      const forwardHref = /^https?:\/\/[^/]+\//.test(handle)
        ? `${handle}?${ctx.querystring}`
        : `${handle}${ctx.path}?${ctx.querystring}`;

      if (ctx.logger && ctx.logger.info) {
        ctx.logger.info(`forward: [${ctx.method}] ${forwardHref}`);
      }

      httpForward({
        url: forwardHref,
        body: ctx.req,
        headers: _.omit(ctx.headers, ['host', 'referer']),
        method: ctx.method,
      }, passThrough);
      ctx.body = passThrough;
    };
  }
  return (ctx) => {
    ctx.throw(500);
  };
};

module.exports = proxy;
