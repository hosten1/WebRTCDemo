'use strict';

class Peer {
    constructor(socket, userId, room) {
        this.socket = socket;
        this.userId = userId;
        this.room = room;

        // 绑定信令消息事件
        this.socket.on('signal', (data) => {
            this.room.handleMessage(this.userId, data);
        });

        // 绑定断开连接事件
        this.socket.on('disconnect', () => {
            this.room.removePeer(this.userId);
        });
    }

    // 发送消息
    send(event, data) {
        if (this.socket.connected) {
            this.socket.emit(event, data);
        }
    }

    // 销毁对等端
    destroy() {
        this.socket.disconnect(true);
    }
}

module.exports = Peer;