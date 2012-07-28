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
global.sending = false;
var buffer_start_size = 32 * 1024;

exports.getData = function (addr, buf, callback) {
  packetQueue.push([addr, buf, callback]);
  return getDataReal();
};

function getDataReal () {
  if(global.sending) {
    return;
  }
  var _packet = packetQueue.pop();
  if(!_packet) {
    return;
  }

  global.sending = true;

  var addr = _packet[0];
  var buf = _packet[1];
  var callback = _packet[2];
  var addrKey = (addr.host + addr.port).toString();

  var client = null;
  for (var i = 0, l = connectionPool.length; i < l; i++) {
    var _item = connectionPool[i];
    if(addrKey === _item.key) {
      client = _item.client;
    }
  }
  if (client) {
    client.setTimeout(1000);
  } else {
    client = new net.Socket();
    client.setTimeout(1000);
    client.addrKey = addrKey;
    client.connect(addr.port, addr.host, function () {
      packetQueue.push(_packet);
      connectionPool.push({key: addrKey, client: client});
      global.sending = false;
      getDataReal();
    });
    return;
  }
  var chunk = new Buffer(buffer_start_size);
  var _pos = 0;
  var len = 0;
  client.on('timeout', function () {
    client.end(new Buffer(' '));
    global.sending = false;
    getDataReal();
    connectionPool[client.addrKey] = null;
    if(!callback.called) {
      return callback(new Error('Tair: Server '+addr.host + addr.port +' Timeout'));
      callback.called = true;
    }
  });
  client.on('error', function (err) {
    global.sending = false;
    getDataReal();
    client.end(new Buffer(' '));
    connectionPool[client.addrKey] = null;
    if(!callback.called) {
      return callback(err || new Error('Tair: Server '+addr.host + addr.port +' Error.'));
      callback.called = true;
    }
  });
  client.on('data', function (data) {
    //read header from packet
    if (_pos === 0 && data.length >= 16) {
      if (data.readInt32BE(0) !== consts.TAIR_PACKET_FLAG) {
        client.end(' ');
        global.sending = false;
        getDataReal();
        connectionPool[client.addrKey] = null;
        if(!callback.called) {
          return callback(new Error('Tair: Server '+addr.host + addr.port +' Reply Error'));
          callback.called = true;
        }
      }
      len = data.readInt32BE(12) + 16;
    }
    if(len >= buffer_start_size) {
      chunk = exploitBuffer(chunk, len);
    }
    data.copy(chunk, _pos);
    _pos += data.length;
    if (_pos >= len) {
      global.sending = false;
      if(!callback.called) {
        callback(null, chunk, len);
        callback.called = true; // two callback will be called sometimes why??
      }
      return getDataReal();
    }
  });
  client.on('end', function () {
    global.sending = false;
    connectionPool[client.addrKey] = null;
    if(!callback.called) {
      callback(null, chunk, len);
      callback.called = true;
    }
    getDataReal();
  });
  client.write(buf);
}

function printBuffer(buf) {
  for (var i = 0; i < buf.length; i++) {
    if (i % 8 === 0) process.stdout.write(' ');
    if (i % 24 === 0) process.stdout.write('\n');
    process.stdout.write((buf[i] < 16 ? '0' : '') + buf[i].toString(16) + ' ');
  }
  process.stdout.write('\n');

}

function exploitBuffer (orign, len) {
  var buf = new Buffer (len);
  orign.copy(buf);
  return buf;
}

exports.printBuffer = printBuffer;