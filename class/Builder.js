module.exports = class Builder {
  constructor (wrap) {
    this.wrap = wrap;
    this.filterNull = false;
    this.filterErantPeriod = false;
    this.sqlTable = null;
    this.schema = null;
  }

  async runWithCount (distinct = false) {
    throw new Error('[-] runWithCount() not supported');
  }

  reset () {
    this.filterNull = false;
    this.filterErantPeriod = false;
    return this;
  }

  table (_table) {
    this.schema = _table.split('.')[0];
    this.sqlTable = _table.split('.')[1];
    return this;
  }

  removeNull (_on) {
    this.filterNull = (typeof _on !== 'undefined') ? _on : true;
    return this;
  }

  removeErrantPeriod (_on) {
    this.filterErantPeriod = (typeof _on !== 'undefined') ? _on : true;
    return this;
  }

  log (_on) {
    this.wrap.log(_on);
    return this;
  }
}
;
