/**
 * Base for the SQLBuilder
 *
 * (c) 2020 https://maclaurin.group/
 */

const _ = require('underscore');

module.exports = class sqlSelectBuilder {
  constructor (dbConn) {
    this.dbConn = dbConn;

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
  }

  // ---------------------------------------------

  async run () {
    const r = await this.dbConn.select(this.toSql(), this.values);
    return r;
  }

  async runWithCount (distinct) {
    const res = {
      data: await this.dbConn.select(this.toSql(), this.values),
      recordsTotal: await this.dbConn.select1(this.toCountSql(distinct), this.values)
    };

    if (res.recordsTotal == null) {
      res.recordsTotal = 0;
    } else {
      res.recordsTotal = Number(res.recordsTotal);
    }

    res.recordsFiltered = res.recordsTotal;

    return res;
  }

  // ---------------------------------------------

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
    this.sql.select = s.trim();
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
    if (_.isString(o)) {
      this.sql.from.push(o);
      this.tables[getTableName(o)] = true;
    } else {
      this.tables[getTableName(o.left)] = true;
      this.tables[getTableName(o.right)] = true;

      if (typeof o.join === 'undefined' || o.join === 'left') {
        this.sql.from.push(`${o.left} LEFT JOIN ${o.right} ON ${o.where}`);
      } else if (o.join.toLowerCase() === 'left outer') {
        this.sql.from.push(`${o.left} LEFT OUTER JOIN ${o.right} ON ${o.where}`);
      } else if (o.join.toLowerCase() === 'right') {
        this.sql.from.push(`${o.left} RIGHT JOIN ${o.right} ON ${o.where}`);
      } else if (o.join.toLowerCase() === 'right outer') {
        this.sql.from.push(`${o.left} RIGHT OUTER JOIN ${o.right} ON ${o.where}`);
      } else if (o.join.toLowerCase() === 'inner') {
        this.sql.from.push(`${o.left} INNER JOIN ${o.right} ON ${o.where}`);
      } else {
        throw new Error('[-] JOIN TYPE not supported (left, left outer, right, right outer, inner)');
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
   *
   */
  dataTable (query) {
    if (typeof query === 'undefined') {
      return;
    }

    // Manage the paging
    if (_.has(query, 'start') && _.has(query, 'length')) {
      query.start = Number(query.start);
      query.length = Number(query.length);
      this.limit(query.length, query.start / query.length);
    }

    // equals (only for 3 or more)
    if (_.has(query, 'equals')) {
      for (const colName of query.equals) {
        this.whereStmt(`${colName}=?`, query.equals[colName]);
      }
    }

    // selectColumns
    if (_.has(query, 'selectColumns')) {
      this.select(query.selectColumns);
    } else if (_.has(query, 'columns') && query.columns.length > 0) {
      const selectColumns = [];
      for (const column of query.columns) {
        selectColumns.push(getColumnName(column));
      }
      this.select(selectColumns.join(','));
    }

    // search (only for 3 or more)
    if (_.has(query, 'search') && _.has(query.search, 'value') && query.search.value.length > 2 && _.has(query, 'columns') && query.columns.length > 0) {
      const whereStmt = [];
      const whereVals = [];

      for (const column of query.columns) {
        if (column.searchable === 'true' && !_.has(query.equals, getColumnName(column))) {
          whereStmt.push(`${getColumnName(column)} LIKE ?`);
          whereVals.push(`%${query.search.value}%`);
        }
      }

      if (whereVals.length > 0) {
        this.where('(' + whereStmt.join(' OR ') + ')', whereVals);
      }
    }

    // order
    if (_.has(query, 'order') && query.order.length > 0 && _.has(query, 'columns') && query.columns.length > 0) {
      const orderByStmt = [];

      for (let x = 0; x < query.order.length; x++) {
        const colOrderIndex = Number(query.order[x].column);
        if (_.has(query.columns[colOrderIndex], 'orderable') && query.columns[colOrderIndex].orderable === 'true') {
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
    let genSql = `SELECT\r\n  ${select}\r\nFROM\r\n  ${this.sql.from.join(', ')}`.trim();

    if (this.sql.where !== '') {
      genSql += `\r\nWHERE\r\n  ${this.sql.where}`;
      genSql = genSql.trim();
    }
    if (this.sql.groupby !== '') {
      genSql += `\r\n${this.sql.groupby}`;
      genSql = genSql.trim();
    }
    if (this.sql.orderby !== '') {
      genSql += `\r\n${this.sql.orderby}`;
      genSql = genSql.trim();
    }
    if (this.pageSize !== -1) {
      genSql += `\r\n${this.dbConn.__sqlSelectLimit(this.pageSize, this.page)}`;
      genSql = genSql.trim();
    }

    if (genSql.indexOf(';') > 0) {
      throw new Error('[-] Potential SQL Injection');
    }
    return genSql;
  }

  toCountSql (distinct) {
    distinct = (distinct) ? 'DISTINCT' : '';
    let genSql = `SELECT\r\n ${distinct} count(*) as t\r\nFROM\r\n  ${this.sql.from.join(', ')}`.trim();

    if (this.sql.where !== '') {
      genSql += `\r\nWHERE\r\n  ${this.sql.where}`;
      genSql = genSql.trim();
    }
    if (this.sql.groupby !== '') {
      genSql += `\r\n${this.sql.groupby}`;
      genSql = genSql.trim();
    }
    if (genSql.indexOf(';') > 0) {
      throw new Error('[-] Potential SQL Injection');
    }
    return genSql;
  }
};

// ------------------------------------------------

function getTableName (t) {
  const c1 = t.toLowerCase().indexOf(' as ');
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
