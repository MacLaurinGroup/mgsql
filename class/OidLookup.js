module.exports = class OidLookup {
  constructor (schema) {
    this.schemaList = schema.replace(' ', '').split(',');
    this.oidTable = {};
  }

  getTableFromOid (oid) {
    return oid in this.oidTable ? this.oidTable[oid] : null;
  }

  // ----------------------

  async load (dbConn) {
    // Read the OID mappings
    const oRes = await dbConn.query(`SELECT tablename, schemaname, oid FROM pg_tables as pt,pg_class as pc WHERE pc.relname=pt.tablename AND schemaname IN ('${this.schemaList.join('\',\'')}')`);
    for (const row of oRes.rows) {
      this.oidTable[row.oid] = {
        schema: row.schemaname,
        table: row.tablename
      };
    }

    delete this.schemaList;
  }
}
;
