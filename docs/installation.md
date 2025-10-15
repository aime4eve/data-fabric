# 安装指南

本指南将帮助您在本地环境中安装和运行 Data-Fabric 应用。

## 📋 系统要求

### 最低要求
- **操作系统**: Linux, macOS, Windows 10+
- **内存**: 8GB RAM
- **存储**: 20GB 可用空间
- **网络**: 稳定的互联网连接

### 推荐配置
- **操作系统**: Ubuntu 20.04+ / macOS 12+ / Windows 11
- **内存**: 16GB+ RAM
- **存储**: 50GB+ SSD
- **CPU**: 4核心以上

## 🛠️ 依赖软件

### 必需软件
1. **Node.js** (v18.0+)
   ```bash
   # 使用 nvm 安装
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   nvm install 18
   nvm use 18
   ```

2. **Python** (v3.11+)
   ```bash
   # Ubuntu/Debian
   sudo apt update
   sudo apt install python3.11 python3.11-pip python3.11-venv
   
   # macOS (使用 Homebrew)
   brew install python@3.11
   
   # Windows (使用 Chocolatey)
   choco install python311
   ```

3. **Git**
   ```bash
   # Ubuntu/Debian
   sudo apt install git
   
   # macOS
   brew install git
   
   # Windows
   choco install git
   ```

### 可选软件
1. **Docker** (推荐用于生产环境)
   ```bash
   # Ubuntu
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   
   # macOS/Windows
   # 下载 Docker Desktop
   ```

2. **NebulaGraph** (图数据库)
   ```bash
   # 使用 Docker 运行
   docker run -d --name nebula-graph \
     -p 9669:9669 -p 19669:19669 -p 19670:19670 \
     vesoft/nebula-graph:v3.8.0
   ```

## 📥 获取源码

### 克隆仓库
```bash
git clone https://github.com/aime4eve/Data-Fabric.git
cd Data-Fabric
```

### 检查分支
```bash
# 查看所有分支
git branch -a

# 切换到开发分支（如果需要）
git checkout develop
```

## ⚙️ 环境配置

### 1. 前端环境设置
```bash
# 安装前端依赖
npm install

# 或使用 pnpm (推荐)
npm install -g pnpm
pnpm install
```

### 2. 后端环境设置
```bash
# 进入后端目录
cd src/backend

# 创建虚拟环境
python3.11 -m venv venv

# 激活虚拟环境
# Linux/macOS
source venv/bin/activate
# Windows
venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt
```

### 3. 环境变量配置
```bash
# 复制环境变量模板
cp .env.example .env

# 编辑环境变量
nano .env
```

**环境变量说明**:
```bash
# 应用配置
NODE_ENV=development
REACT_APP_API_URL=http://localhost:5000/api

# 数据库配置
DATABASE_URL=postgresql://user:password@localhost:5432/data_fabric
REDIS_URL=redis://localhost:6379/0

# 图数据库配置
NEBULA_HOST=localhost
NEBULA_PORT=9669
NEBULA_USER=root
NEBULA_PASSWORD=nebula

# 安全配置
SECRET_KEY=your-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-key

# 第三方服务
ELASTICSEARCH_URL=http://localhost:9200
```

## 🚀 启动应用

### 开发模式

#### 1. 启动后端服务
```bash
cd src/backend
source venv/bin/activate
python app.py
```

后端服务将在 `http://localhost:5000` 启动

#### 2. 启动前端服务
```bash
# 在项目根目录
npm run dev
# 或
pnpm dev
```

前端服务将在 `http://localhost:3000` 启动

### 生产模式

#### 使用 Docker Compose
```bash
# 构建并启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

#### 手动部署
```bash
# 构建前端
npm run build

# 启动后端（生产模式）
cd src/backend
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

## ✅ 验证安装

### 1. 检查服务状态
```bash
# 检查前端
curl http://localhost:3000

# 检查后端 API
curl http://localhost:5000/api/health

# 检查数据库连接
curl http://localhost:5000/api/db/status
```

### 2. 运行测试
```bash
# 前端测试
npm run test

# 后端测试
cd src/backend
pytest tests/
```

### 3. 访问应用
- **前端应用**: http://localhost:3000
- **API 文档**: http://localhost:5000/api/v1/docs/
- **管理界面**: http://localhost:3000/admin

## 🔧 常见问题

### 端口冲突
如果默认端口被占用，可以修改配置：
```bash
# 前端端口
export PORT=3001
npm run dev

# 后端端口
export FLASK_RUN_PORT=5001
python app.py
```

### 依赖安装失败
```bash
# 清理缓存
npm cache clean --force
pip cache purge

# 重新安装
rm -rf node_modules package-lock.json
npm install

rm -rf venv
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 数据库连接问题
1. 确保数据库服务正在运行
2. 检查连接字符串是否正确
3. 验证用户权限

### 权限问题
```bash
# Linux/macOS 权限修复
sudo chown -R $USER:$USER .
chmod +x scripts/*.sh
```

## 📚 下一步

安装完成后，您可以：

1. 阅读 [快速入门指南](./quick-start.md)
2. 查看 [API 文档](./api.md)
3. 了解 [架构设计](./architecture.md)
4. 参与 [开发贡献](./contributing.md)

## 🆘 获取帮助

如果遇到问题，请：

1. 查看 [故障排查指南](./troubleshooting.md)
2. 搜索 [GitHub Issues](https://github.com/aime4eve/Data-Fabric/issues)
3. 在 [讨论区](https://github.com/aime4eve/Data-Fabric/discussions) 提问
4. 联系技术支持: support@data-fabric.example.com