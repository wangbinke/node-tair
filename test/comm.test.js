/*!
 * tair - test/comm.test.js
 * Copyright(c) 2012 Taobao.com
 * Author: kate.sf <kate.sf@taobao.com>
 */

var comm = require('../lib/comm.js');
var should = require('should');

describe('comm.test.js should do right communation to a server', function () {
  var reqBuffer = new Buffer('GET / HTTP/1.1 \r\n' +
    'Host: www.baidu.com \r\n' +
    'Connection: keep-alive\r\n' +
    'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_7_4) AppleWebKit/536.11 (KHTML, like Gecko) Chrome/20.0.1132.57 Safari/536.11\r\n' +
    'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8\r\n' +
    'Accept-Encoding: gzip,deflate,sdch');

  it('should get a data from a server', function (done) {

    comm.getData({addr: '74.125.71.105', port: 80}, reqBuffer, function(err, data, datalen) {
      should.not.exist(err);
      datalen.should.equal(0);
      data[0].should.equal(0);
      done();
    });

  });


});