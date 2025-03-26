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
// 截取视频保存成图片
const snapshotBtn = document.getElementById("snapshot_Btn");

const videoPicture = document.getElementById("video_picture");
videoPicture.width = 320;
videoPicture.height = 240;


//录制功能
var mediaRecorder;
var buffer;
const remoteVideoPlayer1 = document.getElementById("remoteVideoPlayer1");
const remoteVideoPlayer2 = document.getElementById("remoteVideoPlayer2");
const remoteVideoPlayer3 = document.getElementById("remoteVideoPlayer3");
const remoteVideoPlayer4 = document.getElementById("remoteVideoPlayer4");

const recoderVideoShow = document.getElementById("recoderVideoShow");
const recordBtn = document.getElementById("record_Btn");
recordBtn.disabled = true;
snapshotBtn.disabled = true;
const recvPlayBtn = document.getElementById("recvPlay_Btn");
const downloadBtn = document.getElementById("download_Btn");



// 获取显示的div
const showDiv = document.getElementById("constraints");
const videoShowTable = document.getElementById("videShowTable");

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

function _renderOwenrIdToLocalVideoRender() {
    // 设置不同的背景颜色
    videoPlayer.style.backgroundColor = '#FFFFFF'; // 循环使用颜色

    // 创建一个显示 senderId 的标签
    const senderIdLabel = document.createElement('div');
    senderIdLabel.textContent = "自己:" + _selfid;
    senderIdLabel.style.position = 'absolute';
    senderIdLabel.style.color = 'white';
    senderIdLabel.style.backgroundColor = 'rgba(0, 0, 0, 0.5)'; // 半透明背景
    senderIdLabel.style.padding = '2px';
    senderIdLabel.style.borderRadius = '3px';
    senderIdLabel.style.top = '5px';
    senderIdLabel.style.left = '5px';

    // 将 senderId 标签添加到视频元素中
    videoPlayer.parentElement.style.position = 'relative'; // 确保父元素为相对定位
    videoPlayer.parentElement.appendChild(senderIdLabel); // 将标签添加到视频的父元素中
}
async function steupMediaSource() {
    console.log('lym init steupMediaSource 0 ========>');

    if (!localStream) {
        console.log('lym init steupMediaSource 1 ========>');
        await getUserMedia();
        await startWebCam();

    }
    _renderOwenrIdToLocalVideoRender();
}


var signal;
var peerClient;

// 用于存储远端视频的 Map
const remoteVideos = new Map();

// 防止重复去获取设备列表
var isGet = false;
// 随机生成一个用户id  '9215' + 16位随机数，不可以修改

const _selfid = '9215' + Math.random().toString(36).slice(2, 18);

steupMediaSource();

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
            console.log('开始获取 videoDeviceIds = ' + videoDeviceIds + ' audioDeviceIds = ' + audioDeviceIds);
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
                console.log('结束获取 videoDeviceIds = ' + videoDeviceIds + ' audioDeviceIds = ' + audioDeviceIds);

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
                    // console.log('kind = ' + devInfo.kind
                    //     + ' lable = ' + devInfo.label
                    //     + ' id = ' + devInfo.deviceId
                    //     + ' groupId = ', devInfo.groupId);

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

