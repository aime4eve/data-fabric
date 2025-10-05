#!/bin/bash

# 知识库数据种子脚本
# 用于填充测试数据到NebulaGraph数据库

set -e

echo "🌱 开始填充知识库测试数据..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查nebula-graphd服务是否运行
if ! docker-compose ps | grep -q "nebula-graphd.*Up"; then
    echo -e "${RED}错误: NebulaGraph服务未运行，请先启动服务${NC}"
    echo "运行: docker-compose up -d"
    exit 1
fi

# 创建测试数据
echo -e "${BLUE}👥 创建测试用户...${NC}"
cat > /tmp/seed_users.ngql << 'EOF'
USE knowledge_base;

-- 插入测试用户
INSERT VERTEX User(id, username, email, password_hash, role, created_at, status) VALUES
  "user_001":("user_001", "admin", "admin@example.com", "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.PJ/..", "admin", now(), "active"),
  "user_002":("user_002", "zhangsan", "zhangsan@example.com", "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.PJ/..", "user", now(), "active"),
  "user_003":("user_003", "lisi", "lisi@example.com", "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.PJ/..", "user", now(), "active");
EOF

# 创建分类数据
echo -e "${BLUE}📂 创建分类数据...${NC}"
cat > /tmp/seed_categories.ngql << 'EOF'
USE knowledge_base;

-- 插入分类数据
INSERT VERTEX Category(id, name, description, parent_id, level, created_at) VALUES
  "cat_001":("cat_001", "技术文档", "技术相关文档和教程", "", 1, now()),
  "cat_002":("cat_002", "前端开发", "前端技术和框架", "cat_001", 2, now()),
  "cat_003":("cat_003", "后端开发", "后端技术和框架", "cat_001", 2, now()),
  "cat_004":("cat_004", "数据库", "数据库相关知识", "cat_001", 2, now()),
  "cat_005":("cat_005", "业务文档", "业务流程和规范", "", 1, now()),
  "cat_006":("cat_006", "产品文档", "产品需求和设计", "cat_005", 2, now()),
  "cat_007":("cat_007", "运营文档", "运营策略和活动", "cat_005", 2, now());
EOF

# 创建知识条目数据
echo -e "${BLUE}📚 创建知识条目...${NC}"
cat > /tmp/seed_knowledge.ngql << 'EOF'
USE knowledge_base;

-- 插入知识条目
INSERT VERTEX Knowledge(id, title, content, category, tags, created_at, updated_at, author_id, status) VALUES
  "knowledge_001":("knowledge_001", "React Hooks 最佳实践", "React Hooks 是 React 16.8 引入的新特性，允许在函数组件中使用状态和其他 React 特性。useState 用于管理状态，useEffect 用于处理副作用，useContext 用于访问上下文...", "cat_002", "react,hooks,frontend", now(), now(), "user_002", "published"),
  "knowledge_002":("knowledge_002", "Flask RESTful API 开发指南", "Flask-RESTX 是 Flask 的扩展，用于快速构建 RESTful API。它提供了请求解析、响应序列化、API 文档自动生成等功能。主要特性包括：1. 装饰器式路由定义 2. 请求参数验证 3. 响应模型定义...", "cat_003", "flask,api,python", now(), now(), "user_002", "published"),
  "knowledge_003":("knowledge_003", "NebulaGraph 图数据库基础", "NebulaGraph 是一个开源的分布式图数据库，专为处理超大规模图数据而设计。它采用 shared-nothing 分布式架构，支持水平扩展。主要概念包括：图空间(space)、标签(tag)、边(edge)、属性(property)...", "cat_004", "nebula,graph,database", now(), now(), "user_003", "published"),
  "knowledge_004":("knowledge_004", "Docker Compose 使用技巧", "Docker Compose 是 Docker 的编排工具，用于定义和运行多容器应用。docker-compose.yml 文件定义了服务、网络、卷等配置。常用命令：docker-compose up 启动服务，docker-compose down 停止服务...", "cat_003", "docker,devops,deployment", now(), now(), "user_003", "published"),
  "knowledge_005":("knowledge_005", "敏捷开发流程规范", "敏捷开发是一种以人为核心、迭代、循序渐进的开发方法。主要原则包括：1. 个体和交互胜过过程和工具 2. 工作的软件胜过详尽的文档 3. 客户合作胜过合同谈判 4. 响应变化胜过遵循计划...", "cat_006", "agile,process,management", now(), now(), "user_001", "published"),
  "knowledge_006":("knowledge_006", "用户增长策略", "用户增长是通过各种策略和手段获取新用户、激活老用户、提高用户留存的过程。AARRR 模型包括：Acquisition(获取)、Activation(激活)、Retention(留存)、Revenue(变现)、Referral(推荐)...", "cat_007", "growth,marketing,user", now(), now(), "user_001", "published");
