/**
 * Basic methods for cleaning data
 *
 * (c) 2020 https://maclaurin.group/
 */

module.exports = class clean {
  forSetDefaults (data, dataDefaults) {
    for (const field in dataDefaults) {
      if (!(field in data)) {
        data[field] = dataDefaults[field];
      }
    }
    return data;
  }

  forOnlyAZaz09 (data, fields) {
    fields = this._toArray(fields);
    for (const field of fields) {
      if (field in data && data[field] != null) {
        data[field] = data[field].toString().trim();
        data[field] = data[field].replace(/[^a-zA-Z0-9,.;:#/&%$!+=*()[\]\- ]/g, '');
      }
    }
    return this;
  }

  forBlankToNull (data, fields) {
    fields = this._toArray(fields);
    for (const field of fields) {
      if (field in data && data[field] != null && data[field].toString().trim() === '') {
        data[field] = null;
      }
    }
    return this;
  }

  _toArray (fields) {
    if (Array.isArray(fields)) {
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
