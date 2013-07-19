/*
 * tair - test/comm.test.js
 * Copyright(c) 2012 Taobao.com
 * Author: kate.sf <kate.sf@taobao.com>
 */

var comm = require('../lib/comm');
var should = require('should');

describe('comm.test.js', function () {
  it('comm to a bad server should throw', function (done) {
    var addr = {host: '127.0.0.2', port: 9873};
    var buf = new Buffer('suibianshenme');
    comm.getData(addr, buf, function (err, data) {
      should.exist(err);
      done();
    });
  });

  it.skip('comm to a non-tair server should throw', function (done) {
    var addr = {host: '218.2.103.166', port: 80};
    var buf = new Buffer('get /\r\nhost www.baidu.com');
    comm.getData(addr, buf, function (err, data) {
      should.exist(err);
      done();
    });
  });
});