class PeerClient {

    constructor(localStream) {
        this.peerConnection = null;
        this._localStream = localStream;
        this._isSetRemote = false;
        this._sendDC = null;
        this._recvDC = null;
        this._isOffer = true;
        this._cacheCandidateMsg = [];
        this._config = {
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
        this.peerConnection = new RTCPeerConnection(this._config);
        // Add event listeners for the peer connection
        const opt = {
            negotiated: true,
            id: 0
        };

        this._sendDC = this.peerConnection.createDataChannel('my channel', opt);
        this._sendDC.onopen = () => {
            console.log("sendDC datachannel open");
        };

        this._sendDC.onclose = () => {
            console.log("sendDC datachannel close");
        };
        this._sendDC.onmessage = (event) => {
            console.log("recvDC received: " + event.data);
        };
        this.peerConnection.ondatachannel = (ev) => {
            this._recvDC = ev.channel;
            this._recvDC.onmessage = (event) => {
                console.log("recvDC received: " + event.data);
            };

            this._recvDC.onopen = () => {
                console.log("recvDC datachannel open");
            };

            this._recvDC.onclose = () => {
                console.log("recvDC datachannel close");
            };
        };

        this.peerConnection.oniceconnectionstatechange = () => {
            if (this.peerConnection.iceConnectionState === 'connected') {
                callback({ type: 'iceConnectionState', candidate: this.peerConnection.iceConnectionState });
            }
        };
        //添加本地媒体流
        for (const track of this._localStream.getTracks()) {
            this.peerConnection.addTrack(track);
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
        const errLocalDescription = await this.peerConnection.setLocalDescription(offerSdp);
        if (errLocalDescription) {
            console.error('setLocalDescription error: ' + JSON.stringify(errLocalDescription));
            return;
        }
        callback({ type: 'offer', sdp: offerSdp });
    }
    async createAnswer(recvSdp, callback) {
        const answerOption = {
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
        };
        console.log('Answer received: ' + JSON.stringify(recvSdp));
        const errSetRD = await this.peerConnection.setRemoteDescription(recvSdp);
        if (errSetRD) {
            console.error('setRemoteDescription error: ' + JSON.stringify(errSetRD));
            return;
        }
        this._isSetRemote = true;
        this._addcandidateFUN();
        const answerSdp = await this.peerConnection.createAnswer(answerOption);

        const errLocalDescription = await this.peerConnection.setLocalDescription(answerSdp);
        if (errLocalDescription) {
            console.error('setLocalDescription error: ' + JSON.stringify(errLocalDescription));
            return;
        }

        callback({ type: 'answer', sdp: answerSdp });
    }

    async setRemoteDescription(sdp) {
        await this.peerConnection.setRemoteDescription(sdp);
        this._isSetRemote = true;
        this._addcandidateFUN();

    }
    addIceCandidate(candidate) {
        if (this._isSetRemote) {
            this._cacheCandidateMsg.push(candidate);
            this._addcandidateFUN();
        } else {
            this._cacheCandidateMsg.push(candidate);
        }
    }
    _addcandidateFUN() {
        this._cacheCandidateMsg.forEach((item) => {
            this.peerConnection.addIceCandidate(item).catch(err => {
                console.error('Failed to add ICE candidate: ', err);
            });
        });
        this._cacheCandidateMsg = [];
    }

    close() {
        if (this.peerConnection) {
            if (this._sendDC) this._sendDC.close();
            if (this._recvDC) this._recvDC.close();
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