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

const httpServer = https.createServer(app);

httpServer.listen(80, '0.0.0.0', () => {
    console.log('httpServer running on port: ', 80);
});
const httpsServer = https.createServer(options, app);

httpsServer.listen(443, '0.0.0.0', () => {
    console.log('httpsServer running on port: ', 443);
});
//将 socket.io 绑定到服务器上，于是任何连接到该服务器的客户端都具备了实时通信功能。
const io = require('socket.io')(httpsServer);
//服务器监听所有客户端，并返回该新连接对象
io.on('connection', function (socket) {
    console.log('===>connection request query= ' + JSON.stringify(socket.handshake.query) );
    socket.on('join', (room) => {
        console.log("====>join" + JSON.stringify(room));
        //加入io的到房间里
        socket.join(room);
        // 获取socket的房间
        var myRoom = io.sockets.adapter.rooms[room];
        var users = 0;
        if (myRoom) {
            users =  Object.keys(myRoom.sockets).length;
        }
       socket.emit('joined',room,socket.id);
       if (users > 1){
          socket.to(room).emit('otherJoined',room,socket.id);
       }
    // 给除了自己之外的所有人发
    //    socket.to(room).emit('joined',room,socket.id);
    // 给房间里所有人发
        // io.in(room).emit('joined',room,socket.id);
        // socket.broadcast.emit('joined',room,socket.id);
    });
    socket.on('message', (room,data) => {
        console.log("====>message" + JSON.stringify(data));
        socket.to(room).emit('message', room, socket.id, data)//房间除自己内所有人
    });
    socket.on('leave', (room)=> {
		var myRoom = io.sockets.adapter.rooms[room];
		var users = Object.keys(myRoom.sockets).length;
		//users - 1;

		console.log('the number of user in room is: ' + (users-1));
        socket.emit('leaved', room, socket.id);	
        socket.to(room).emit('leaved', room, socket.id);//除自己之外
		socket.leave(room);
	 	//socket.to(room).emit('joined', room, socket.id);//除自己之外
		//io.in(room).emit('joined', room, socket.id)//房间内所有人
	 	//socket.broadcast.emit('joined', room, socket.id);//除自己，全部站点	
	});
});