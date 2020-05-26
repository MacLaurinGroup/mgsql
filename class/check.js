/**
 * Basic methods for checking data
 *
 * (c) 2020 https://maclaurin.group/
 */

const _ = require('underscore');

module.exports = class check {
  forMissing (data, fields) {
    fields = this._toArray(fields);
    for (const field of fields) {
      if (!_.has(data, field)) {
        throw new Error(field + ' was missing');
      }
    }
    return this;
  }

  forEmptyOrNull (data, fields) {
    fields = this._toArray(fields);
    for (const field of fields) {
      if (_.has(data, field) && (data[field] == null || data[field].toString().trim() === '')) {
        throw new Error(field + ' was empty');
      }
    }
    return this;
  }

  forEmptyOrNullOrMissing (data, fields) {
    fields = this._toArray(fields);
    for (const field of fields) {
      if (!_.has(data, field)) {
        throw new Error(field + ' was missing');
      } else if (data[field] == null || data[field].toString().trim() === '') {
        throw new Error(field + ' was empty');
      }
    }
    return this;
  }

  _toArray (fields) {
    if (_.isArray(fields)) {
      return fields;
    } else {
      const fieldArr = fields.split(',');
      for (let x = 0; x < fieldArr.length; x++) {
        fieldArr[x] = fieldArr[x].trim();
      }
      return fieldArr;
    }
  }
};
