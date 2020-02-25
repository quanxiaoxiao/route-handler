const _ = require('lodash');
const { httpForward } = require('@quanxiaoxiao/about-http');
const { PassThrough } = require('stream');

const humanize = (n) => {
  n = n.toString().split('.');
  n[0] = n[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1,');
  return n.join('.');
};

const time = (start) => {
  const delta = Date.now() - start;
  return humanize(delta < 10000
    ? `${delta}ms`
    : `${Math.round(delta / 1000)}s`);
};

const proxy = (handle) => {
  const type = typeof handle;

  const handler = (ctx, options) => {
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
      ctx.logger.info(`FORWARD -> [${options.method}] ${options.url}`);
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
        ctx.logger.info(`FORWARD <- [${options.method}] ${options.url} [${ctx.status || ''}] ${time(start)}`);
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
      const forwardHref = /^https?:\/\/[^/]+\//.test(handle)
        ? `${handle}?${ctx.querystring}`
        : `${handle}${ctx.path}?${ctx.querystring}`;
      handler(ctx, {
        url: forwardHref,
        body: ctx.req,
        headers: _.omit(ctx.headers, ['host', 'referer']),
        method: ctx.method,
      });
    };
  }
  return (ctx) => {
    ctx.throw(500);
  };
};

module.exports = proxy;
