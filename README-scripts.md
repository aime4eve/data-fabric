# 企业知识库管理系统 - 一键启动脚本

## 📋 脚本概览

本项目提供了一套完整的服务管理脚本，让您能够轻松管理前后端服务的启动、停止和状态检查。

## 🚀 快速开始

### 1. 一键启动所有服务
```bash
./start.sh
```

这个脚本会：
- ✅ 检查系统环境和依赖
- ✅ 检查端口占用情况
- ✅ 启动Docker基础设施服务（NebulaGraph、Redis等）
- ✅ 创建并激活Python虚拟环境
- ✅ 安装后端依赖
- ✅ 初始化数据库
- ✅ 启动后端API服务（端口8000）
- ✅ 安装前端依赖
- ✅ 启动前端开发服务（端口3000）
- ✅ 执行健康检查
- ✅ 显示服务状态和访问地址

### 2. 停止所有服务
```bash
./stop.sh
```

这个脚本会：
- 🛑 优雅停止前端服务
- 🛑 优雅停止后端服务
- 🛑 停止Docker基础设施服务
- 🧹 清理残留进程

### 3. 重启所有服务
```bash
./restart.sh
```

这个脚本会先停止所有服务，然后重新启动。

### 4. 查看服务状态
```bash
./status.sh
```

这个脚本会：
- 📊 检查应用服务状态
- 🐳 检查Docker基础设施状态
- 🔌 检查端口占用情况
- 🌐 执行服务连通性测试
- 📋 提供系统状态总览

## 🌐 服务访问地址

启动成功后，您可以通过以下地址访问服务：

- **前端应用**: http://localhost:3000
- **后端API**: http://localhost:8000
- **API文档**: http://localhost:8000/docs
- **健康检查**: http://localhost:8000/health

## 🗄️ 数据库连接

- **NebulaGraph**: localhost:9669
- **Redis**: localhost:6379

## 📊 日志查看

- **后端日志**: `tail -f logs/backend.log`
- **前端日志**: `tail -f logs/frontend.log`
- **Docker日志**: `docker-compose logs -f`

## 🔧 系统要求

在运行脚本之前，请确保系统已安装以下软件：

- **Docker** 和 **Docker Compose**
- **Node.js** 和 **npm**
- **Python 3.11+**
- **Poetry**（可选，用于Python依赖管理）

## 📁 项目结构

```
knowledge-base-app/
├── start.sh          # 一键启动脚本
├── stop.sh           # 停止服务脚本
├── restart.sh        # 重启服务脚本
├── status.sh         # 状态检查脚本
├── logs/             # 日志目录
│   ├── backend.log   # 后端日志
│   ├── frontend.log  # 前端日志
│   ├── backend.pid   # 后端进程ID
│   └── frontend.pid  # 前端进程ID
├── src/
│   ├── backend/      # 后端代码
│   └── frontend/     # 前端代码
└── docker-compose.yml # Docker服务配置
```

## 🚨 常见问题

### 1. 端口被占用
如果遇到端口占用问题，可以：
- 运行 `./stop.sh` 停止现有服务
- 或者手动停止占用端口的进程

### 2. Docker服务启动失败
- 确保Docker服务正在运行
- 检查Docker Compose配置文件
- 查看Docker日志：`docker-compose logs`

### 3. Python依赖安装失败
- 确保Python 3.11+已安装
- 如果使用Poetry，确保已正确安装
- 检查网络连接

### 4. 前端依赖安装失败
- 确保Node.js和npm已安装
- 清除npm缓存：`npm cache clean --force`
- 删除node_modules重新安装

## 🎯 开发建议

1. **首次运行**：建议先运行 `./status.sh` 检查系统状态
2. **开发调试**：可以单独启动前端或后端服务进行调试
3. **日志监控**：开发时建议开启日志监控
4. **定期重启**：长时间开发后建议重启服务以释放资源

## 📞 技术支持

如果遇到问题，请：
1. 查看相关日志文件
2. 运行 `./status.sh` 检查服务状态
3. 检查系统环境和依赖

---

**祝您使用愉快！** 🎉