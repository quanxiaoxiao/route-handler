const body = (handle) => async (ctx) => {
  if (typeof handle === 'function') {
    try {
      const data = await handle(ctx);
      ctx.body = data;
    } catch (error) {
      if (typeof error.status === 'number') {
        throw error;
      } else {
        console.error(error);
        ctx.throw(500);
      }
    }
  } else {
    ctx.body = handle;
  }
};

module.exports = body;
