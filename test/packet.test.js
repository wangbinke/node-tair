/*!
 * tair - test/packet.test.js
 * Copyright(c) 2012 Taobao.com
 * Author: kate.sf <kate.sf@taobao.com>
 */

var packet = require('../lib/packet.js');
var should = require('should');
var consts = require('../lib/const');

describe('packet.test.js', function () {

  it('#requestGetGroupPacket should build right packet content', function() {
    var _buf = packet.requestGetGroupPacket('groups', 1);
    _buf.should.length(31);
    var phead = _buf.readInt32BE(0);
    phead.should.equal(consts.TAIR_PACKET_FLAG);
  });


});