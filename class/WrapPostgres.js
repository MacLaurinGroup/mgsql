const schemaDef = {};
const oidDef = {};

module.exports = class WrapPostgres extends require('./WrapBase') {
  constructor (client) {
    super();
    this.pgClient = client;
    this.logStat = false;
  }

  // ----------------------

  async init (schema) {
    if (this.pgClient.database in oidDef) {
      return;
    }

    const schemaPts = schema.split(',');
    if (!(schemaPts[0] in schemaDef)) {
      const d = new (require('./Definition'))(schema);
      await d.load(this.pgClient);

      for (const schema of schemaPts) {
        schemaDef[schema] = d;
      }

      console.log(`mgsql.defintion.load(${this.pgClient.database}; ${schema})`);
    }

    if (!(this.pgClient.database in oidDef)) {
      oidDef[this.pgClient.database] = new (require('./OidLookup'))(schema);
      await oidDef[this.pgClient.database].load(this.pgClient);
      console.log(`mgsql.oidTable.load(${this.pgClient.database}; ${schema})`);
    }
  }

  // ----------------------

  getDefinition (schema, table) {
    return schemaDef[schema].getTable(schema, table);
  }

  log (_on) {
    this.logStat = (typeof _on !== 'undefined') ? _on : true;
    return this;
  }

  /**
   * Free up memory for this OID if we are no longer using this
   */
  free () {
    delete oidDef[this.pgClient.database];
  }

  async end () {
    await this.pgClient.end();
  }

  // ----------------------

  async queryR (sql, params) {
    const rs = await this.query(sql, params, false);
    return rs;
  }

  /**
   * Run an arbitary SQL statement
   * @param {*} sql
   * @param {*} params
   * @param {*} fixParams
   */
  async query (sql, params, fixParams = true, rowMode = null) {
    sql = sql.trim();

    this.lastStmt = {
      sql: fixParams ? this.fixPreparedMarkers(sql) : sql,
      vals: params
    };

    if (this.logStat) {
      const params = (typeof this.lastStmt.vals === 'undefined' || this.lastStmt.vals == null || this.lastStmt.vals.length === 0) ? '' : `\r\n\r\nParams_____\r\n${this.lastStmt.vals}`;
      console.log(`SQL________\r\n${this.lastStmt.sql}${params}`);
    }

    try {
      const params = {
        text: this.lastStmt.sql,
        values: this.lastStmt.vals
      };
      if (rowMode != null) {
        params.rowMode = rowMode;
      }

      const qResult = await this.pgClient.query(params);
      return qResult;
    } catch (e) {
      const ne = new Error(e);
      ne.code = e.code;
      ne.lastStmt = this.lastStmt;
      throw ne;
    }
  }

  /**
   * Return back the first row, null if no rows
   *
   * @param {*} sql
   * @param {*} params
   */
  async select1 (sql, params) {
    const qAlias = await this.select(sql, params);
    return (qAlias.length > 0) ? qAlias[0] : null;
  }

  /**
   * Execute SELECT statement, and aliases up the columns with the table
   *
   * @param {*} sql
   * @param {*} params
   */
  async select (sql, params) {
    let qResult = await this.query(sql, params, true, 'array');

    if (qResult.command && qResult.command === 'SELECT') {
      qResult = remapRowsWithAlias(this.pgClient.database, qResult);
      return ('rows' in qResult) ? qResult.rows : [];
    } else {
      return qResult.rows;
    }
  }

  /**
   * Create and build the INSERT
   *
   * @param {*} table
   * @param {*} tableData
   */
  async insertIgnoreDuplicate (schemaTable, tableData) {
    const r = await this.insert(schemaTable, tableData, true);
    return r;
  }

  async insert (schemaTable, tableData, ignoreDuplicate = false) {
    const schema = schemaTable.split('.')[0];
    if (!(schema in schemaDef)) {
      throw new Error(`[-] ${schema} is not loaded`);
    }

    const table = schemaTable.split('.')[1];
    const tableDef = schemaDef[schema].getTable(schema, table);
    if (tableDef == null) {
      throw new Error(`[-] Unknown table ${schema}.${table}`);
    }

    const insertData = this.getData(tableDef, table, tableData);

    // check for required fields
    for (const col in tableDef.cols) {
      if (tableDef.cols[col].bReq && !(col in insertData)) {
        throw new Error(`[-] ${table}.${col}; required`);
      }
    }

    const vals = [];
    const sqlCols = [];
    const sqlVals = [];

    for (const col in insertData) {
      sqlCols.push(col);
      sqlVals.push(`$${sqlVals.length + 1}`);
      vals.push(insertData[col]);
    }

    let sql = `INSERT INTO ${schema}.${table} (${sqlCols.join(',')}) VALUES (${sqlVals.join(',')})`;
    sql += (ignoreDuplicate) ? ' ON CONFLICT DO NOTHING' : '';
    sql += (tableDef.keys.length > 0) ? ` RETURNING ${tableDef.keys.join(',')}` : '';

    const qResult = await this.query(sql, vals);
    return this.transformInsertReturn(tableDef, qResult);
  }

  /**
   * Create and build the UPDATE
   *
   * @param {*} schemaTable
   * @param {*} tableData
   */
  async update (schemaTable, tableData) {
    const schema = schemaTable.split('.')[0];
    if (!(schema in schemaDef)) {
      throw new Error(`[-] ${schema} is not loaded`);
    }

    const table = schemaTable.split('.')[1];
    const tableDef = schemaDef[schema].getTable(schema, table);
    if (tableDef == null) {
      throw new Error(`[-] Unknown table ${schema}.${table}`);
    }

    const updateData = this.getData(tableDef, table, tableData);

    // check for a primary key
    let priKeyCt = 0;
    for (const col of tableDef.keys) {
      if (col in updateData) {
        priKeyCt += 1;
      }
    }

    if (priKeyCt === 0) {
      throw new Error(`[-] ${schema}.${table} missing primary ${tableDef.keys}`);
    }

    const sqlSet = [];
    const sqlWhere = [];
    const vals = [];
    let pos = 0;

    // basic values
    for (const col in updateData) {
      if (col in tableDef.cols && !tableDef.keys.includes(col)) {
        pos = pos + 1;
        sqlSet.push(`${col}=$${pos}`);
        vals.push(updateData[col]);
      }
    }

    // basic values
    for (const col in updateData) {
      if (tableDef.keys.includes(col) && col in tableDef.cols) {
        pos = pos + 1;
        sqlWhere.push(`${col}=$${pos}`);
        vals.push(updateData[col]);
      }
    }

    const sql = `UPDATE ${schema}.${table} SET ${sqlSet.join(',')} WHERE ${sqlWhere.join(' AND ')}`;
    const qResult = await this.query(sql, vals);
    return transformUpdateReturn(qResult);
  }
};

