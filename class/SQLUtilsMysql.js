/**
 * MySQL
 *
 * (c) 2020 https://maclaurin.group/
 */
module.exports = class SQLUtilsMysql extends require('./sqlBaseAbstract') {
  /**
   * Load the table defintion if it is not already available
   *
   * @param {*} dbConn
   * @param {*} table
   */
  async __getTableMetadata (dbConn, table) {
    if (this.dbDefinition.hasTable(table)) {
      return this.dbDefinition.getTable(table);
    }

    try {
      const rows = await dbConn.query('desc `' + table + '`');
      const desc = {
        keys: [],
        columns: {}
      };

      for (const row of rows) {
        const field = {
          name: row.Field,
          dataType: (row.Type.includes('(')) ? row.Type.substring(0, row.Type.indexOf('(')) : row.Type,
          allowNull: (row.Null === 'YES'),
          autoKeyGen: false,
          values: null,
          keyType: null,
          hasDefault: false,
          len: 0
        };

        if (row.Key === 'PRI' || row.Key === 'MUL') {
          field.keyType = row.Key;
          if (row.Key === 'PRI') {
            desc.keys.push(row.Field);
            if (row.Extra === 'auto_increment') {
              field.autoKeyGen = true;
            }
          }
        }

        if (field.type === 'enum') {
          field.values = row.Type.substring(row.Type.indexOf('(') + 1, row.Type.indexOf(')')).trim().replace(/'/g, '').split(',');
        } else if (field.type === 'int' || field.type === 'smallint' || field.type === 'varchar' || field.type === 'char' || field.type === 'tinyint') {
          field.len = Number(row.Type.substring(row.Type.indexOf('(') + 1, row.Type.indexOf(')')));
        }

        desc.columns[row.Field] = field;
      }

      this.dbDefinition.setTable(table, desc);
      return desc;
    } catch (e) {
      console.log(e);
      throw e;
    }
  }
};
