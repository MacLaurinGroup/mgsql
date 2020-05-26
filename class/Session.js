const _ = require('underscore');

class Session {
  constructor () {
    this.tableDef = {};
  }

  hasTable (table) {
    return _.has(this.tableDef, table);
  }

  getTable (table) {
    return this.tableDef[table];
  }

  setTable (table, defintion) {
    this.tableDef[table] = defintion;
  }
}

module.exports = new Session();
