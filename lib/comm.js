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
var packetQueue = [];
var sending = false;
var buffer_start_size = 128 * 1024;

var chunk;
var _pos;
var len;
var callbacks = {};
var callbackTimeout = null;
var addr;
var addrKey;
var client;

exports.getData = function (addr, buf, callback) {
  var packetID = Math.floor((Math.random() * (new Date().getTime())) / 10000);
  if (buf.length >= 16)
    buf.writeInt32BE(packetID, 4);
  packetQueue.push([addr, buf, callback, packetID]);
  if (!sending) {
    return getDataReal();
  }
};

function getDataReal () {
  if (sending) {
    return;
  }
  var _packet = packetQueue.pop();
  if (!_packet) {
    return;
  }

  sending = true;

  var buf = _packet[1];
  callbacks[_packet[3]] = _packet[2];
  callbackTimeout = _packet[2];
  chunk = new Buffer(buffer_start_size);
  _pos = 0;
  len = 0;

  addr = _packet[0];
  addrKey = (addr.host + addr.port).toString();

  client = null;
  for (var i = 0, l = connectionPool.length; i < l; i++) {
    var _item = connectionPool[i];
    if (addrKey === _item.key) {
      client = _item.client;
    }
  }
  if (client) {
    client.write(buf);
  } else {
    client = new net.Socket();
    client.setTimeout(1000);
    client.addrKey = addrKey;
    packetQueue.push(_packet);
    client.connect(addr.port, addr.host, function () {
      sending = false;
      connectionPool.push({key: addrKey, client: client});
      return getDataReal();
    });
    client.on('timeout', function () {
      sending = false;
      connectionPool[client.addrKey] = null;
      delete client;
      if (!callbackTimeout.called) {
        callbackTimeout(new Error('Tair: Server ' + addr.host + addr.port + ' Timeout'));
        callbackTimeout.called = true;
      }
      return getDataReal();
    });
    client.on('error', function (err) {
      sending = false;
      connectionPool[client.addrKey] = null;
      delete client;
      if (!callbackTimeout.called) {
        callbackTimeout(err || new Error('Tair: Server ' + addr.host + addr.port + ' Error.'));
        callbackTimeout.called = true;
      }
      return getDataReal();
    });
    client.on('data', function (data) {
      //read header from packet
      if (_pos === 0 && data.length >= 16) {
        if (data.readInt32BE(0) !== consts.TAIR_PACKET_FLAG) {
          connectionPool[client.addrKey] = null;
          delete client;
          if (!callbackTimeout.called) {
            callbackTimeout.called = true;
            callbackTimeout(new Error('Tair: Server ' + addr.host + addr.port + ' Reply Error'));
          }
          sending = false;
          getDataReal();
          return;
        }
        len = data.readInt32BE(12) + 16;
        //console.log('rv' + packetID);
        if (len >= buffer_start_size) {
          chunk = exploitBuffer(chunk, len);
        }
      }

      data.copy(chunk, _pos);
      _pos += data.length;
      //console.log(_pos / len);
      if (_pos >= len) {
        sending = false;
        var packetID = chunk.readInt32BE(4);
        var callback = callbacks[packetID];
        if (callback) {
          packetID = chunk.readInt32BE(4);
          //console.log('re' + packetID);
          callback(null, chunk, len);
          delete callbacks[packetID];
        }
        return getDataReal();
      }
    });
    client.on('end', function () {
      sending = false;
      var packetID = chunk.readInt32BE(4);
      var callback = callbacks[packetID];
      connectionPool[client.addrKey] = null;
      delete client;
      if (callback) {
        callback(null, chunk, len);
        delete callbacks[packetID];
      }
      return getDataReal();
    });
    return;
  }

}

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

exports.printBuffer = printBuffer;