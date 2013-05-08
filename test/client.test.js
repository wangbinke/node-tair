/*
 * tair - test/client.test.js
 * Copyright(c) 2012 Taobao.com
 * Author: kate.sf <kate.sf@taobao.com>
 */

var cli = require('../lib/client.js');
var should = require('should');
var fs = require('fs');

var tair;

describe('client.test.js', function () {

  before(function (done) {
    tair = new cli('group_market2', [
      {host: '127.0.0.1', port: 62345},
      {host: '10.235.144.195', port: 5198}
    ], {heartBeatInterval: 3000},
      function (err) {
        if (err) {
          done(err);
          return;
        }
        done();
      });
  });

  it('#set method should set a data', function (done) {
    tair.set('unittestjs', 'we are testers', function (err, success) {
      should.not.exist(err);
      success.should.equal(true);
      done();
    });
  });

  it('#get method should get right data', function (done) {
    tair.get('unittestjs', function (err, data) {
      should.not.exist(err);
      data.should.equal('we are testers');
      done();
    });
  });

  it('#get and #set method should get buffer data when datatype is buffer', function (done) {
    tair.set('unittestjs2', new Buffer('we are testers'), function (err, success) {
      tair.get('unittestjs2', 0, function (err, data) {
        should.not.exist(err);
        should.exist(data);
        should.ok(Buffer.isBuffer(data));
        done();
      }, false, 'buffer');
    });
  });

  it('#get method should get empty data when key is wrong', function (done) {
    tair.get('zhemechangniyoume', function (err, data) {
      should.not.exist(err);
      should.not.exist(data);
      done();
    });
  });

  it('#remove method should remove data right', function (done) {
    tair.set('unittestjs', 'we are testers', function (err, success) {
      should.not.exist(err);
      success.should.equal(true);
      tair.remove('unittestjs', function (err) {
        should.not.exist(err);
        tair.get('unittestjs', function (err, data) {
          should.not.exist(err);
          should.not.exist(data);
          done();
        });
      });
    });
  });

  it('#set and #get will work well on large data', function (done) {
    var content = fs.readFileSync('./test/large_text.txt', 'utf-8');
    tair.set('alargeData', content, function (err, success) {
      should.not.exist(err);
      success.should.equal(true);
      tair.get('alargeData', function (err, data) {
        should.not.exist(err);
        data.should.equal(content);
        done();
      });
    });
  });

  it('#incr and decr will work well', function (done) {
    var keyName = 'incrTestKey' + new Date().getTime();
    tair.incr(keyName, 1, function (err, data) {
      should.not.exist(err);
      data.should.equal(1);

      tair.decr(keyName, 1, function (err, data) {
        should.not.exist(err);
        data.should.equal(0);
        tair.incr(keyName, 0, function (err, data) {
          should.not.exist(err);
          data.should.equal(0);
          done();
        });
      });
    });
  });

  it('heartbeat should work', function (done) {
    tair.heartbeat(function (count) {
      count.should.above(0);
      count.should.below(100);
    });
    setTimeout(function () {
      tair.heartBeatCount.should.equal(3);
      done();
    }, 4.5 * 1000);
  });

  it('#mget will work well', function (done) {
    var testCases = {caonima: 'yamiedie', juhuacan: 'fuckyou', loli: 'dashu', meizi: 'shuaiguo'};
    var testKeys = ['caonima', 'juhuacan', 'loli', 'meizi'];
    var setCount = 4;
    for (var k in testCases) {
      var v = testCases[k];
      tair.set(k, v, function (err, succ) {
        should.not.exist(err);
        succ.should.be.equal(true);
        setCount--;
        if (setCount === 0) {
          tair.mget(testKeys, function (err, data) {
            should.not.exist(err);
            data.should.have.property('caonima');
            data.length.should.equal(3);
            data.juhuacan.should.equal('fuckyou');
            done();
          });
        }
      });
    }
  });

});
