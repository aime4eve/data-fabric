# 快速入门指南

欢迎使用 Data-Fabric！本指南将帮助您在 10 分钟内快速上手。

## 🎯 学习目标

完成本指南后，您将能够：
- ✅ 创建您的第一个知识图谱
- ✅ 添加节点和关系
- ✅ 执行基本查询
- ✅ 可视化图数据

## 🚀 第一步：启动应用

确保您已经完成了 [安装指南](./installation.md)，然后启动应用：

```bash
# 启动后端
cd src/backend
source venv/bin/activate
python app.py

# 启动前端（新终端）
npm run dev
```

访问 http://localhost:3000 查看应用界面。

## 📊 第二步：创建知识图谱

### 1. 登录系统
- 打开浏览器访问 http://localhost:3000
- 使用默认账户登录：
  - 用户名: `admin`
  - 密码: `admin123`

### 2. 创建新的图空间
```bash
# 使用 API 创建图空间
curl -X POST http://localhost:5000/api/graphs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "my_first_graph",
    "description": "我的第一个知识图谱",
    "schema": {
      "vertex_types": ["Person", "Company", "Technology"],
      "edge_types": ["WORKS_AT", "USES", "KNOWS"]
    }
  }'
```

### 3. 通过界面创建
1. 点击 "新建图谱" 按钮
2. 填写图谱名称：`我的第一个知识图谱`
3. 选择模板：`企业知识图谱`
4. 点击 "创建"

## 🔗 第三步：添加数据

### 方式一：通过界面添加

#### 添加节点
1. 在图谱编辑器中点击 "添加节点"
2. 选择节点类型：`Person`
3. 填写属性：
   ```json
   {
     "name": "张三",
     "age": 30,
     "position": "软件工程师",
     "email": "zhangsan@example.com"
   }
   ```
4. 点击 "保存"

#### 添加关系
1. 选择两个节点
2. 点击 "添加关系"
3. 选择关系类型：`WORKS_AT`
4. 设置关系属性：
   ```json
   {
     "since": "2020-01-01",
     "department": "技术部"
   }
   ```

### 方式二：批量导入数据

#### 准备 CSV 文件
**nodes.csv**:
```csv
id,type,name,age,position,company
1,Person,张三,30,软件工程师,
2,Person,李四,28,产品经理,
3,Company,科技公司,,,"北京市朝阳区"
4,Technology,Python,,,
5,Technology,React,,,
```

**edges.csv**:
```csv
source,target,type,since,skill_level
1,3,WORKS_AT,2020-01-01,
2,3,WORKS_AT,2021-06-01,
1,4,USES,,expert
1,5,USES,,intermediate
2,5,USES,,advanced
```

#### 执行导入
```bash
# 导入节点
curl -X POST http://localhost:5000/api/graphs/my_first_graph/import/nodes \
  -H "Content-Type: multipart/form-data" \
  -F "file=@nodes.csv"

# 导入边
curl -X POST http://localhost:5000/api/graphs/my_first_graph/import/edges \
  -H "Content-Type: multipart/form-data" \
  -F "file=@edges.csv"
```

### 方式三：使用 API 添加

```python
import requests

# API 基础 URL
BASE_URL = "http://localhost:5000/api"
GRAPH_NAME = "my_first_graph"

# 添加节点
def add_node(node_data):
    response = requests.post(
        f"{BASE_URL}/graphs/{GRAPH_NAME}/nodes",
        json=node_data,
        headers={"Authorization": "Bearer YOUR_TOKEN"}
    )
    return response.json()

# 添加边
def add_edge(edge_data):
    response = requests.post(
        f"{BASE_URL}/graphs/{GRAPH_NAME}/edges",
        json=edge_data,
        headers={"Authorization": "Bearer YOUR_TOKEN"}
    )
    return response.json()

# 示例：添加人员节点
person_node = {
    "type": "Person",
    "properties": {
        "name": "王五",
        "age": 32,
        "position": "架构师",
        "skills": ["Python", "Kubernetes", "微服务"]
    }
}

result = add_node(person_node)
print(f"节点创建成功，ID: {result['id']}")
```

## 🔍 第四步：查询数据

### 基础查询

#### 1. 查找所有人员
```cypher
MATCH (p:Person) RETURN p LIMIT 10
```

#### 2. 查找特定人员
```cypher
MATCH (p:Person {name: "张三"}) RETURN p
```

#### 3. 查找工作关系
```cypher
MATCH (p:Person)-[r:WORKS_AT]->(c:Company) 
RETURN p.name, c.name, r.since
```

### 高级查询

#### 1. 查找技能专家
```cypher
MATCH (p:Person)-[r:USES {skill_level: "expert"}]->(t:Technology)
RETURN p.name, t.name
```

#### 2. 查找同事关系
```cypher
MATCH (p1:Person)-[:WORKS_AT]->(c:Company)<-[:WORKS_AT]-(p2:Person)
WHERE p1 <> p2
RETURN p1.name, p2.name, c.name
```

