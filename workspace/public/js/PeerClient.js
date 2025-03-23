class PeerClient {

    constructor(config) {
        this.config = config;
        this.peerConnection = null;
        this.localStream = null;
        const config = {
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
        this.peerConnection = new RTCPeerConnection(this.config);
        // Add event listeners for the peer connection
        this.peerConnection.onicecandidate = (ev) => {
            if (ev.candidate) {
                callback({ type: 'candidate', candidate: ev.candidate });
            }
        };
        this.peerConnection.ontrack = (ev) => {
            callback({ type: 'track', stream: ev.streams[0] });
        };
    }

    async createOffer(callback) {
        const offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(offer);
        callback({ type: 'offer', sdp: offer });
    }

    async setRemoteDescription(sdp) {
        await this.peerConnection.setRemoteDescription(sdp);
    }

    addTrack(track) {
        this.peerConnection.addTrack(track);
    }
    _addcandidateFUN() {
        cacheCandidateMsg.forEach((item, index, arr) => {
            peerconnetion.addIceCandidate(item)
        }); // undefined
        cacheCandidateMsg = [];
    }

    close() {
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }
    }
}

export default PeerClient;