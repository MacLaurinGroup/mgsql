/**
 * Session class to park some data between queries
 *
 * (c) 2020 https://maclaurin.group/
 */

const _ = require('underscore');

class Session {
  constructor () {
    this.tableDef = {};
    this.tableNameOid = {};
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

  hasTableName (tableOwner, tableId) {
    return _.has(this.tableNameOid, tableOwner + tableId);
  }

  getTableName (tableOwner, tableId) {
    return this.tableNameOid[tableOwner + tableId];
  }

  setTableName (tableOwner, tableId, tableName) {
    this.tableNameOid[tableOwner + tableId] = tableName;
  }
}

module.exports = new Session();
