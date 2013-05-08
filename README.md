# Node Tair

Taobao [Tair](http://code.taobao.org/p/tair/src/) Client for Node.js, build on pure javascript without any native code.

## Installation

	$ npm install tair

Strongly recommand you use node >= 0.8.0 to use this lib for its performance improve on io and buffer.

## An Example

````js
var cli = require('tair');

var configServer = [{host: '10.20.30.40', port: 5189}]; /* you can also add another slave server to it */
// firstly must
var tair = new cli('group_name', configServer, function (err){
  if (err) {
    console.log(err);
  }
  tair.set('key', 'value', function(err, isSuccess){
    console.log(success);
  });
});
````

## API


	Tair(groupName, hostList, callback)
	 * initial clients from config servers, must be first called, all three params must be used
	 * @params groupnName：group name of tair
	 * @params hostList: config server list of tair, like [{host: '10.235.144.116', port: 5198}]
	 * @params options
   * heartBeatInterval = 10 * 1000 {Number} interval time for heartbeat, mili-seconds
   * timeout = 5000 {Number}, timeout for network, mili-seconds
	 * @params callback(err)


	Tair.set / Tair.setEx (key, value, [expire], [namespace], [version], callback)
	 * set a key with a value
	 * @params key：must be string, the key to set
	 * @params value: usually string, the value to set
	 * @params expire: seconds to expire, number, optional, default is 0 (not expired)
	 * @params namespace: the area(namespace) of data, number 0~1023, optional, default is 0
	 * @params version: the version of data, using to solve concurrency conflicts, not commonly used in cache, optional, default is 0
	 * @params callback(err, success): success is true when set successfully


	Tair.get (key, [namespace], callback, fitJava, dataType)
	 * get a key from a datanode
	 * @params key：must be string, the key to get
	 * @params namespace: the area(namespace) of data, number 0~1023, optional, default is 0
	 * @params callback(err, data): if key on server is not exist, data is null, or data will be a string or buffer
   * @params fitJava: true/ false, set to fit java key type
   * @params datatype: 'string' or 'buffer', returned data type, default is string.

  Tair.mget (keys, [namespace], callback)
   * get multi keys from tair
   * @params keys：must be an array of string, the keys to get
   * @params namespace: the area(namespace) of data, number 0~1023, optional, default is 0
   * @params callback(err, data): if key on server is not exist, data is null, or data will be an map

	Tair.remove (key, [namespace], callback)
	 * remove / delete a key from a datanode
	 * @params key：must be string, the key to remove
	 * @params namespace: the area(namespace) of data, number 0~1023, optional, default is 0
	 * @params callback(err)


	Tair.incr / Tair.decr (key, [count], [namespace], [initValue], [expire], callback)
	 * increace or decreace a count object on tair, count object is different from object from usually set / get. First use these method on a key will create it with initValue or 0;
	 * @params key：must be string, the key to remove
	 * @params count: amount to plus or minus, usually be positive number
	 * @params namespace: the area(namespace) of data, number 0~1023, optional, default is 0
	 * @params initValue: if key is not exist, give it a value
	 * @params expire: if key is not exist, the new value`s expire(seconds)
	 * @params callback(err, data): data is the count number after incr or decr.

## Preformance

#### Compare Tests
Preformance tests are under Taobao's LAN Servers.
As to compare with other version of clients, we use test server and config in [this](http://confluence.taobao.ali.com:8080/pages/viewpage.action?pageId=194136575) page(could only visit in Alibaba`s LAN);
We use cluster to fork 10 threads in order to simulate the test under java, all test are under jdk 1.5 and node 0.8.7.

Java Client Test Result (get):

    time: 30010 // whole time cose（ms）
    total: 230774 // total amount of request
    qps: 7692
    min: 0.001001,max:522.133,avg:0.6500260010400416 //response time(ms)

Node-Tair Test Result (get):

````shell
node test/benchmark.js get 5000 10
````


    Working Threads: 10
    Request Counts: 50000
    Success: 50000
    Failure: 20
    Cost Time: 9080 [ms]
    QPS: 5506.61 [#/sec]
    Min rt: 0 [ms]
    Max rt: 4006 [ms]
    Avg rt: 1.8 [ms]

We could easily know that：qps/rt of Node-Tair is about 35% lower than the java version, and Node-Tair sometimes get a quiet long rt but the average rt is not bad.

#### Single Tests

We make test on 1,3,5,10,20 threads runing simultaneously to find out how the max qps of Node-Tair with no error occured.
The test config is same as above, but we use fewer total request then above to reduce tair server`s pressure, result:


<table>
    <tr>
        <td>Method</td> <td>Thread Number</td> <td>Req. Total</td> <td>QPS(#/s)</td> <td>Avg. RT(ms)</td> <td>Has Failure?</td>
    </tr>
    <tr>
        <td>get</td> <td>1</td> <td>2500</td> <td>1169.86</td> <td>0.8</td> <td>No</td>
    </tr>
    <tr>
        <td>set</td> <td>1</td> <td>2500</td> <td>2893.52</td> <td>0.3</td> <td>No</td>
    </tr>
    <tr>
        <td>get</td> <td>3</td> <td>7500</td> <td>3485.13</td> <td>0.9</td> <td>No</td>
    </tr>
    <tr>
        <td>set</td> <td>3</td> <td>7500</td> <td>6607.93</td> <td>0.5</td> <td>No</td>
    </tr>
    <tr>
        <td>get</td> <td>5</td> <td>12500</td> <td>5289.89</td> <td>0.9</td> <td>No</td>
    </tr>
    <tr>
        <td>set</td> <td>5</td> <td>12500</td> <td>10794.47</td> <td>0.5</td> <td>No</td>
    </tr>
    <tr>
        <td>get</td> <td>10</td> <td>25000</td> <td>9494.87</td> <td>1.0</td> <td>No</td>
    </tr>
    <tr>
        <td>set</td> <td>10</td> <td>25000</td> <td>17730.5</td> <td>0.6</td> <td>No</td>
    </tr>
    <tr>
        <td>get</td> <td>20</td> <td>50000</td> <td>13808.34</td> <td>1.4</td> <td>No</td>
    </tr>
    <tr>
        <td>set</td> <td>20</td> <td>50000</td> <td>29481.13</td> <td>0.7</td> <td>No</td>
    </tr>
    <tr>
        <td>get</td> <td>20</td> <td>60000</td> <td>6960.56</td> <td>2.9</td> <td>Yes, 40 Failed</td>
    </tr>
    <tr>
        <td>set</td> <td>20</td> <td>60000</td> <td>27309.97</td> <td>0.7</td> <td>No</td>
    </tr>
</table>

As we know, Tair use Optimistic Locking when operate a data, and its set maybe asynchronous, so set preformance much better.
And the get method has a final qps of 13808.34 with avg. rt is 1.4 ms under this situation.


## Infomation and Future Work

1. Tair use config server to store the config of all datanode in a cluster. The client firstly request config server to get the bucket / copy / datanode infomation. And use [MurMurHash2](http://en.wikipedia.org/wiki/MurmurHash) Algorithm to decide a key to store on which datanode. Nearly all load balancing work is done on client-side. So when client is out of sync with config servers, the service maybe down.

2. Multi get, mget, as get more then one data form server in a request, is not supported in this version of client.

3. This client is tested under the mdb tair engine, tair cluster use kdb or ldb may not totally supported at this version.


