/**
 * Postgres
 *
 * (c) 2020 https://maclaurin.group/
 */

module.exports = class SQLUtilsPostgresql extends require('./sqlBaseAbstract') {
  /**
   * Converts the ? ->  $1
   * @param {*} sql
   * @param {*} params
   */
  async query (sql, params) {
    return super.query(this.__sqlSelectWhere(sql, params), params);
  }

  //  -------------------------------------

  __createInsert (table, columns, ignoreDuplicate) {
    const preparedList = [];
    for (let x = 0; x < columns.length; x++) {
      preparedList.push('?');
    }

    let genSql = `INSERT INTO ${table} (${columns.join(',')}) VALUES (${preparedList.join(',')})`;
    if (ignoreDuplicate) {
      genSql += ' on conflict do nothing';
    }

    return genSql;
  }

  /**
   * Specific override to let us alias up the columns
   * @param {*} sql
   * @param {*} params
   */
  async select (sql, params) {
    this.lastStmt = {
      sql: this.__sqlSelectWhere(sql, params),
      vals: params
    };

    if (this.logStat) {
      console.log(`SQL________\r\n${this.lastStmt.sql}\r\n\r\nValues_____\r\n${this.lastStmt.vals}`);
    }

    let qResult = await this.dbConn.query({
      text: this.lastStmt.sql,
      values: this.lastStmt.vals,
      rowMode: 'array'
    });

    if (qResult.command && qResult.command === 'SELECT') {
      qResult = await this._remapRowsWithAlias(qResult);
      return this.__parseSelectReturn(qResult);
    } else {
      return qResult.rows;
    }
  }

  /**
   * Builds the UPDATE statement
   * @param {*} tableDef
   * @param {*} table
   * @param {*} tableData
   */
  __sqlUpdate (tableDef, table, tableData) {
    const stmt = {
      sql: null,
      vals: []
    };

    const sqlSet = [];
    const sqlWhere = [];
    let pos = 0;

    // basic values
    for (const col in tableDef.columns) {
      if (!tableDef.keys.includes(col) && col in tableData) {
        sqlSet.push(col + '=$' + (++pos));
        stmt.vals.push(tableData[col]);
      }
    }

    // basic values
    for (const col in tableDef.columns) {
      if (tableDef.keys.includes(col) && col in tableData) {
        sqlWhere.push(col + '=$' + (++pos));
        stmt.vals.push(tableData[col]);
      }
    }

    stmt.sql = `UPDATE ${table} SET ${sqlSet.join(',')} WHERE ${sqlWhere.join(' AND ')}`;
    return stmt;
  }

  /**
   * Takes the ? and turn them into $1, $2
   *
   * @param {*} where
   * @param {*} values
   */
  __sqlSelectWhere (where, values) {
    let indx = 0;

    return where.replace(/\?/gi, function (matched) {
      indx += 1;
      return '$' + indx;
    });
  }

  __sqlSelectLimit (pageSize, page) {
    if (pageSize === -1) {
      return '';
    }

    let s = 'LIMIT ' + pageSize;
    if (page > 0) {
      s += ' OFFSET ' + (page * pageSize);
    }
    return s;
  }

  /**
   * Builds an INSERT statement
   *
   * @param {*} tableDef
   * @param {*} table
   * @param {*} tableData
   * @param {*} ignoreDuplicate
   */
  __sqlInsert (tableDef, table, tableData, ignoreDuplicate) {
    const stmt = {
      sql: null,
      vals: []
    };

    const sqlCols = [];
    const sqlVals = [];

    for (const col in tableData) {
      sqlCols.push(col);
      sqlVals.push('$' + (sqlVals.length + 1));
      stmt.vals.push(tableData[col]);
    }

    stmt.sql = `INSERT INTO ${table} (${sqlCols.join(',')}) VALUES (${sqlVals.join(',')})`;
    if (ignoreDuplicate) {
      stmt.sql += ' ON CONFLICT DO NOTHING';
    }
    if (tableDef.keys.length > 0) {
      stmt.sql += ` RETURNING ${tableDef.keys.join(',')}`;
    }
    return stmt;
  }

  /**
   * Parse the return results
   *
   * @param {*} qResult
   */
  __parseSelectReturn (qResult) {
    if ('rows' in qResult) {
      if (this.filterNull || this.filterErantPeriod || this.filterKeys != null) {
        for (const row of qResult.rows) {
          for (const col in row) {
            if (this.filterNull && row[col] == null) {
              delete row[col];
              continue;
            } else if (this.filterKeys && this.filterKeys[col]) {
              delete row[col];
              continue;
            } else if (this.filterErantPeriod && col.charAt(0) === '.') {
              row[col.substring(1)] = row[col];
              delete row[col];
            }
          }
        }
      }
      return qResult.rows;
    } else {
      return [];
    }
  }

  /**
   * Parse addition information to get the rows effected
   *
   * @param {*} tableDef
   * @param {*} qResult
   */
  __parseUpdateReturn (tableDef, qResult) {
    return 'rowCount' in qResult ? qResult.rowCount : qResult;
  }

  /**
   * Parse additional information to get the autogenerated ID
   * @param {*} tableDef
   * @param {*} qResult
   */
  __parseInsertReturn (tableDef, qResult) {
    if (!('rows' in qResult) || qResult.rows.length === 0) {
      return qResult;
    } else if (tableDef != null && tableDef.keys.length > 0 && 'fields' in qResult) {
      for (const field of qResult.fields) {
        if (field.name === tableDef.keys[0]) {
          return qResult.rows[0][field.name];
        }
      }
    } else if ('rows' in qResult) {
      return qResult.rows;
    }
    return qResult;
  }

  /**
   * Load the table defintion if it is not already available
   *
   * @param {*} dbConn
   * @param {*} table
   */
  async __getTableMetadata (table) {
    if (this.dbDefinition.hasTable(table)) {
      return this.dbDefinition.getTable(table);
    }

    const desc = {
      keys: [],
      columns: {}
    };

    const tableParts = table.split('.');
    let schema = null;
    let qResult = null;

    if (tableParts.length === 2) {
      schema = tableParts[0];
      table = tableParts[1];
      qResult = await this.dbConn.query('SELECT * FROM information_schema.COLUMNS WHERE table_name=$1 and table_schema=$2', [table, schema]);
    } else {
      qResult = await this.dbConn.query('SELECT * FROM information_schema.COLUMNS WHERE table_name=$1', [table]);
    }

    for (const row of qResult.rows) {
      const field = {
        name: row.column_name,
        dataType: this._getDataType(row.data_type),
        allowNull: (row.is_nullable === 'YES'),
        autoKeyGen: false,
        values: null,
        keyType: null,
        hasDefault: (row.column_default != null),
        bRequired: row.column_default == null && row.is_nullable === 'NO',
        len: (row.numeric_precision != null) ? (2 ** row.numeric_precision) : 0
      };

      if (row.identity_generation === 'ALWAYS' || row.identity_generation === 'BY DEFAULT') {
        field.autoKeyGen = true;
        field.bRequired = false;
      }

      if (row.character_maximum_length != null) {
        field.len = row.character_maximum_length;
      }

      desc.columns[row.column_name] = field;
    }

    await this._readKeys(schema, table, desc);
    return desc;
  }

  async _readEnums (schema, name) {
    const qRes = await this.dbConn.query(SQL_ENUM, [schema, name]);
    const vals = [];

    for (const row of qRes.rows) {
      vals.push(row.enum_value);
    }

    return vals;
  }

  async _readKeys (schema, name, desc) {
    const qRes = await this.dbConn.query(SQL_PK, [schema + '.' + name]);
    for (const row of qRes.rows) {
      desc.keys.push(row.attname);
      desc.columns[row.attname].keyType = this._getDataType(row.data_type);
    }
  }

  _getDataType (pgDataType) {
    if (pgDataType === 'integer') {
      return 'int';
    } else if (pgDataType.startsWith('timestamp')) {
      return 'timestamp';
    } else if (pgDataType === 'character varying') {
      return 'varchar';
    } else if (pgDataType === 'USER-DEFINED') {
      return 'enum';
    } else {
      return pgDataType;
    }
  }

  /**
   * Run around the rows in the query, rewriting them with the alias
   * @param {*} dbConn
   * @param {*} qResult
   */
  async _remapRowsWithAlias (qResult) {
    // Grab all the tableId's
    const tableOwner = this.dbConn.connectionParameters.user;
    const tableIdMap = {};

    for (const field of qResult.fields) {
      if (field.tableID > 0 && !(field.tableID in tableIdMap)) {
        tableIdMap[field.tableID] = await this._loadTableFromOid(tableOwner, field.tableID);
      }
    }

    // Make sure we have some tables to alias up
    if (Object.keys(tableIdMap).length === 0) {
      return qResult;
    }

    // Determine the fieldnames
    const fieldNames = [];
    for (const field of qResult.fields) {
      if (field.tableID > 0) {
        const tableName = tableIdMap[field.tableID];
        if (tableName != null) {
          fieldNames.push(tableName + '.' + field.name);
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

  async _loadTableFromOid (tableOwner, tableID) {
    if (this.dbDefinition.hasTableName(tableOwner, tableID)) {
      return this.dbDefinition.getTableName(tableOwner, tableID);
    }

    const qResult = await this.dbConn.query(SQL_TABLEID, [tableID]);
    if (qResult.rows.length === 1) {
      this.dbDefinition.setTableName(tableOwner, tableID, qResult.rows[0].tablename);
      return qResult.rows[0].tablename;
    } else {
      this.dbDefinition.setTableName(tableOwner, tableID, null);
      return null;
    }
  }
};

const SQL_TABLEID = `
select 
  tablename
from 
  pg_tables as pt, 
  pg_class as pc 
where 
  pc.relname=pt.tablename 
  and oid=$1
`;

const SQL_ENUM = `
select 
  e.enumlabel as enum_value 
from pg_type t 
   join pg_enum e on t.oid = e.enumtypid  
   join pg_catalog.pg_namespace n ON n.oid = t.typnamespace
where
  n.nspname = $1 and t.typname = $2`;

const SQL_PK = `
SELECT 
  a.attname, 
  format_type(a.atttypid, a.atttypmod) AS data_type
FROM
  pg_index i
  JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
WHERE
  i.indrelid = $1::regclass
  AND i.indisprimary;
`;
