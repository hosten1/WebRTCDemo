#!/bin/bash
# 可以使用set -e来使脚本在出错时直接终止
# set -e
# # 在子Shell中也生效
# set -E
# # 捕获错误
# handle_error() {
#   echo "An error occurred"
#   exit 1
# }

# trap handle_error ERR
# 获取端口号
PORT=443
HTTPPORT=8080

# 查询进程是否已经存在
pid=$(lsof -i:${PORT} -t)

# 判断进程是否已经存在
if [ -z "$pid" ]; then
    echo "Port ${PORT} is not in use."
else
    echo "Port ${PORT} is in use. Killing the process..."
    kill -9 "${pid}"
    echo "Process killed."
fi

# 查询进程是否已经存在
httpPid=$(lsof -i:${HTTPPORT} -t)

# 判断进程是否已经存在
if [ -z "$httpPid" ]; then
    echo "Port ${HTTPPORT} is not in use."
else
    echo "Port ${HTTPPORT} is in use. Killing the process..."
    kill -9 "${httpPid}"
    echo "Process killed."
fi

# 3. 重新启动服务
# 3. 重新启动服务，并将日志重定向到 log.log 文件中
#nohup node server.js > log.log &
node server.js