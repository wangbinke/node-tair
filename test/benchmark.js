var cluster = require('cluster');
var bench = {};

var content = 'lzstat_uv=9515746301159965720|2592155@2837774@2738597@12' +
  '16880@2786630@2775310@1791451@2043323@1723936@2592119@1296239@2225939@288' +
  '1505@2857556@2059594@2208862@2581747@2692646@2751004@2490638@2852799@2735862@273' +
  '5864@2229691@2558276@2800965@2581759@2836758@2920265@2910057@2285988';

var costTime = 0;
var errCount = 0;

bench.set = function (maxTimes) {
  var ccount = 0;
  var cli = require('./../index');
  cli.initClient('group_ju', [
    {host: '10.235.144.116', port: 5198}
  ], function (err) {
    if (err) {
      console.log(err);
    }
    worker(0, new Date().getTime(), maxTimes, 'set', cli);
  });
};

bench.get = function (maxTimes) {
  var cli = require('./../index');
  cli.initClient('group_ju', [
    {host: '10.235.144.116', port: 5198}
  ], function (err) {
    if (err) {
      console.log(err);
    }
    worker(0, new Date().getTime(), maxTimes, 'get', cli);
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
  var times = argv[3] || 1000;
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