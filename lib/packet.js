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
  byteBuffer.writeInt32BE(consts.TAIR_PACKET_HEADER_BLPOS, pos);
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
  var configCount =  data.readInt32BE(pos);
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
      if(err) {
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
        countTemp ++;
        if(countTemp === bucketCount) {
          countTemp = 0;
          copyTemp ++;
        }
      }
      var aNodeCount = data.readInt32BE(pos);
      pos += 4;
      for (var i = 0; i < aNodeCount; i++) {

      }
      console.log(bucketCount + ' ' + copyCount + ' ' + configVersion + ' ' + configCount + ' ' + aNodeCount);
    });
  } else {
    return callback(new Error('Tair: No Server'));
  }


};

function readLong (buffer, pos) {
  var _buf  = new Buffer(8);
  buffer.copy(_buf, 0, pos, pos + 8);
  return utils.decodeLong(_buf);
}

function writeString (byteBuffer, pos, str) {
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
  var len = byteBuffer.readInt32BE(pos);

  if (len <= 1) {
    return "";
  } else {
    var b = new Buffer(len);

    byteBuffer.copy(b, 0, pos + 4, pos + 5 + len);
    return [b.toString('utf-8'), pos + 5 + len];
  }
}
