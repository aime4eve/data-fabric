# Nebula Graph社区版WSL部署指南

## 环境要求

- WSL 2 (Ubuntu 20.04+ 推荐)
- Docker 20.10+
- Docker Compose 2.0+

## 快速开始

### 1. 安装依赖

```bash
# 安装Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# 安装Docker Compose
sudo apt-get update
sudo apt-get install docker-compose-plugin

# 添加用户到docker组
sudo usermod -aG docker $USER
newgrp docker
```

### 2. 部署Nebula Graph

```bash
# 切换到部署脚本目录
cd scripts/deploy/local

# 给脚本执行权限
chmod +x deploy-nebula.sh manage-nebula.sh

# 部署Nebula Graph
./deploy-nebula.sh
```

### 3. 验证部署

```bash
# 检查服务状态
./manage-nebula.sh status

# 测试连接
./manage-nebula.sh console
```

## 服务说明

| 服务 | 端口 | 说明 |
|------|------|------|
| nebula-graph | 9669 | 图数据库服务 |
| nebula-storaged | 9779 | 存储服务 |
| nebula-metad | 9559 | 元数据服务 |
| Prometheus | 9090 | 监控服务 |
| Grafana | 3001 | 可视化监控 |

## 常用操作

### 启动服务
```bash
./manage-nebula.sh start
```

### 停止服务
```bash
./manage-nebula.sh stop
```

### 查看日志
```bash
./manage-nebula.sh logs nebula-graph
```

### 数据备份
```bash
./manage-nebula.sh backup
```

## 故障排除

### 端口冲突
如果端口被占用，可以修改`docker-compose.yml`中的端口映射。

### 服务启动失败
检查Docker日志：
```bash
docker-compose logs
```

### 连接失败
确保服务完全启动后再连接，等待时间可能需要30-60秒。