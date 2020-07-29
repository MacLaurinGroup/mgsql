# mgsql

A simple set of SQL utilities for managing and building SQL statements for both Postgresql and MySQL, trying to normalize
as much of the differences as possible.


## API

```
const mgsql = require('mgsql');

const dbConn = mgsql.mysql( mysqlConnect );

// Throw an error if any of the fields match
mgsql.assert.forMissing( data, 'field1,field2' );
mgsql.assert.forMissing( data, ['field1','field2'] );          <-- accepts array-of-strings, or csv of strings
mgsql.assert.forEmptyOrNull( data, 'field1,field2' );
mgsql.assert.forEmptyOrNullOrMissing( data, 'field1,field2' );

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
dbConn.insertIgnoreDuplicate( 'schema1.table1', {} );   // return the ID

// UPDATE
dbConn.update( 'schema1.table1', {} );   // return the rows updated

// Logging the SQL/Values
dbConn.log();
dbConn.update( 'schema1.table1', {} );   // return the rows updated
dbConn.log(false);
dbConn.update( 'schema1.table1', {} );   // return the rows updated

dbConn.removeNull(true|false);    // Remove any keys that are null
dbConn.removeErrantPeriod();      // Remove the period on any keys that start with .


// Builder helpers
dbConn.run( ..builder.. )
dbConn.runWithCount( ..builder.. )
dbConn.runWithCountDistinct( ..builder.. )
```

## .insert() / .update()

These are special methods as they will do a schema lookup on the database for the given table and do checking to make sure
you have all the right columns, with the right data types and have not missed any required fields.  The database table
definition drives the validation check here.

This metadata is cached so the overhead is not incurred on each one.  A 'nice' error message is returned detailing the column
that is wrong and the reason it failed.  It will auto marshall date objects.



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
  async .run()  <- Return the rows from the INSERT
```


## Builder UPDATE

```
const mgsql = require('mgsql');
const dbConn = mgsql.postgresql( pgConnect );

await dbConn.run(
  dbConn.buildUpdate()
    .table('global.table')
    .column('a=?',2)     <- value is optional
    .column('b=?',2)
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
    .log()
    .removeNull()
    .removeErrantPeriod()
    .select('t1.col1, t2.col1')
    .selectConcat('t3.col2)
    .from('global.table1 as t1')
    .from('global.table2 as t2')
    .from({
      "left" : "global.table3 as t3",
      "join" : [
        {
        "type" : "left",                    <- left (default), left outer, right, right outer, inner
        "right" : "global.table2 as tt2",
        "where" : "t3.id = tt2.id"
        }
      ]
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
  .log()                    <- Log the SQL to the console
  .removeNull()             <- Remove any keys that are null
  .removeErrantPeriod()     <- Remove the period on any keys that start with .
  .removeKeys(..)           <- Remove the keys from the result payload

  async .run()              <- Return rows
```

There is support for the popular JavaScript DataTables control, with the query block it generates and passes to the server.

```
        .dataTable(query [, maxItems])    <- Optional maxItems to limit the total rows no matter the query.length
  async .runWithCount(distinct)           <- Return the count with the rows
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
    "columnName" : "value"  <- the value of the column to do a '='; if an array, will be a IN
  },
  notequals: {
    "columnName" : "value"  <- the value of the column to do a '!='; if an array, will be a NOT IN
  },
  range: {
    "columnName" : {
      "f": value   <- the value >=
      "t": value   <- the value for <=
    }  
  }
}
```

For columns that have a . (period) in them, to maintain that, datatables wants them escaped.  So in the JS defintion, "t1.id" is defined "t1\\\\.id"

## Postgres

Given the way Postgresql works with aliasing, this library, for all ```.select/.select1``` calls, will convert the columns return in the rows with a full
aliased name (```<table>.<column>```).

Prepared paremeters are marked using ?

## ToDo

* MySQL side of the fence

## Release

* 2020-07-29:
  * Support for array, and notequals
* 2020-07-21:
  * fixed dataTable maxItems
* 2020-07-10:
  * added .insertIgnoreDuplicate
* 2020-07-08:
  * added .range to the dataTable support
* 2020-06-29:
  * added resetAll() on builder patterns
* 2020-06-10:
  * added .log() / .removeNull() / .removeErrantPeriod() to builders
  * fixed the join syntax
* 2020-06-09:
  * SELECT/INSERT/UPDATE Builder helpers
  * Auto ? -> $1
* 2020-06-01:
  * Cleaner interpretation of select/select1/query
* 2020-05-26:
  * Initial release