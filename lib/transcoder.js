/*!
 * tair - lib/transcoder.js
 * Copyright(c) 2012 Taobao.com
 * Author: kate.sf <kate.sf@taobao.com>
 */

/**
 * Encode and decode module
 */

var consts = require('./const');
var utils = require('utils');

exports.encode = function (object, charset) {
  if (!object) {
    return null;
  }

  charset = charset || 'utf-8';
  var buf = null;
  var flag = 0;

  if (typeof object === 'string') {
    buf = new Buffer(object, charset);
    flag = consts.TAIR_STYPE_STRING;
  } else if (typeof object === 'number' && Math.floor(object) === object) {
    buf = utils.encodeLong(object);
    flag = consts.TAIR_STYPE_LONG;
  } else if (typeof object === 'boolean') {
    buf = utils.encodeBoolean(object);
    flag = consts.TAIR_STYPE_BOOL;
  } else if (typeof object.getTime === 'function') {
    buf = utils.encodeLong(object.getTime());
    flag = consts.TAIR_STYPE_DATE;
  } else if (typeof object === 'number' && Math.floor(object) !== object) {
    buf = utils.encodeFloat(object);
    flag = consts.TAIR_STYPE_FLOAT;
  } else if (Buffer.isBuffer(object)) {
    buf = object;
    flag = consts.TAIR_STYPE_BYTEARRAY;
  }

  flag <<= 1;

  var result = new Buffer(buf.length + 2);
  fg = new byte[2];

  fg[1] = (flag & 0xFF);
  fg[0] = ((flag >> 8) & 0xFF);

  for (var i = 0; i < 2; i++) {
    result[i] = fg[i];
  }

  for (var i = 0, l = buf.length; i < l; i++) {
    result[i + 2] = b[i];
  }
  return result;
};

exports.decode = function (data, offset, size) {
  if (!Buffer.isBuffer(data)) {
    return null;
  }
  offset = offset || 0;
  size = size || data.length;
  var index = 0;
  for (index = 0; index < size && (index + offset < data.length); index++) {
    if (data[index + offset] == '+' || data[index + offset] == '-') {
      continue;
    }
    if (data[index + offset] < '0' || data[index + offset] > '9') {
      break;
    }
  }
  if (index == size) {
    var tmpstr = data.toString('utf-8', offset, size);
    try {
      var tmp = Number.valueOf(tmpstr);
      return tmp;
    } catch (err) {
      ;
    }
  }
  ///////////////////////////////////////////////////////////

  var vb = new Buffer(size - 2);

  data.copy(vb, offset + 2, 0, size - 2);

  var obj = null;

  var flags = 0;

  for (var i = 0; i < 2; i++) {
    var b = data[offset + i];
    flags = (flags << 8) | ((b < 0) ? (256 + b) : b);
  }

//  if ((flags & 1) == 1) {
//    vb = utils.decompress(vb);
//  }

  var type = (flags >> 1) & 0xF;

  switch (type) {
    case consts.TAIR_STYPE_INT:
      obj = utils.decodeInt(vb);
      break;

    case consts.TAIR_STYPE_STRING:
      obj = vb.toString('utf-8')
      break;

    case consts.TAIR_STYPE_BOOL:
      obj = utils.decodeBoolean(vb);
      break;

    case consts.TAIR_STYPE_LONG:
      obj = utils.decodeLong(vb);
      break;

    case consts.TAIR_STYPE_BYTE:
      obj = vb;
      break;

    case consts.TAIR_STYPE_FLOAT:
      obj = vb.readFloatBE(0);
      break;

    case consts.TAIR_STYPE_BYTEARRAY:
      obj = vb;
      break;

    default:
      return null
  }

  return obj;
}