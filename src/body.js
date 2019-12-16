const body = (handle) => async (ctx) => {
  if (typeof handle === 'function') {
    try {
      const data = await handle(ctx);
      ctx.body = data;
    } catch (error) {
      if (typeof error.status === 'number' || typeof error.statusCode === 'number') {
        throw error;
      } else {
        if (ctx.logger && ctx.logger.error) {
          ctx.logger.error(error);
        }
        ctx.throw(500);
      }
    }
  } else {
    ctx.body = handle;
  }
};

module.exports = body;
