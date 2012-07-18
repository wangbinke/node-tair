var cli = require('./index');

var ccount = 0;

cli.initClient('group_ju', [{host: '10.235.144.116', port: 5198}], function(err){
  if(err)  {
    console.log(err);
  }
  console.time('1000 times get');
  for (var i  = 0;  i < 1000; i ++) {
    cli.get('hello', function(err, data){
      ccount++;
      if(ccount === 1000) {
        console.timeEnd('1000 times get');
        process.exit(0);
      }
    });
  }
});