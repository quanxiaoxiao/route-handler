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
        ctx.status = statusCode;
        Object
          .keys(headers)
          .forEach((key) => {
            ctx.set(key, headers[key]);
          });
        passThrough.headersSent = true;
      };
      passThrough.socket = ctx.socket;
      httpForward(options, passThrough);
      ctx.body = passThrough;
    };
  }
  if (type === 'string') {
    return (ctx) => {
      const passThrough = new PassThrough();
      passThrough.writeHead = (statusCode, headers) => {
        ctx.status = statusCode;
        Object
          .keys(headers)
          .forEach((key) => {
            ctx.set(key, headers[key]);
          });
        passThrough.headersSent = true;
      };
      passThrough.socket = ctx.socket;
      httpForward({
        url: /^https?:\/\/[^/]+\//.test(handle)
          ? `${handle}?${ctx.querystring}`
          : `${handle}${ctx.originalUrl}`,
        body: ctx.req,
        headers: _.omit(ctx.headers, ['host', 'referer']),
      }, passThrough);
      ctx.body = passThrough;
    };
  }
  return (ctx) => {
    ctx.throw(500);
  };
};

module.exports = proxy;
