class Signal {
    constructor() {
        this.socket = io();
    }

    join(dataIn, callback) {
        // Send join message
        this.socket.emit('join', dataIn, callback);

        // Receive acknowledgment of joining
        this.socket.on('joined', (data) => {
            console.log('joined ack ===>', data);
            callback(data);
        });
    }

    onOtherJoined(callback) {
        this.socket.on('otherJoined', (data) => {
            console.log('lym otherJoined', data);
            callback(data);
        });
    }

    onLeaved(callback) {
        this.socket.on('leaved', (data) => {
            console.log('lym leaved', data);
            callback(data);
        });
    }

    onMessage(selfid, offerSdpCallback, answerSdpCallback, candidateCallback) {
        this.socket.on('message', (data) => {

            const id = data.senderId;
            if (id === selfid) {
                console.error(`lym id errr selfid:${selfid} senderId:${senderId}`);
                return;
            }
            const type = data.type;
            switch (type) {
                case 0: {// offer
                    const { senderId, sdp } = data;
                    console.log('lym  recv offer sdp ' + JSON.stringify(data.sdp));

                    if (offerSdpCallback) {
                        offerSdpCallback(sdp, senderId);
                    }
                }
                    break;
                case 1: {// answer
                    const { senderId, sdp } = data;
                    console.log('lym  recv answer sdp ' + JSON.stringify(data.sdp));

                    if (answerSdpCallback) {
                        answerSdpCallback(sdp, senderId);
                    }
                }
                    break;
                case 2: {// candidate
                    const { senderId, candidate } = data;
                    console.log('lym  recv candidate sdp ' + JSON.stringify(data.candidate));
                    if (candidateCallback) {
                        candidateCallback(candidate, senderId);
                    }
                }
                    break;
                default:
                    console.warn('Unknown message type:', type);
                    break;
            }
        });
    }

    sendMessage(room, userId, data) {
        data.roomId = room;
        data.senderId = userId;
        console.log("lym sendMessage data:", JSON.stringify(data));
        this.socket.emit('message', data);
    }

    sendChat(room, userId, data) {
        data.roomId = room;
        data.senderId = userId;
        console.log("lym sendMessage data:", JSON.stringify(data));
        this.socket.emit('message', data);
    }

    leave(room, userId) {
        this.socket.emit('leave', { roomId: room, senderId: userId });
    }
}

export default Signal;