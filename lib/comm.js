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
var Cutter = require('cutter');

exports.globalTimeout = 3000;
exports.getData = function (addr, buf, callback) {

  var client = new net.Socket();
  client.setTimeout(exports.globalTimeout);

  client.connect(addr.port, addr.host, function () {
    client.write(buf);
  });
  client.on('timeout', function () {
    client.end(new Buffer(' '));
    return callback(new Error('Tair: Server ' + addr.host + addr.port + ' Timeout'));
  });
  client.on('error', function (err) {
    client.end(new Buffer(' '));
    return callback(err || new Error('Tair: Server ' + addr.host + addr.port + ' Error.'));
  });
  var cutter = new Cutter(16, packetLength);
  cutter.on('packet', function (chunk) {
    callback(null, chunk, chunk.length);
    return client.end(' ');
  });
  client.on('data', function (data) {
    cutter.emit('data', data);
  });
  client.on('end', function () {
    cutter.destroy();
  });
};

function packetLength (data) {
  return 16 + data.readInt32BE(12);
}

function printBuffer (buf) {
  for (var i = 0; i < buf.length; i++) {
    if (i % 8 === 0) process.stdout.write(' ');
    if (i % 24 === 0) process.stdout.write('\n');
    process.stdout.write((buf[i] < 16 ? '0' : '') + buf[i].toString(16) + ' ');
  }
  process.stdout.write('\n');

}

exports.printBuffer = printBuffer;