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

var connectionPool = {};
var buffer_start_size = 32 * 1024;

exports.getData = function (addr, buf, callback) {
  //client.setTimeout(1000);
  var addrKey = addr.host + ':' + addr.port;

  if (connectionPool[addrKey]) {
    var client = connectionPool[addrKey];
    client.write(buf);
  } else {
    var client = new net.Socket();
    client.addrKey = addrKey;
    client.connect(addr.port, addr.host, function () {
      client.write(buf);
      connectionPool[addrKey] = client;
    });
  }
  var chunk = new Buffer(buffer_start_size);
  var _pos = 0;
  var len = 0;
  client.on('timeout', function () {
    client.end(new Buffer(' '));
    connectionPool[client.addrKey] = null;
    return callback(new Error('Tair: Server '+addr.host + addr.port +' Timeout'));
  });
  client.on('error', function (err) {
    client.end(new Buffer(' '));
    connectionPool[client.addrKey] = null;
    return callback(err || new Error('Tair: Server '+addr.host + addr.port +' Error.'));
  });
  client.on('data', function (data) {
    //read header from packet
    if (_pos === 0 && data.length >= 16) {
      if (data.readInt32BE(0) !== consts.TAIR_PACKET_FLAG) {
        client.end(' ');
        connectionPool[client.addrKey] = null;
        return callback(new Error('Tair: Server '+addr.host + addr.port +' Reply Error'));
      }
      len = data.readInt32BE(12) + 16;
    }
    if(_pos + data.length >= chunk.length - 128) {
      chunk = exploitBuffer(chunk);
    }
    data.copy(chunk, _pos);
    _pos += data.length;
    if (_pos >= len) {
      return callback(null, chunk, len);
    }
  });
  client.on('end', function () {
    connectionPool[client.addrKey] = null;
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

function exploitBuffer (orign) {
  var buf = new Buffer (orign * 2);
  orign.copy(buf);
  return buf;
}

exports.printBuffer = printBuffer;