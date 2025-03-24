'use strict';

const Peer = require('./Peer');
const MAX_PEERS = 6;

class Room {
    constructor(roomId) {
        this.roomId = roomId; // 房间的唯一标识
        this.peers = new Map(); // userId -> Peer 实例
    }

    // 添加对等端
    addPeer(socket, userId, ack) {
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
        // 加入房间
        socket.join(this.roomId);

        // 通知其他用户有新用户加入
        var data = {
            roomId: this.roomId,
            id: socket.id,
            senderId: userId,
        }
        this._notification(socket, 'otherJoined', data, true);
        console.log('lym send otherJoined msg ', JSON.stringify(data));
        // 发送当前用户列表给新用户
        const userList = Array.from(this.peers.keys()).filter(id => id !== userId);
        const callBackData = {
            id: socket.id,
            roomId: this.roomId,
            targetId: userId,
            userList
        };
        // 如果支持ack 返回，就使用这个返回消息到客户端
        if (ack) {
            console.log('lym ack msg ', JSON.stringify(callBackData));

            ack(callBackData);
        } else {
            // 这个是为了兼容老版本
            this._notification(socket, 'joined', callBackData, false);
            console.log('lym send joined msg ', JSON.stringify(callBackData));

        }


        console.log(`User ${userId} joined room ${this.roomId}`);
    }

    // 移除对等端
    removePeer(userId) {
        if (!this.peers.has(userId)) return;

        const peer = this.peers.get(userId);
        peer.destroy();
        this.peers.delete(userId);
        // 离开房间
        // this.socket.leave(this.roomId);
        peer.socket.leave(this.roomId);

        // 通知其他用户有用户离开
        var data = {
            roomId: this.roomId,
            userId: userId
        }
        this._notification(peer.socket, 'leave', data, true);
        console.log(`User ${userId} left room ${this.roomId}`);
    }

    // 处理信令消息
    handleMessage(senderId, data) {
        // 应该验证下消息的合法性，防止崩溃
        if (!data.targetId) {
            console.error(`Target user ${data.targetId} not found in room ${this.roomId}`);
            return;
        }

        const { targetId } = data;

        if (!this.peers.has(targetId)) {
            console.error(`Target user ${targetId} not found in room ${this.roomId}`);
            return;
        }

        // 转发信令消息给目标用户
        const targetPeer = this.peers.get(targetId);
        //复制一个data添加 id
        data = Object.assign({}, data);
        data.id = senderId;
        data.senderId = senderId;
        data.targetId = targetId;
        data.roomId = this.roomId;
        this._notification(targetPeer.socket, 'message', data, false);

        console.log(`Signal from ${senderId} to ${targetId} in room ${this.roomId}`, JSON.stringify(data));
    }

    // 处理聊天消息
    handleChat(senderId, data) {
        const peer = this.peers.get(senderId);
        //复制一个data添加 id
        data = Object.assign({}, data);
        data.senderId = senderId;
        data.roomId = this.roomId;

        // 广播聊天消息给房间内的其他用户
        this._notification(peer.socket, 'chat', data, true);

        console.log(`Chat message from ${senderId} in room ${this.roomId}:`, data);
    }

    // 处理用户离开
    handleUserLeave(userId) {
        this.removePeer(userId);
        console.log(`User ${userId} left room ${this.roomId}`);
    }

    // 广播消息
    _notification(socket, method, data = {}, broadcast = false, includeSender = false) {
        if (broadcast) {
            socket.broadcast.to(this.roomId).emit(
                method, data
            );

            if (includeSender)
                socket.emit(method, data);
        }
        else {
            socket.emit(method, data);
        }
    }

    // 检查房间是否为空
    isEmpty() {
        return this.peers.size === 0;
    }
}

module.exports = Room;