// 使用 peerClient 处理 WebRTC 逻辑
async function InitPeerconnect(senderId, isOffer) {
    // console.log('开始初始化摄像头。。。。');
    // await startWebCam();
    // await getUserMedia();
    // console.log('结束初始化摄像头。。。。');
    _addRemoteVideo(senderId);
    await peerClient.initPeerConnection((message, senderId) => {
        if (message.type === 'candidate') {
            const sendData = {
                targetId: senderId,
                type: 2,
                candidate: message.candidate
            };
            signal.sendMessage(room, _selfid, sendData);
        } else if (message.type === 'track') {
            // 从 Map 中获取对应的远端视频元素
            const remoteVideo = remoteVideos.get(senderId);
            if (remoteVideo) {
                remoteVideo.srcObject = message.stream; // 设置远端视频流
            } else {
                const errorMsg = `No remote video found for senderId: ${senderId} remoteVideos:${Array.from(remoteVideos.keys())}`;
                console.error(errorMsg);
                outputArea.value += errorMsg + '\n'; // 将错误信息添加到 outputArea
                outputArea.scrollTop = outputArea.scrollHeight; // 滚动到最新信息
            }
        } else if (message.type === 'iceConnectionState') {
            const joinMsg = `senderId:${senderId} iceConnectionState: ${message.iceConnectionState}`;
            outputArea.value += joinMsg + '\n'; // 将用户加入的信息添加到 outputArea
            outputArea.scrollTop = outputArea.scrollHeight; // 滚动到最新信息
            if (message.state === 'connected') {
                startGraph(senderId);
                // setTimeout(() => {
                //     // RTCDataChannel
                //     sendDC.send('你好 我是 ' + selfid);
                // }, 5000);
            }
        }
    }, senderId);
    if (isOffer == true) {
        await peerClient.createOffer((offerSDP, senderId) => {
            const sendData = {
                targetId: senderId,
                type: 0,
                sdp: offerSDP
            };
            signal.sendMessage(room, _selfid, sendData);
        }, senderId);
    }

}
var bitrateGraph;
var bitrateSeries;

var packetGraph;
var packetSeries;

var bitrateRecvGraph;
var bitrateRecvSeries;

var lastResult;
var graphInterval = null;

var isStartGraph = false;


//     结束webrtc 
function peerCloseFun(senderId) {
    isStartRecored = false;
    if (localStream) {
        for (const track of localStream.getTracks()) {
            // peerconnetion.removeTrack(track);
            track.stop();
        }
    }
    peerClient.close(senderId);
    localStream = null;
    videoPlayer.srcObject = null;
    remoteVideoPlayer.srcObject = null;

    isSetRemote = false;
    //    isOffer = true;
    recvSdp = null;
    inputArea.value = '';
    videoBindwidthSelect.disabled = true;
    if (graphInterval) {
        clearInterval(graphInterval);

    }
}

