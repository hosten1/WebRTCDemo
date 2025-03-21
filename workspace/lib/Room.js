'use strict';

const Peer = require('./Peer');
const MAX_PEERS = 6;

class Room {
    constructor(roomId) {
        this.roomId = roomId; // 房间的唯一标识
        this.peers = new Map(); // userId -> Peer 实例
    }

    // 添加对等端
    addPeer(socket, userId) {
        if (this.peers.size >= MAX_PEERS) {
            socket.emit('error', { message: 'Room is full (max 6 users)' });
            return;
        }

        if (this.peers.has(userId)) {
            socket.emit('error', { message: 'User ID already exists' });
            return;
        }

        // 创建 Peer 实例
        const peer = new Peer(socket, userId, this);
        this.peers.set(userId, peer);

        // 通知其他用户有新用户加入
        this.broadcast('userJoined', { userId }, userId);

        // 发送当前用户列表给新用户
        const userList = Array.from(this.peers.keys()).filter(id => id !== userId);
        peer.send('joined', { roomId: this.roomId, userId, userList });

        console.log(`User ${userId} joined room ${this.roomId}`);
    }

    // 移除对等端
    removePeer(userId) {
        if (!this.peers.has(userId)) return;

        const peer = this.peers.get(userId);
        peer.destroy();
        this.peers.delete(userId);

        // 通知其他用户有用户离开
        this.broadcast('userLeft', { userId });

        console.log(`User ${userId} left room ${this.roomId}`);
    }

    // 处理信令消息
    handleMessage(senderId, data) {
        const { targetId, signal } = data;

        if (!this.peers.has(targetId)) {
            console.error(`Target user ${targetId} not found in room ${this.roomId}`);
            return;
        }

        // 转发信令消息给目标用户
        const targetPeer = this.peers.get(targetId);
        targetPeer.send('signal', { from: senderId, signal });

        console.log(`Signal from ${senderId} to ${targetId} in room ${this.roomId}:`, signal);
    }

    // 广播消息
    broadcast(event, data, excludeUserId = null) {
        this.peers.forEach((peer, userId) => {
            if (userId !== excludeUserId) {
                peer.send(event, data);
            }
        });
    }

    // 检查房间是否为空
    isEmpty() {
        return this.peers.size === 0;
    }
}

module.exports = Room;