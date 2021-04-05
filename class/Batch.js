/**
 * For a given file, executes a sequence of events
 * @param {*} filename
 * @param {*} options
 */

const fs = require('fs');
const readline = require('readline');
const Mustache = require('mustache');

module.exports.execute = async function (dbConn, filename, options) {
  options = (typeof options !== 'undefined') ? options : {};
  const delimiter = (typeof options.delimiter !== 'undefined') ? options.delimiter : '';
  delete options.delimiter;

  await doFile(dbConn, filename, options, delimiter);
};

// -------------------------

async function doFile (dbConn, filename, options, delimiter) {
  const promise = new Promise(function (resolve, reject) {
    const rl = readline.createInterface({
      input: fs.createReadStream(filename),
      terminal: false
    });

    const statements = [];
    let stmtBlock = '';

    rl.on('line', function (chunk) {
      const line = chunk.toString('ascii').trim();
      if (line.length === 0 || line.startsWith('//')) {
        return;
      }

      if (delimiter === 'per-line') {
        statements.push(line);
      } else {
        if (line.endsWith(delimiter) || delimiter.length === 0) {
          stmtBlock += line + '\r\n';
          statements.push(stmtBlock);
          stmtBlock = '';
        } else {
          stmtBlock += line + '\r\n';
        }
      }
    });

    rl.on('close', function () {
      if (stmtBlock.length > 0) {
        statements.push(stmtBlock);
      }
      resolve(statements);
    });
  });

  let stArray;
  await promise.then((statements) => {
    stArray = statements;
  });

  // Run around the statements and execute
  for (const stmt of stArray) {
    await executeStatement(dbConn, options, stmt);
  }
}

// -------------------------

async function executeStatement (dbConn, options, stmt) {
  if (stmt.trim() === '') {
    return;
  }

  if (Object.keys(options).length > 0) {
    stmt = Mustache.render(stmt, options);
  }

  await dbConn.query(stmt);
}
