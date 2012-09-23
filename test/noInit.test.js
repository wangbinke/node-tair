/*
 * tair - test/no_init.test.js
 * Copyright(c) 2012 Taobao.com
 * Author: kate.sf <kate.sf@taobao.com>
 */

var cli = require('../lib/client.js');
var should = require('should');

describe('client.test.js', function () {
  it('should put req in queue when not init, and after init well deal them', function (done) {
    var tair = new cli('group_ju', [
      {host: '10.235.144.116', port: 5198}
    ], function (err) {
      should.not.exist(err);
    });
    tair.set('unittestjs', 'we are testers', function (err, success) {
      should.not.exist(err);
      success.should.equal(true);
      done();
    });
  });
});