class Signal {
    constructor() {
        this.socket = io.connect();
    }

    join(dataIn, callback) {
        //connect
        socket = io.connect();

        //recieve message
        socket.on('joined', (data) => {
            console.log('joined data :' + JSON.stringify(data));
        });

        //send message
        // socket.emit('join', dataIn);
        this.socket.emit('join', dataIn);
        this.socket.on('joined', (data) => {
            console.log('joined ack ===>', data);
            // const { roomId, id } = data;
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
                    const { senderId, sdp } = data;
                    if (answerSdpCallback) {
                        answerSdpCallback(sdp, senderId);
                    }
                    // peerconnetion.setRemoteDescription(data.sdp);
                    // isSetRemote = true;
                    // _addcandidateFUN();
                    // videoBindwidthSelect.disabled = false;
                }
                    break;
                case 2: {// candidate
                    const { senderId, candidate } = data;
                    if (candidateCallback) {
                        candidateCallback(candidate, senderId);
                    }
                    //     if (isSetRemote === true) {
                    //         peerconnetion.addIceCandidate(data.candidate);
                    //         _addcandidateFUN();
                    //     } else {
                    //         cacheCandidateMsg.push(data.candidate);

                    //     }
                    //     outputArea.scrollTop = outputArea.scrollHeight;//窗口总是显示最后的内容

                    //     outputArea.value = outputArea.value + JSON.stringify(data.candidate) + '\r';
                }
                    break;

                default:
                    break;
            }
        });
    }

    sendMessage(room, data) {
        this.socket.emit('chat', room, data);
    }

    leave(room, userId) {
        this.socket.emit('leave', { roomId: room, id: userId });
    }
}

export default Signal;