/*
 * tair - test/utils.test.js
 * Copyright(c) 2012 Taobao.com
 * Author: kate.sf <kate.sf@taobao.com>
 */

var utils = require('../lib/utils');

describe('utils.test.js', function () {
  it('#encodeLong and #decodeLong', function () {
    var l = 123456789;
    var enc = utils.encodeLong(l);
    enc.should.length(8);
    var dec = utils.decodeLong(enc);
    dec.should.equal(l);
  });

  it('#encodeBoolean and #decodeBoolean', function () {
    var b = true;
    var enc = utils.encodeBoolean(b);
    enc.should.length(1);
    var dec = utils.decodeBoolean(enc);
    dec.should.equal(b);
  });

  it('#encodeInt, #decodeInt and #getInt', function () {
    var l = 12345678;
    var enc = utils.encodeInt(l);
    enc.should.length(4);
    var dec = utils.decodeInt(enc);
    dec.should.equal(l);
    var get = utils.getInt(enc, 0);
    get.should.equal(l);
  });
});