# mgsql

Set of SQL utilities for managing and building SQL statements for both Postgresql and MySQL


## API

```
const mgsql = require('mgsql');

const dbConn = mgsql.mysql( mysqlConnect );

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
dbConn.queryR( 'SELECT * FROM TABLE', [] );   // return []

// With auto ? -> $1 for postgres
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

// Builder helpers
dbConn.run( ..builder.. )
dbConn.runWithCount( ..builder.. )
dbConn.runWithCountDistinct( ..builder.. )
```


## Builder INSERT

```
const mgsql = require('mgsql');
const dbConn = mgsql.postgresql( pgConnect );

await dbConn.run(
  dbConn.buildInsert()
    .table('global.table')
    .column('a',2)
    .column('b',3)
    .column('c',3)
    .ignoreDuplicate()
  )
)
```

Supporting methods for re-use

```
  .reset()      <- reset the columns/values; ignoreDuplicate flag

  .toSql()      <- returns the prepared SQL statement
  async .run()  <- Return the ID if autogenerate
```


## Builder UPDATE

```
const mgsql = require('mgsql');
const dbConn = mgsql.postgresql( pgConnect );

await dbConn.run(
  dbConn.buildUpdate()
    .table('global.table')
    .setColumn('a=?',2)     <- value is optional
    .setColumn('b=?',2)
    .where('c=?',3)
  )
)
```

Supporting methods for re-use

```
  .reset()                      <- reset the columns/values

  .toSql(ignoreDuplicates)      <- returns the prepared SQL statement
  async .run(ignoreDuplicates)  <- Return the number of rows updated
```


## Builder SELECT

```
const mgsql = require('mgsql');
const dbConn = mgsql.postgresql( pgConnect );

await dbConn.run(
  dbConn.buildSelect()
    .select('t1.col1, t2.col1')
    .from('global.table1 as t1')
    .from('global.table2 as t2')
    .from({
      "left" : "global.table3 as t3",
      "right" : "global.table2 as tt2",
      "where" : "t3.id = tt2.id"
    })
    .where('t1.id > ?', [3])
    .whereOr('t2.id != 0')
    .groupBy('')
    .orderBy('t2.id asc)
    .limit(10, 2)                           <- pageSize [, pageNo]
);

```

Supporting methods for re-use

```
  .selectReset()
  .whereReset()
  .selectGroupBy()
  .groupByReset()
  .orderByReset()
  .limitReset()

  .toSql()                  <- returns the prepared SQL statement
  .toCountSql(distinct)     <- Run a count (with optional distinct)

  async .run()      <- Return the count with the rows
```

There is support for the popular JavaScript DataTables control, with the query block it generates and passes to the server.

```
        .dataTable(query)
  async .runWithCount(distinct)   <- Return the count with the rows
```

where query is of the following structure

```
{
  start : 0,                <- where to start from
  length: 10,               <- length to pull back
  selectColumns : ""        <- comma separated of columns that are to be turned; overrides columns
  columns:[
    {
      data: ""              <- name of the column
      searchable: "true",   <- if this column is searchable
      orderable: "true",    <- if this column can be orderable
    }
  ],
  order:[
    {
      column: 2,            <- the index into 'columns' of the column to order by
      dir: "desc|asc"       <- the direction
    }
  ],
  search: {
    "value" : "value"       <- the value of the column to do a 'LIKE' against
  },
  equals: {
    "columnName" : "value"  <- the value of the column to do a '=' 
  }
}
```

For columns that have a . (period) in them, to maintain that, datatables wants them escaped.  So in the JS defintion, "t1.id" is defined "t1\\.id"

## Postgres

Given the way Postgresql works with aliasing, this library, for all ```.select/.select1``` calls, will convert the columns return in the rows with a full
aliased name (```<table>.<column>```).

Prepared paremeters are marked using ?

## ToDo

* MySQL side of the fence

## Release

* 2020-06-09:
  * SELECT/INSERT/UPDATE Builder helpers
  * Auto ? -> $1
* 2020-06-01:
  * Cleaner interpretation of select/select1/query
* 2020-05-26:
  * Initial release