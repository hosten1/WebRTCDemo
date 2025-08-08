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
            // sdpSemantics: 'plan-b', // 明确指定 plan-b 模式
            iceServers: [
                {
                    urls: "turn:8.137.17.218:3478",
                    username: "lym",
                    credential: "lym123456"
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

            callback({ type: 'iceConnectionState', iceConnectionState: peerConnection.iceConnectionState }, senderId);

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
               
        const canUseH265 = RTCRtpSender.getCapabilities('video').codecs.some(
		    codec => codec.mimeType === 'video/H265' || codec.mimeType === 'video/HEVC'
		);
		
		if (canUseH265) {
			 // 修改 SDP - 指定优先编解码器
		    offerSdp.sdp = await setPreferredCodec(offerSdp.sdp, 'video', 'H265');
		} else {
		    console.warn("浏览器不支持 H.265，使用默认编解码器");
		}
        const errLocalDescription = await peerConnection.setLocalDescription(offerSdp);
        if (errLocalDescription) {
            console.error('createOffer error: ' + JSON.stringify(errLocalDescription));
            return;
        }
        callback(offerSdp, senderId);
    }
    // 设置优先编解码器的辅助函数
async setPreferredCodec(sdp, mediaType, codecName) {
  const lines = sdp.split('\n');
  let mLineIndex = -1;
  
  // 查找媒体行 (m=video)
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith(`m=${mediaType}`)) {
      mLineIndex = i;
      break;
    }
  }
  
  if (mLineIndex === -1) return sdp;
  
  // 提取编解码器 payload 类型
  const codecRegex = new RegExp(`a=rtpmap:(\\d+) ${codecName}`);
  let payloadType = null;
  
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(codecRegex);
    if (match) {
      payloadType = match[1];
      break;
    }
  }
  
  if (!payloadType) return sdp;
  
  // 重新排序编解码器 - 将指定编解码器移到首位
  const mLineParts = lines[mLineIndex].split(' ');
  const newMLine = [mLineParts[0], mLineParts[1], mLineParts[2], payloadType];
  
  // 添加其他编解码器（可选）
  for (let i = 3; i < mLineParts.length; i++) {
    if (mLineParts[i] !== payloadType) {
      newMLine.push(mLineParts[i]);
    }
  }
  
  lines[mLineIndex] = newMLine.join(' ');
  return lines.join('\n');
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
    async addIceCandidate(candidate, senderId) {
        console.log('addIceCandidate with senderId:' + senderId);

        const connectionData = this.peerConnections.get(senderId);

        if (connectionData._isSetRemote) {
            connectionData._cacheCandidateMsg.push(candidate);
            await this._addcandidateFUN(senderId);
        } else {
            connectionData._cacheCandidateMsg.push(candidate);
        }
    }

    async _addcandidateFUN(remoteId) {
        const connectionData = this.peerConnections.get(remoteId);
        if (!connectionData) {
            console.error(`No connection data found for remoteId: ${remoteId}`);
            console.error('Current peerConnections keys:', Array.from(this.peerConnections.keys())); // 输出所有的键值
            return; // 如果没有找到连接数据，直接返回
        }
        connectionData._cacheCandidateMsg.forEach(async (item) => {
            await connectionData.peerConnection.addIceCandidate(item).catch(err => {
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
