module.exports = class SqlInsertBuilder extends require('./Builder') {
  constructor (wrap) {
    super(wrap);
    this.reset();
  }

  resetAll () {
    this.reset();
    return this;
  }

  // ---------------------------------------------

  async run () {
    const qResult = await this.wrap.query(this.toSql(), this.values);
    const tableDef = this.wrap.getDefinition(this.schema, this.sqlTable);
    return this.wrap.transformInsertReturn(tableDef, qResult);
  }

  // ---------------------------------------------

  reset () {
    super.reset();
    this.columns = [];
    this.values = [];
    this._ignoreDuplicate = false;
    return this;
  }

  column (column, value) {
    if (typeof value === 'undefined') {
      throw new Error('[-] Missing value');
    }

    this.columns.push(column);
    this.values.push(value);
    return this;
  }

  ignoreDuplicate () {
    this.ignoreDuplicate = true;
    return this;
  }

  // ---------------------------------------------

  toSql () {
    if (this.sqlTable == null) {
      throw new Error('[-] no table defined');
    } else if (this.columns.length === 0) {
      throw new Error('[-] No columns');
    }

    const preparedList = [];
    for (let x = 0; x < this.columns.length; x++) {
      preparedList.push('?');
    }

    const tableDef = this.wrap.getDefinition(this.schema, this.sqlTable);

    let genSql = `INSERT INTO ${this.schema}.${this.sqlTable} (${this.columns.join(',')}) VALUES (${preparedList.join(',')})`;
    genSql += (this.ignoreDuplicate) ? ' ON CONFLICT DO NOTHING' : '';
    genSql += (tableDef.keys.length > 0) ? ` RETURNING ${tableDef.keys.join(',')}` : '';

    return genSql;
  }
};
