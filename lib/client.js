/*!
 * tair - lib/client.js
 * Copyright(c) 2012 Taobao.com
 * Author: kate.sf <kate.sf@taobao.com>
 */

var configServer = require('./configServer');
var comm = require('./comm');
var packet = require('./packet');

var inited = false;
var lastSyncConfig = 0;

var _groupName = '';
var _hostList = '';

/**
 * initial clients. must be first called, all three params must be used
 * @type {Function}
 * @params groupnName：group name of tair
 * @params hostList: config server list of tair, like [{host: '10.235.144.116', port: 5198}]
 * @params callback(err):
 */
exports.initClient = function (groupName, hostList, callback) {

  if (!groupName || !hostList || !callback) {
    return;
  }

  configServer.retrieveConfigure(groupName, 0, hostList, function (err) {
    if (err) {
      return callback(err);
    }
    _groupName = groupName;
    _hostList = hostList;
    inited = true;
    lastSyncConfig = new Date().getTime();
    callback(null);
  });
};

setInterval(function () {
  var now = new Date().getTime();
  if (inited && (now - lastSyncConfig > 120 * 1000)) {
    exports.initClient(_groupName, _hostList, function () {
    });
  }
}, 60 * 1000);

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
  if (typeof expire === 'function') {
    callback = expire;
  }
  if (typeof namespace === 'function') {
    callback = namespace;
  }
  if (typeof version === 'function') {
    callback = version;
  }
  if (!key || key.length === 0 || typeof key !== 'string') {
    return callback(new Error('Tair: params lack.'), false);
  }
  if (!value || value.length === 0) {
    return callback(new Error('Tair: params lack.'), false);
  }
  if (!inited) {
    return callback(new Error('Tair: client not init'), false);
  }
  var _packet = packet.requestPutPacket(_namespace, _version, key, value, _expire);
  var _addr = configServer.getDataNode(key);
  if (!_addr.success) {
    return callback(new Error('Tair: find datanode error'), false);
  }
  comm.getData(_addr, _packet, function (err, data, len) {
    if (err) {
      return callback(err, false);
    }
    var returned = packet.returnPacket(data);
    if (returned.code !== 0) {
      return callback(new Error('Tair Error: Code ' + returned.code));
    }
    return callback(null, true);
  });

};

/**
 * get  method
 * @type {Function}
 * @params key：must be string, the key to get
 * @params namespace: the area(namespace) of data, number 0~1023, optional, default is 0
 * @params callback(err, data):
 */
exports.get = function (key, namespace, callback) {

  var _namespace = typeof namespace === 'number' ? namespace : 0;
  if (typeof namespace === 'function') {
    callback = namespace;
  }

  if (!key || key.length === 0 || typeof key !== 'string') {
    return callback(new Error('Tair: params lack.'), false);
  }

  if (!inited) {
    return callback(new Error('Tair: client not init'), false);
  }

  var _packet = packet.requestGetOrRemovePacket(_namespace, key);

  var _addr = configServer.getDataNode(key);
  if (!_addr.success) {
    return callback(new Error('Tair: find datanode error'), false);
  }

  comm.getData(_addr, _packet, function (err, data, len) {
    if (err) {
      return callback(err, false);
    }
    var res = packet.responseGetPacket(data);
    if (!res || !res.key || res.key !== key) {
      return callback(null, null);
    }
    return callback(null, res.value);
  });
};

/**
 * remove  method
 * @type {Function}
 * @params key：must be string, the key to remove
 * @params namespace: the area(namespace) of data, number 0~1023, optional, default is 0
 * @params callback(err):
 */
exports.remove = exports.delete = function (key, namespace, callback) {

  var _namespace = typeof namespace === 'number' ? namespace : 0;
  if (typeof namespace === 'function') {
    callback = namespace;
  }

  if (!key || key.length === 0 || typeof key !== 'string') {
    return callback(new Error('Tair: params lack.'), false);
  }

  if (!inited) {
    return callback(new Error('Tair: client not init'), false);
  }

  var _packet = packet.requestGetOrRemovePacket(_namespace, key, true);

  var _addr = configServer.getDataNode(key);
  if (!_addr.success) {
    return callback(new Error('Tair: find datanode error'), false);
  }

  comm.getData(_addr, _packet, function (err, data, len) {
    if (err) {
      return callback(err, false);
    }
    var returned = packet.returnPacket(data);
    if (returned.code !== 0) {
      return callback(new Error('Tair Error: Code ' + returned.code));
    }
    return callback(null);
  });
};

function incDec(key, count, namespace, initValue, expire, callback) {
  if (!key || key.length === 0) {
    return callback(new Error('Tair: params lack.'));
  }
  var _namespace = typeof namespace === 'number' ? namespace : 0;
  var _count = typeof count === 'number' ? count : 0;
  var _initValue = typeof initValue === 'number' ? initValue : 0;
  var _expire = typeof expire === 'number' ? expire : 0;
  if (typeof count === 'function') {
    callback = count;
  }
  if (typeof namespace === 'function') {
    callback = namespace;
  }
  if (typeof initValue === 'function') {
    callback = initValue;
  }
  if (typeof expire === 'function') {
    callback = expire;
  }

  var _packet = packet.requestIncDecPacket(_namespace, key, _count, _initValue, _expire);
  var _addr = configServer.getDataNode(key);
  if (!_addr.success) {
    return callback(new Error('Tair: find datanode error'), false);
  }

  comm.getData(_addr, _packet, function (err, data, len) {
    if (err) {
      return callback(err, false);
    }
    var returned = packet.returnPacket(data);
    if (returned.code < 0) {
      return callback(new Error('Tair Error: Code ' + returned.code));
    }
    return callback(null, returned.code);
  });
}

/**
 * incr / decr  method
 * @type {Function}
 * @params key：must be string, the key to remove
 * @params count: amount to plus or minus, usually be positive number
 * @params namespace: the area(namespace) of data, number 0~1023, optional, default is 0
 * @params initValue: if key is not exist, give it a value
 * @params expire: if key is not exist, the new value`s expire(seconds)
 * @params callback(err, data):
 */
exports.incr = function (key, count, namespace, initValue, expire, callback) {
  count = count || 1;
  return incDec(key, count, namespace, initValue, expire, callback);
};
exports.decr = function (key, count, namespace, initValue, expire, callback) {
  count = - count || -1;
  return incDec(key, count, namespace, initValue, expire, callback);
};
