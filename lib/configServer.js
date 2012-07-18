/*!
 * tair - lib/configServer.js
 * Copyright(c) 2012 Taobao.com
 * Author: kate.sf <kate.sf@taobao.com>
 */

/**
 * configServer module
 */



var packet = require('./packet');
var utils = require('./utils');
var encode = require('./transcoder').encode;
var getData = require('./comm').getData;

exports.bucketCount = 0;
exports.copyCount = 0;
exports.aliveNodes = [];
exports.serverList = [];
exports.configVersion = 0;

var MURMURHASH_M = 0x5bd1e995;
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
        for(var ai in res.aliveNode)
         console.log('aliveNode: ' + ai );
        console.log('first in serverList: ' + exports.serverList[0][0].host + ':' + exports.serverList[0][0].port);
      }

      return callback(null, res);
    });
  });

};

exports.getDataNode = function (key, isRead) {
    if (exports.serverList == null || exports.serverList.length === 0) {
      console.error("Tair: DataNode Server list is empty!");
      return 0;
    }
    var serverIdx = findServerIdx(encode(key, 'utf-8'));

    var serverIp = 0;
    var i  = 0;
    serverIp = exports.serverList[i][serverIdx] ? exports.serverList[i][serverIdx].host : 0;

    if (!exports.aliveNodes[serverIp]) {
      serverIp = 0;
      console.log("Tair: master server " + utils.longToIP(serverIp) + " had down");
    }

    if (serverIp == 0 && isRead) {
      for (i = 1; i < exports.copyCount; ++i) {
        serverIp =  exports.serverList[i][serverIdx] ? exports.serverList[i][serverIdx].host : 0;
        console.log("Tair: read operation try: " + utils.longToIP(serverIp));
        if (exports.aliveNodes[serverIp]) {
          break;
        } else {
          serverIp = 0;
        }
      }
      if (serverIp == 0) {
        console.error("Tair Error: slave servers also"+ " had down");
      }
    }
    return {host: utils.longToIP(serverIp), port: exports.serverList[i][serverIdx].port, success: (serverIp !== 0)};

};

function findServerIdx(keyByte) {
  var hash = murMurHash(keyByte); // cast to int is safe
  if ((exports.serverList) && (exports.serverList.length > 0))
    return parseInt(hash %= exports.bucketCount, 10);
  return 0;
}

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
  return (h & 0xffffffff) >>> 0;
}


