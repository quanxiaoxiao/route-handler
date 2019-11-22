const mount = (handle) => (ctx, next) => handle(ctx, next);

module.exports = mount;
