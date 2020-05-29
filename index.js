const dbSession = require('./class/Session');
const clean = new (require('./class/clean'))();
const check = new (require('./class/check'))();

module.exports = {

  mysql: function (dbConn) {
    return new (require('./class/SQLUtilsMysql'))(dbSession, dbConn);
  },

  postgresql: function (dbConn) {
    return new (require('./class/SQLUtilsPostgresql'))(dbSession, dbConn);
  },

  check: check,
  clean: clean
};