async function startGraph(senderId) {
    if (isStartGraph == true) {
        return;
    }
    isStartGraph = true;
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
    peerClient.peerConnections[senderId].getSenders().forEach(sender => {
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
joinBtnConnect.onclick = async () => {
    if (!signal) {
        console.log('lym init socket ========>');
        signal = new Signal();
        signal.onOtherJoined(async (data) => {
            console.log('otherJoined :' + JSON.stringify(data));
            // 检查该用户的 peer 连接是否已经存在
            if (!peerClient.peerConnections.has(data.senderId)) {
                _addRemoteVideo(data.senderId); // 添加远端视频

                // 处理其他用户加入的逻辑
                await InitPeerconnect(data.senderId, true); // 只有在没有连接时才初始化

                const joinMsg = `User ${data.senderId} has joined the room.`;
                outputArea.value += joinMsg + '\n'; // 将用户加入的信息添加到 outputArea
                outputArea.scrollTop = outputArea.scrollHeight; // 滚动到最新信息
            } else {
                const errorMsg = `Peer connection for user ${data.senderId} already exists.`;
                console.log(errorMsg);
                outputArea.value += errorMsg + '\n'; // 将错误信息添加到 outputArea
                outputArea.scrollTop = outputArea.scrollHeight; // 滚动到最新信息
            }
        });

        signal.onLeaved((data) => {
            console.log('leaved :' + JSON.stringify(data));
            peerClient.close(data.senderId);
            // 移除远端视频
            _removeRemoteVideo(data.senderId);
            const leaveMsg = `User ${data.senderId} has left the room.`;
            outputArea.value += leaveMsg + '\n'; // 将用户离开的信息添加到 outputArea
            outputArea.scrollTop = outputArea.scrollHeight; // 滚动到最新信息
        });


        signal.onMessage(_selfid, async (offerSdp, senderIdIn) => {
            if (!peerClient.peerConnections.has(senderIdIn)) {
                await InitPeerconnect(senderIdIn, false);

            }
            await peerClient.createAnswer(offerSdp, (answerSDP, senderIdIn,) => {
                signal.sendMessage(room, _selfid, { targetId: senderIdIn, type: 1, sdp: answerSDP });

            }, senderIdIn);
        }, async (answerSdp, senderId) => {
            await peerClient.setRemoteDescription(answerSdp, senderId);
        }, async (candidate, senderId) => {
            await peerClient.addIceCandidate(candidate, senderId);

        });
        peerClient = new PeerClient(localStream);
    }

    // Ensure _selfid and room are defined correctly
    console.log('Joining room:', room, 'with user ID:', _selfid); // Debugging line
    signal.join({
        roomId: room, //房间id
        userId: _selfid  //用户id 当前客户端的id
    }, (data) => {
        // Check if data contains the expected values
        console.log('Join response data:', data); // Debugging line
        const { id, roomId, targetId, userList } = data;

        joinBtnConnect.disabled = true;
        btnLeave.disabled = false;
        inputArea.disabled = false;
        btnSend.disabled = false;
        recordBtn.disabled = false;
        snapshotBtn.disabled = false;
        // 初始化为webrtc 相关 这里只要对方一加入就 启动webrtc
        //        isOffer = true;
    });
}

btnSend.onclick = () => {
    var data = inputArea.value;
    data = _selfid + ':' + data;
    signal.sendChat(room, _selfid, { data })
    inputArea.value = '';
}

btnLeave.onclick = () => {
    var room = inputRoom.value;
    signal.leave(room, _selfid);
}

inputArea.onkeypress = (event) => {
    //event = event || window.event;
    if (event.keyCode == 13) { //回车发送消息
        var data = inputArea.value;
        data = _selfid + ':' + data;
        signal.sendChat(room, _selfid, { data })
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


// 添加远端视频的函数
function _addRemoteVideo(senderId) {
    // 检查视频是否已经存在
    if (remoteVideos.has(senderId)) {
        console.log(`Video for senderId ${senderId} already exists.`);
        return;
    }

    // 获取map中视频的个数
    var currentVideoCount = remoteVideos.size;
    console.log(`_addRemoteVideo count:${currentVideoCount}`);

    // 根据当前视频数量选择对应的预先创建的 video 元素
    let remoteVideo;
    switch (currentVideoCount) {
        case 0:
            remoteVideo = remoteVideoPlayer1;
            break;
        case 1:
            remoteVideo = remoteVideoPlayer2;
            break;
        case 2:
            remoteVideo = remoteVideoPlayer3;
            break;
        case 3:
            remoteVideo = remoteVideoPlayer4;
            break;
        default:
            console.error('Maximum number of remote videos reached.');
            return; // 超过最大数量，返回
    }

    // 设置不同的背景颜色
    const colors = ['#FF5733', '#33FF57', '#3357FF', '#F3FF33']; // 预定义颜色数组
    remoteVideo.style.backgroundColor = colors[currentVideoCount % colors.length]; // 循环使用颜色

    // 创建一个显示 senderId 的标签
    const senderIdLabel = document.createElement('div');
    senderIdLabel.textContent = senderId;
    senderIdLabel.style.position = 'absolute';
    senderIdLabel.style.color = 'white';
    senderIdLabel.style.backgroundColor = 'rgba(0, 0, 0, 0.5)'; // 半透明背景
    senderIdLabel.style.padding = '2px';
    senderIdLabel.style.borderRadius = '3px';
    senderIdLabel.style.top = '5px';
    senderIdLabel.style.left = '5px';

    // 将 senderId 标签添加到视频元素中
    remoteVideo.parentElement.style.position = 'relative'; // 确保父元素为相对定位
    remoteVideo.parentElement.appendChild(senderIdLabel); // 将标签添加到视频的父元素中

    // 将视频存储到 Map 中
    remoteVideos.set(senderId, remoteVideo);
}

// 移除远端视频的函数
function _removeRemoteVideo(senderId) {
    if (remoteVideos.has(senderId)) {
        // const remoteVideo = remoteVideos.get(senderId);
        // remoteVideo.parentElement.remove(); // 从 DOM 中移除视频
        remoteVideos.delete(senderId); // 从 Map 中删除
    }
}