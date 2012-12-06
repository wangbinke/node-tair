/*!
 * tair - lib/client.js
 * Copyright(c) 2012 Taobao.com
 * Author: kate.sf <kate.sf@taobao.com>
 */

var configServer = require('./configServer');
var comm = require('./comm');
var packet = require('./packet');
var consts = require('./const');
var utils = require('./utils');

/**
 * initial clients. must be first called, all three params must be used
 * @type {Function}
 * @params groupnName：group name of tair
 * @params hostList: config server list of tair, like [{host: '10.235.144.116', port: 5198}]
 * @params callback(err):
 */
var Tair = module.exports = function (groupName, hostList, options, callback) {

  if (!(this instanceof Tair)) {
    return new Tair(groupName, hostList, options, callback);
  }
  options = options || {};
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  callback = callback || function () {
  };
  if (!groupName || !hostList || !callback) {
    return;
  }
  this.heartBeatInterval = options.heartBeatInterval || 10 * 1000;
  var that = this;
  this.requestQueue = [];
  // init the serverlist etc. only need to init once once program run.
  this.bucketCount = 0;
  this.copyCount = 0;
  this.aliveNodes = [];
  this.serverList = [];
  this.configVersion = 0;

  this.retrieveConfigure(groupName, hostList, function (err, res) {
    if (err) {
      return callback(err);
    }
    callback(null);
    if (res && res.serverList) {
      // run heart beat once to make connect to all datanodes
      that.heartbeat();
      // heartbeat interval
      if (!that._hInterval) {
        that._hInterval = setInterval(that.heartbeat.bind(that), that.heartBeatInterval);
      }
    }
    if (that.requestQueue && that.requestQueue.length > 0) {
      for (var i = 0; i < that.requestQueue.length; i++) {
        var method = that.requestQueue[i].method;
        that[method].apply(that.requestQueue[i].that, that.requestQueue[i].args);
      }
      delete this.requestQueue;
    }
    setInterval(function () {
      var now = new Date().getTime();
      if (that.inited && (now - that.lastSyncConfig > 120 * 1000)) {
        that.retrieveConfigure(that._groupName, that._hostList, function () {
        });
      }
    }, 60 * 1000);
  })
};
Tair.prototype.heartbeat = function (callback) {
  callback = callback || function () {
  };
  // get a key each datanode, for datanode does not eval key`s hash is right when get, one key is enouge.
  var _packet = packet.requestGetOrRemovePacket(0, 'heartbeatkey_nodejs');
  var _servers = this.serverList[0];
  var serverMap = {};
  for (var i = 0; i < _servers.length; i++) {
    var ip = _servers[i].host >>> 0;
    var addr = {host: utils.longToIP(ip), port: _servers[i].port, success: (ip !== 0)};
    // there`s buklet info in serverlist, so we should build a map to ensure one datenode one request
    serverMap[ip] = addr;
  }
  var finished = 0;
  var total = 0;
  var _int = this.heartBeatInterval;
  var that = this;
  for (var key in serverMap) {
    total++;
    comm.getData(serverMap[key], _packet, function (err, data) {
      if (err) {
        console.error("HeartBeat Error! Error: %s", err.toString());
      }
      finished++;
      if (finished >= total) {
        that.heartBeatCount = (that.heartBeatCount || 0) + 1;
        callback(finished);
      }
    });
  }

};

Tair.prototype.retrieveConfigure = function (groupName, hostList, callback) {
  var that = this;
  configServer.retrieveConfigure.apply(this, [groupName, 0, hostList, function (err, res) {
    if (err) {
      return callback(err);
    }
    that._groupName = groupName;
    that._hostList = hostList;
    that.inited = true;
    that.lastSyncConfig = new Date().getTime();
    callback(null, res);

  }]);
}

