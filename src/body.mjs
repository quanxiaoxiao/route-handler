export default (handle) => async (ctx) => {
  if (typeof handle === 'function') {
    try {
      const data = await handle(ctx);
      ctx.body = data;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error(error);
      }
      if (typeof error.status === 'number' || typeof error.statusCode === 'number') {
        throw error;
      } else {
        if (ctx.logger && ctx.logger.warn) {
          ctx.logger.warn(error.message);
        }
        ctx.throw(500);
      }
    }
  } else {
    ctx.body = handle;
  }
};
