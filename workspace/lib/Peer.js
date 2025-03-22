'use strict';

class Peer {
    constructor(socket, userId, room) {
        this.socket = socket;
        this.userId = userId;
        this.room = room;

        // 绑定信令消息事件
        this.socket.on('message', (data) => {
            this.room.handleSignal(this.userId, data);
        });
        this.socket.on('chat', (data) => {
            this.room.handleChat(this.userId, data);
        });
        this.socket.on('leave', (data) => {
            this.room.handleUserLeave(this.userId, data);
        });
        // 绑定断开连接事件
        this.socket.on('disconnect', () => {
            this.room.removePeer(this.userId);
        });
    }

    // 发送消息
    send(event, data,senderId) {
        if (this.socket.connected) {
            // 复制一个data添加 id
            data = Object.assign({}, data);
            data.id = senderId;//兼容老的版本
            data.senderId = senderId;
            data.targetId = this.userId;
            data.roomId = this.room.roomId;
            // 使用 socket.to(roomId).emit() 确保消息只发送给同一个房间的用户
            this.socket.to(this.room.roomId).emit(event, data);
        }
    }

    // 销毁对等端
    destroy() {
        this.socket.disconnect(true);
    }
}

module.exports = Peer;