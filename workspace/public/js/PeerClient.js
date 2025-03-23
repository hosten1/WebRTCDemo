class PeerClient {

    constructor(localStream) {
        this.peerConnection = null;
        this._localStream = localStream;
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
            }
        };
        //添加本地媒体流
        for (const track of localStream.getTracks()) {
            peerconnetion.addTrack(track);
        }
        this.peerConnection.onicecandidate = (ev) => {
            console.log('=======> send onicecandidate:' + JSON.stringify(ev.candidate));
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
            'googNumSimulcastLayers': 1,
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
        _addcandidateFUN();
        const answerSdp = await this.peerConnection.createAnswer(answerOption);

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
        _addcandidateFUN();

    }
    addIceCandidate(candidate) {
        if (isSetRemote === true) {
            cacheCandidateMsg.push(data.candidate);
            _addcandidateFUN();
        } else {
            cacheCandidateMsg.push(data.candidate);
        }
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
            this._cacheCandidateMsg = [];

            this._isSetRemote = false;
            this._isOffer = true;
            this.peerConnection.close();
            this.peerConnection = null;
        }
    }
}

export default PeerClient;