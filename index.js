
const dbSession = require('./class/Session');
const clean = new (require('./class/clean'))();
const check = new (require('./class/check'))();

module.exports = {

  mysql: function () {
    return new (require('./class/SQLUtilsMysql'))(dbSession);
  },

  postgresql: function () {
    return new (require('./class/SQLUtilsPostgresql'))(dbSession);
  },

  check: check,
  clean: clean
};
