/*!
 * tair - lib/configServer.js
 * Copyright(c) 2012 Taobao.com
 * Author: kate.sf <kate.sf@taobao.com>
 */

/**
 * configServer module
 */

var MURMURHASH_M = 0x5bd1e995;
var consts = require('./const');
var packet = require('./packet');
var net = require('net');

exports.bucketCount = 0;
exports.copyCount = 0;
exports.aliveNodes = [];
exports.configVersion = 0;

function getData(addr, buf, callback) {
  var client = new net.Socket();
  //client.setTimeout(500);
  var chunk = new Buffer(1024 * 1024);
  var _pos = 0;
  client.connect(addr.port, addr.host, function () {
    client.write(buf);
  });
  client.on('timeout', function () {
    client.destory();
    return callback(new Error('Config Server Timeout'));
  });
  client.on('error', function (err) {
    client.destory();
    return callback(err || new Error('Config Server Error.'));
  });
  client.on('data', function (data) {
    console.log(data);
    _pos += chunk.copy(data, _pos);
  });
  client.on('end', function () {
    return callback(null, chunk);
  });
}

exports.retrieveConfigure = function (groupName, configVersion, configServerList, callback) {
  var retrieveLastTime = new Date().getTime();


  var addr = configServerList[0];
  var returnPacket = null;

  var reqGetGroup = packet.requestGetGroupPacket(groupName, configVersion);
  getData(addr, reqGetGroup, function (err, data) {
    if (err || !data) {
      return callback(err);
    }

    console.log(data);
    var res = ResponseGetGroupPacket(data);

    if (res.status !== 0) {
      return callback(new Error('Tair: ResponseGetGroupPacket failed'));
    }


    exports.configVersion = res.getConfigVersion();
    exports.bucketCount = res.getBucketCount();
    exports.copyCount = res.getCopyCount();
    exports.aliveNodes = res.getAliveNodes();

    if (exports.aliveNodes == null || exports.aliveNodes.length === 0) {
      return callback(new Error('Tair: fatal error, no datanode is alive'));
    }
    if (exports.bucketCount <= 0 || exports.copyCount <= 0) {
      return callback(new Error('Tair: bucket count or copy count can not be 0'));
    }
  });


  return callback(null);
};

function murMurHash(key) {
  var len = key.length;
  var h = 97 ^ len;
  var index = 0;

  while (len >= 4) {
    var k = (key[index] & 0xff) | ((key[index + 1] << 8) & 0xff00)
      | ((key[index + 2] << 16) & 0xff0000)
      | (key[index + 3] << 24);

    k *= MURMURHASH_M;
    k ^= (k >>> 24);
    k *= MURMURHASH_M;
    h *= MURMURHASH_M;
    h ^= k;
    index += 4;
    len -= 4;
  }

  switch (len) {
    case 3:
      h ^= (key[index + 2] << 16);

    case 2:
      h ^= (key[index + 1] << 8);

    case 1:
      h ^= key[index];
      h *= MURMURHASH_M;
  }

  h ^= (h >>> 13);
  h *= MURMURHASH_M;
  h ^= (h >>> 15);
  return (h & 0xffffffff);
}


