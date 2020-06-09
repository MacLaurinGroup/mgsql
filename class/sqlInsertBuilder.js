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
    this.table = null;
  }

  // ---------------------------------------------

  async run (ignoreDuplicate) {
    const r = await this.dbConn.query(this.toSql(ignoreDuplicate), this.values);
    return r;
  }

  // ---------------------------------------------

  table (table) {
    this.table = table;
    return this;
  }

  reset () {
    this.columns = [];
    this.values = [];
    return this;
  }

  column (column, value) {
    this.columns.push(column);
    this.values.push(value);
    return this;
  }

  toSql (ignoreDuplicate) {
    if (this.table == null) {
      throw new Error('[-] no table defined');
    }
    if (this.columns.length === 0) {
      throw new Error('[-] No columns');
    }

    ignoreDuplicate = !!(ignoreDuplicate);
    return this.dbConn.__createInsert(this.table, this.columns, ignoreDuplicate);
  }
};
