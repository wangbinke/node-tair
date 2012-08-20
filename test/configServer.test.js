/*
 * tair - test/configServer.test.js
 * Copyright(c) 2012 Taobao.com
 * Author: kate.sf <kate.sf@taobao.com>
 */

var configServer = require('../lib/configServer');
var should = require('should');

describe('configServer.test.js', function () {
  it('should get configure right', function (done) {
    configServer.retrieveConfigure('group_ju', 0, [
      {host: '10.235.144.116', port: 5198}
    ], function (err, ret) {
      should.not.exist(err);
      ret.configVersion.should.above(0);
      ret.bucketCount.should.above(0);
      should.exist(ret.aliveNode);
      ret.serverList[0].should.length(ret.bucketCount);
      done();
    });
  });

  it('should get right configure from another one first server down', function (done) {
    configServer.retrieveConfigure('group_ju', 0, [
      {host: '127.0.0.1', port: 62345},
      {host: '10.235.144.116', port: 5198}
    ], function (err, ret) {
      should.not.exist(err);
      ret.configVersion.should.above(0);
      ret.bucketCount.should.above(0);
      should.exist(ret.aliveNode);
      ret.serverList[0].should.length(ret.bucketCount);
      done();
    });
  });
});