/*!
 * tair - lib/client.js
 * Copyright(c) 2012 Taobao.com
 * Author: kate.sf <kate.sf@taobao.com>
 */

var configServer  = require('./configServer');

configServer.retrieveConfigure('group_mdbcomm', 0, [{host:'10.235.144.192', port:5198}], function(err) {
  console.log(err);
})