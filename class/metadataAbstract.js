/**
 * Base class for the sqlbase
 *
 * (c) 2020 https://maclaurin.group/
 */

const _ = require('underscore');

module.exports = class metadataAbstract {
  constructor () {
    this.tableDef = {};
  }

  async loadTable (dbConn, table) {
    if (_.has(this.tableDef, table)) {
      return;
    }
    throw new Error('not implemented');
  }

  getDef (table) {
    if (_.has(this.tableDef, table)) {
      return this.tableDef[table];
    } else {
      throw new Error(`${table} not available`);
    }
  }
};

// ------------------------------

const tableDefClass = class tableDefClass {
  constructor (table) {
    this.table = table;
    this.columns = {};
  }

  addColumn (colName, dataType, primaryKey, colRequired, allowedNull, colMaxLen, colValues) {
    this.columns[colName] = {
      dataType: dataType,
      pk: primaryKey,
      req: colRequired,
      allowedNull: allowedNull,
      maxLen: colMaxLen,
      enum: colValues
    };
    return this;
  }
};
