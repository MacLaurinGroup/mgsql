/**
 * Base class for the sqlbase
 *
 * (c) 2020 https://maclaurin.group/
 */

module.exports = class selectClass extends require('./sqlBaseAbstract') {
  constructor (table) {
    super(table, 'SELECT');
  }
};
