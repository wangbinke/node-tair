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
var debug = false;

exports.retrieveConfigure = function (groupName, configVersion, configServerList, callback, configServerIndex) {

  configServerIndex = configServerIndex || 0;
  if (configServerIndex > configServerList.length - 1) {
    configServerIndex = configServerList.length - 1;
  }

  var addr = configServerList[configServerIndex];

  var reqGetGroup = packet.requestGetGroupPacket(groupName, configVersion);
  getData(addr, reqGetGroup, function (err, data) {
    if (err || !data) {
      if (configServerIndex >= configServerList.length - 1) {
        return callback(err);
      } else {
        configServerIndex++;
        return exports.retrieveConfigure(groupName, configVersion, configServerList, callback, configServerIndex);
      }
    }

    packet.responseGetGroupPacket(data, function (err, res) {
      if (err) {
        if (configServerIndex >= configServerList.length - 1) {
          return callback(err);
        } else {
          configServerIndex++;
          return exports.retrieveConfigure(groupName, configVersion, configServerList, callback, configServerIndex);
        }
      }

      exports.configVersion = res.configVersion;
      exports.bucketCount = res.bucketCount;
      exports.copyCount = res.copyCount;
      exports.aliveNodes = res.aliveNode;
      exports.serverList = res.serverList;

      if (!exports.aliveNodes || exports.aliveNodes.length === 0) {
        if (configServerIndex >= configServerList.length - 1) {
          return callback(new Error('Tair: fatal error, no datanode is alive'));
        } else {
          configServerIndex++;
          return exports.retrieveConfigure(groupName, configVersion, configServerList, callback, configServerIndex);
        }
      }
      if (exports.bucketCount <= 0 || exports.copyCount <= 0) {
        if (configServerIndex >= configServerList.length - 1) {
          return callback(new Error('Tair: bucket count or copy count can not be 0'));
        } else {
          configServerIndex++;
          return exports.retrieveConfigure(groupName, configVersion, configServerList, callback, configServerIndex);
        }
      }
//      if (debug) {
//        console.log('configversion: ' + exports.configVersion);
//        console.log(res.configMap);
//        console.log('bucketCount: ' + exports.bucketCount);
//        console.log('copyCount: ' + exports.copyCount);
//        for (var ai in res.aliveNode)
//          console.log('aliveNode: ' + ai);
//        console.log('first in serverList: ' + exports.serverList[0][0].host + ':' + exports.serverList[0][0].port);
//      }

      return callback(null, res);
    });
  });

};

exports.getDataNode = function (key, isRead) {
  if (exports.serverList == null || exports.serverList.length === 0) {
    console.error("Tair: DataNode Server list is empty!");
    return 0;
  }
  var serverIdx = findServerIdx(encode(key, 'utf-8', false));
  var serverIp = 0;
  var i = 0;
  serverIp = exports.serverList[i][serverIdx] ? exports.serverList[i][serverIdx].host : 0;
  serverIp >>>= 0;
  if (!exports.aliveNodes[serverIp]) {
    serverIp = 0;
    console.log("Tair: master server " + utils.longToIP(serverIp) + " had down");
  }

  if (serverIp == 0 && isRead) {
    for (i = 1; i < exports.copyCount; ++i) {
      serverIp = exports.serverList[i][serverIdx] ? exports.serverList[i][serverIdx].host : 0;
      console.log("Tair: read operation try: " + utils.longToIP(serverIp));
      if (exports.aliveNodes[serverIp]) {
        break;
      } else {
        serverIp = 0;
      }
    }
    if (serverIp == 0) {
      console.error("Tair Error: slave servers also" + " had down");
    }
  }
  return {host: utils.longToIP(serverIp), port: exports.serverList[i][serverIdx].port, success: (serverIp !== 0)};

};

function findServerIdx (keyByte) {
  var hash = murmurhash2(keyByte); // cast to int is safe

  if ((exports.serverList) && (exports.serverList.length > 0))
    return parseInt(hash %= exports.bucketCount, 10);
  return 0;
}

function murmurhash2 (_str) {
  var
    l = _str.length + 1,
    h = 97 ^ l,
    i = 0,
    k;

  var str = new Buffer(l);
  _str.copy(str);
  str[l - 1] = 0;

  while (l >= 4) {
    k =
      ((str[i] & 0xff)) |
        ((str[++i] & 0xff) << 8) |
        ((str[++i] & 0xff) << 16) |
        ((str[++i] & 0xff) << 24);

    k = (((k & 0xffff) * MURMURHASH_M) + ((((k >>> 16) * MURMURHASH_M) & 0xffff) << 16));
    k ^= k >>> 24;
    k = (((k & 0xffff) * MURMURHASH_M) + ((((k >>> 16) * MURMURHASH_M) & 0xffff) << 16));

    h = (((h & 0xffff) * MURMURHASH_M) + ((((h >>> 16) * MURMURHASH_M) & 0xffff) << 16)) ^ k;

    l -= 4;
    ++i;
  }

  switch (l) {
    case 3:
      h ^= (str[i + 2] & 0xff) << 16;
    case 2:
      h ^= (str[i + 1] & 0xff) << 8;
    case 1:
      h ^= (str[i] & 0xff);
      h = (((h & 0xffff) * MURMURHASH_M) + ((((h >>> 16) * MURMURHASH_M) & 0xffff) << 16));
  }

  h ^= h >>> 13;
  h = (((h & 0xffff) * MURMURHASH_M) + ((((h >>> 16) * MURMURHASH_M) & 0xffff) << 16));
  h ^= h >>> 15;

  return h >>> 0;
}
