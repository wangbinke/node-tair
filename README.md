# Node Tair

Taobao [Tair](http://code.taobao.org/p/tair/src/) Client for Node.js, build on pure javascript without any native code.

## Installation

	$ npm install tair

Strongly recommand you use node >= 0.8.0 to use this lib for its performance improve on io and buffer.

## An Example


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


## API


	Tair(groupName, hostList, callback)
	 * initial clients from config servers, must be first called, all three params must be used
	 * @params groupnName：group name of tair
	 * @params hostList: config server list of tair, like [{host: '10.235.144.116', port: 5198}]
	 * @params callback(err):


	Tair.set / Tair.setEx (key, value, [expire], [namespace], [version], callback)
	 * set a key with a value
	 * @params key：must be string, the key to set
	 * @params value: usually string, the value to set
	 * @params expire: seconds to expire, number, optional, default is 0 (not expired)
	 * @params namespace: the area(namespace) of data, number 0~1023, optional, default is 0
	 * @params version: the version of data, using to solve concurrency conflicts, not commonly used in cache, optional, default is 0
	 * @params callback(err, success): success is true when set successfully


	Tair.get (key, [namespace], callback)
	 * get a key from a datanode
	 * @params key：must be string, the key to get
	 * @params namespace: the area(namespace) of data, number 0~1023, optional, default is 0
	 * @params callback(err, data): if key on server is not exist


	Tair.remove (key, [namespace], callback)
	 * remove / delete a key from a datanode
	 * @params key：must be string, the key to remove
	 * @params namespace: the area(namespace) of data, number 0~1023, optional, default is 0
	 * @params callback(err): 


	Tair.incr / Tair.decr (key, [count], [namespace], [initValue], [expire], callback)
	 * increace or decreace a count object on tair, count object is different from object from usually set / get. First use these method on a key will create it with initValue or 0;
	 * @params key：must be string, the key to remove
	 * @params count: amount to plus or minus, usually be positive number
	 * @params namespace: the area(namespace) of data, number 0~1023, optional, default is 0
	 * @params initValue: if key is not exist, give it a value
	 * @params expire: if key is not exist, the new value`s expire(seconds)
	 * @params callback(err, data): data is the count number after incr or decr.


## Infomation and Future Work

1. Tair use config server to store the config of all datanode in a cluster. The client firstly request config server to get the bucket / copy / datanode infomation. And use [MurMurHash2](http://en.wikipedia.org/wiki/MurmurHash) Algorithm to decide a key to store on which datanode. Nearly all load balancing work is done on client-side. So when client is out of sync with config servers, the service maybe down.


2. Multi get, mget, as get more then one data form server in a request, is not supported in this version of client.

3. This client is tested under the mdb tair engine, tair cluster use kdb or ldb may not totally supported at this version.


