'use strict'

// const startReocrdBtn = document.getElementById("startReocrd_btn");
// const stopReocrdBtn = document.getElementById("stopReocrd_btn");
//获取 DOM 树节点
const audioSource = document.getElementById("audioSource");
const audioOutput = document.getElementById("audioOutput");
const videoSource = document.getElementById("videoSource");

//filter 特效选择
var filtersSelect = document.querySelector('select#filter');
//视频播放的标签 
const videoPlayer = document.getElementById("videoPlayer");
const remoteVideoPlayer = document.getElementById("remoteVideoPlayer");
// 截取视频保存成图片
const snapshotBtn = document.getElementById("snapshot_Btn");

const videoPicture = document.getElementById("video_picture");
videoPicture.width = 320;
videoPicture.height = 240;


//录制功能
var mediaRecorder;
var buffer;
const recoderVideoShow = document.getElementById("recoderVideoShow");
const recordBtn = document.getElementById("record_Btn");
recordBtn.disabled = true;
snapshotBtn.disabled = true;
const recvPlayBtn = document.getElementById("recvPlay_Btn");
const downloadBtn = document.getElementById("download_Btn");



// 获取显示的div
const showDiv = document.getElementById("constraints");

// 房间聊天功能
var userName = document.querySelector('input#username');
userName.value = randomString(6);
var inputRoom = document.querySelector('input#room');
inputRoom.value = 123456;
var btnConnect = document.querySelector('button#connect');
var btnLeave = document.querySelector('button#leave');
var outputArea = document.querySelector('textarea#output');
var inputArea = document.querySelector('textarea#input');
var btnSend = document.querySelector('button#send');


var videoBindwidthSelect = document.getElementById('videoBindwidth');
var birateCanvas  = document.getElementById('birateCanvas');
var packetsCanvas = document.getElementById('packetsCanvas');


var socket;
var room;
var localStream;

// 防止重复去获取设备列表
var isGet = false;
var isStartRecored = false;
var isSetRemote = false;
// 是不是主叫
let peerconnetion = null;
var isOffer = true;
var recvSdp = {
    sdp: null,
    type: null
};
var cacheCandidateMsg = [];
var selfid = '';

