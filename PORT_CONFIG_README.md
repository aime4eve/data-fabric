# 端口统一配置管理

## 概述

本项目实现了端口配置的集中管理，所有服务的端口配置都统一在 `config/ports.yml` 文件中管理，避免了在代码中硬编码端口号的问题。

## 配置文件结构

端口配置文件位于 `config/ports.yml`，结构如下：

```yaml
frontend:
  port: 3000

backend:
  port: 5000

database:
  postgres:
    port: 5432
  redis:
    port: 6379

search:
  elasticsearch:
    port: 9200

graph_database:
  nebula_graph:
    port: 9669

monitoring:
  prometheus:
    port: 9090
  grafana:
    port: 3001

internal:
  backend:
    port: 5000
  postgres:
    port: 5432
  redis:
    port: 6379
  elasticsearch:
    port: 9200
  nebula_graph:
    port: 9669
  grafana:
    port: 3000
```

## 配置管理工具

### 查看当前配置

```bash
python scripts/manage_ports.py show
```

### 更新端口配置

```bash
# 更新前端端口
python scripts/manage_ports.py update frontend 3000

# 更新后端端口
python scripts/manage_ports.py update backend 5000

# 更新数据库端口
python scripts/manage_ports.py update database.postgres 5432
python scripts/manage_ports.py update database.redis 6379

# 更新搜索服务端口
python scripts/manage_ports.py update search.elasticsearch 9200

# 更新图数据库端口
python scripts/manage_ports.py update graph_database.nebula_graph 9669

# 更新监控服务端口
python scripts/manage_ports.py update monitoring.prometheus 9090
python scripts/manage_ports.py update monitoring.grafana 3001
```

### 验证端口配置

```bash
python scripts/manage_ports.py validate
```

### 生成所有配置

```bash
python scripts/manage_ports.py generate
```

## 配置更新流程

### 1. 修改端口配置

使用管理工具或直接编辑 `config/ports.yml` 文件修改端口配置。

### 2. 验证配置

```bash
python scripts/manage_ports.py validate
```

### 3. 生成新配置

```bash
python scripts/manage_ports.py generate
```

### 4. 重启服务

```bash
docker-compose down
docker-compose up -d
```

## 自动化脚本

### 一键更新所有配置

```bash
python scripts/update_configs.py
```

### 配置生成器

- `scripts/generate_docker_compose.py` - 根据端口配置生成 Docker Compose 文件
- `scripts/generate_frontend_env.py` - 根据端口配置生成前端环境变量

## 代码中使用端口配置

### 后端代码

```python
from infrastructure.config.port_config import port_config

# 获取后端端口
backend_port = port_config.get_backend_port()

# 获取数据库端口
postgres_port = port_config.get_database_port('postgres')
redis_port = port_config.get_database_port('redis')

# 获取所有配置
all_config = port_config.get_all_config()
```

### 前端配置

前端环境变量文件 `.env` 会自动根据端口配置生成：

```env
VITE_API_BASE_URL=http://localhost:5000/api/v1
```

## 端口冲突检测

配置管理工具会自动检测端口冲突，如果多个服务使用相同的端口，会提示错误信息。

## 默认端口配置

如果 `config/ports.yml` 文件不存在，系统会使用以下默认配置：

- 前端: 3000
- 后端: 5000
- PostgreSQL: 5432
- Redis: 6379
- Elasticsearch: 9200
- NebulaGraph: 9669
- Prometheus: 9090
- Grafana: 3001

## 注意事项

1. **端口范围**: 确保使用的端口在有效范围内（1024-65535）
2. **端口冲突**: 避免多个服务使用相同的端口
3. **防火墙设置**: 确保所需端口在防火墙中开放
4. **服务重启**: 修改端口配置后需要重启相关服务
5. **配置验证**: 修改配置后建议运行验证命令检查配置正确性

## 故障排除

### 端口被占用

如果端口被占用，可以：
1. 使用 `netstat -tulpn | grep <端口号>` 查看占用进程
2. 停止占用进程或修改端口配置

### 配置验证失败

如果配置验证失败，检查：
1. 配置文件格式是否正确
2. 端口号是否为有效数字
3. 是否存在端口冲突

### 服务启动失败

如果服务启动失败，检查：
1. 端口配置是否正确
2. Docker Compose 配置是否已更新
3. 相关依赖服务是否正常运行

## 最佳实践

1. **开发环境**: 使用默认端口配置
2. **生产环境**: 根据实际需求调整端口配置
3. **版本控制**: 将 `config/ports.yml` 纳入版本控制
4. **文档更新**: 修改端口配置后更新相关文档
5. **备份配置**: 定期备份端口配置文件

通过这种集中式的端口配置管理，可以大大提高项目的可维护性和可配置性。