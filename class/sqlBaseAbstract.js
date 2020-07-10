/**
 * Base class for the sqlbase
 *
 * (c) 2020 https://maclaurin.group/
 */

const _ = require('underscore');
const SQLSelectBuilder = require('./sqlSelectBuilder');
const SQLInsertBuilder = require('./sqlInsertBuilder');
const SQLUpdateBuilder = require('./sqlUpdateBuilder');

module.exports = class sqlBaseAbstract {
  constructor (dbDefinition, dbConn) {
    this.dbDefinition = dbDefinition;
    this.dbConn = dbConn;
    this.lastStmt = null;
    this.logStat = false;
    this.filterNull = false;
    this.filterErantPeriod = false;
    this.filterKeys = null;
    this.buildSelectObj = null;
    this.buildInsertObj = null;
    this.buildUpdatetObj = null;
  }

  // ----------------------------------------

  async run (builderObj) {
    if (typeof builderObj === 'undefined') {
      throw new Error('[-] Missing Builder');
    } else if (builderObj === this.buildUpdatetObj || builderObj === this.buildInsertObj || builderObj === this.buildSelectObj) {
      const r = await builderObj.run();
      return r;
    } else {
      throw new Error('[-] Builder not presented');
    }
  }

  async runWithCount (builderObj) {
    if (typeof builderObj === 'undefined') {
      throw new Error('[-] Missing Builder');
    } else if (builderObj === this.buildSelectObj) {
      const r = await builderObj.runWithCount();
      return r;
    } else {
      throw new Error('[-] Builder not presented');
    }
  }

  async runWithCountDistinct (builderObj) {
    if (typeof builderObj === 'undefined') {
      throw new Error('[-] Missing Builder');
    } else if (builderObj === this.buildSelectObj) {
      const r = await builderObj.runWithCount(true);
      return r;
    } else {
      throw new Error('[-] Builder not presented');
    }
  }

  buildSelect () {
    if (this.buildSelectObj == null) {
      this.buildSelectObj = new SQLSelectBuilder(this);
    }
    return this.buildSelectObj.resetAll();
  }

  buildInsert () {
    if (this.buildInsertObj == null) {
      this.buildInsertObj = new SQLInsertBuilder(this);
    }
    return this.buildInsertObj.resetAll();
  }

  buildUpdate () {
    if (this.buildUpdatetObj == null) {
      this.buildUpdatetObj = new SQLUpdateBuilder(this);
    }
    return this.buildUpdatetObj.resetAll();
  }

  // ----------------------------------------

  log (_on) {
    this.logStat = (typeof _on !== 'undefined') ? _on : true;
    return this;
  }

  removeKeys (fields) {
    this.filterKeys = {};

    if (_.isArray(fields)) {
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

  removeNull (_on) {
    this.filterNull = (typeof _on !== 'undefined') ? _on : true;
    return this;
  }

  removeErrantPeriod (_on) {
    this.filterErantPeriod = (typeof _on !== 'undefined') ? _on : true;
    return this;
  }

  async end () {
    await this.dbConn.end();
  }

  // ---------------------------------------------------------

  async query (sql, params) {
    this.lastStmt = {
      sql: sql.trim(),
      vals: params
    };

    if (this.logStat) {
      console.log(`SQL________\r\n${this.lastStmt.sql}\r\n\r\nValues_____\r\n${this.lastStmt.vals}`);
    }

    const qResult = await this.dbConn.query(this.lastStmt.sql, this.lastStmt.vals);
    return qResult;
  }

  // ---------------------------------------------------------

  async queryR (sql, params) {
    this.lastStmt = {
      sql: sql.trim(),
      vals: params
    };

    if (this.logStat) {
      console.log(`SQL________\r\n${this.lastStmt.sql}\r\n\r\nValues_____\r\n${this.lastStmt.vals}`);
    }

    const qResult = await this.dbConn.query(this.lastStmt.sql, this.lastStmt.vals);
    return qResult;
  }

  async queryStmt () {
    const qResult = await this.query(this.lastStmt.sql, this.lastStmt.vals);
    return qResult;
  }

  // ---------------------------------------------------------

  /**
   * Return back the rows
   *
   * @param {*} sql
   * @param {*} params
   */
  async select (sql, params) {
    this.lastStmt = {
      sql: sql,
      vals: params
    };

    const qResult = await this.query(this.lastStmt.sql, this.lastStmt.vals);
    const qAlias = this.__parseSelectReturn(qResult);
    return qAlias;
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

  // ---------------------------------------------------------

  async insert (table, tableData) {
    const tableDef = await this.__getTableMetadata(table);
    const insertData = this._checkData(tableDef, table, tableData);

    // check for required fields
    for (const col in tableDef.columns) {
      if (!_.has(insertData, col) && tableDef.columns[col].bRequired) {
        throw new Error(`[-] Field=${col}; required column missing`);
      }
    }

    this.lastStmt = this.__sqlInsert(tableDef, table, insertData, false);
    const qResult = await this.queryStmt();
    return this.__parseInsertReturn(tableDef, qResult);
  }

  // ---------------------------------------------------------

  async insertIgnoreDuplicate (table, tableData) {
    const tableDef = await this.__getTableMetadata(table);
    const insertData = this._checkData(tableDef, table, tableData);

    // check for required fields
    for (const col in tableDef.columns) {
      if (!_.has(insertData, col) && tableDef.columns[col].bRequired) {
        throw new Error(`[-] Field=${col}; required column missing`);
      }
    }

    this.lastStmt = this.__sqlInsert(tableDef, table, insertData, true);
    const qResult = await this.queryStmt();
    return this.__parseInsertReturn(tableDef, qResult);
  }

  // ---------------------------------------------------------

  async update (table, tableData) {
    const tableDef = await this.__getTableMetadata(table);
    const updateData = this._checkData(tableDef, table, tableData);

    // check for a primary key
    let priKeyCt = 0;
    for (const col of tableDef.keys) {
      if (_.has(updateData, col)) {
        priKeyCt += 1;
      }
    }

    if (priKeyCt === 0) {
      throw new Error('[-] Missing a primary key');
    }

    this.lastStmt = this.__sqlUpdate(tableDef, table, updateData);
    const qResult = await this.queryStmt();
    return this.__parseUpdateReturn(tableDef, qResult);
  }

  // ---------------------------------------------------------

  createInsert (table, columns, ignoreDuplicate) {
    throw new Error('[-] not implemented');
  }

  __parseInsertReturn (tableDef, qResult) {
    return qResult;
  }

  __parseUpdateReturn (tableDef, qResult) {
    return qResult;
  }

  __parseSelectReturn (qResult) {
    return qResult;
  }

  __sqlInsert (tableDef, table, tableData, ignoreDuplicate) {
    throw new Error('not supported');
  }

  __sqlUpdate (tableDef, table, tableData) {
    throw new Error('not supported');
  }

  async __getTableMetadata (table) {
    throw new Error('not implemented');
  }

  // ---------------------------------------------------------

  __sqlSelectWhere (where, values) {
    return where;
  }

  __sqlSelectLimit (pageSize, page) {
    throw new Error('not implemented');
  }

  // ---------------------------------------------------------

  _checkData (tableDef, table, tableData) {
    const data = {};
    const tableParts = table.split('.');

    if (tableParts.length === 2) {
      table = tableParts[1];
    }

    for (const col in tableData) {
      const colName = col.startsWith(table + '.') ? col.split('.')[1] : col;

      // if the column is not part of this table; then continue
      if (!_.has(tableDef.columns, colName)) {
        continue;
      }

      const fieldDef = tableDef.columns[colName];

      // Determine the handling for null
      if (tableData[col] == null) {
        if (!fieldDef.allowNull) {
          throw new Error(`[-] Field=${fieldDef.name}; value was null`);
        } else {
          data[colName] = null;
        }
        continue;
      }

      // for fields that are not null; make sure they are good
      if (fieldDef.dataType === 'varchar' || fieldDef.dataType === 'char' || fieldDef.dataType === 'text') {
        if (!_.isString(tableData[col])) {
          data[colName] = tableData[col] + '';
        } else {
          data[colName] = tableData[col].trim();
        }

        if (fieldDef.len > 0 && data[colName].length > fieldDef.len) {
          throw new Error(`[-] Field=${fieldDef.name}; was longer than ${fieldDef.len}`);
        }
      } else if (fieldDef.dataType === 'int' || fieldDef.dataType === 'smallint' || fieldDef.dataType === 'tinyint') {
        if (_.isNaN(tableData[col])) {
          throw new Error(`[-] Field=${fieldDef.name}; value was not a number`);
        } else {
          data[colName] = Number(tableData[col]);
          if (data[colName] > fieldDef.len) {
            throw new Error(`[-] Field=${fieldDef.name}; value > ${fieldDef.len}`);
          }
        }
      } else if (fieldDef.dataType === 'boolean') {
        if (tableData[col] === true || tableData[col] === 1) {
          data[colName] = true;
        } else if (_.isString(tableData[col]) && (tableData[col].toLowerCase().startsWith('y') || tableData[col].toLowerCase().startsWith('t'))) {
          data[colName] = true;
        } else {
          data[colName] = false;
        }
      } else if (fieldDef.dataType === 'date') {
        if (_.isDate(tableData[col])) {
          data[colName] = tableData[col];
        } else if (_.isString(tableData[col])) {
          data[colName] = this._parseDate(fieldDef.name, tableData[col].split('-'));
        }
      } else if (fieldDef.dataType === 'datetime' || fieldDef.dataType === 'timestamp') {
        if (_.isDate(tableData[col])) {
          data[colName] = tableData[col];
        } else if (_.isString(tableData[col])) {
          data[colName] = new Date(tableData[col]);
        }
      } else if (fieldDef.dataType === 'enum') {
        if (_.indexOf(fieldDef.values, tableData[col]) === -1) {
          throw new Error(`[-] Field=${fieldDef.name}; invalid value [${tableData[col]}]`);
        } else {
          data[colName] = tableData[col];
        }
      } else {
        // default handling, just set the field
        data[colName] = tableData[col];
      }
    }

    // Make sure we have at least some columns
    if (Object.keys(data).length === 0) {
      throw new Error('No columns found for operation');
    }

    return data;
  }

  /**
   * Creates a date object from the parts passed
   * @param {*} column
   * @param {*} parts
   */
  _parseDate (column, parts) {
    if (parts.length !== 3) {
      throw new Error(`[-] Field=${column}; invalid date (yyyy-mm-dd)`);
    }

    const thisDate = new Date();
    thisDate.setHours(0);
    thisDate.setMinutes(0);
    thisDate.setSeconds(0);
    thisDate.setMilliseconds(0);

    let v = parts[0] * 1;
    if (_.isNaN(v) || v < 0 || v > 2100) {
      throw new Error(`[-] Field=${column}; invalid year ${parts[0]}`);
    }
    thisDate.setFullYear(v);

    v = parts[1] * 1;
    if (_.isNaN(v) || v < 1 || v > 12) {
      throw new Error(`[-] Field=${column}; invalid month ${parts[1]}`);
    }
    thisDate.setMonth(v - 1);

    v = parts[2] * 1;
    if (_.isNaN(v) || v < 0 || v > 31) {
      throw new Error(`[-] Field=${column}; invalid day ${parts[2]}`);
    }

    thisDate.setDate(v);
    return thisDate;
  }
};