// ------------------------------

function transformUpdateReturn (qResult) {
  return 'rowCount' in qResult ? qResult.rowCount : qResult;
}

// ------------------------------

function remapRowsWithAlias (database, qResult) {
  if (!(database in oidDef)) {
    return qResult;
  }

  // Check to see if we have named fields
  let nonFields = 0;
  for (const field of qResult.fields) {
    if (field.tableID === 0) {
      nonFields++;
    }
  }

  if (nonFields === qResult.fields.length) {
    return qResult;
  }

  // Determine the fieldnames
  const oidLookup = oidDef[database];

  const fieldNames = [];
  for (const field of qResult.fields) {
    if (field.tableID > 0) {
      const tableInfo = oidLookup.getTableFromOid(field.tableID);
      if (tableInfo != null) {
        fieldNames.push(`${tableInfo.table}.${field.name}`);
      } else {
        fieldNames.push(field.name);
      }
    } else {
      fieldNames.push(field.name);
    }
  }

  // Run around the rows creating the alias
  const rows = [];
  for (const row of qResult.rows) {
    const nRow = {};
    for (let c = 0; c < row.length; c++) {
      nRow[fieldNames[c]] = row[c];
    }
    rows.push(nRow);
  }

  qResult.rows = rows;
  delete qResult.fields;
  return qResult;
}
