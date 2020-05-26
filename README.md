# mgsql

Set of SQL utilities for managing and building SQL statements for both Postgresql and MySQL


## API

```
const mgsql = require('mgsql');

// Throw an error if any of the fields match
mgsql.check.forMissing( data, 'field1,field2' );
mgsql.check.forEmptyOrNull( data, 'field1,field2' );
mgsql.check.forEmptyOrNullOrMissing( data, 'field1,field2' );

// Change the data for the given method signature
mgsql.clean.forOnlyAZaz09( data, 'field1,field2' );
mgsql.clean.forBlankToNull( data, 'field1,field2' );
mgsql.clean.forSetDefaults( data, {field1:value2} );

// query
mgsql.pg().query( dbConn, 'SELECT * FROM TABLE', [] );   // return []

// SELECT
mgsql.pg().select( dbConn, 'SELECT * FROM TABLE', [] );   // return []
mgsql.pg().select1( dbConn, 'SELECT * FROM TABLE', [] );  // return struct or null

// INSERT
mgsql.pg().insert( dbConn, 'schema1.table1', {} );   // return the ID

// INSERT
mgsql.pg().update( dbConn, 'schema1.table1', {} );   // return the rows updated

// Logging the SQL/Values
mgsql.pg().log().update( dbConn, 'schema1.table1', {} );   // return the rows updated
mgsql.pg().log(false).update( dbConn, 'schema1.table1', {} );   // return the rows updated
```