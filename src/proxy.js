const _ = require('lodash');
const { httpForward } = require('@quanxiaoxiao/about-http');
const { PassThrough } = require('stream');

const proxy = (handle) => {
  const type = typeof handle;

  const handler = (ctx, options) => {
    const { path, method } = ctx;
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
      ctx.logger.info(`[${method}] ${path} -> [${options.method}] ${options.url}`);
    }

    const start = Date.now();

    httpForward({
      ...options,
      logger: ctx.logger,
    }, passThrough);

    const onEnd = passThrough.end;

    passThrough.end = (...args) => {
      onEnd.bind(passThrough)(...args);
      if (ctx.logger && ctx.logger.info) {
        ctx.logger.info(`[${method}] ${path} <- [${options.method}] ${options.url} [${ctx.status || ''}] ${Date.now() - start}ms`);
      }
    };
    ctx.body = passThrough;
  };

  if (type === 'function') {
    return async (ctx) => {
      const options = await handle(ctx);
      handler(ctx, {
        ...options,
        method: options.method || ctx.method,
      });
    };
  }

  if (type === 'string') {
    return (ctx) => {
      if (!/^https?:\/\//.test(handle)) {
        ctx.throw(503);
      }
      let forwardHref = handle;
      if (!forwardHref.includes('?')) {
        if (!/^https?:\/\/[^/]+\//.test(forwardHref)) {
          forwardHref = `${forwardHref}${ctx.path}?${ctx.querystring}`;
        } else {
          forwardHref = `${forwardHref}?${ctx.querystring}`;
        }
      }
      handler(ctx, {
        url: forwardHref,
        body: ctx.req,
        headers: _.omit(ctx.headers, [
          'host',
          'referer',
          'connection',
          'proxy-authorization',
          'upgrade',
        ]),
        method: ctx.method,
      });
    };
  }
  return (ctx) => {
    ctx.throw(500);
  };
};

module.exports = proxy;
