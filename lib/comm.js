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

var connectionPool = [];
var buffer_start_size = 128 * 1024;

exports.globalTimeout = 5000;
exports.getData = function (addr, buf, callback) {
  var packetID = buf.readUInt32BE(4);
  if (packetID <= 0) {
    console.warn('%s, Warning: Tair chid make to 0!!!!', new Date());
  }

  var client = new net.Socket();
  client.setTimeout(exports.globalTimeout);
  var chunk = new Buffer(1024 * 1024);
  var _pos = 0;
  var len = 0;
  client.connect(addr.port, addr.host, function () {
    client.write(buf);
  });
  client.on('timeout', function () {
    client.end(new Buffer(' '));
    return callback(new Error('Tair: Server '+addr.host + addr.port +' Timeout'));
  });
  client.on('error', function (err) {
    client.end(new Buffer(' '));
    return callback(err || new Error('Tair: Server '+addr.host + addr.port +' Error.'));
  });
  client.on('data', function (data) {
    //read header from packet
    if (_pos === 0 && data.length >= 16) {
      if (data.readInt32BE(0) !== consts.TAIR_PACKET_FLAG) {
        client.end(' ');
        return callback(new Error('Tair: Server '+addr.host + addr.port +' Reply Error'));
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


function printBuffer (buf) {
  for (var i = 0; i < buf.length; i++) {
    if (i % 8 === 0) process.stdout.write(' ');
    if (i % 24 === 0) process.stdout.write('\n');
    process.stdout.write((buf[i] < 16 ? '0' : '') + buf[i].toString(16) + ' ');
  }
  process.stdout.write('\n');

}

function exploitBuffer (orign, len) {
  var buf = new Buffer(len);
  orign.copy(buf);
  return buf;
}

function findClient (addrKey) {
  for (var i = 0, l = connectionPool.length; i < l; i++) {
    var _item = connectionPool[i];
    if (_item && addrKey === _item.key) {
      return _item.client;
    }
  }
  return null;
}

function deleteClient (addrKey) {
  for (var i = 0, l = connectionPool.length; i < l; i++) {
    var _item = connectionPool[i];
    if (_item && addrKey === _item.key) {
      delete connectionPool[i];
      connectionPool[i] = null;
      return true;
    }
  }
  return false;
}

//exports.printBuffer = printBuffer;