#### 3. 技能推荐
```cypher
MATCH (p:Person {name: "张三"})-[:WORKS_AT]->(c:Company)<-[:WORKS_AT]-(colleague:Person)
MATCH (colleague)-[:USES]->(skill:Technology)
WHERE NOT (p)-[:USES]->(skill)
RETURN skill.name, COUNT(colleague) as colleague_count
ORDER BY colleague_count DESC
```

### 使用 API 查询

```python
def query_graph(cypher_query):
    response = requests.post(
        f"{BASE_URL}/graphs/{GRAPH_NAME}/query",
        json={"query": cypher_query},
        headers={"Authorization": "Bearer YOUR_TOKEN"}
    )
    return response.json()

# 执行查询
result = query_graph("MATCH (p:Person) RETURN p.name, p.position LIMIT 5")
for record in result['data']:
    print(f"姓名: {record['p.name']}, 职位: {record['p.position']}")
```

## 📈 第五步：数据可视化

### 1. 图谱可视化
- 在界面中点击 "图谱视图"
- 使用鼠标拖拽节点
- 双击节点查看详细信息
- 使用滚轮缩放图谱

### 2. 自定义样式
```javascript
// 节点样式配置
const nodeStyle = {
  Person: {
    color: '#1890ff',
    size: 30,
    label: 'name'
  },
  Company: {
    color: '#52c41a',
    size: 40,
    label: 'name'
  },
  Technology: {
    color: '#fa8c16',
    size: 25,
    label: 'name'
  }
};

// 边样式配置
const edgeStyle = {
  WORKS_AT: {
    color: '#1890ff',
    width: 2,
    label: 'type'
  },
  USES: {
    color: '#fa8c16',
    width: 1,
    label: 'skill_level'
  }
};
```

### 3. 统计图表
```python
# 获取统计数据
stats = requests.get(f"{BASE_URL}/graphs/{GRAPH_NAME}/stats").json()

print(f"节点总数: {stats['node_count']}")
print(f"边总数: {stats['edge_count']}")
print(f"节点类型分布: {stats['node_types']}")
print(f"关系类型分布: {stats['edge_types']}")
```

## 🎨 第六步：高级功能

### 1. 图算法分析
```python
# 计算中心性
centrality = requests.post(
    f"{BASE_URL}/graphs/{GRAPH_NAME}/algorithms/centrality",
    json={"algorithm": "betweenness", "node_type": "Person"}
).json()

# 社区发现
communities = requests.post(
    f"{BASE_URL}/graphs/{GRAPH_NAME}/algorithms/community",
    json={"algorithm": "louvain"}
).json()

# 路径查找
path = requests.post(
    f"{BASE_URL}/graphs/{GRAPH_NAME}/algorithms/path",
    json={
        "source": "张三",
        "target": "Python",
        "algorithm": "shortest"
    }
).json()
```

### 2. 实时数据更新
```javascript
// 建立 WebSocket 连接
const ws = new WebSocket('ws://localhost:5000/ws/graphs/my_first_graph');

ws.onmessage = function(event) {
    const update = JSON.parse(event.data);
    if (update.type === 'node_added') {
        // 更新图谱显示
        addNodeToVisualization(update.data);
    }
};

// 监听数据变化
ws.send(JSON.stringify({
    action: 'subscribe',
    events: ['node_added', 'edge_added', 'node_updated']
}));
```

## ✅ 完成检查清单

确保您已经完成以下任务：

- [ ] 成功启动应用
- [ ] 创建了第一个知识图谱
- [ ] 添加了至少 5 个节点
- [ ] 创建了节点之间的关系
- [ ] 执行了基本查询
- [ ] 查看了图谱可视化
- [ ] 尝试了 API 调用

## 🎉 恭喜！

您已经成功完成了 Data-Fabric 的快速入门！现在您可以：

### 继续学习
- 📖 阅读 [API 文档](./api.md) 了解更多功能
- 🏗️ 查看 [架构设计](./architecture.md) 理解系统原理
- 🔧 学习 [高级配置](./configuration.md) 优化性能

### 实际应用
- 🏢 构建企业知识图谱
- 🔬 进行数据分析和挖掘
- 🤖 集成机器学习算法
- 📊 创建数据可视化仪表板

### 获取帮助
- 💬 加入 [社区讨论](https://github.com/aime4eve/Data-Fabric/discussions)
- 🐛 报告 [问题](https://github.com/aime4eve/Data-Fabric/issues)
- 📧 联系支持: support@data-fabric.example.com

## 📚 推荐资源

- [Cypher 查询语言教程](https://neo4j.com/developer/cypher/)
- [图数据库最佳实践](https://neo4j.com/developer/graph-database/)
- [React 开发指南](https://reactjs.org/docs/getting-started.html)
- [Flask API 开发](https://flask-restx.readthedocs.io/)

---

*祝您使用愉快！如有问题，随时联系我们。*