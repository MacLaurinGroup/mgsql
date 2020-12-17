module.exports = class SqlUpdateBuilder extends require('./sqlInsertBuilder') {
  constructor (wrap) {
    super(wrap);
    this.reset();
  }

  reset () {
    super.reset();
    this.setvals = [];
    this.values = [];
    this.sqlWhere = [];
    return this;
  }

  async run () {
    const qResult = await this.wrap.query(this.toSql(), this.values);
    return 'rowCount' in qResult ? qResult.rowCount : qResult;
  }

  column (column, value) {
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

  // ---------------------------------------------

  toSql () {
    if (this.sqlTable == null) {
      throw new Error('[-] no table defined');
    } else if (this.setvals.length === 0) {
      throw new Error('[-] No columns');
    } else if (this.sqlWhere.length === 0) {
      throw new Error('[-] No WHERE');
    }
    return `UPDATE ${this.schema}.${this.sqlTable} SET ${this.setvals.join(',')} WHERE ${this.sqlWhere.join(' AND ')}`;
  }
};
