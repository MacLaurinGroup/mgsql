module.exports = class SqlSelectBuilder extends require('./Builder') {
  constructor (wrap) {
    super(wrap);
    this.resetAll();
  }

  resetAll () {
    this.sql = {
      select: '',
      from: [],
      where: '',
      groupby: '',
      orderby: ''
    };
    this.page = -1;
    this.pageSize = -1;
    this.values = [];
    this.tables = {};
    this.filterKeys = null;
    return this;
  }

  // ---------------------------------------------

  async run () {
    const r = await this.wrap.select(this.toSql(), this.values);
    return transformSelectResult(r, this.filterNull, this.filterErantPeriod, this.filterKeys);
  }

  async runWithCount (distinct = false) {
    const res = {
      data: await this.run(),
      recordsTotal: await this.wrap.select1(this.toCountSql(distinct), this.values)
    };

    if (res.recordsTotal == null) {
      res.recordsTotal = 0;
    } else {
      res.recordsTotal = Number(res.recordsTotal.t);
    }

    res.page = this.page;
    res.pageSize = this.pageSize;
    res.recordsFiltered = res.recordsTotal;

    return res;
  }

  // ---------------------------------------------

  removeKeys (fields) {
    this.filterKeys = {};
    if (Array.isArray(fields)) {
      for (const el of fields) {
        this.filterKeys[el.trim()] = true;
      }
    } else {
      const fieldArr = fields.split(',');
      for (let x = 0; x < fieldArr.length; x++) {
        this.filterKeys[fieldArr[x].trim()] = true;
      }
    }
    return this;
  }

  whereReset () {
    this.sql.where = '';
    return this;
  }

  selectReset () {
    this.sql.select = '';
    return this;
  }

  groupByReset () {
    this.sql.groupby = '';
    return this;
  }

  orderByReset () {
    this.sql.orderby = '';
    return this;
  }

  limitReset () {
    this.page = -1;
    this.pageSize = -1;
    return this;
  }

  select (s) {
    if (typeof s === 'undefined' || s.trim().length === 0) {
      return this;
    } else {
      this.sql.select = s.trim();
      return this;
    }
  }

  selectConcat (s) {
    if (typeof s === 'undefined' || s.trim().length === 0) {
      return this;
    } else if (this.sql.select.endsWith(',')) {
      this.sql.select += s.trim();
    } else {
      this.sql.select += ', ' + s.trim();
    }
    return this;
  }

  /**
   {
    "join" : "left",
    "left" : "city.global as b",
    "right" : "city.global as b",
    "where" : "b.id = a.id"
    }
   */
  from (o) {
    if (typeof o === 'string') {
      this.sql.from.push(o);
      this.tables[getTableName(o)] = true;
    } else {
      this.tables[getTableName(o.left)] = true;

      if ('join' in o && Array.isArray(o.join)) {
        const joinS = [o.left];

        for (const jj of o.join) {
          let joinType = 'LEFT JOIN';
          if ('type' in jj) {
            if (jj.type.toLowerCase() === 'left outer') {
              joinType = 'LEFT OUTER JOIN';
            } else if (jj.type.toLowerCase() === 'right') {
              joinType = 'RIGHT JOIN';
            } else if (jj.type.toLowerCase() === 'right outer') {
              joinType = 'RIGHT OUTER JOIN';
            } else if (jj.type.toLowerCase() === 'inner') {
              joinType = 'INNER JOIN';
            } else {
              throw new Error('[-] JOIN TYPE not supported (left, left outer, right, right outer, inner)');
            }
          }

          joinS.push(`\r\n    ${joinType} ${jj.right} ON ${jj.where}`);
          this.tables[getTableName(jj.right)] = true;
        }
        this.sql.from.push(joinS.join(''));
      }
    }
    return this;
  }

  where (statement, values) {
    if (this.sql.where.length === 0) {
      this.sql.where = statement;
    } else {
      this.sql.where += ' AND ' + statement;
    }

    if (typeof values !== 'undefined') {
      this.values = this.values.concat(values);
    }

    return this;
  }

  whereOR (statement, values) {
    return this.where('OR ' + statement, values);
  }

  orderBy (statement) {
    this.sql.orderby = '\r\nORDER BY\r\n  ' + statement;
    return this;
  }

  groupBy (statement) {
    this.sql.groupby = '\r\nGROUP BY\r\n  ' + statement;
    return this;
  }

  limit (pageSize, pageNo) {
    this.pageSize = Number(pageSize);
    if (typeof pageNo !== 'undefined') {
      this.page = Number(pageNo);
    }
    return this;
  }

  /**
   * Support for building from dataTables.net
   */
  dataTable (query, maxItems) {
    if (typeof query === 'undefined') {
      return this;
    }

    // Manage the paging
    if ('start' in query && 'length' in query) {
      query.start = Number(query.start);
      query.start = (query.start < 0) ? 0 : query.start;

      query.length = Number(query.length);
      query.length = (query.length < 0) ? 0 : query.length;

      if (typeof maxItems !== 'undefined' && Number(maxItems) < query.length) {
        query.length = Number(maxItems);
      }

      this.limit(query.length, query.start / query.length);
    } else {
      this.limit(maxItems, 0);
    }

    // equals
    if ('equals' in query) {
      for (const colName in query.equals) {
        if (Array.isArray(query.equals[colName])) {
          const v = [];
          for (const el of query.equals[colName]) {
            v.push('?');
          }
          this.where(`${colName} IN (${v.join(',')})`, query.equals[colName]);
        } else {
          this.where(`${colName}=?`, query.equals[colName]);
        }
      }
    } else {
      query.equals = {};
    }

    if ('notequals' in query) {
      for (const colName in query.notequals) {
        if (Array.isArray(query.notequals[colName])) {
          const v = [];
          for (const el of query.notequals[colName]) {
            v.push('?');
          }
          this.where(`${colName} NOT IN (${v.join(',')})`, query.notequals[colName]);
        } else {
          this.where(`${colName}!=?`, query.notequals[colName]);
        }
      }
    } else {
      query.notequals = {};
    }

    // range
    if ('range' in query) {
      for (const colName in query.range) {
        if ('f' in query.range[colName]) {
          this.where(`${colName} >= ?`, [query.range[colName].f]);
        }
        if ('t' in query.range[colName]) {
          this.where(`${colName} <= ?`, [query.range[colName].t]);
        }
      }
    }

    // exerange
    if ('excrange' in query) {
      for (const colName in query.excrange) {
        if ('f' in query.excrange[colName]) {
          this.where(`${colName} > ?`, [query.excrange[colName].f]);
        }
        if ('t' in query.excrange[colName]) {
          this.where(`${colName} < ?`, [query.excrange[colName].t]);
        }
      }
    }

    // selectColumns
    if ('selectColumns' in query) {
      this.select(query.selectColumns);
    } else if (this.sql.select === '' && 'columns' in query && query.columns.length > 0) {
      const selectColumns = [];
      for (const column of query.columns) {
        selectColumns.push(getColumnName(column));
      }
      this.select(selectColumns.join(','));
    }

    // search (only for 3 or more)
    if ('search' in query && 'value' in query.search && query.search.value.length > 2 && 'columns' in query && query.columns.length > 0) {
      const whereStmt = [];
      const whereVals = [];

      for (const column of query.columns) {
        const colName = getColumnName(column);

        if ((column.searchable === 'true' || column.searchable === true) && !(colName in query.equals) && !(colName in query.notequals)) {
          whereStmt.push(`${colName} ILIKE ?`);
          whereVals.push(`%${query.search.value}%`);
        }
      }

      if (whereVals.length > 0) {
        this.where('(' + whereStmt.join(' OR ') + ')', whereVals);
      }
    }

    // order
    if ('order' in query && query.order.length > 0 && 'columns' in query && query.columns.length > 0) {
      const orderByStmt = [];

      for (let x = 0; x < query.order.length; x++) {
        const colOrderIndex = Number(query.order[x].column);
        if (colOrderIndex >= 0 && 'orderable' in query.columns[colOrderIndex] && (query.columns[colOrderIndex].orderable === 'true' || query.columns[colOrderIndex].orderable === true)) {
          const colOrderName = getColumnName(query.columns[colOrderIndex]);
          orderByStmt.push(`${colOrderName} ${(query.order[x].dir === 'asc') ? 'asc' : 'desc'}`);
        }
      }

      if (orderByStmt.length > 0) {
        this.orderBy(orderByStmt.join(', '));
      }
    }

    return this;
  }

  toSql () {
    const select = (this.sql.select === '') ? '*' : this.sql.select;
    let genSql = `SELECT\r\n  ${select}\r\nFROM\r\n  ${this.sql.from.join(',\r\n  ')}`.trim();

    if (this.sql.where !== '') {
      genSql += `\r\nWHERE\r\n  ${this.sql.where}`;
    }
    if (this.sql.groupby !== '') {
      genSql += `\r\n${this.sql.groupby}`;
    }
    if (this.sql.orderby !== '') {
      genSql += `\r\n${this.sql.orderby}`;
    }
    if (this.pageSize !== -1) {
      genSql += `\r\n${getLimit(this.pageSize, this.page)}`;
    }

    if (genSql.indexOf(';') > 0) {
      throw new Error('[-] Potential SQL Injection');
    }
    return genSql.trim();
  }

  toCountSql (distinct = false) {
    distinct = (distinct) ? 'DISTINCT' : '';
    let genSql = `SELECT\r\n ${distinct} COUNT(*) as t\r\nFROM\r\n  ${this.sql.from.join(',\r\n  ')}`;

    if (this.sql.where !== '') {
      genSql += `\r\nWHERE\r\n  ${this.sql.where}`;
    }

    if (this.sql.groupby !== '') {
      genSql += `\r\n${this.sql.groupby}`;
    }

    if (genSql.indexOf(';') > 0) {
      throw new Error('[-] Potential SQL Injection');
    }

    return genSql.trim();
  }
};

// ------------------------------------------------

function getTableName (t) {
  const c1 = t.toLowerCase().indexOf(' AS ');
  if (c1 > 0) {
    return t.substring(0, c1).trim();
  } else {
    return t.trim();
  }
}

function getColumnName (column) {
  const s = column.data.indexOf('\\');
  if (s >= 0) {
    return column.data.substring(0, s) + column.data.substring(s + 1);
  } else {
    return column.data;
  }
}

function getLimit (pageSize, page) {
  if (pageSize === -1) {
    return '';
  }

  let s = 'LIMIT ' + pageSize;
  if (page > 0) {
    s += ' OFFSET ' + (page * pageSize);
  }
  return s;
}

// ------------------------------

function transformSelectResult (rows, filterNull = false, filterErantPeriod = false, filterKeys = null) {
  if (filterNull || filterErantPeriod || filterKeys != null) {
    for (const row of rows) {
      for (const col in row) {
        if (filterNull && row[col] == null) {
          delete row[col];
          continue;
        } else if (filterKeys && col in filterKeys) {
          delete row[col];
          continue;
        } else if (filterErantPeriod && col.charAt(0) === '.') {
          row[col.substring(1)] = row[col];
          delete row[col];
        }
      }
    }
  }
  return rows;
}
