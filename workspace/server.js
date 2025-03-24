'use strict';

const https = require('https');
const fs = require('fs');
const express = require('express');
const socketIo = require('socket.io');
const Room = require('./lib/Room');

// TLS 配置
const tlsOptions = {
    cert: fs.readFileSync(__dirname + '/lib/example.crt'),
    key: fs.readFileSync(__dirname + '/lib/example.key'),
};

// 创建 Express 应用
const app = express();
app.use(express.static(__dirname + '/public'));
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// 创建 HTTPS 服务器
const httpsServer = https.createServer(tlsOptions, app);
httpsServer.listen(443, '0.0.0.0', () => {
    console.log('HTTPS server running on port 443');
});
// const httpServer = https.createServer(app);

// httpServer.listen(80, '0.0.0.0', () => {
//     console.log('httpServer running on port: ', 80);
// });

async function runWebSocketServer() {
    // 绑定 Socket.IO
    const io = socketIo(httpsServer, { cookie: false });

    // 全局房间管理器
    const rooms = new Map();

    // 处理 Socket.IO 连接
    io.on('connection', (socket) => {
        console.log('New connection:', socket.id);

        // 加入房间
        socket.on('join', (data, ack) => {
            const { roomId, userId } = data;
            console.log(`server User ${userId} joining room ${roomId}`);

            // 获取或创建房间
            var room = rooms.get(roomId);
            if (!room) {
                room = new Room(roomId);
                rooms.set(roomId, room);
            }

            // 将用户加入房间
            room.addPeer(socket, userId, ack);

            // 监听断开连接
            socket.on('disconnect', () => {
                room.removePeer(userId);
                if (room.isEmpty()) {
                    rooms.delete(roomId);
                    console.log(`Room ${roomId} deleted (no users left)`);
                }
            });
        });
    });
}

runWebSocketServer()
