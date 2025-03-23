'use strict'

import Signal from './signal.js';
import PeerClient from './PeerClient.js';

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
const room = inputRoom.value;

var joinBtnConnect = document.querySelector('button#connect');
var btnLeave = document.querySelector('button#leave');
var outputArea = document.querySelector('textarea#output');
var inputArea = document.querySelector('textarea#input');
var btnSend = document.querySelector('button#send');


var videoBindwidthSelect = document.getElementById('videoBindwidth');
// var birateCanvas  = document.getElementById('birateCanvas');
// var packetsCanvas = document.getElementById('packetsCanvas');
var localStream;

getUserMedia();
startWebCam();

const signal = new Signal();
const peerClient = new PeerClient(localStream);


// 防止重复去获取设备列表
var isGet = false;
// 随机生成一个用户id  '9215' + 16位随机数，不可以修改

const _selfid = '9215' + Math.random().toString(36).slice(2, 18);

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
                    width: 640,
                    height: 480,
                    frameRate: { ideal: 10, max: 30 },
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

// 使用 signal 处理 socket 事件
signal.join(inputRoom.value, (data) => {
    console.log('joined data :' + JSON.stringify(data));
    // 处理加入房间后的逻辑
});

signal.onOtherJoined((data) => {
    console.log('otherJoined :' + JSON.stringify(data));
    // 处理其他用户加入的逻辑
    InitPeerconnect();
});

signal.onLeaved((data) => {
    console.log('leaved :' + JSON.stringify(data));
    // 处理用户离开的逻辑
    peerCloseFun();
});


signal.onMessage((offerSdp, senderId) => {
    peerClient.createAnswer(offerSdp, (answerSDP) => {
        // if (socket) {
        //     await socket.emit('message', {
        //         roomId: room,
        //         id: selfid,
        //         type: 1,
        //         sdp: answerSDP
        //     });
        //     console.log('=======> send answerSDP:' + answerSDP);
        // }
        signal.sendMessage(room, _selfid, { type: 0, sdp: answerSDP });

    });
}, (answerSdp, senderId) => {
    peerClient.setRemoteDescription(answerSdp);
}, (candidate, senderId) => {
    peerClient.addcandidateFUN(candidate);

});

// 使用 peerClient 处理 WebRTC 逻辑
async function InitPeerconnect() {
    // console.log('开始初始化摄像头。。。。');
    // await startWebCam();
    // await getUserMedia();
    // console.log('结束初始化摄像头。。。。');

    await peerClient.initPeerConnection((message) => {
        if (message.type === 'candidate') {
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
            signal.sendMessage(room, _selfid, { type: 2, candidate: message.candidate });
        } else if (message.type === 'track') {
            remoteVideoPlayer.srcObject = message.stream;
        } else if (message.type === 'iceConnectionState') {
            if (message.state === 'connected') {
                startGraph();
                // setTimeout(() => {
                //     // RTCDataChannel
                //     sendDC.send('你好 我是 ' + selfid);
                // }, 5000);
            }
        }
    });
    peerClient.createOffer((offerSDP) => {
        signal.sendMessage(room, _selfid, { type: 0, sdp: offerSDP });
    });
}
var bitrateGraph;
var bitrateSeries;

var packetGraph;
var packetSeries;

var bitrateRecvGraph;
var bitrateRecvSeries;

var lastResult;
var graphInterval = null;


//     结束webrtc 
function peerCloseFun() {
    isStartRecored = false;
    if (localStream) {
        for (const track of localStream.getTracks()) {
            // peerconnetion.removeTrack(track);
            track.stop();
        }
    }
    peerClient.close();
    localStream = null;
    videoPlayer.srcObject = null;
    remoteVideoPlayer.srcObject = null;

    isSetRemote = false;
    isOffer = true;
    recvSdp = null;
    inputArea.value = '';
    videoBindwidthSelect.disabled = true;
    if (graphInterval) {
        clearInterval(graphInterval);

    }
}

async function startGraph() {
    var vSender = null;
    var aSender = null;
    bitrateSeries = new TimelineDataSeries();
    bitrateGraph = new TimelineGraphView('bitrateGraph', 'birateCanvas');
    bitrateGraph.updateEndDate();

    packetSeries = new TimelineDataSeries();
    packetGraph = new TimelineGraphView('packetGraph', 'packetsCanvas');
    packetGraph.updateEndDate();

    bitrateRecvSeries = new TimelineDataSeries();
    bitrateRecvGraph = new TimelineGraphView('bitrateRecvtGraph', 'bitrateRecvCanvas');
    bitrateRecvGraph.updateEndDate();
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
            } else if (value.type === "transport") {
                const now = value.timestamp;
                let bytes = value.bytesSent;
                let bytesRecv = value.bytesReceived;
                let packets = value.packetsSent;
                if (lastResult && lastResult.has(value.id)) {
                    const bitrateRecv = 8 * (bytesRecv - lastResult.get(value.id).bytesReceived) /
                        (now - lastResult.get(value.id).timestamp);
                    // append to chart
                    bitrateRecvSeries.addPoint(now, bitrateRecv);
                    bitrateRecvGraph.setDataSeries([bitrateRecvSeries]);
                    bitrateRecvGraph.updateEndDate();
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

// 加入房间按钮
joinBtnConnect.onclick = () => {
    // Ensure _selfid and room are defined correctly
    console.log('Joining room:', room, 'with user ID:', _selfid); // Debugging line
    signal.join({
        roomId: room, //房间id
        userId: _selfid  //用户id 当前客户端的id
    }, (data) => {
        // Check if data contains the expected values
        console.log('Join response data:', data); // Debugging line
        const { id, roomId, targetId, userList } = data;

        btnConnect.disabled = true;
        btnLeave.disabled = false;
        inputArea.disabled = false;
        btnSend.disabled = false;
        recordBtn.disabled = false;
        snapshotBtn.disabled = false;
        // 初始化为webrtc 相关 这里只要对方一加入就 启动webrtc
        isOffer = true;
    });
}

btnSend.onclick = () => {
    var data = inputArea.value;
    data = userName.value + ':' + data;
    socket.emit('chat', room, data);
    inputArea.value = '';
}

btnLeave.onclick = () => {
    room = inputRoom.value;
    socket.emit('leave', {
        roomId: room,
        id: selfid
    });
}

inputArea.onkeypress = (event) => {
    //event = event || window.event;
    if (event.keyCode == 13) { //回车发送消息
        var data = inputArea.value;
        data = userName.value + ':' + data;
        socket.emit('chat', {
            roomId: room,
            id: selfid,
            data
        });
        inputArea.value = '';
        event.preventDefault();//阻止默认行为
    }
}
videoBindwidthSelect.onchange = () => {
    //  先使标签不可见
    videoBindwidthSelect.disabled = true;
    // 获取选择的值
    const bw = videoBindwidthSelect.options[videoBindwidthSelect.selectedIndex].value;
    console.log('用户选择的大小是：' + bw);
    var vSender = null;
    var aSender = null;
    // 从peer connection中获取senders 然后遍历查找到视频的sender
    peerClient.peerConnection.getSenders().forEach(sender => {
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
    vSender.setParameters(paramaters).then(() => {
        console.log('设置限制最大码率成功');
        videoBindwidthSelect.disabled = false;
    }).catch((e) => {
        videoBindwidthSelect.disabled = false;
        console.log(e);
    });

};