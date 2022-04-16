'use strict'

var https = require('https');
var http = require('http');
const fs = require('fs');
const express = require('express');
const serverIndex = require('serve-index');
// TLS server configuration.
const options =
{
	cert: fs.readFileSync(__dirname + '/lib/' + 'example.crt'),
	key: fs.readFileSync(__dirname + '/lib/' + 'example.key'),
};

var app = new express();

app.use(serverIndex(__dirname + '/public'));
app.use(express.static(__dirname + '/public'));
app.get('/', function (req, res) {
    res.sendfile(__dirname + '/public/index.html');
});
//将 socket.io 绑定到服务器上，于是任何连接到该服务器的客户端都具备了实时通信功能。
const httpServer = https.createServer(app);

httpServer.listen(80, '0.0.0.0', () => {
    console.log('httpServer running on port: ', 80);
});
//将 socket.io 绑定到服务器上，于是任何连接到该服务器的客户端都具备了实时通信功能。
const httpsServer = https.createServer(options, app);

httpsServer.listen(443, '0.0.0.0', () => {
    console.log('httpsServer running on port: ', 443);
});