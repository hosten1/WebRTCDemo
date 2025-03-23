# WebRTCDemo

## 运行方式

    1. 安装依赖
    ```bash
    npm install
    ```

    2. 启动
    ```bash
    ./restartSocketIo.sh
    ```

## 信令格式

### 1.加入房间

发送如下信令：

```js
socket.emit('join', {
    roomId: roomId, //房间id
    userId: userId  //用户id 当前客户端的id
});
```

服务会返回状态所以这里可以使用emitwithAck，查看状态

## 2. 推送消息

### 2.1 加入房间成功

客户端监听如下方法：

```js
消息格式 {
    id:socket.id, //socket.id 当前客户端对应服务端socket的id
    roomId: this.roomId, 
    targetId:userId, // 发送给自己的消息，所以用户id就是当前用户的ID 和 targetId 一样
    userList:userList // 房间已经有的用户列表
     }
socket.on('joined', (data) => {
        /*  id 是服务的socket标识 
            roomId 是房间id 
            targetId 是对方id， 
            userList是存在房间的用户列表
         */
        const {id,
            roomId,
            targetId,
            userList } = data;
       

 });
 ```

### 2.2 其他用户加入房间

客户端监听如下方法：

```js
消息格式 {
            roomId:this.roomId,
            id:senderId,
            targetId:userId, // 发送给谁的
            senderId:senderId,// 发送者
            id = senderId;//兼容老的版本
        }
socket.on('otherJoined', (data) => {
        const {roomId, id} = data;
       

 });
 ```

### 2.3 用户离开

客户端监听如下方法：

```js
消息格式 {
            roomId:this.roomId,
            id:senderId,
            targetId:userId, // 发送给谁的
            senderId:senderId,// 发送者
            id = senderId;//兼容老的版本
        }
socket.on('leaved', (data) => {
        const {roomId, id} = data;
      
 });

 ```

### sdp交换信息

客户端监听如下方法：

```js
socket.on('message', (data) => {
        const id = data.id;
// 服务会向所有用户推送所以过滤掉当前用户
        if (id === selfid) {
            return;
        }
        const type = data.type;
        switch (type) {
            case 0: {// offer 主叫调用createoff发送的offersdp
            消息格式 {
                        roomId:this.roomId,
                        id:senderId,
                        targetId:userId, // 发送给谁的
                        senderId:senderId,// 发送者
                        id = senderId;//兼容老的版本
                    }
               
            }
                break;
            case 1: {// answer 被叫的answer sdp
               
            }
                break;
            case 2: {// candidate
               
            }
                break;

            default:
                break;
        }
      
    });

 ```

# 发送消息格式

## 发送ice信息如下

```js
ocket.emit('message',  {
                roomId:room,
                id: id,
                type: 2,
                candidate: ev.candidate
            },(data)=>{
                console.log('发送成功了 '+JSON.stringify(data));
            });
```

## 发送offer信息如下

```js
socket.emit('message',  {
                roomId:room,
                id: id,
                type: 0,
                sdp: offerSdp
            });
```

## 发送answer信息如下

```js
socket.emit('message', {
                roomId:room,
                id: id,
                type: 1,
                sdp: answerSDP
            });
```

## 发送level信息如下

```js
ocket.emit('leaved',  {
                roomId:room,
                id:selfid
            },(data)=>{
                console.log('发送成功了 '+JSON.stringify(data));
            });
```
