/* eslint no-use-before-define: 0 */
import { PassThrough } from 'stream';
import _ from 'lodash';
import { httpForward } from '@quanxiaoxiao/about-http';

export default (handle) => {
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
                const errorMessage = `${path} [${method}] \`${error.message}\``;
                if (ctx.logger && ctx.logger.warn) {
                  ctx.logger.warn(errorMessage);
                } else {
                  console.error(errorMessage);
                }
              }
            }
          });
      }
      passThrough.headersSent = true;
    };

    passThrough.socket = ctx.socket;

    if (ctx.logger && ctx.logger.info) {
      ctx.logger.info(`${path} [${method}] -> \`${options.url}@${options.method}\``);
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
      if (!_.isPlainObject(options)) {
        ctx.throw(500);
      }
      if (!options.url) {
        if (ctx.logger && ctx.logger.warn) {
          ctx.logger.warn('url is not set');
        }
        ctx.throw(500);
      }
      if (!/^https?:\/\//.test(options.url)) {
        if (ctx.logger && ctx.logger.warn) {
          ctx.logger.warn(`url \`${options.url}\` invalid`);
        }
        ctx.throw(500);
      }
      handler(ctx, {
        ...options,
        method: options.method || ctx.method,
      });
    };
  }

  if (type === 'string') {
    return (ctx) => {
      if (!/^https?:\/\//.test(handle)) {
        if (ctx.logger && ctx.logger.warn) {
          ctx.logger.warn(`url \`${handle}\` invalid`);
        }
        ctx.throw(500);
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
