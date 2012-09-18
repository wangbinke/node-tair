/*!
 * tair - lib/client.js
 * Copyright(c) 2012 Taobao.com
 * Author: kate.sf <kate.sf@taobao.com>
 */

var configServer = require('./configServer');
var comm = require('./comm');
var packet = require('./packet');
var consts = require('./const');

var inited = false;
var lastSyncConfig = 0;

var _groupName = '';
var _hostList = '';
var requestQueue = [];
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
    if (requestQueue.length > 0) {
      for (var i = 0; i < requestQueue.length; i++) {
        var method = requestQueue[i].method;
        exports[method].apply(this, requestQueue[i].args);
      }
    }
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
    //console.warn('Tair: client not init');
    requestQueue.push({method: 'set', args: arguments});
    return;
  }
  var _packet = packet.requestPutPacket(_namespace, _version, key, value, _expire);
  var _addr = configServer.getDataNode(key);
  if (!_addr.success) {
    return callback(new Error('Tair: find datanode error'), false);
  }

  if (key.length >= consts.NAMESPACE_MAX) {
    return callback(null, false);
  }
  if (value.length >= consts.TAIR_MALLOC_MAX - 1) {
    return callback(null, false);
  }

  comm.getData(_addr, _packet, function (err, data, len) {
    if (err) {
      if (!callback.called) {
        callback.called = true;
        return callback(err, false);
      }
    }
    var returned = packet.returnPacket(data);
    if (returned.code !== 0) {
      if (!callback.called) {
        callback.called = true;
        return callback(new Error('Tair Error: Code ' + returned.code));
      }
    }
    if (!callback.called) {
      callback.called = true;
      return callback(null, true);
    }
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
    //console.warn('Tair: client not init');
    requestQueue.push({method: 'get', args: arguments});
    return;
  }

  var _packet = packet.requestGetOrRemovePacket(_namespace, key);

  var _addr = configServer.getDataNode(key);
  if (!_addr.success) {
    return callback(new Error('Tair: find datanode error'), null);
  }

  if (key.length >= consts.NAMESPACE_MAX) {
    return callback(null, null);
  }

  comm.getData(_addr, _packet, function (err, data, len) {
    if (err) {
      if (!callback.called) {
        callback.called = true;
        return callback(err, false);
      }
    }
    var res = packet.responseGetPacket(data);
    if (!res || !res.key || res.key !== key) {
      if (!callback.called) {
        callback.called = true;
        return callback(null, null);
      }
    }
    if (!callback.called) {
      callback.called = true;
      return callback(null, res.value);
    }
  });
};

/**
 * get  method
 * @type {Function}
 * @params keys：must be an array of string, the key to get
 * @params namespace: the area(namespace) of data, number 0~1023, optional, default is 0
 * @params callback(err, data):
 */
exports.mget = function (keys, namespace, callback) {
  var _namespace = typeof namespace === 'number' ? namespace : 0;
  if (typeof namespace === 'function') {
    callback = namespace;
  }

  if (!keys || keys.length === 0 || !Array.isArray(keys)) {
    return callback(new Error('Tair: params lack.'), false);
  }

  if (!inited) {
    //console.warn('Tair: client not init');
    requestQueue.push({method: 'mget', args: arguments});
    return;
  }

  var _keys = [];
  var _packets = {};
  for (var i = 0, l = keys.length; i < l; i++) {
    if (typeof keys[i] === 'string' && keys[i].length > 0 && keys[i].length < consts.NAMESPACE_MAX) {
      _keys.push(keys[i]);
      var _addr = configServer.getDataNode(keys[i]);
      var _addrKey = _addr.host + _addr.port;
      if (!_packets[_addrKey]) {
        _packets[_addrKey] = [];
        _packets[_addrKey].addr = _addr;
      }
      // 记录下每个服务器中发哪些包
      _packets[_addrKey].push(_keys.length - 1);
    }
  }
  // 构建包
  // addr不会很多，用for..in..不会有性能问题
  var retCount = 0;
  var returned = {};
  for (var k in _packets) {
    var realkeys = [];
    for (var i = 0; i < _packets[k].length; i++) {
      realkeys.push(_keys[_packets[k][i]]);
    }
    comm.getData(_packets[k].addr, packet.requestMGetPacket(_namespace, realkeys), function (err, data, len) {
      if (err) {
        retCount++;
        if (retCount === _packets.length) {
          return callback(null, returned);
        }
        return;
      }
      var ret = packet.responseMGetPacket(data) || {};
      ret.count = ret.count || 0;
      for (var j = 0; j < ret.count; j++) {
        returned[ret.keys[i]] = ret.value[i];
      }
      retCount++;
      if (retCount === _packets.length) {
        returned.length = retCount;
        return callback(null, returned);
      }
    });
  }

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
    //console.warn('Tair: client not init');
    requestQueue.push({method: 'remove', args: arguments});
    return;
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

function incDec (key, count, namespace, initValue, expire, callback) {
  if (!key || key.length === 0) {
    return callback(new Error('Tair: params lack.'));
  }
  if (!inited) {
    //console.warn('Tair: client not init');
    requestQueue.push({method: 'incDec', args: arguments});
    return;
  }
  if (key.length >= consts.NAMESPACE_MAX) {
    return callback(null, null);
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
  count = count || 0;
  return incDec(key, count, namespace, initValue, expire, callback);
};
exports.decr = function (key, count, namespace, initValue, expire, callback) {
  count = count || 0;
  return incDec(key, -count, namespace, initValue, expire, callback);
};
