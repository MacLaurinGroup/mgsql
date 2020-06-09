/**
 * Base for the SQLBuilder
 *
 * (c) 2020 https://maclaurin.group/
 */

module.exports = class sqlUpdateBuilder {
  constructor (dbConn) {
    this.dbConn = dbConn;

    this.setvals = [];
    this.sqlWhere = [];

    this.values = [];
    this.sqlTable = null;
  }

  // ---------------------------------------------

  async run () {
    const qResult = await this.dbConn.query(this.toSql(), this.values);
    return this.dbConn.__parseUpdateReturn(null, qResult);
  }

  // ---------------------------------------------

  table (table) {
    this.sqlTable = table;
    return this;
  }

  reset () {
    this.setvals = [];
    this.values = [];
    this.sqlWhere = [];
    return this;
  }

  setColumn (column, value) {
    this.setvals.push(column);

    if (typeof value !== 'undefined') {
      this.values.push(value);
    }
    return this;
  }

  where (column, value) {
    this.sqlWhere.push(column);

    if (typeof value !== 'undefined') {
      this.values.push(value);
    }
    return this;
  }

  toSql () {
    if (this.sqlTable == null) {
      throw new Error('[-] no table defined');
    }
    if (this.setvals.length === 0) {
      throw new Error('[-] No columns');
    }
    if (this.sqlWhere.length === 0) {
      throw new Error('[-] No where');
    }
    const sql = `UPDATE ${this.sqlTable} SET ${this.setvals.join(',')} WHERE ${this.sqlWhere.join(' AND ')}`;
    return sql;
  }
};
