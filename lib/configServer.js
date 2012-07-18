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
var utils = require('./utils');

exports.bucketCount = 0;
exports.copyCount = 0;
exports.aliveNodes = [];
exports.serverList = [];
exports.configVersion = 0;

var debug  = true;



exports.retrieveConfigure = function (groupName, configVersion, configServerList, callback) {
  var retrieveLastTime = new Date().getTime();

  var addr = configServerList[0];
  var returnPacket = null;

  var reqGetGroup = packet.requestGetGroupPacket(groupName, configVersion);
  getData(addr, reqGetGroup, function (err, data, datalen) {
    if (err || !data) {
      return callback(err);
    }

    packet.responseGetGroupPacket(data, function (err, res) {
      if (err) {
        return callback(err);
      }

      exports.configVersion = res.configVersion;
      exports.bucketCount = res.bucketCount;
      exports.copyCount = res.copyCount;
      exports.aliveNodes = res.aliveNode;
      exports.serverList = res.serverList;

      if (exports.aliveNodes == null || exports.aliveNodes.length === 0) {
        return callback(new Error('Tair: fatal error, no datanode is alive'));
      }
      if (exports.bucketCount <= 0 || exports.copyCount <= 0) {
        return callback(new Error('Tair: bucket count or copy count can not be 0'));
      }
      if(debug) {
        console.log('configversion: ' + exports.configVersion);
        console.log('bucketCount: ' + exports.bucketCount);
        console.log('copyCount: ' + exports.copyCount);
        console.log('aliveNode One:' + utils.longToIP(res.aliveNode[1]) );
      }

      return callback(null, res);
    });
  });

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


