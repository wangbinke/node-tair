/*!
 * tair - lib/client.js
 * Copyright(c) 2012 Taobao.com
 * Author: kate.sf <kate.sf@taobao.com>
 */

var configServer  = require('./configServer');
var comm = require('./comm');
var packet = require('./packet');

var inited = false;

configServer.retrieveConfigure('group_ju', 0, [{host:'10.235.144.116', port:5198}], function(err) {
  console.log(err);
  inited = true;
  exports.set('2hex2345', 'suanbumingbai');
});



/**
 * set / setEx method
 * @type {Function}
 * @params key：must be string, the key to set
 * @params value: usually string, the value to set
 * @params expire: seconds to expire, number, optional, default is 0 (not expired)
 * @params namespace: the area(namespace) of data, number 0~1023, optional, default is 0
 * @params version: the version of data, using to solve concurrency conflicts, not commonly used in cache, optional, default is 0
 * @params callback(err, success):
 */
exports.set = exports.setEx = function (key, value, expire, namespace, version, callback) {
  var _expire = typeof expire === 'number' ? expire : 0;
  var _namespace = typeof namespace === 'number' ? namespace : 0;
  var _version = typeof version === 'number' ? version : 0;
  if(typeof expire === 'function') {
    callback = expire;
  }
  if(typeof namespace === 'function') {
    callback = namespace;
  }
  if(typeof version === 'function') {
    callback = version;
  }
  if(!key || key.length === 0 || typeof key !== 'string') {
    return callback(new Error('Tair: params lack.'), false);
  }
  if(!value || value.length === 0) {
    return callback(new Error('Tair: params lack.'), false);
  }
  if(!inited) {
    return callback(new Error('Tair: client not init'), false);
  }
  var _packet = packet.requestPutPacket(_namespace, _version, key, value, _expire);
  var _addr = configServer.getDataNode(key);
  console.log(_addr);
  if(!_addr.success) {
    return callback(new Error('Tair: find datanode error'), false);
  }
  comm.getData(_addr, _packet, function(err, data, len) {
     if(err) {
       return callback(err, false);
     }
     console.log(packet.returnPacket(data));
  });

};