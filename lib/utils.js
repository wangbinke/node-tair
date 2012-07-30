/*!
 * tair - lib/transcoder.js
 * Copyright(c) 2012 Taobao.com
 * Author: kate.sf <kate.sf@taobao.com>
 */

/**
 * utility module
 */

exports.encodeLong = function (number) {
  var rt = new Buffer(8);

  rt[7] = (number & 0xFF);
  rt[6] = ((number >> 8) & 0xFF);
  rt[5] = ((number >> 16) & 0xFF);
  rt[4] = ((number >> 24) & 0xFF);
  rt[3] = ((number >> 32) & 0xFF);
  rt[2] = ((number >> 40) & 0xFF);
  rt[1] = ((number >> 48) & 0xFF);
  rt[0] = ((number >> 56) & 0xFF);
  return rt;
};

exports.decodeLong = function (data) {
  var rv = 0;
  for (var i = 0; i < data.length; i++) {
    rv = (rv << 8) | ((data[i] < 0) ? (256 + data[i]) : data[i]);
  }
  return rv >>> 0;
};

exports.encodeInt = function (number) {
  var fg = new Buffer(4);
  fg.writeInt32BE(number, 0);
  return fg;
};

exports.decodeInt = function (data) {
  return data.readInt32BE(0);
}

exports.getInt = function (data, offset) {
  return data.readInt32BE(offset);
};

exports.encodeBoolean = function (b) {
  var rv = new Buffer(1);
  rv[0] = (b ? '1' : '0');
  return rv;
};

exports.encodeFloat = function (float) {
  var rf = new Buffer(8);
  rf.writeDoubleBE(float, 0);
  return rf;
};

exports.decodeBoolean = function (input) {
  return (input[0] == '1');
};

exports.longToIP = function (id) {
  var host = '';
  host += ((id & 0xff)).toString() + '.';
  host += (((id >> 8) & 0xff)).toString() + '.';
  host += (((id >> 16) & 0xff)).toString() + '.';
  host += (((id >> 24) & 0xff)).toString();

  var port = ((id >> 32) & 0xffff);
  return host;
};
