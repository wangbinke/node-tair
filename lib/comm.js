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
var timeCounter = null;

exports.globalTimeout = 5000;
exports.getData = function (addr, buf, callback) {
  var packetID = buf.readUInt32BE(4);
  if (packetID <= 0) {
    console.warn('%s, Warning: Tair chid make to 0!!!!', new Date());
  }
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
  callbackTimeout.key = _packet[3];

  _pos = 0;
  len = 0;

  addr = _packet[0];
  addrKey = (addr.host + addr.port).toString();

  client = findClient(addrKey);

  //锁的超时设置，防止死锁
  timeCounter = setTimeout(function () {
    if (sending) {
      sending = false;
      if (!callbackTimeout._hadcalled) {
        callbackTimeout._hadcalled = true;
        callbackTimeout(new Error('Tair: Server ' + addr.host + addr.port + ' Timeout'));
      }
      deleteClient(client.addrKey);
      return getDataReal();
    }
  }, exports.globalTimeout + 200);
  if (client) {
    client.write(buf);
  } else {
    client = new net.Socket();
    client.setTimeout(exports.globalTimeout); // first use socket timeout, if it doesn`t work , global timeout work
    client.addrKey = addrKey;
    packetQueue.push(_packet);
    client.connect(addr.port, addr.host, function () {
      sending = false;
      clearTimeout(timeCounter);
      connectionPool.push({key: addrKey, client: client});
      return getDataReal();
    });
    client.on('timeout', function () {
      sending = false;
      clearTimeout(timeCounter);
      for (var i in callbacks) {
        var cb = callbacks[i];
        if (!cb._hadcalled) {
          cb._hadcalled = true;
          cb(new Error('Tair: Server ' + addr.host + addr.port + ' Timeout.'));
        }
      }
      cutter.destroy();
      client.end();
      return getDataReal();
    });
    client.on('error', function (err) {
      clearTimeout(timeCounter);
      deleteClient(client.addrKey);
      for (var i in callbacks) {
        var cb = callbacks[i];
        if (!cb._hadcalled) {
          cb._hadcalled = true;
          cb(err || new Error('Tair: Server ' + addr.host + addr.port + ' Error.'));
        }
      }
      cutter.destroy();
      sending = false;
      return getDataReal();
    });
    var cutter = new Cutter(16, packetLength);
    cutter.on('packet', function (chunk) {
      sending = false;
      var packetID = chunk.readUInt32BE(4);
      var callback = callbacks[packetID];
      if (callback) {
        packetID = chunk.readUInt32BE(4);
        callback(null, chunk, chunk.length);
        clearTimeout(timeCounter);
        callbacks[packetID]._hadcalled = true;
        delete callbacks[packetID];
      }
      return getDataReal();
    });
    client.on('data', function (data) {
      cutter.emit('data', data);
    });
    client.on('end', function () {
      sending = false;
      deleteClient(client.addrKey);
      cutter.destroy();
      return getDataReal();
    });

    client.on('close', function (hadError) {
      if (hadError) {
        // using on 'error' to process error close
        return;
      }
      deleteClient(client.addrKey);
      console.warn("Tair: Warning: DataNode: %s connect closed.", client.addrKey);
    });
    return;
  }

}
//
//function printBuffer (buf) {
//  for (var i = 0; i < buf.length; i++) {
//    if (i % 8 === 0) process.stdout.write(' ');
//    if (i % 24 === 0) process.stdout.write('\n');
//    process.stdout.write((buf[i] < 16 ? '0' : '') + buf[i].toString(16) + ' ');
//  }
//  process.stdout.write('\n');
//
//}

function exploitBuffer (orign, len) {
  var buf = new Buffer(len);
  orign.copy(buf);
  return buf;
}

function packetLength (data) {
  return 16 + data.readInt32BE(12);
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
