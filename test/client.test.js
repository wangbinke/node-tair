/*
 * tair - test/client.test.js
 * Copyright(c) 2012 Taobao.com
 * Author: kate.sf <kate.sf@taobao.com>
 */

var cli = require('../lib/client.js');
var should = require('should');
var consts = require('../lib/const');
var fs = require('fs');

describe('client.test.js', function () {

  before(function (done) {
    cli.initClient('group_ju', [
      {host: '10.235.144.116', port: 5198}
    ], function (err) {
      if (err) {
        console.log(err);
        done(err);
      }
      done();
    });
  });

  it('#set method should set a data', function (done) {
    cli.set('unittestjs', 'we are testers', function (err, success) {
      should.not.exist(err);
      success.should.equal(true);
      done();
    });
  });

  it('#get method should get right data', function (done) {
    cli.get('unittestjs', function (err, data) {
      should.not.exist(err);
      data.should.equal('we are testers');
      done();
    });
  });

  it('#get method should get empty data when key is wrong', function (done) {
    cli.get('zhemechangniyoume', function (err, data) {
      should.not.exist(err);
      should.not.exist(data);
      done();
    });
  });

  it('#remove method should remove data right', function (done) {
    cli.set('unittestjs', 'we are testers', function (err, success) {
      should.not.exist(err);
      success.should.equal(true);
      cli.remove('unittestjs', function (err) {
        should.not.exist(err);
        cli.get('unittestjs', function (err, data) {
          should.not.exist(err);
          should.not.exist(data);
          done();
        });
      });
    });
  });

  it('#set and #get will work well on large data', function (done) {
    var content = fs.readFileSync('./test/large_text.txt', 'utf-8');
    cli.set('alargeData', content, function (err, success){
      should.not.exist(err);
      success.should.equal(true);
      cli.get('alargeData', function (err, data){
        should.not.exist(err);
        data.should.equal(content);
        done();
      });
    });
  });

});