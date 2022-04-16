'use strict'

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


// 防止重复去获取设备列表
var isGet = false;
function start(){
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        document.write('当前浏览器不支持 getUserMedia()！！！！/n');
    } else {
        
        // 想要获取一个最接近 1280x720 的相机分辨率
        const videoDeviceIds = videoSource.value;
        const audioDeviceIds = audioSource.value;
        console.log('刷新了 videoDeviceIds = ' + videoDeviceIds + ' audioDeviceIds = '+audioDeviceIds);
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
                  deviceId:audioDeviceIds ? audioDeviceIds : undefined
                } ,
             
            };
    
        navigator.mediaDevices.getUserMedia(constraints)
            .then(function (mediaStream) {
               
                videoPlayer.srcObject = mediaStream;
                videoPlayer.onloadedmetadata = function (e) {
                    videoPlayer.play();
                };
                // 获取权限后开始获取设备
                return navigator.mediaDevices.enumerateDevices();
            }).then((devices) => {
                if(!isGet){
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
start();
videoSource.onchange = start;
audioSource.onchange = start;
audioOutput.onchange = start;
// 选择特效的方法
filtersSelect.onchange = ()=>{
	videoPlayer.className = filtersSelect.value;
}
snapshotBtn.onclick = ()=>{
    videoPicture.className = filtersSelect.value;
  videoPicture.getContext('2d').drawImage(videoPlayer,0,0,videoPicture.width,videoPicture.height);
}