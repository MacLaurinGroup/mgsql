module.exports = class WrapBase {
  buildInsert () {
    return new (require('./sqlInsertBuilder'))(this);
  }

  buildUpdate () {
    return new (require('./sqlUpdateBuilder'))(this);
  }

  buildSelect () {
    return new (require('./sqlSelectBuilder'))(this);
  }

  /**
   * Executes the builder
   *
   * @param {*} builderObj
   */
  async run (builderObj) {
    if (typeof builderObj === 'undefined') {
      throw new Error('[-] Missing Builder');
    }

    const r = await builderObj.run();
    return r;
  }

  async runWithCount (builderObj) {
    if (typeof builderObj === 'undefined') {
      throw new Error('[-] Missing Builder');
    }

    const r = await builderObj.runWithCount();
    return r;
  }

  async runWithCountDistinct (builderObj) {
    if (typeof builderObj === 'undefined') {
      throw new Error('[-] Missing Builder');
    }

    const r = await builderObj.runWithCount(true);
    return r;
  }

  /**
   * Replaces the ? with %x
   *
   * @param {*} where
   */
  fixPreparedMarkers (sql) {
    let indx = 0;

    return sql.replace(/\?/gi, function (matched) {
      indx += 1;
      return '$' + indx;
    });
  }

  /**
   * Cleans up the data
   *
   * @param {*} tableDef
   * @param {*} table
   * @param {*} tableData
   */
  getData (tableDef, table, tableData) {
    const data = {};

    for (const col in tableData) {
      const colName = col.startsWith(`${table}.`) ? col.split('.')[1] : col;

      // if the column is not part of this table; then continue
      if (!(colName in tableDef.cols)) {
        continue;
      }

      const fieldDef = tableDef.cols[colName];

      // Determine the handling for null
      if (tableData[col] == null) {
        if (!fieldDef.aN) {
          throw new Error(`[-] Table=${table}.${colName}; was null`);
        } else {
          data[colName] = null;
        }
        continue;
      }

      // for fields that are not null; make sure they are good
      if (fieldDef.dT === 'varchar' || fieldDef.dT === 'char' || fieldDef.dT === 'text') {
        if (typeof tableData[col] !== 'string') {
          data[colName] = tableData[col] + '';
        } else {
          data[colName] = tableData[col].trim();
        }

        if (fieldDef.len > 0 && data[colName].length > fieldDef.len) {
          throw new Error(`[-] Table=${table}.${colName}; longer than ${fieldDef.len}`);
        }
      } else if (fieldDef.dT === 'int' || fieldDef.dT === 'smallint' || fieldDef.dT === 'tinyint') {
        if (isNaN(tableData[col])) {
          throw new Error(`[-] Table=${table}.${colName}; not a number`);
        } else if (typeof tableData[col] === 'string' && tableData[col].trim() === '') {
          throw new Error(`[-] Table=${table}.${colName}; not a number`);
        } else {
          data[colName] = Number(tableData[col]);
          if (data[colName] > fieldDef.len) {
            throw new Error(`[-] Table=${table}.${colName}; value > ${fieldDef.len}`);
          }
        }
      } else if (fieldDef.dT === 'boolean') {
        const type = typeof tableData[col];

        if (type === 'boolean' && tableData[col] === true) {
          data[colName] = true;
        } else if (type === 'number' && tableData[col] === 1) {
          data[colName] = true;
        } else if (type === 'string' && (tableData[col].toLowerCase().startsWith('y') || tableData[col].toLowerCase().startsWith('t'))) {
          data[colName] = true;
        } else {
          data[colName] = false;
        }
      } else if (fieldDef.dT === 'date') {
        if (typeof tableData[col].getMonth === 'function') {
          data[colName] = tableData[col];
        } else if (typeof tableData[col] === 'string') {
          data[colName] = this.parseDate(fieldDef.name, tableData[col]);
        } else {
          throw new Error(`[-] Table=${table}.${colName}; not a string or date`);
        }
      } else if (fieldDef.dT === 'datetime' || fieldDef.dT === 'timestamp') {
        if (typeof tableData[col].getMonth === 'function') {
          data[colName] = tableData[col];
        } else if (typeof tableData[col] === 'string') {
          data[colName] = new Date(tableData[col]);
        } else {
          throw new Error(`[-] Table=${table}.${colName}; not a string or date`);
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
   * Creates a date object from the parts passed; attempts a number of different formats
   * @param {*} column
   * @param {*} parts
   */
  parseDate (column, date) {
    date = (date.indexOf('T') !== -1) ? date.substring(0, date.indexOf('T')) : date;

    const parts = date.replace(/\\/g, '-').split('-');
    if (parts.length !== 3) {
      throw new Error(`[-] Column=${column}; invalid date (yyyy-mm-dd)`);
    }

    const year = Number(parts[0]);
    if (isNaN(parts[0]) || year < 0 || year > 2100) {
      throw new Error(`[-] Column=${column}; invalid year ${date} - ${parts[0]}`);
    }
    const month = Number(parts[1]);
    if (isNaN(parts[1]) || month < 1 || month > 12) {
      throw new Error(`[-] Column=${column}; invalid month ${date} - ${parts[1]}`);
    }
    const day = Number(parts[2]);
    if (isNaN(parts[2]) || day < 0 || day > 31) {
      throw new Error(`[-] Column=${column}; invalid month ${date} - ${parts[2]}`);
    }

    return new Date(year, month - 1, day, 0, 0, 0);
  }

  // ------------------------------

  transformInsertReturn (tableDef, qResult) {
    if (!('rows' in qResult) || qResult.rows.length === 0) {
      return null;
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
};
