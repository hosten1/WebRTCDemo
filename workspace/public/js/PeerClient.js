class PeerClient {

    constructor(localStream) {
        this.peerConnections = new Map(); // 存储远端连接
        this._localStream = localStream;
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

    // 新增的远端连接对象
    _createPeerConnection(remoteId) {
        const peerConnection = new RTCPeerConnection(this._config);
        const connectionData = {
            peerConnection: peerConnection,
            _isSetRemote: false,
            _sendDC: null,
            _recvDC: null,
            _isOffer: true,
            _cacheCandidateMsg: []
        };
        this.peerConnections.set(remoteId, connectionData);
        return connectionData;
    }

    async initPeerConnection(callback, senderId) {
        const connectionData = this._createPeerConnection(senderId);
        const peerConnection = connectionData.peerConnection;

        // Add event listeners for the peer connection
        const opt = {
            negotiated: true,
            id: 0
        };

        connectionData._sendDC = peerConnection.createDataChannel('my channel', opt);
        connectionData._sendDC.onopen = () => {
            console.log("sendDC datachannel open");
        };

        connectionData._sendDC.onclose = () => {
            console.log("sendDC datachannel close");
        };
        connectionData._sendDC.onmessage = (event) => {
            console.log("recvDC received: " + event.data);
        };
        peerConnection.ondatachannel = (ev) => {
            connectionData._recvDC = ev.channel;
            connectionData._recvDC.onmessage = (event) => {
                console.log("recvDC received: " + event.data);
            };

            connectionData._recvDC.onopen = () => {
                console.log("recvDC datachannel open");
            };

            connectionData._recvDC.onclose = () => {
                console.log("recvDC datachannel close");
            };
        };

        peerConnection.oniceconnectionstatechange = () => {
            if (peerConnection.iceConnectionState === 'connected') {
                callback({ type: 'iceConnectionState', iceConnectionState: peerConnection.iceConnectionState });
            }
        };
        //添加本地媒体流
        for (const track of this._localStream.getTracks()) {
            peerConnection.addTrack(track);
        }
        peerConnection.onicecandidate = (ev) => {
            if (ev.candidate) {
                callback({ type: 'candidate', candidate: ev.candidate }, senderId);
            }
        };
        peerConnection.ontrack = (ev) => {
            if (ev.streams && ev.streams[0]) {
                callback({ type: 'track', stream: ev.streams[0] }, senderId);
            } else {
                const inboundStream = new MediaStream();
                inboundStream.addTrack(ev.track);
                callback({ type: 'track', stream: inboundStream }, senderId);
            }
            // if (trackEvent.track.kind === 'video') {
            //     remoteVideoPlayer.srcObject = trackEvent[0];
            // }

        };
    }

    async createOffer(callback, senderId) {
        const connectionData = this.peerConnections.get(senderId);
        const peerConnection = connectionData.peerConnection;

        const offerOption = {
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
            'googNumSimulcastLayers': 1,
        };
        const offerSdp = await peerConnection.createOffer(offerOption);
        const errLocalDescription = await peerConnection.setLocalDescription(offerSdp);
        if (errLocalDescription) {
            console.error('createOffer error: ' + JSON.stringify(errLocalDescription));
            return;
        }
        callback(offerSdp, senderId);
    }
    async createAnswer(recvSdp, callback, senderId) {
        const connectionData = this.peerConnections.get(senderId);
        const peerConnection = connectionData.peerConnection;
        const answerOption = {
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
        };
        // console.log('Answer received: ' + JSON.stringify(recvSdp));
        const errSetRD = await peerConnection.setRemoteDescription(recvSdp);
        if (errSetRD) {
            console.error('createAnswer error: ' + JSON.stringify(errSetRD));
            return;
        }
        this._isSetRemote = true;
        console.log('createAnswer with senderId:' + senderId);
        this._addcandidateFUN(senderId);
        const answerSdp = await peerConnection.createAnswer(answerOption);

        const errLocalDescription = await peerConnection.setLocalDescription(answerSdp);
        if (errLocalDescription) {
            console.error('createAnswer error: ' + JSON.stringify(errLocalDescription));
            return;
        }

        callback(answerSdp, senderId);
    }

    async setRemoteDescription(sdp, senderId) {
        const connectionData = this.peerConnections.get(senderId);
        if (!connectionData) {
            console.error(`No connection data found for senderId: ${senderId}`);
            console.error('Current peerConnections keys:', Array.from(this.peerConnections.keys())); // 输出所有的键值
            return; // 如果没有找到连接数据，直接返回
        }
        const peerConnection = connectionData.peerConnection;
        await peerConnection.setRemoteDescription(sdp);
        this._isSetRemote = true;
        console.log('setRemoteDescription with senderId:' + senderId);
        this._addcandidateFUN(senderId);

    }
    addIceCandidate(candidate, senderId) {
        console.log('addIceCandidate with senderId:' + senderId);

        const connectionData = this.peerConnections.get(senderId);

        if (connectionData._isSetRemote) {
            connectionData._cacheCandidateMsg.push(candidate);
            this._addcandidateFUN(senderId);
        } else {
            connectionData._cacheCandidateMsg.push(candidate);
        }
    }

    _addcandidateFUN(remoteId) {
        const connectionData = this.peerConnections.get(remoteId);
        if (!connectionData) {
            console.error(`No connection data found for remoteId: ${remoteId}`);
            console.error('Current peerConnections keys:', Array.from(this.peerConnections.keys())); // 输出所有的键值
            return; // 如果没有找到连接数据，直接返回
        }
        connectionData._cacheCandidateMsg.forEach((item) => {
            connectionData.peerConnection.addIceCandidate(item).catch(err => {
                console.error('Failed to add ICE candidate: ', err);
            });
        });
        connectionData._cacheCandidateMsg = [];
    }

    close(remoteId) {
        const connectionData = this.peerConnections.get(remoteId);
        if (connectionData) {
            if (connectionData._sendDC) connectionData._sendDC.close();
            if (connectionData._recvDC) connectionData._recvDC.close();
            connectionData._sendDC = null;
            connectionData._recvDC = null;
            connectionData._cacheCandidateMsg = [];

            connectionData._isSetRemote = false;
            connectionData._isOffer = true;
            connectionData.peerConnection.close();
            this.peerConnections.delete(remoteId);
        }
    }
}

export default PeerClient;
