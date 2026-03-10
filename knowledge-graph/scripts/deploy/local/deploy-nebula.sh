#!/bin/bash

# Nebula Graph社区版部署脚本
# 适用于WSL环境

echo "🚀 开始部署Nebula Graph社区版..."

# 检查Docker是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ Docker未安装，请先安装Docker"
    echo "安装命令: curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh"
    exit 1
fi

# 检查Docker Compose是否安装
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose未安装，请先安装Docker Compose"
    echo "安装命令: sudo apt-get update && sudo apt-get install docker-compose-plugin"
    exit 1
fi

# 创建必要的目录
mkdir -p logs
mkdir -p config

# 检查配置文件是否存在
if [ ! -f "config/redis.conf" ]; then
    echo "📝 创建Redis配置文件..."
    cat > config/redis.conf << EOF
# Redis基础配置
bind 0.0.0.0
port 6379
timeout 0
tcp-keepalive 300
daemonize no
protected-mode no
pidfile /var/run/redis_6379.pid
loglevel notice
logfile ""
databases 16
save 900 1
save 300 10
save 60 10000
stop-writes-on-bgsave-error yes
rdbcompression yes
rdbchecksum yes
dbfilename dump.rdb
dir /data
EOF
fi

if [ ! -f "config/prometheus.yml" ]; then
    echo "📝 创建Prometheus配置文件..."
    cat > config/prometheus.yml << EOF
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'nebula-graph'
    static_configs:
      - targets: ['nebula-graph:19669']
  - job_name: 'nebula-storaged'
    static_configs:
      - targets: ['nebula-storaged:19779']
  - job_name: 'nebula-metad'
    static_configs:
      - targets: ['nebula-metad:19559']
  - job_name: 'backend'
    static_configs:
      - targets: ['backend:5000']
EOF
fi

# 启动Nebula Graph服务
echo "🔧 启动Nebula Graph服务..."
docker-compose up -d nebula-graph nebula-storaged nebula-metad

# 等待服务启动
echo "⏳ 等待Nebula Graph服务启动..."
sleep 30

# 检查服务状态
echo "🔍 检查服务状态..."
docker-compose ps

# 测试连接
echo "🧪 测试Nebula Graph连接..."
docker exec knowledge-base-nebula-graph /usr/local/nebula/bin/nebula-console -u root -p nebula --address=127.0.0.1 --port=9669 -e "SHOW HOSTS;"

if [ $? -eq 0 ]; then
    echo "✅ Nebula Graph部署成功！"
    echo ""
    echo "📊 服务访问地址："
    echo "   Nebula Graph: http://localhost:9669"
    echo "   Nebula Studio: http://localhost:7001 (如果部署了Studio)"
    echo "   Prometheus: http://localhost:9090"
    echo "   Grafana: http://localhost:3001 (用户名: admin, 密码: admin)"
    echo ""
    echo "🔧 常用命令："
    echo "   查看服务状态: docker-compose ps"
    echo "   查看日志: docker-compose logs [服务名]"
    echo "   停止服务: docker-compose down"
    echo "   重启服务: docker-compose restart"
else
    echo "❌ Nebula Graph连接测试失败，请检查日志"
    docker-compose logs nebula-graph
fi