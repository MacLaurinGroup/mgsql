module.exports = class Definition {
  constructor (schema) {
    this.schemaList = schema.replace(' ', '').split(',');
    this.schema = {};
  }

  getTable (schema, table) {
    return (schema in this.schema && table in this.schema[schema]) ? this.schema[schema][table] : null;
  }

  async load (dbConn) {
    // Read the columns
    const rowCols = await dbConn.query(`SELECT table_schema,column_name,table_name,data_type,is_nullable,column_default,numeric_precision,identity_generation,character_maximum_length FROM information_schema.COLUMNS WHERE table_schema IN ('${this.schemaList.join('\',\'')}') ORDER BY table_name, ordinal_position`);
    for (const row of rowCols.rows) {
      if (!(row.table_schema in this.schema)) {
        this.schema[row.table_schema] = {};
      }

      if (!(row.table_name in this.schema[row.table_schema])) {
        this.schema[row.table_schema][row.table_name] = {
          cols: {},
          keys: []
        };
      }

      const field = {
        dT: getDataType(row.data_type),
        aN: (row.is_nullable === 'YES'),
        aK: false,
        bDef: (row.column_default != null),
        bReq: row.column_default == null && row.is_nullable === 'NO',
        len: (row.numeric_precision != null) ? (2 ** row.numeric_precision) : null
      };

      if (row.identity_generation === 'ALWAYS' || row.identity_generation === 'BY DEFAULT') {
        field.aK = true;
        field.bReq = false;
      }

      if (row.character_maximum_length != null) {
        field.len = row.character_maximum_length;
      }

      if (field.len == null) {
        delete field.len;
      }

      this.schema[row.table_schema][row.table_name].cols[row.column_name] = field;
    }

    // Read the keys
    const qRes = await dbConn.query('SELECT a.attname, format_type(a.atttypid, a.atttypmod) AS data_type, indrelid::regclass FROM pg_index i JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey) WHERE i.indisprimary');
    for (const row of qRes.rows) {
      const schema = row.indrelid.split('.')[0];

      if (this.schemaList.includes(schema)) {
        const table = row.indrelid.split('.')[1];

        if (table in this.schema[schema]) {
          this.schema[schema][table].keys.push(row.attname);
          this.schema[schema][table].cols[row.attname].keyType = getDataType(row.data_type);
        }
      }
    }

    delete this.schemaList;
  }
}
;

// ------------------------------------

function getDataType (pgDataType) {
  if (pgDataType === 'integer') {
    return 'int';
  } else if (pgDataType.startsWith('timestamp')) {
    return 'timestamp';
  } else if (pgDataType.startsWith('character varying')) {
    return 'varchar';
  } else if (pgDataType === 'USER-DEFINED') {
    return 'enum';
  } else {
    return pgDataType;
  }
}
