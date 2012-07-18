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

var PREFIX_KEY_OFFSET = 22;
var PREFIX_KEY_MASK = 0x3FFFFF;
var MURMURHASH_M = 0x5bd1e995;
var debug = true;

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
      if (debug) {
        console.log('configversion: ' + exports.configVersion);
        console.log(res.configMap);
        console.log('bucketCount: ' + exports.bucketCount);
        console.log('copyCount: ' + exports.copyCount);
        for (var ai in res.aliveNode)
          console.log('aliveNode: ' + ai);
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
  var serverIdx = findServerIdx(encode(key, 'utf-8', false));
  var serverIp = 0;
  var i = 0;
  serverIp = exports.serverList[i][serverIdx] ? exports.serverList[i][serverIdx].host : 0;

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

function findServerIdx(keyByte) {
  var hash = murmurhash2(keyByte); // cast to int is safe
  console.log(hash %= exports.bucketCount);
  if ((exports.serverList) && (exports.serverList.length > 0))
    return parseInt(hash %= exports.bucketCount, 10);
  return 0;
}

function murMurHash(_key, seed) {
  var len = _key.length + 1;
  var key = new Buffer(len);
  _key.copy(key);
  key[len - 1] = 0;
  seed = seed || 97;
  console.log('len ' + len);
  var h = 97 ^ len;
  var index = 0;
  console.log('h ' + h);
  while (len >= 4) {
    var k = key.readInt32BE(index);

    k *= MURMURHASH_M;
    k ^= (k >> 24);
    k *= MURMURHASH_M;
    h *= MURMURHASH_M;
    h ^= k;
    index += 4;
    len -= 4;
  }
  console.log('h2 ' + h);
  switch (len) {
    case 3:
      h ^= (key[index + 2] << 16);
    case 2:
      h ^= (key[index + 1] << 8);
    case 1:
      h ^= key[index];
      h *= MURMURHASH_M;
  }
  console.log('h3 ' + h);
  h ^= (h >>> 13);
  h *= MURMURHASH_M;
  h ^= (h >>> 15);
  console.log('h4 ' + h);
  return (h & 0xffffffff) >>> 0;
}

function murmurhash2(_str) {
  var
    l = _str.length + 1,
    h = 97 ^ l,
    i = 0,
    k;
  console.log('len ' + l);
  var str = new Buffer(l);
  _str.copy(str);
  str[l - 1] = 0;
  console.log('h ' + h);
  while (l >= 4) {
    k =
      ((str[i] & 0xff)) |
        ((str[++i] & 0xff) << 8) |
        ((str[++i] & 0xff) << 16) |
        ((str[++i] & 0xff) << 24);

    k = (((k & 0xffff) * 0x5bd1e995) + ((((k >>> 16) * 0x5bd1e995) & 0xffff) << 16));
    k ^= k >>> 24;
    k = (((k & 0xffff) * 0x5bd1e995) + ((((k >>> 16) * 0x5bd1e995) & 0xffff) << 16));

    h = (((h & 0xffff) * 0x5bd1e995) + ((((h >>> 16) * 0x5bd1e995) & 0xffff) << 16)) ^ k;

    l -= 4;
    ++i;
  }
  console.log('h2 ' + h);
  switch (l) {
    case 3:
      h ^= (str[i + 2] & 0xff) << 16;
    case 2:
      h ^= (str[i + 1] & 0xff) << 8;
    case 1:
      h ^= (str[i] & 0xff);
      h = (((h & 0xffff) * 0x5bd1e995) + ((((h >>> 16) * 0x5bd1e995) & 0xffff) << 16));
  }

  h ^= h >>> 13;
  h = (((h & 0xffff) * 0x5bd1e995) + ((((h >>> 16) * 0x5bd1e995) & 0xffff) << 16));
  h ^= h >>> 15;

  return h >>> 0;
}