EOF

# 创建关系数据
echo -e "${BLUE}🔗 创建知识条目关系...${NC}"
cat > /tmp/seed_relationships.ngql << 'EOF'
USE knowledge_base;

-- 创建用户与知识条目的创建关系
INSERT EDGE Created(created_at, role) VALUES
  "user_002"->"knowledge_001":(now(), "author"),
  "user_002"->"knowledge_002":(now(), "author"),
  "user_003"->"knowledge_003":(now(), "author"),
  "user_003"->"knowledge_004":(now(), "author"),
  "user_001"->"knowledge_005":(now(), "author"),
  "user_001"->"knowledge_006":(now(), "author");

-- 创建知识条目与分类的归属关系
INSERT EDGE BelongsTo(created_at) VALUES
  "knowledge_001"->"cat_002":(now()),
  "knowledge_002"->"cat_003":(now()),
  "knowledge_003"->"cat_004":(now()),
  "knowledge_004"->"cat_003":(now()),
  "knowledge_005"->"cat_006":(now()),
  "knowledge_006"->"cat_007":(now());

-- 创建知识条目之间的关联关系
INSERT EDGE RelatedTo(relationship_type, strength, created_at) VALUES
  "knowledge_001"->"knowledge_002":("technology", 0.7, now()),
  "knowledge_002"->"knowledge_004":("development", 0.8, now()),
  "knowledge_003"->"knowledge_004":("database", 0.6, now()),
  "knowledge_001"->"knowledge_005":("process", 0.4, now());
EOF

# 执行数据插入
docker-compose exec -T nebula-graphd nebula -u root -p nebula < /tmp/seed_users.ngql
docker-compose exec -T nebula-graphd nebula -u root -p nebula < /tmp/seed_categories.ngql
docker-compose exec -T nebula-graphd nebula -u root -p nebula < /tmp/seed_knowledge.ngql
docker-compose exec -T nebula-graphd nebula -u root -p nebula < /tmp/seed_relationships.ngql

# 验证数据插入
echo -e "${BLUE}🔍 验证数据插入结果...${NC}"
docker-compose exec nebula-graphd nebula -u root -p nebula -e "USE knowledge_base; MATCH (v) RETURN count(v);"

# 清理临时文件
rm -f /tmp/seed_*.ngql

echo -e "${GREEN}✅ 测试数据填充完成！${NC}"
echo ""
echo "📊 已创建的测试数据:"
echo "  - 用户: 3个 (admin, zhangsan, lisi)"
echo "  - 分类: 7个 (技术文档、前端开发、后端开发等)"
echo "  - 知识条目: 6个 (React、Flask、NebulaGraph等)"
echo "  - 关系: 用户创建、分类归属、知识关联"
echo ""
echo "🎯 下一步:"
echo "  1. 启动后端服务: cd src/backend && python app.py"
echo "  2. 启动前端服务: cd src/frontend && npm start"
echo "  3. 访问 http://localhost:3000 查看应用"
echo "  4. 使用API测试: curl http://localhost:5000/api/knowledge"