/**
 * Base for the SQLBuilder
 *
 * (c) 2020 https://maclaurin.group/
 */

module.exports = class sqlInsertBuilder {
  constructor (dbConn) {
    this.dbConn = dbConn;

    this.columns = [];
    this.values = [];
    this.sqlTable = null;
    this.ignoreDuplicate = false;
  }

  // ---------------------------------------------

  async run () {
    const qResult = await this.dbConn.query(this.toSql(), this.values);
    return this.dbConn.__parseInsertReturn(null, qResult);
  }

  // ---------------------------------------------

  log (_on) {
    this.dbConn.log(_on);
    return this;
  }

  removeNull (_on) {
    this.dbConn.removeNull(_on);
    return this;
  }

  removeErrantPeriod (_on) {
    this.dbConn.removeErrantPeriod(_on);
    return this;
  }

  table (table) {
    this.sqlTable = table;
    return this;
  }

  reset () {
    this.columns = [];
    this.values = [];
    this.ignoreDuplicate = false;
    return this;
  }

  column (column, value) {
    this.columns.push(column);
    this.values.push(value);
    return this;
  }

  ignoreDuplicate () {
    this.ignoreDuplicate = true;
    return this;
  }

  toSql () {
    if (this.sqlTable == null) {
      throw new Error('[-] no table defined');
    }
    if (this.columns.length === 0) {
      throw new Error('[-] No columns');
    }

    return this.dbConn.__createInsert(this.sqlTable, this.columns, this.ignoreDuplicate);
  }
};
