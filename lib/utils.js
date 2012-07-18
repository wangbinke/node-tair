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

  rt[7] = (byte)(number & 0xFF);
  rt[6] = (byte)((number >> 8) & 0xFF);
  rt[5] = (byte)((number >> 16) & 0xFF);
  rt[4] = (byte)((number >> 24) & 0xFF);
  rt[3] = (byte)((number >> 32) & 0xFF);
  rt[2] = (byte)((number >> 40) & 0xFF);
  rt[1] = (byte)((number >> 48) & 0xFF);
  rt[0] = (byte)((number >> 56) & 0xFF);
  return rt;
};

exports.decodeLong = function (data) {
  var rv = 0;
  for (var i = 0; i < data.length; i++) {
    rv = (rv << 8) | ((data[i] < 0) ? (256 + data[i]) : data[i]);
  }
  return rv;
};

exports.encodeInt = function (number) {
  var fg = new Buffer(4);

  fg[3] = (number & 0xFF);
  fg[2] = ((number >> 8) & 0xFF);
  fg[1] = ((number >> 16) & 0xFF);
  fg[0] = ((number >> 24) & 0xFF);
  return fg;
};

exports.decodeInt = function (data) {
  return decodeLong(data);
}

exports.getInt = function (data, offset) {
  var rv = 0;
  rv = ((data[offset + 3] < 0) ? (256 + data[offset + 3]) : data[offset + 3]);
  rv = (rv << 8) | ((data[offset + 2] < 0) ? (256 + data[offset + 2]) : data[offset + 2]);
  rv = (rv << 8) | ((data[offset + 1] < 0) ? (256 + data[offset + 1]) : data[offset + 1]);
  rv = (rv << 8) | ((data[offset] < 0) ? (256 + data[offset]) : data[offset]);
  return rv;
};

exports.encodeBoolean = function (b) {
  var rv = new Buffer(1);
  rv[0] = (b ? '1' : '0');
  return rv;
};

exports.encodeFloat = function (float) {
  var rf = new Buffer(8);
  return rf.writeDoubleBE(float);
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

  var port = ((id >> 32) & 0xffff).toString();
  return host + ':' + port;
};
