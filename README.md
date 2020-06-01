# mgsql

Set of SQL utilities for managing and building SQL statements for both Postgresql and MySQL


## API

```
const mgsql = require('mgsql');

const dbConn = mysql.mysql( mysqlConnect );

// Throw an error if any of the fields match
mgsql.check.forMissing( data, 'field1,field2' );
mgsql.check.forEmptyOrNull( data, 'field1,field2' );
mgsql.check.forEmptyOrNullOrMissing( data, 'field1,field2' );

// Change the data for the given method signature
mgsql.clean.forOnlyAZaz09( data, 'field1,field2' );
mgsql.clean.forBlankToNull( data, 'field1,field2' );
mgsql.clean.forSetDefaults( data, {field1:value2} );

// query; basic straight through to the underlying driver; returns back the driver would do
// Postgres for example the .rows is the [] of fields; where as MySQL returns back []
dbConn.query( 'SELECT * FROM TABLE', [] );   // return []

// SELECT, with auto col conversion on return struct to include table names and to return back the [] of rows
dbConn.select( 'SELECT * FROM TABLE', [] );   // return []
dbConn.select1( 'SELECT * FROM TABLE', [] );  // return struct or null

// INSERT
dbConn.insert( 'schema1.table1', {} );   // return the ID

// INSERT
dbConn.update( 'schema1.table1', {} );   // return the rows updated

// Logging the SQL/Values
dbConn.log().update( 'schema1.table1', {} );   // return the rows updated
dbConn.log(false).update( 'schema1.table1', {} );   // return the rows updated
```

## Postgres

Given the way Postgresql works with aliasing, this library, for all ```.select/.select1``` calls, will convert the columns return in the rows with a full
aliased name (```<table>.<column>```)


## Release

* 2020-06-01:
  * Cleaner interpretation of select/select1/query
* 2020-05-26:
  * Initial release