function randomString(length) {
    var str = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    var result = '';
    for (var i = length; i > 0; --i) 
        result += str[Math.floor(Math.random() * str.length)];
    return result;
}
function startWebCam() {
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
                    width: 320,
                    height: 240,
                    frameRate: { ideal: 10, max: 15 },
                    deviceId: audioDeviceIds ? audioDeviceIds : undefined
                },

            };

            navigator.mediaDevices.getUserMedia(constraints).then(function (mediaStream) {
                localStream = mediaStream;
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
function getUserMedia() {
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

async function InitPeerconnect() {
    console.log('开始初始化摄像头。。。。');
    await startWebCam();
    await getUserMedia();
    console.log('结束初始化摄像头。。。。');
    const config = {
        bundlePolicy: 'balanced',
        // certificates?: RTCCertificate[];
        // iceCandidatePoolSize?: number;
        iceTransportPolicy: "all",//  public relay
        rtcpMuxPolicy: 'negotiate',
        iceServers: [
            {
                urls: "turn:www.lymggylove.top:3478",
                username: "lym",
                credential: "123456"
            }
        ]
    };
    peerconnetion = new RTCPeerConnection(config);
    peerconnetion.ontrack = (ev) => {
        if (ev.streams && ev.streams[0]) {
            remoteVideoPlayer.srcObject = ev.streams[0];
        } else {
            const inboundStream = new MediaStream();
            inboundStream.addTrack(ev.track);
            remoteVideoPlayer.srcObject = inboundStream;
        }
        // if (trackEvent.track.kind === 'video') {
        //     remoteVideoPlayer.srcObject = trackEvent[0];
        // }
    };
    peerconnetion.onicecandidate = async (ev) => {
        console.log('=======>' + JSON.stringify(ev.candidate));
        if (socket) {
            await socket.emit('message', room, {
                type: 2,
                candidate: ev.candidate
            });
        }
    };
    peerconnetion.oniceconnectionstatechange = (ev)=>{
        outputArea.scrollTop = outputArea.scrollHeight;//窗口总是显示最后的内容
        outputArea.value = outputArea.value + JSON.stringify(peerconnetion.iceConnectionState) + '\r';
        if (peerconnetion.iceConnectionState === 'connected') {
            startGraph();
        }
    };
    //添加本地媒体流
    for (const track of localStream.getTracks()) {
        peerconnetion.addTrack(track);
    }
    if (isOffer) {
        const offerOption = {
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
        };
        const offerSdp = await peerconnetion.createOffer(offerOption);
        if (socket) {
            await socket.emit('message', room, {
                type: 0,
                sdp: offerSdp
            });
        }
        const errLocalDescription = await peerconnetion.setLocalDescription(offerSdp);
        if (errLocalDescription) {
            console.error('setLocalDescription err :' + JSON.stringify(offerSdp));
            return;
        }
    } else {
        const answerOption = {
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
        };
        // RTCSessionDescriptionInit init = 
        const errsetRemoteDescription = await peerconnetion.setRemoteDescription(recvSdp);
        if (errsetRemoteDescription) {
            console.error('answer setRemoteDescription err :' + JSON.stringify(recvSdp));
            return;
        }
        isSetRemote = true;
        const answerSDP = await peerconnetion.createAnswer(answerOption);
        if (socket) {
            await socket.emit('message', room, {
                type: 1,
                sdp: answerSDP
            });
        }
        //发送出去
        const setLocalDescriptionErr = await peerconnetion.setLocalDescription(answerSDP);
        addcandidateFUN();
        videoBindwidthSelect.disabled = false;

    }

}
var bitrateGraph;
var bitrateSeries;

var packetGraph;
var packetSeries;

var lastResult;
var graphInterval = null;
//     结束webrtc 
function peerCloseFun ()  {
    isStartRecored = false;
    for (const track of localStream.getTracks()) {
        // peerconnetion.removeTrack(track);
        track.stop();
    }
    peerconnetion.close();
    localStream = null;
    cacheCandidateMsg = [];
    videoPlayer.srcObject = null;
    remoteVideoPlayer.srcObject = null;
    
    isSetRemote = false;
    isOffer = true;
    recvSdp = null;
    inputArea.value = '';
    peerconnetion = null;
    videoBindwidthSelect.disabled = true;
    if (graphInterval) {
        clearInterval(graphInterval);

    }
}

async function startGraph(){
    var vSender = null;
    var aSender = null;
    bitrateSeries = new TimelineDataSeries();
	bitrateGraph = new TimelineGraphView('bitrateGraph', 'birateCanvas');
	bitrateGraph.updateEndDate();

	packetSeries = new TimelineDataSeries();
	packetGraph = new TimelineGraphView('packetGraph', 'packetsCanvas');
	packetGraph.updateEndDate();
    // 从peer connection中获取senders 然后遍历查找到视频的sender
    peerconnetion.getSenders().forEach(sender => {
             if (sender && sender.track.kind === 'video') {
                 vSender = sender;
             }
             if (sender && sender.track.kind === 'audio') {
                aSender = sender;
            }
    });
    // RTCStatsReport
    graphInterval = setInterval(async () => {
        const statsReport = await vSender.getStats();
        statsReport.forEach((value, key, parent) => {
            if (value.type === 'outbound-rtp') {
                const now = value.timestamp;
                let bytes = value.bytesSent;
                let packets = value.packetsSent;
                if (lastResult && lastResult.has(value.id)) {
                    // calculate bitrate
                    const bitrate = 8 * (bytes - lastResult.get(value.id).bytesSent) /
                        (now - lastResult.get(value.id).timestamp);
                    const packet = packets - lastResult.get(value.id).packetsSent;

                    // append to chart
                    bitrateSeries.addPoint(now, bitrate);
                    bitrateGraph.setDataSeries([bitrateSeries]);
                    bitrateGraph.updateEndDate();

                    // calculate number of packets and append to chart
                    packetSeries.addPoint(now, packet);
                    packetGraph.setDataSeries([packetSeries]);
                    packetGraph.updateEndDate();
                }
            }
        });
        lastResult = statsReport;
    }, 1000);
    
}
// videoSource.onchange = start;
// audioSource.onchange = start;
// audioOutput.onchange = start;
// 选择特效的方法
filtersSelect.onchange = () => {
    videoPlayer.className = filtersSelect.value;
}
snapshotBtn.onclick = () => {
    videoPicture.className = filtersSelect.value;
    videoPicture.getContext('2d').drawImage(videoPlayer, 0, 0, videoPicture.width, videoPicture.height);
}
async function startRecord() {
    //   console.log(mediaRecorder.stat);
    console.log("recorder started");
    recoderVideoShow.style.background = "red";
    recoderVideoShow.style.color = "black";
    recoderVideoShow.stop = true;
    recoderVideoShow.src = 'none';
    buffer = [];
    var option = {
        mimeType: 'video/webm;codecs=vp8'
    }
    if (!MediaRecorder.isTypeSupported(option.mimeType)) {
        console.error('mimeType 是不被支持的:${option.mimeType}');
        return;
    }
    try {
        mediaRecorder = new MediaRecorder(localStream, option);
        mediaRecorder.ondataavailable = (e) => {
            if (e && e.data && e.data.size > 0) {
                //保存数据 在二进制数组
                buffer.push(e.data);
            }
        };

        mediaRecorder.onstop = function (e) {
            console.log("data available after MediaRecorder.stop() called.");

        }
        mediaRecorder.start(10);
    } catch (error) {
        console.error('failed Create meidaRecord ' + error);
    }


}
function addcandidateFUN(){
    cacheCandidateMsg.forEach((item, index, arr)=> {
        peerconnetion.addIceCandidate(item) }); // undefined
        cacheCandidateMsg = [];
}
async function stopRecord() {

    // console.log(mediaRecorder.state);
    console.log("recorder stopped");
    mediaRecorder.stop();
    recoderVideoShow.style.background = "";
    recoderVideoShow.style.color = "";
}
recordBtn.onclick = () => {
    if (recordBtn.textContent === 'Start Record') {
        recordBtn.textContent = 'Stop Record';
        recvPlayBtn.disabled = true;
        downloadBtn.disabled = true;
        startRecord();


    } else {
        recordBtn.textContent = 'Start Record';
        recvPlayBtn.disabled = false;
        downloadBtn.disabled = false;
        stopRecord();

    }
}
recvPlayBtn.onclick = () => {
    var blob = new Blob(buffer, { type: 'video/webm' });
    recoderVideoShow.src = window.URL.createObjectURL(blob);
    recoderVideoShow.srcObject = null;
    recoderVideoShow.controls = true;
    recoderVideoShow.play();
}
downloadBtn.onclick = async () => {
    //保存文件
    var blob = new Blob(buffer, { type: 'video/webm' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.style.display = 'none';
    a.download = 'aaa.webm';
    a.click();

}

btnConnect.onclick = () => {

    //connect
    socket = io.connect();

    //recieve message
    socket.on('joined', (room, id) => {
        if (selfid.length < 1) {
            selfid = id
        }
        btnConnect.disabled = true;
        btnLeave.disabled = false;
        inputArea.disabled = false;
        btnSend.disabled = false;
        recordBtn.disabled = false;
        snapshotBtn.disabled = false;
       
    });
    socket.on('otherJoined', (room, id) => {
        outputArea.scrollTop = outputArea.scrollHeight;//窗口总是显示最后的内容
        outputArea.value = outputArea.value + 'otherJoined' + id + '\r';
        btnConnect.disabled = true;
        btnLeave.disabled = false;
        inputArea.disabled = false;
        btnSend.disabled = false;
         // 初始化为webrtc 相关 这里只要对方一加入就 启动webrtc
         isOffer = true;
         InitPeerconnect();
    });

    socket.on('leaved', (room, id) => {
        btnConnect.disabled = false;
        btnLeave.disabled = true;
        inputArea.disabled = true;
        btnSend.disabled = true;
        recordBtn.disabled = true;
        snapshotBtn.disabled = true;
        peerCloseFun();
        outputArea.scrollTop = outputArea.scrollHeight;//窗口总是显示最后的内容
        outputArea.value = outputArea.value + 'leaved'+ id + '\r';
        socket.disconnect();
    });

    socket.on('message', (room, id, data) => {
        if (id === selfid) {
            return;
        }
        const type = data.type;
        switch (type) {
            case 0: {// offer
                isOffer = false;
                recvSdp = data.sdp;
                InitPeerconnect();
            }
                break;
            case 1: {// answer
                peerconnetion.setRemoteDescription(data.sdp);
                isSetRemote = true;
                addcandidateFUN();
                videoBindwidthSelect.disabled = false;
            }
                break;
            case 2: {// candidate
                if (isSetRemote ==  true) {
                    outputArea.scrollTop = outputArea.scrollHeight;//窗口总是显示最后的内容
                    
                } else {
                    cacheCandidateMsg.push(data.candidate);
                    addcandidateFUN();
                }
                outputArea.value = outputArea.value + JSON.stringify(data.candidate) + '\r';
                peerconnetion.addIceCandidate(data.candidate);
            }
                break;

            default:
                break;
        }
        // outputArea.scrollTop = outputArea.scrollHeight;//窗口总是显示最后的内容
        // outputArea.value = outputArea.value + data + '\r';
    });

    socket.on('disconnect', (socket) => {
        btnConnect.disabled = false;
        btnLeave.disabled = true;
        inputArea.disabled = true;
        btnSend.disabled = true;
    });

    //send message
    room = inputRoom.value;
    socket.emit('join', room);
}

btnSend.onclick = () => {
    var data = inputArea.value;
    data = userName.value + ':' + data;
    socket.emit('message', room, data);
    inputArea.value = '';
}

btnLeave.onclick = () => {
    room = inputRoom.value;
    socket.emit('leave', room);
}

inputArea.onkeypress = (event) => {
    //event = event || window.event;
    if (event.keyCode == 13) { //回车发送消息
        var data = inputArea.value;
        data = userName.value + ':' + data;
        socket.emit('message', room, data);
        inputArea.value = '';
        event.preventDefault();//阻止默认行为
    }
}
videoBindwidthSelect.onchange = () =>{
    //  先使标签不可见
    videoBindwidthSelect.disabled = true;
    // 获取选择的值
    const bw = videoBindwidthSelect.options[videoBindwidthSelect.selectedIndex].value;
    console.log('用户选择的大小是：'+bw);
    var vSender = null;
    var aSender = null;
    // 从peer connection中获取senders 然后遍历查找到视频的sender
    peerconnetion.getSenders().forEach(sender => {
             if (sender && sender.track.kind === 'video') {
                 vSender = sender;
             }
             if (sender && sender.track.kind === 'audio') {
                aSender = sender;
            }
    });
    // 从视频sender中获取parameters
    var paramaters = vSender.getParameters();
    var aParamaters = aSender.getParameters();
    if (!paramaters.encodings) {
        return;
    }
    if (!aParamaters.encodings) {
        // return;
    }
    // 如果有联播这里需要使用循环去设置每一个的值
    //  这里只有一个所以直接获取第一个进行设置
    paramaters.encodings[0].maxBitrate = bw * 1000;
    // 将参数应用到sender中
    vSender.setParameters(paramaters).then(()=>{
        console.log('设置限制最大码率成功');
        videoBindwidthSelect.disabled = false;
    }).catch((e) => {
        videoBindwidthSelect.disabled = false;
        console.log(e);
    });

};