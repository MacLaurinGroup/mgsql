const clean = new (require('./class/clean'))();
const check = new (require('./class/check'))();

module.exports = {

  getPostgresWrap: async function (pgClient, schema) {
    const w = new (require('./class/WrapPostgres'))(pgClient);
    await w.init(schema);
    return w;
  },

  assert: check,
  clean: clean
};
