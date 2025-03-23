class PeerClient {

    constructor() {
        this.peerConnection = null;
        this.localStream = null;
        this._isSetRemote = false;
        this._sendDC = null;
        this._recvDC = null;
        this._isOffer = true;
        this._cacheCandidateMsg = [];
        const _config = {
            // bundlePolicy: 'balanced',
            // certificates?: RTCCertificate[];
            // iceCandidatePoolSize?: number;
            // iceTransportPolicy: "all",//  public relay
            // rtcpMuxPolicy: 'negotiate',
            iceServers: [
                {
                    urls: "turn:39.97.110.12:3478",
                    username: "lym",
                    credential: "123456"
                }
            ]
        };
    }
    startWebCam() {
        return new Promise((resolve, reject) => {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                document.write('当前浏览器不支持 getUserMedia()！！！！/n');
                return reject('当前浏览器不支持 getUserMedia()！！！！/n');
            } else {

                // 想要获取一个最接近 1280x720 的相机分辨率
                const videoDeviceIds = videoSource.value;
                const audioDeviceIds = audioSource.value;
                console.log('刷新了 videoDeviceIds = ' + videoDeviceIds + ' audioDeviceIds = ' + audioDeviceIds);
                var constraints = {
                    audio: {
                        noiseSuppression: true, // 降噪
                        echoCancellation: true,// 回音消除
                        deviceId: videoDeviceIds ? videoDeviceIds : undefined
                    },
                    video: {
                        width: 640,
                        height: 480,
                        frameRate: { ideal: 10, max: 30 },
                        deviceId: audioDeviceIds ? audioDeviceIds : undefined
                    },

                };

                navigator.mediaDevices.getUserMedia(constraints).then(function (mediaStream) {
                    this.localStream = mediaStream;
                    // 获取视频的track
                    const videoTrack = mediaStream.getVideoTracks()[0];
                    //拿到video的所有约束
                    const videoConstraints = videoTrack.getSettings();
                    // 转成jsonstring显示到div标签上
                    showDiv.textContent = JSON.stringify(videoConstraints, null, 2);


                    videoPlayer.srcObject = mediaStream;
                    videoPlayer.onloadedmetadata = function (e) {
                        videoPlayer.play();
                    };
                    console.log('刷新了 3333 videoDeviceIds = ' + videoDeviceIds + ' audioDeviceIds = ' + audioDeviceIds);

                    // 获取权限后开始获取设备
                    return resolve(mediaStream);
                }).catch((err) => {
                    return reject(err);
                    console.log(err.name + ": " + err.message);
                }); // 总是在最后检查错误
            }
        });
    }
    getUserMedia() {
        return new Promise((resolve, reject) => {
            navigator.mediaDevices.enumerateDevices().then((devices) => {
                if (!isGet) {
                    isGet = true;
                    devices.forEach((devInfo) => {
                        console.log('kind = ' + devInfo.kind
                            + ' lable = ' + devInfo.label
                            + ' id = ' + devInfo.deviceId
                            + ' groupId = ', devInfo.groupId);

                        var option = document.createElement('option');
                        option.text = devInfo.label;
                        option.value = devInfo.deviceId;
                        if (devInfo.kind === 'audioinput') {
                            audioSource.appendChild(option);
                        } else if (devInfo.kind === 'audiooutput') {
                            audioOutput.appendChild(option);
                        } else if (devInfo.kind === 'videoinput') {
                            videoSource.appendChild(option);
                        }
                    });
                }
                resolve(devices);
            });
        });
    }

    async initPeerConnection(callback) {
        this.peerConnection = new RTCPeerConnection(_config);
        // Add event listeners for the peer connection
        const opt = {
            negotiated: true,
            id: 0
        };

        this._sendDC = peerconnetion.createDataChannel('my channal', opt);
        this._sendDC.onopen = function () {
            console.log("sendDC datachannel open");
        };

        this._sendDC.onclose = function () {
            console.log("sendDC datachannel close");
        };
        this._sendDC.onmessage = function (event) {
            console.log(" recvDC received: " + event.data);
        };
        peerconnetion.ondatachannel = (ev) => {
            // this._recvDC = ev.channel;
            // this._recvDC.onmessage = function (event) {
            //     console.log(" recvDC received: " + event.data);
            // };

            // this._recvDC.onopen = function () {
            //     console.log("recvDC datachannel open");
            // };

            // this._recvDC.onclose = function () {
            //     console.log("recvDC datachannel close");
            // };
        };

        peerconnetion.oniceconnectionstatechange = (ev) => {
            // outputArea.scrollTop = outputArea.scrollHeight;//窗口总是显示最后的内容
            // outputArea.value = outputArea.value + JSON.stringify(peerconnetion.iceConnectionState) + '\r';
            if (peerconnetion.iceConnectionState === 'connected') {
                callback({ type: 'iceConnectionState', candidate: peerconnetion.iceConnectionState });
                // startGraph();
                // setTimeout(() => {
                //     // RTCDataChannel
                //     sendDC.send('你好 我是 ' + selfid);
                // }, 5000);
            }
        };
        //添加本地媒体流
        for (const track of localStream.getTracks()) {
            peerconnetion.addTrack(track);
        }
        this.peerConnection.onicecandidate = (ev) => {
            console.log('=======> send onicecandidate:' + JSON.stringify(ev.candidate));
            // if (socket) {
            //     if (ev.candidate) {
            //         await socket.emit('message', {
            //             roomId: room,
            //             id: selfid,
            //             type: 2,
            //             candidate: ev.candidate
            //         }, (data) => {
            //             console.log('发送成功了 ' + JSON.stringify(data));
            //         });
            //     }

            // }
            if (ev.candidate) {
                callback({ type: 'candidate', candidate: ev.candidate });
            }
        };
        this.peerConnection.ontrack = (ev) => {
            if (ev.streams && ev.streams[0]) {
                callback({ type: 'track', stream: ev.streams[0] });
            } else {
                const inboundStream = new MediaStream();
                inboundStream.addTrack(ev.track);
                remoteVideoPlayer.srcObject = inboundStream;
                callback({ type: 'track', stream: inboundStream });
            }
            // if (trackEvent.track.kind === 'video') {
            //     remoteVideoPlayer.srcObject = trackEvent[0];
            // }

        };
    }

    async createOffer(callback) {
        const offerOption = {
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
            'googNumSimulcastLayers': 2,
        };
        const offerSdp = await this.peerConnection.createOffer(offerOption);
        const errLocalDescription = await peerconnetion.setLocalDescription(offerSdp);
        if (errLocalDescription) {
            console.error('setLocalDescription err :' + JSON.stringify(offerSdp));
            return;
        }
        callback({ type: 'offer', sdp: offerSdp });
    }
    async createAnswer(recvSdp, callback) {
        const answerOption = {
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
        };
        // RTCSessionDescriptionInit init = 
        console.log('Answer errSetRD' + JSON.stringify(recvSdp));
        // RTCSessionDescriptionInit init = 
        const errSetRD = await peerconnetion.setRemoteDescription(recvSdp);
        if (errSetRD) {
            console.error('answer errSetRD err :' + JSON.stringify(recvSdp));
            return;
        }
        _isSetRemote = true;
        const answerSdp = await this.peerConnection.createAnswer(answerOption);
        // if (socket) {
        //     await socket.emit('message', {
        //         roomId: room,
        //         id: selfid,
        //         type: 1,
        //         sdp: answerSDP
        //     });
        //     console.log('=======> send answerSDP:' + answerSDP);
        // }
        const errLocalDescription = await peerconnetion.setLocalDescription(answerSdp);
        if (errLocalDescription) {
            console.error('setLocalDescription err :' + JSON.stringify(answerSdp));
            return;
        }

        callback({ type: 'answer', sdp: answerSdp });
    }

    async setRemoteDescription(sdp) {
        await this.peerConnection.setRemoteDescription(sdp);
        _isSetRemote = true;

    }
    _addcandidateFUN() {
        this._cacheCandidateMsg.forEach((item, index, arr) => {
            peerconnetion.addIceCandidate(item)
        }); // undefined
        this._cacheCandidateMsg = [];
    }

    close() {
        if (this.peerConnection) {
            this._sendDC.close();
            this._recvDC.close();
            this._sendDC = null;
            this._recvDC = null;
            this._localStream = null;
            this._cacheCandidateMsg = [];

            this._isSetRemote = false;
            this._isOffer = true;
            this.peerConnection.close();
            this.peerConnection = null;
        }
    }
}

export default PeerClient;