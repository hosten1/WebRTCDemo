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
            callback(data);
        });
    }

    onLeaved(callback) {
        this.socket.on('leaved', (data) => {
            callback(data);
        });
    }

    onMessage(offerSdpCallback, answerSdpCallback, candidateCallback) {
        this.socket.on('message', (data) => {
            console.log('message data :' + JSON.stringify(data));

            const id = data.id;
            if (id === selfid) {
                return;
            }
            console.log('message :' + JSON.stringify(data));
            const type = data.type;
            switch (type) {
                case 0: {// offer
                    const { senderId, sdp } = data;
                    if (offerSdpCallback) {
                        offerSdpCallback(sdp, senderId);
                    }
                }
                    break;
                case 1: {// answer
                    console.log('offer setRemoteDescription' + JSON.stringify(data.sdp));
                    const { senderId, sdp: answerSdp } = data;
                    if (answerSdpCallback) {
                        answerSdpCallback(answerSdp, senderId);
                    }
                }
                    break;
                case 2: {// candidate
                    const { senderId: candidateSenderId, candidate } = data;
                    if (candidateCallback) {
                        candidateCallback(candidate, candidateSenderId);
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
        data.userId = userId;
        this.socket.emit('message', data);
    }

    leave(room, userId) {
        this.socket.emit('leave', { roomId: room, id: userId });
    }
}

module.exports = Signal;