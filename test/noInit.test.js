/*
 * tair - test/no_init.test.js
 * Copyright(c) 2012 Taobao.com
 * Author: kate.sf <kate.sf@taobao.com>
 */

var cli = require('../lib/client.js');
var should = require('should');

describe('noinit.test.js', function () {
  it('should put req in queue when not init, and after init well deal them', function (done) {
    var tair = new cli('group_market2', [
      {host: '10.235.144.193', port: 5198}
    ], function (err) {
      should.not.exist(err);
    });
    var doned = 0;
    tair.set('unittestjs', 'we are testers', function (err, success) {
      should.not.exist(err);
      success.should.equal(true);
      doned++;
      if (doned === 3) {
        done();
      }
    });
    tair.get('unittestjs', 0, function (err, data) {
      should.not.exist(err);
      doned++;
      if (doned === 3) {
        done();
      }
    });
    tair.remove('unittestjs', function (err, data) {
      //should.not.exist(err);
      doned++;
      if (doned === 3) {
        done();
      }
    });
  });
});