Tair.prototype.getDataNode = function () {
  return configServer.getDataNode.apply(this, Array.prototype.slice.apply(arguments));
}

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
Tair.prototype.set = Tair.prototype.setEx = function (key, value, expire, namespace, version, callback) {
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
  if (!this.inited) {
    //console.warn('Tair: client not init');
    this.requestQueue.push({method: 'set', args: Array.prototype.slice.apply(arguments), that: this});
    return;
  }
  var _packet = packet.requestPutPacket(_namespace, _version, key, value, _expire);
  var _addr = this.getDataNode(key);
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
 * @params fitJava: true/ false, set to fit java key type
 */
Tair.prototype.get = function (key, namespace, callback, fitJava, datatype) {
  var _namespace = typeof namespace === 'number' ? namespace : 0;
  if (typeof namespace === 'function') {
    callback = namespace;
  }
  if (typeof fitJava !== 'boolean') {
    datatype = fitJava;
    fitJava = null;
  }
  datatype = datatype || 'string';

  if (!key || key.length === 0 || typeof key !== 'string') {
    return callback(new Error('Tair: params lack.'), false);
  }

  if (!this.inited) {
    //console.warn('Tair: client not init');
    this.requestQueue.push({method: 'get', args: Array.prototype.slice.apply(arguments), that: this});
    return;
  }

  var _packet = packet.requestGetOrRemovePacket(_namespace, key, null, fitJava);

  var _addr = this.getDataNode(key, null, fitJava);
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
    if (datatype === 'string' && res && res.value) {
      res.value = res.value.toString('utf-8').replace('\u0000', '');
    }
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
Tair.prototype.mget = function (keys, namespace, callback) {
  var _namespace = typeof namespace === 'number' ? namespace : 0;
  if (typeof namespace === 'function') {
    callback = namespace;
  }

  if (!keys || keys.length === 0 || !Array.isArray(keys)) {
    return callback(new Error('Tair: params lack.'), false);
  }

  if (!this.inited) {
    //console.warn('Tair: client not init');
    this.requestQueue.push({method: 'mget', args: Array.prototype.slice.apply(arguments), that: this});
    return;
  }

  var _keys = [];
  var _packets = {};
  for (var i = 0, l = keys.length; i < l; i++) {
    if (typeof keys[i] === 'string' && keys[i].length > 0 && keys[i].length < consts.NAMESPACE_MAX) {
      var _addr = this.getDataNode(keys[i]);
      var _addrKey = _addr.host + _addr.port;
      if (!_packets[_addrKey]) {
        _packets.length = (_packets.length || 0) + 1;
        _packets[_addrKey] = [];
        _packets[_addrKey].addr = _addr;
      }
      // 记录下每个服务器中发哪些包
      _packets[_addrKey].push(keys[i]);
    }
  }
  // 构建包
  // addr不会很多，用for..in..不会有性能问题
  var retCount = 0;
  var returned = {};
  var itemCount = 0;
  for (var k in _packets) {
    if (k === 'addr' || k === 'length') {
      continue;
    }
    var realkeys = [];
    for (var i = 0; i < _packets[k].length; i++) {
      realkeys.push(_packets[k][i]);
    }
    var _buf = packet.requestMGetPacket(_namespace, realkeys);
    comm.getData(_packets[k].addr, _buf, function (err, data, len) {
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
        returned[ret.keys[j]] = ret.values[j];
        itemCount++;
      }
      retCount++;
      if (retCount === _packets.length) {
        returned.length = itemCount;
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
Tair.prototype.remove = Tair.prototype.delete = function (key, namespace, callback) {

  var _namespace = typeof namespace === 'number' ? namespace : 0;
  if (typeof namespace === 'function') {
    callback = namespace;
  }

  if (!key || key.length === 0 || typeof key !== 'string') {
    return callback(new Error('Tair: params lack.'), false);
  }

  if (!this.inited) {
    //console.warn('Tair: client not init');
    this.requestQueue.push({method: 'remove', args: Array.prototype.slice.apply(arguments), that: this});
    return;
  }

  var _packet = packet.requestGetOrRemovePacket(_namespace, key, true);

  var _addr = this.getDataNode(key);
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
  if (!this.inited) {
    //console.warn('Tair: client not init');
    this.requestQueue.push({method: 'incDec', args: Array.prototype.slice.apply(arguments), that: this});
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
  var _addr = this.getDataNode(key);
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
Tair.prototype.incr = function (key, count, namespace, initValue, expire, callback) {
  count = count || 0;
  return incDec.apply(this, [key, count, namespace, initValue, expire, callback]);
};
Tair.prototype.decr = function (key, count, namespace, initValue, expire, callback) {
  count = count || 0;
  return incDec.apply(this, [key, -count, namespace, initValue, expire, callback]);
};
