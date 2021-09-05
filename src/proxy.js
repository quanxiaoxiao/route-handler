const _ = require('lodash');
const { httpForward } = require('@quanxiaoxiao/about-http');
const { PassThrough } = require('stream');

const proxy = (handle) => {
  const type = typeof handle;

  const handler = (ctx, options) => {
    const { path, method } = ctx;
    const passThrough = new PassThrough();
    passThrough.writeHead = (statusCode, headers) => {
      if (statusCode != null) {
        ctx.status = statusCode;
      }
      if (_.isPlainObject(headers)) {
        Object
          .keys(headers)
          .forEach((key) => {
            const name = key.trim();
            if (name.toUpperCase() !== 'SERVER') {
              try {
                ctx.set(name, headers[key]);
              } catch (error) {
                ctx.logger.error(`${path} \`${method}\` ${error.message}`);
              }
            }
          });
      }
      passThrough.headersSent = true;
    };
    passThrough.socket = ctx.socket;

    if (ctx.logger && ctx.logger.info) {
      ctx.logger.info(`${path} \`${method}\` -> ${options.url} \`${options.method}\``);
    }

    httpForward({
      ...options,
      logger: ctx.logger,
    }, passThrough);

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
        const { querystring } = ctx;
        if (!/^https?:\/\/[^/]+\//.test(forwardHref)) {
          forwardHref = `${forwardHref}${ctx.path}`;
        }
        if (ctx.querystring !== '') {
          forwardHref = `${forwardHref}?${querystring}`;
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
