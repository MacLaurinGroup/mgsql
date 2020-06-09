/**
 * Base for the SQLBuilder
 *
 * (c) 2020 https://maclaurin.group/
 */

module.exports = class sqlUpdateBuilder {
  constructor (dbConn) {
    this.dbConn = dbConn;

    this.setvals = [];
    this.where = [];

    this.values = [];
    this.table = null;
  }

  // ---------------------------------------------

  async run () {
    const r = await this.dbConn.query(this.toSql(), this.values);
    return r;
  }

  // ---------------------------------------------

  table (table) {
    this.table = table;
    return this;
  }

  reset () {
    this.setvals = [];
    this.values = [];
    this.where = [];
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
    this.where.push(column);

    if (typeof value !== 'undefined') {
      this.values.push(value);
    }
    return this;
  }

  toSql () {
    if (this.table == null) {
      throw new Error('[-] no table defined');
    }
    if (this.setvals.length === 0) {
      throw new Error('[-] No columns');
    }
    const sql = `UPDATE ${this.table} SET ${this.setvals.join(',')} WHERE ${this.where.join(' AND ')}`;
    return sql;
  }
};
