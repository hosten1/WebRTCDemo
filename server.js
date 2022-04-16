'use strict'

var http = require('http');

var app = http.createServer((req, res)=>{
    console.log('访问成功');
	res.writeHead(200, {'Content-Type':'text/plain'});
	res.end('===>Hello World!!!!!!\n');
}).listen(8081, '0.0.0.0');
