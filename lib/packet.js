/*!
 * tair - lib/packet.js
 * Copyright(c) 2012 Taobao.com
 * Author: kate.sf <kate.sf@taobao.com>
 */

/**
 * network packet structure
 */

var consts = require('./const');
var zlib = require('zlib');
var utils = require('./utils');
var transcoder = require('./transcoder');
var getData = require ('./comm').getData;

var chid = 1; //global channel id

exports.writePacketBegin = function (pcode, capacity) {

  capacity = capacity || 0;
  chid++;

  // packet header
  var byteBuffer = new Buffer(capacity + 16);
  byteBuffer.fill();
  byteBuffer.writeInt32BE(consts.TAIR_PACKET_FLAG, 0); // packet flag
  byteBuffer.writeInt32BE(chid, 4); // channel id
  byteBuffer.writeInt32BE(pcode, 8); // packet code
  byteBuffer.writeInt32BE(capacity, 12); // body len
  return [byteBuffer, 16];
};

exports.writePacketEnd = function (byteBuffer, pos) {
  byteBuffer.writeInt8(consts.TAIR_PACKET_HEADER_BLPOS, pos);
};

exports.requestGetGroupPacket = function (groupName, configVersion) {
  configVersion = configVersion || 0;
  var ret = exports.writePacketBegin(consts.TAIR_REQ_GET_GROUP_NEW_PACKET, 9 + groupName.length);
  var buf = ret[0], pos = ret[1];
  buf.writeInt32BE(configVersion, pos);
  pos += 4;
  pos += writeString(buf, pos, groupName);
  return buf;
}

exports.responseGetGroupPacket = function (data, callback) {

  var pos = 16;
  var bucketCount = data.readInt32BE(pos);
  pos += 4;
  var copyCount = data.readInt32BE(pos);
  pos += 4;
  var configVersion = data.readInt32BE(pos);
  pos += 4;
  var configCount = data.readInt32BE(pos);
  pos += 4;
  var configMap = {};

  for (var i = 0; i < configCount; i++) {
    var name = readString(data, pos);
    pos += name[1];

    var value = readString(data, pos);
    pos += value[1];
    configMap[name[0]] = value[0];
  }

  var serverList = [];
  var serverCountFlate = data.readInt32BE(pos);
  pos += 4;
  if (serverCountFlate > 0) {
    var _buff = new Buffer(serverCountFlate);
    data.copy(_buff, 0, pos, pos + serverCountFlate);
    zlib.inflate(_buff, function (err, buffer) {
      if (err) {
        return callback(err);
      }
      pos += serverCountFlate;
      var posTemp = 0;
      var countTemp = 0;
      var copyTemp = 0;
      while (posTemp < buffer.length) {
        if (countTemp === 0) {
          serverList[copyTemp] = [];
        }
        serverList[copyTemp].push(readLong(buffer, posTemp));
        posTemp += 8;
        countTemp++;
        if (countTemp === bucketCount) {
          countTemp = 0;
          copyTemp++;
        }
      }
      var aNodeCount = data.readInt32BE(pos);
      pos += 4;
      var aliveNode = [];
      for (var i = 0; i < aNodeCount; i++) {
        aliveNode.push(readLong(data, pos));
        pos += 8;
      }
      var configServerRes = {
        configVersion: configVersion,
        bucketCount: bucketCount,
        copyCount: copyCount,
        configMap: configMap,
        serverList: serverList,
        aliveNode: aliveNode
      };
      //console.log(configServerRes);
      return callback(null, configServerRes);
    });
  } else {
    return callback(new Error('Tair: No Server'));
  }

};

exports.requestPutPacket = function (namespace, version, key, value, expire) {
  var keyBuffer = transcoder.encode(key);
  var valueBuffer = transcoder.encode(value);
  var ret = exports.writePacketBegin( consts.TAIR_REQ_PUT_PACKET, 90 + keyBuffer.length + valueBuffer.length)[0];
  var pos = ret[1], packet = ret[0];
  //packet body begin
  packet[pos] = 0;
  pos ++;
  packet.writeInt16(namespace, pos);
  pos += 2;
  packet.writeInt16(version, pos);
  pos += 2;
  packet.writeInt32(expire, pos);
  pos += 4;

  pos += fillMeta(packet, pos);
  pos += encodeMeta(packet, pos, 0);
  packet.writeInt32(keyBuffer.length, pos);
  pos += 4;
  keyBuffer.copy(packet, pos, 0, keyBuffer.length - 1);
  pos += keyBuffer.length;

  pos += fillMeta(packet, pos);
  pos += encodeMeta(packet, pos, 0);
  packet.writeInt32(valueBuffer.length, pos);
  pos += 4;
  keyBuffer.copy(packet, pos, 0, valueBuffer.length - 1);
  pos += keyBuffer.length;

  exports.writePacketEnd(packet, pos);

  return packet;
};

function readLong(buffer, pos) {
  var _buf = new Buffer(8);
  buffer.copy(_buf, 0, pos, pos + 8);
  return utils.decodeLong(_buf);
}

function writeString(byteBuffer, pos, str) {
  var written = 0;
  if (str == null) {
    byteBuffer.writeInt32BE(0, pos);
    written += 4;
  } else {
    var _buf = new Buffer(str, 'utf-8');
    byteBuffer.writeInt32BE(_buf.length + 1, pos);
    written += 4;
    written += byteBuffer.write(str, pos + written, 'utf-8');
    byteBuffer.writeInt8(0, pos + written);
    written += 4;
  }
  return written;
}

function readString(byteBuffer, pos) {
  var len = parseInt(byteBuffer.readInt32BE(pos));

  if (len <= 1) {
    return "";
  } else {
    var b = new Buffer(len);
    byteBuffer.copy(b, 0, pos + 4, pos + 4 + len);
    return [b.toString('utf-8').replace('\u0000', ''), 4 + len];
  }
}

function encodeMeta(buffer, pos, flag) {
  for (var i = pos; i < pos + 29; i++) {
    buffer[i] = 0;
  }
  if (flag !== 0) {
    buffer.writeInt32BE(flag, pos + 13);
  }
  return 29;
}
function fillMeta(buffer, pos) {
  for (var i = pos; i < pos + 7; i++) {
    buffer[i] = 0;
  }
  return 7;
}