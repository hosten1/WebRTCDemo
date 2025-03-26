'use strict';

const Peer = require('./Peer');
//引入log4js
const log4js = require('log4js');

// 配置log4js显示文件名、函数名和行数
log4js.configure({
    appenders: {
        console: {
            type: 'console',
            layout: {
                type: 'pattern',
                pattern: '%d{yyyy-MM-dd hh:mm:ss.SSS} [%p] %f:%l %c - %m'
            }
        }
    },
    categories: {
        default: {
            appenders: ['console'],
            level: 'info',
            enableCallStack: true
        }
    }
});

const MAX_PEERS = 6;

class Room {
    constructor(roomId) {
        this.roomId = roomId; // 房间的唯一标识
        this.peers = new Map(); // userId -> Peer 实例
        this.logger = log4js.getLogger('Room'); // 创建日志记录器并指定类别名
    }

    // 添加对等端
    async addPeer(socket, userId, ack) {
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
        await this._sendJoined(socket, userId, ack);
        // 通知其他用户有新用户加入
        var data = {
            roomId: this.roomId,
            id: socket.id,
            senderId: userId,
        }
        await this._notification(socket, 'otherJoined', data, true);
        this.logger.info('lym send otherJoined msg ', JSON.stringify(data));

    }
    async _sendJoined(socket, userId, ack) {
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
            this.logger.info('lym ack msg ', JSON.stringify(callBackData));

            ack(callBackData);
        } else {
            // 这个是为了兼容老版本
            await this._notification(socket, 'joined', callBackData, false);
            this.logger.info('lym send joined msg ', JSON.stringify(callBackData));

        }
    }

    // 移除对等端
    async removePeer(userId) {
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
        await this._notification(peer.socket, 'leaved', data, true);
        this.logger.info(`User ${userId} left room ${this.roomId}`);
    }

    // 处理信令消息
    async handleMessage(senderId, data) {
        // 应该验证下消息的合法性，防止崩溃
        if (!data.targetId) {
            this.logger.error(`Target user ${data.targetId} not found in room ${this.roomId}`);
            return;
        }

        const { targetId } = data;

        if (!this.peers.has(targetId)) {
            this.logger.error(`Target user ${targetId} not found in room ${this.roomId}`);
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
        await this._notification(targetPeer.socket, 'message', data, false);

        // console.log(`Signal from ${senderId} to ${targetId} in room ${this.roomId}`, JSON.stringify(data));
    }

    // 处理聊天消息
    async handleChat(senderId, data) {
        const peer = this.peers.get(senderId);
        //复制一个data添加 id
        data = Object.assign({}, data);
        data.senderId = senderId;
        data.roomId = this.roomId;

        // 广播聊天消息给房间内的其他用户
        await this._notification(peer.socket, 'chat', data, true);

        this.logger.info(`Chat message from ${senderId} in room ${this.roomId}:`, data);
    }

    // 处理用户离开
    handleUserLeave(userId) {
        this.removePeer(userId);
        this.logger.info(`User ${userId} left room ${this.roomId}`);
    }

    // 广播消息
    async _notification(socket, method, data = {}, broadcast = false, includeSender = false) {
        if (broadcast) {
            // 获取当前用户ID
            const currentUserId = Array.from(this.peers.entries())
                .find(([_, peer]) => peer.socket === socket)?.[0];

            if (currentUserId) {
                // 获取所有peers
                const allPeers = Array.from(this.peers.entries());

                // 过滤掉当前用户
                const peersToSend = allPeers.filter(([userId, _]) => userId !== currentUserId);

                // 依次发送消息给每个peer，每次发送后延迟1秒
                for (let i = 0; i < peersToSend.length; i++) {
                    const [userId, peer] = peersToSend[i];
                    const peerData = { ...data, targetId: userId };
                    peer.socket.emit(method, peerData);
                    this.logger.info(`Sent ${method} to user ${userId} in room ${this.roomId}`);

                    // 如果不是最后一个peer，则延迟1秒
                    if (i < peersToSend.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                }
            } else {
                // 如果找不到当前用户，回退到原来的广播方式
                socket.broadcast.to(this.roomId).emit(method, data);
            }

            if (includeSender)
                socket.emit(method, data);
        }
        else {
            socket.emit(method, data);
        }
    }

    // // 广播消息
    // _notification(socket, method, data = {}, broadcast = false, includeSender = false) {
    //     if (broadcast) {
    //         socket.broadcast.to(this.roomId).emit(
    //             method, data
    //         );

    //         if (includeSender)
    //             socket.emit(method, data);
    //     }
    //     else {
    //         socket.emit(method, data);
    //     }
    // }

    // 检查房间是否为空
    isEmpty() {
        return this.peers.size === 0;
    }
}

module.exports = Room;