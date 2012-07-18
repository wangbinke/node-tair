/*!
 * tair - lib/packet.js
 * Copyright(c) 2012 Taobao.com
 * Author: kate.sf <kate.sf@taobao.com>
 */

/**
 * network communication module
 */

var net = require('net');
var consts = require('./const');

exports.getData = function (addr, buf, callback) {
  printBuffer(buf);
  var client = new net.Socket();
  client.setTimeout(300);
  var chunk = new Buffer(1024 * 1024);
  var _pos = 0;
  var len = 0;
  client.connect(addr.port, addr.host, function () {
    client.write(buf);
  });
  client.on('timeout', function () {
    client.end(new Buffer(' '));
    return callback(new Error('Config Server Timeout'));
  });
  client.on('error', function (err) {
    client.end(new Buffer(' '));
    return callback(err || new Error('Config Server Error.'));
  });
  client.on('data', function (data) {
    //read header from packet
    if (_pos === 0 && data.length >= 16) {
      if (data.readInt32BE(0) !== consts.TAIR_PACKET_FLAG) {
        client.end(' ');
        return callback(new Error('Config Server Reply Error'));
      }
      len = data.readInt32BE(12) + 16;
    }

    data.copy(chunk, _pos);
    _pos += data.length;
    if (_pos >= len) {
      client.end(' ');
    }
  });
  client.on('end', function () {
    return callback(null, chunk, len);
  });
};

function printBuffer(buf) {
  for (var i = 0; i < buf.length; i++) {
    if (i % 8 === 0) process.stdout.write(' ');
    if (i % 24 === 0) process.stdout.write('\n');
    process.stdout.write((buf[i] < 16 ? '0' : '') + buf[i].toString(16) + ' ');
  }
  process.stdout.write('\n');

}