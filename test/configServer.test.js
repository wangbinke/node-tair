/*
 * tair - test/configServer.test.js
 * Copyright(c) 2012 Taobao.com
 * Author: kate.sf <kate.sf@taobao.com>
 */

var configServer = require('../lib/configServer');
var should = require('should');

describe('configServer.test.js', function () {
  xit('should get configure right', function (done) {
    configServer.retrieveConfigure('group_market2', 0, [
      {host: '10.235.144.195', port: 5198}
    ], function (err, ret) {
      should.not.exist(err);
      ret.configVersion.should.above(0);
      ret.bucketCount.should.above(0);
      should.exist(ret.aliveNode);
      ret.serverList[0].should.length(ret.bucketCount);
      done();
    });
  });

  xit('should have not lost any of config when retrieveConfigure', function (done) {
    configServer.retrieveConfigure('group_market2', 0, [
      {host: '10.235.144.195', port: 5198}
    ], function (err, ret) {
      should.not.exist(err);
      configServer.retrieveConfigure('group_market2', 0, [
        {host: '10.235.144.195', port: 5198}
      ], function (err, ret) {
      });
      configServer.serverList.length.should.above(0);
      configServer.bucketCount.should.above(0);
      done();
    });
  });

  xit('should get right configure from another one first server down', function (done) {
    configServer.retrieveConfigure('group_market2', 0, [
      {host: '127.0.0.1', port: 62345},
      {host: '10.235.144.195', port: 5198}
    ], function (err, ret) {
      should.not.exist(err);
      ret.configVersion.should.above(0);
      ret.bucketCount.should.above(0);
      should.exist(ret.aliveNode);
      ret.serverList[0].should.length(ret.bucketCount);
      done();
    });
  });

  it('should callback (err) when server is down ', function (done) {
    configServer.retrieveConfigure('group_market2', 0, [
      {host: '127.0.0.1', port: 62345}
    ], function (err, ret) {
      should.exist(err);
      done();
    });
  });

  it('#getDateNode error test', function () {
    var that = {
      serverList: null
    };
    var zero = configServer.getDataNode.call(that, 'sdf');
    zero.should.equal(0);
    that.serverList = ['1234567', '7890101'];
    that.aliveNodes = {};
    zero = configServer.getDataNode.call(that, 'sdf', true);
    zero.should.equal(0);
  });
});