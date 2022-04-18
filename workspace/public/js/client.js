'use strict'

const startReocrdBtn = document.getElementById("startReocrd_btn");

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
const recoderVideoShow = document.getElementById("recoderVideoShow");
const recordBtn = document.getElementById("record_Btn");
const recvPlayBtn = document.getElementById("recvPlay_Btn");
const downloadBtn = document.getElementById("download_Btn");



// 获取显示的div
const showDiv = document.getElementById("constraints");

// 房间聊天功能
var userName = document.querySelector('input#username');
var inputRoom = document.querySelector('input#room');
var btnConnect = document.querySelector('button#connect');
var btnLeave = document.querySelector('button#leave');
var outputArea = document.querySelector('textarea#output');
var inputArea = document.querySelector('textarea#input');
var btnSend = document.querySelector('button#send');

var socket;
var room;


// 防止重复去获取设备列表
var isGet = false;
function start() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        document.write('当前浏览器不支持 getUserMedia()！！！！/n');
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

        navigator.mediaDevices.getUserMedia(constraints)
            .then(function (mediaStream) {
                // 保存到window全局对象中，方便后续使用
                window.stream = mediaStream;
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
                // 获取权限后开始获取设备
                return navigator.mediaDevices.enumerateDevices();
            }).then((devices) => {
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

            }).catch((err) => {
                console.log(err.name + ": " + err.message);
            }); // 总是在最后检查错误
    }
}

startReocrdBtn.onclick = ()=>{
    start();
    start.recordBtn.disabled = true;
}
videoSource.onchange = start;
audioSource.onchange = start;
audioOutput.onchange = start;
// 选择特效的方法
filtersSelect.onchange = () => {
    videoPlayer.className = filtersSelect.value;
}
snapshotBtn.onclick = () => {
    videoPicture.className = filtersSelect.value;
    videoPicture.getContext('2d').drawImage(videoPlayer, 0, 0, videoPicture.width, videoPicture.height);
}
function handlerDataRecord(e) {
    if (e && e.data && e.data.size > 0) {
        //保存数据 在二进制数组
        buffer.push(e.data);
    }
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
        mediaRecorder = new MediaRecorder(window.stream, option);
        mediaRecorder.ondataavailable = handlerDataRecord;

        mediaRecorder.onstop = function (e) {
            console.log("data available after MediaRecorder.stop() called.");

            // var clipName = prompt('Enter a name for your sound clip');

            // var clipContainer = document.createElement('article');
            // var clipLabel = document.createElement('p');
            // var audio = document.createElement('audio');
            // var deleteButton = document.createElement('button');

            // clipContainer.classList.add('clip');
            // audio.setAttribute('controls', '');
            // deleteButton.innerHTML = "Delete";
            // clipLabel.innerHTML = clipName;

            // clipContainer.appendChild(audio);
            // clipContainer.appendChild(clipLabel);
            // clipContainer.appendChild(deleteButton);
            // soundClips.appendChild(clipContainer);

            // audio.controls = true;
            // var blob = new Blob(chunks, { 'type' : 'audio/ogg; codecs=opus' });
            // chunks = [];
            // var audioURL = URL.createObjectURL(blob);
            // audio.src = audioURL;
            // console.log("recorder stopped");

            // deleteButton.onclick = function(e) {
            //   evtTgt = e.target;
            //   evtTgt.parentNode.parentNode.removeChild(evtTgt.parentNode);
            // }
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

btnConnect.onclick = () => {

    //connect
    socket = io.connect();

    //recieve message
    socket.on('joined', (room, id) => {
        btnConnect.disabled = true;
        btnLeave.disabled = false;
        inputArea.disabled = false;
        btnSend.disabled = false;
    });

    socket.on('leaved', (room, id) => {
        btnConnect.disabled = false;
        btnLeave.disabled = true;
        inputArea.disabled = true;
        btnSend.disabled = true;

        socket.disconnect();
    });

    socket.on('message', (room, id, data) => {
        outputArea.scrollTop = outputArea.scrollHeight;//窗口总是显示最后的内容
        outputArea.value = outputArea.value + data + '\r';
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