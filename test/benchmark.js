/*
 * tair - test/benchmark.js
 * only runs on node 0.8.0 and above
 * Copyright(c) 2012 Taobao.com
 * Author: kate.sf <kate.sf@taobao.com>
 */

var cluster = require('cluster');
var bench = {};

var content = 'testforcontent9515746301152565720|2592155@2837774@2738597@12' +
  '168802786630@2775310@1791451@20433231723932592119@12962392225939@288' +
  '1505@28575562059594@2224912@2581747@26926462751004@2490638@2852799@2735862@273' +
  '5864@我是中文@2558276@2we4565@25817592836758@29202652910057@2285988';

var costTime = 0;
var errCount = 0;

bench.set = function (maxTimes) {
  var ccount = 0;
  var cli = require('./../index');
  var tair = new cli('group_ju', [
    {host: '10.235.144.116', port: 5198}
  ], function (err) {
    if (err) {
      console.log(err);
    }
    worker(0, new Date().getTime(), maxTimes, 'set', tair);
  });
};

bench.get = function (maxTimes) {
  var cli = require('./../index');
  var tair = new cli('group_ju', [
    {host: '10.235.144.116', port: 5198}
  ], function (err) {
    if (err) {
      console.log(err);
    }
    worker(0, new Date().getTime(), maxTimes, 'get', tair);
  });
};

function worker (times, starttime, maxTimes, method, cli) {
  var arg2 = 0;
  if (method === 'set') {
    arg2 = content;
  }
  cli[method]('hello2test', arg2, function (err, data) {
    if (err) {
      console.log(err);
    }
    times = times || 1;
    times++;
    if (data !== content && data !== true) {
      if (!cluster.isMaster) {
        process.send('err');
      }
    }

    if (times === maxTimes) {
      if (!cluster.isMaster) {
        costTime = (new Date().getTime() - starttime);
        process.send(costTime);
        cluster.worker.destroy();
      }
    }
    worker(times, starttime, maxTimes, method, cli);
  });
}

function main (argv) {
  var test = argv[2];
  var times = argv[3] || 200;
  var threads = argv[4] || 5;
  if (!bench[test]) {
    console.log('usage: node benchmark.js benchname [times=100] [threads=5]');
    return process.exit(0);
  }
  if (cluster.isMaster) {
    console.log('Node-Tair Benchmark Started, Waiting...');
    threads = parseInt(threads, 10);
    for (var i = 0; i < threads; i++) {
      cluster.fork();
    }
    var finished = 0;
    Object.keys(cluster.workers).forEach(function (id) {
      cluster.workers[id].on('message', function (msg) {
        if (msg === 'err') {
          errCount++;
        } else if (!isNaN(parseInt(msg, 10))) {
          costTime += parseInt(msg, 10);
        }
      });
    });
    cluster.on('exit', function (worker, code, signal) {
      finished++;
      if (finished === threads) {
        console.log('Node-Tair Benchmark Finished.');
        var qps = (threads * times / Math.floor(costTime / threads, 10) * 1000).toFixed(2);
        console.log('Working Threads: %d\nRequest Counts: %d\nSuccess: %d\nFailure: %d\nCost Time: %d [ms]\nQPS: %d [#/sec]',
          threads, threads * times, threads * times - errCount, errCount, Math.floor(costTime / threads, 10), qps
        );
      }
    });
  } else {
    bench[test](parseInt(times, 10));
  }
}

main(process.argv);