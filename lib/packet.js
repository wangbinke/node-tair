/*!
 * tair - lib/packet.js
 * Copyright(c) 2012 Taobao.com
 * Author: kate.sf <kate.sf@taobao.com>
 */

/**
 * network packet structure
 */

var consts = require('./const');
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
  //exports.writePacketEnd(buf, pos);
  return buf;
}

exports.ResponseGetGroupPacket = function (data) {

};

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

function readString(byteBuffer) {
  var len = byteBuffer.getInt();

  if (len <= 1) {
    return "";
  } else {
    var b = new byte[len];

    byteBuffer.get(b);
    return new String(b, 0, len - 1);
  }
}
