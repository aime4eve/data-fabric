---
# ===== 1. Pandoc 用：转 PDF 时会写进属性 =====
title: "公司级知识库管理文档 v2.0"
author: [知识库管理员, 系统架构师]
date: 2024-12-27
version: 2.0.0
subject: "企业知识管理体系、业务流程与组织架构"
keywords: [知识库, 企业管理, 业务流程, 组织架构, 政府信息化, 海外物联网, 保障性住房]
lang: zh-CN
pdf-engine: xelatex
mainfont: SimSun
toc: true
numbersections: true

# ===== 2. NebulaGraph 用：整段交给脚本一次性灌库 =====
nebula:
  space: company_knowledge_base    # 事先 CREATE SPACE company_knowledge_base(...)
  # 2.1 顶点：文档 → 体系 → 业务中心 → 部门 → 功能模块
  vertices:
    # 2.1.1 文档级
    - vid: "doc:company-kb-2.0.0"
      tag: Document
      props:
        name: "公司级知识库管理文档"
        version: 2.0.0
        status: "正式发布"
        lastReview: "2024-12-20"
        url: "file:///root/knowledge-base-app/company_knowledge_base/README.md"

    # 2.1.2 体系级（三大体系）
    - vid: "system:basic-mgmt"
      tag: System
      props: {name: "基础管理体系", order: 1, anchor: "#基础管理体系"}
    - vid: "system:core-business"
      tag: System
      props: {name: "核心业务体系", order: 2, anchor: "#核心业务体系"}
    - vid: "system:support-guarantee"
      tag: System
      props: {name: "支撑保障体系", order: 3, anchor: "#支撑保障体系"}

    # 2.1.3 业务中心级
    - vid: "center:company-basic-info"
      tag: BusinessCenter
      props: {name: "公司基本信息", code: "01", type: "基础管理"}
    - vid: "center:hr"
      tag: BusinessCenter
      props: {name: "人力资源中心", code: "02", type: "基础管理"}
    - vid: "center:finance"
      tag: BusinessCenter
      props: {name: "财务管理中心", code: "03", type: "基础管理"}
    - vid: "center:admin"
      tag: BusinessCenter
      props: {name: "行政后勤管理", code: "04", type: "基础管理"}
    - vid: "center:overseas-iot"
      tag: BusinessCenter
      props: {name: "海外物联网业务", code: "05", type: "核心业务"}
    - vid: "center:gov-informatization"
      tag: BusinessCenter
      props: {name: "政府信息化业务", code: "06", type: "核心业务"}
    - vid: "center:affordable-housing"
      tag: BusinessCenter
      props: {name: "保障性住房业务", code: "07", type: "核心业务"}
    - vid: "center:tech-rd"
      tag: BusinessCenter
      props: {name: "技术研发中心", code: "08", type: "支撑保障"}
    - vid: "center:pmo"
      tag: BusinessCenter
      props: {name: "项目管理办公室", code: "09", type: "支撑保障"}
    - vid: "center:legal-compliance"
      tag: BusinessCenter
      props: {name: "法务合规中心", code: "10", type: "支撑保障"}
    - vid: "center:kb-mgmt"
      tag: BusinessCenter
      props: {name: "知识库管理规范", code: "11", type: "支撑保障"}

    # 2.1.4 部门级（重点业务中心的子部门）
    # 海外物联网业务部门
    - vid: "dept:iot-tech-rd"
      tag: Department
      props: {name: "技术研发中心", parent: "overseas-iot", functions: "硬件软件研发,技术标准制定"}
    - vid: "dept:iot-market"
      tag: Department
      props: {name: "市场拓展部", parent: "overseas-iot", functions: "市场分析,合作伙伴管理"}
    - vid: "dept:iot-sales"
      tag: Department
      props: {name: "销售管理部", parent: "overseas-iot", functions: "销售流程,合同管理"}
    - vid: "dept:iot-service"
      tag: Department
      props: {name: "客户服务部", parent: "overseas-iot", functions: "产品支持,客户关系"}

    # 政府信息化业务部门（项目运营中心下的团队）
    - vid: "dept:gov-project-ops"
      tag: Department
      props: {name: "项目运营中心", parent: "gov-informatization", functions: "统一项目管理"}
    - vid: "team:gov-market-business"
      tag: Team
      props: {name: "市场商务团队", parent: "gov-project-ops", functions: "投标管理,政府关系"}
    - vid: "team:gov-project-rd"
      tag: Team
      props: {name: "项目研发团队", parent: "gov-project-ops", functions: "项目实施,质量保证"}
    - vid: "team:gov-quality-cost"
      tag: Team
      props: {name: "质量成本团队", parent: "gov-project-ops", functions: "政策合规,成本控制"}

    # 保障性住房业务部门
    - vid: "dept:housing-construction"
      tag: Department
      props: {name: "项目建设部", parent: "affordable-housing", functions: "规划设计,施工管理"}
    - vid: "dept:housing-property"
      tag: Department
      props: {name: "物业管理部", parent: "affordable-housing", functions: "物业服务,维修维护"}
    - vid: "dept:housing-policy"
      tag: Department
      props: {name: "政策合规部", parent: "affordable-housing", functions: "政策解读,合规管理"}
    - vid: "dept:housing-tenant"
      tag: Department
      props: {name: "租户管理部", parent: "affordable-housing", functions: "租赁管理,社区服务"}

    # 2.1.5 功能模块级（重要的业务功能）
    - vid: "module:project-templates"
      tag: Module
      props: {name: "项目研发模板", type: "模板库", location: "06_政府信息化业务/项目运营中心/项目研发团队"}
    - vid: "module:bidding-templates"
      tag: Module
      props: {name: "投标文件模板", type: "模板库", location: "06_政府信息化业务/项目运营中心/市场商务团队"}
    - vid: "module:contract-templates"
      tag: Module
      props: {name: "合同模板库", type: "模板库", location: "10_法务合规中心"}
    - vid: "module:policy-library"
      tag: Module
      props: {name: "政策法规库", type: "知识库", location: "06_政府信息化业务/项目运营中心/质量成本团队"}
    - vid: "module:tech-standards"
      tag: Module
      props: {name: "技术架构规范", type: "标准规范", location: "08_技术研发中心"}

  # 2.2 边：把上面顶点连成一张企业知识网络
  edges:
    # 体系归属文档
    - {src: "system:basic-mgmt", dst: "doc:company-kb-2.0.0", type: PART_OF, rank: 0, props: {}}
    - {src: "system:core-business", dst: "doc:company-kb-2.0.0", type: PART_OF, rank: 0, props: {}}
    - {src: "system:support-guarantee", dst: "doc:company-kb-2.0.0", type: PART_OF, rank: 0, props: {}}

    # 业务中心归属体系
    - {src: "center:company-basic-info", dst: "system:basic-mgmt", type: BELONGS_TO, rank: 0, props: {}}
    - {src: "center:hr", dst: "system:basic-mgmt", type: BELONGS_TO, rank: 0, props: {}}
    - {src: "center:finance", dst: "system:basic-mgmt", type: BELONGS_TO, rank: 0, props: {}}
    - {src: "center:admin", dst: "system:basic-mgmt", type: BELONGS_TO, rank: 0, props: {}}
    - {src: "center:overseas-iot", dst: "system:core-business", type: BELONGS_TO, rank: 0, props: {}}
    - {src: "center:gov-informatization", dst: "system:core-business", type: BELONGS_TO, rank: 0, props: {}}
    - {src: "center:affordable-housing", dst: "system:core-business", type: BELONGS_TO, rank: 0, props: {}}
    - {src: "center:tech-rd", dst: "system:support-guarantee", type: BELONGS_TO, rank: 0, props: {}}
    - {src: "center:pmo", dst: "system:support-guarantee", type: BELONGS_TO, rank: 0, props: {}}
    - {src: "center:legal-compliance", dst: "system:support-guarantee", type: BELONGS_TO, rank: 0, props: {}}
    - {src: "center:kb-mgmt", dst: "system:support-guarantee", type: BELONGS_TO, rank: 0, props: {}}

    # 部门归属业务中心
    - {src: "dept:iot-tech-rd", dst: "center:overseas-iot", type: PART_OF, rank: 0, props: {}}
    - {src: "dept:iot-market", dst: "center:overseas-iot", type: PART_OF, rank: 0, props: {}}
    - {src: "dept:iot-sales", dst: "center:overseas-iot", type: PART_OF, rank: 0, props: {}}
    - {src: "dept:iot-service", dst: "center:overseas-iot", type: PART_OF, rank: 0, props: {}}
    - {src: "dept:gov-project-ops", dst: "center:gov-informatization", type: PART_OF, rank: 0, props: {}}
    - {src: "dept:housing-construction", dst: "center:affordable-housing", type: PART_OF, rank: 0, props: {}}
    - {src: "dept:housing-property", dst: "center:affordable-housing", type: PART_OF, rank: 0, props: {}}
    - {src: "dept:housing-policy", dst: "center:affordable-housing", type: PART_OF, rank: 0, props: {}}
    - {src: "dept:housing-tenant", dst: "center:affordable-housing", type: PART_OF, rank: 0, props: {}}

    # 团队归属项目运营中心
    - {src: "team:gov-market-business", dst: "dept:gov-project-ops", type: PART_OF, rank: 0, props: {}}
    - {src: "team:gov-project-rd", dst: "dept:gov-project-ops", type: PART_OF, rank: 0, props: {}}
    - {src: "team:gov-quality-cost", dst: "dept:gov-project-ops", type: PART_OF, rank: 0, props: {}}

    # 功能模块归属相关部门/团队
    - {src: "module:project-templates", dst: "team:gov-project-rd", type: BELONGS_TO, rank: 0, props: {}}
    - {src: "module:bidding-templates", dst: "team:gov-market-business", type: BELONGS_TO, rank: 0, props: {}}
    - {src: "module:contract-templates", dst: "center:legal-compliance", type: BELONGS_TO, rank: 0, props: {}}
    - {src: "module:policy-library", dst: "team:gov-quality-cost", type: BELONGS_TO, rank: 0, props: {}}
    - {src: "module:tech-standards", dst: "center:tech-rd", type: BELONGS_TO, rank: 0, props: {}}

    # 跨部门协作关系
    - {src: "team:gov-market-business", dst: "center:legal-compliance", type: COLLABORATES_WITH, rank: 0, props: {reason: "合同审核"}}
    - {src: "team:gov-project-rd", dst: "center:tech-rd", type: COLLABORATES_WITH, rank: 0, props: {reason: "技术支持"}}
    - {src: "team:gov-project-rd", dst: "center:pmo", type: COLLABORATES_WITH, rank: 0, props: {reason: "项目管理"}}
    - {src: "dept:iot-tech-rd", dst: "center:tech-rd", type: COLLABORATES_WITH, rank: 0, props: {reason: "技术共享"}}
    - {src: "center:finance", dst: "team:gov-quality-cost", type: SUPPORTS, rank: 0, props: {reason: "成本控制"}}
    - {src: "center:hr", dst: "center:overseas-iot", type: SUPPORTS, rank: 0, props: {reason: "人员配置"}}
    - {src: "center:hr", dst: "center:gov-informatization", type: SUPPORTS, rank: 0, props: {reason: "人员配置"}}
    - {src: "center:hr", dst: "center:affordable-housing", type: SUPPORTS, rank: 0, props: {reason: "人员配置"}}

    # 模板和标准的引用关系
    - {src: "team:gov-project-rd", dst: "module:tech-standards", type: REFERENCES, rank: 0, props: {}}
    - {src: "team:gov-market-business", dst: "module:contract-templates", type: REFERENCES, rank: 0, props: {}}
    - {src: "dept:iot-sales", dst: "module:contract-templates", type: REFERENCES, rank: 0, props: {}}
    - {src: "team:gov-quality-cost", dst: "module:policy-library", type: MAINTAINS, rank: 0, props: {}}
---

# 🏢 公司级知识库

## 📋 概述

本知识库是公司统一的知识管理平台，涵盖了公司运营的各个方面，从基础管理到业务专项，从技术研发到合规管理。通过标准化的目录结构和文档管理规范，为全公司提供高效的知识共享和协作平台。

## 🗂️ 目录结构

### 📋 基础管理体系

#### **01_公司基本信息**
- 公司简介与发展历程
- 组织架构与岗位职责
- 企业文化和价值观
- 规章制度手册
- 公司证照资质
- 战略规划与年度目标

#### **02_人力资源中心**
- 招聘与入职管理
- 薪酬福利制度
- 绩效考核体系
- 培训发展体系
- 员工关系管理
- 人事档案管理

#### **03_财务管理中心**
- 财务制度与流程
- 预算管理
- 成本控制
- 税务管理
- 财务报表与分析
- 资金管理

#### **04_行政后勤管理**
- 办公资产管理
- 行政采购管理
- 会议管理
- 文档管理规范
- 后勤服务管理

### 🚀 核心业务体系

#### **05_海外物联网业务**
- **技术研发中心**
  - 硬件产品文档
  - 软件系统文档
  - 技术白皮书
  - API接口文档
  - 技术标准规范
- **市场拓展部**
  - 目标市场分析
  - 竞争对手情报
  - 市场推广策略
  - 合作伙伴管理
  - 行业趋势研究
- **销售管理部**
  - 销售流程规范
  - 报价模板库
  - 合同范本库
  - 销售培训资料
  - 销售数据分析
- **客户服务部**
  - 产品安装指南
  - 故障排除手册
  - 客户案例库
  - 服务标准流程
  - 客户反馈管理

#### **06_政府信息化业务**
- **项目运营中心**
  - **市场商务团队**
    - 投标文件模板
    - 资质证明文件
    - 成功案例库
    - 竞争对手分析
    - 投标策略分析
    - 对接部门名录
    - 沟通记录档案
    - 合作备忘录
    - 政府活动记录
    - 关系维护策略
  - **项目研发团队**
    - 项目实施标准
    - 验收流程规范
    - 质量保证体系
    - **项目研发模板** *(包含完整的项目研发文档模板)*
  - **质量成本团队**
    - 政府政策解读
    - 行业标准规范
    - 合规要求文件
    - 法律法规库
    - 政策动态跟踪

#### **07_保障性住房业务**
- **项目建设部**
  - 规划设计文件
  - 施工图纸资料
  - 施工规范标准
  - 质量验收记录
  - 工程进度管理
- **物业管理部**
  - 物业服务标准
  - 收费管理制度
  - 维修维护手册
  - 安全管理规范
  - 环境管理标准
- **政策合规部**
  - 保障房政策库
  - 补贴申请流程
  - 审计合规要求
  - 政府检查记录
  - 政策风险预警
- **租户管理部**
  - 租赁合同模板
  - 租户服务指南
  - 投诉处理流程
  - 社区活动管理
  - 租户信息档案

### 🔗 支撑保障体系

#### **08_技术研发中心**
- 技术架构规范
- 研发流程管理
- 知识产权管理
- 技术培训资料
- 创新项目库

#### **09_项目管理办公室**
- 项目管理方法论
- 项目模板库
- 项目风险管理
- 项目经验总结
- 项目绩效评估

#### **10_法务合规中心**
- 合同模板库
- 法律风险防控
- 合规审查流程
- 法律咨询记录
- 诉讼案件管理

#### **11_知识库管理规范**
- 文档分类标准
- 权限管理体系
- 版本控制机制
- 搜索优化策略
- 知识贡献激励
- 定期维护计划

## 📖 使用指南

### 🎯 目标用户

- **管理层**：战略规划、业务决策、风险管控
- **业务部门**：业务流程、客户管理、市场分析
- **技术团队**：技术规范、研发流程、创新项目
- **支持部门**：人事、财务、行政、法务等

### 🔍 快速导航

#### 🎯 按角色导航
- **新员工入职**：`01_公司基本信息` → `02_人力资源中心/招聘与入职管理`
- **项目经理**：`09_项目管理办公室` → `06_政府信息化业务/项目运营中心/项目研发团队`
- **技术开发**：`08_技术研发中心` → `06_政府信息化业务/项目运营中心/项目研发团队/项目研发模板`
- **市场商务**：`06_政府信息化业务/项目运营中心/市场商务团队` → `05_海外物联网业务/市场拓展部`
- **财务人员**：`03_财务管理中心` → `10_法务合规中心/合同模板库`

#### 📋 按业务场景导航
- **项目启动**：`09_项目管理办公室/项目管理方法论` → 对应业务目录
- **投标准备**：`06_政府信息化业务/项目运营中心/市场商务团队/投标文件模板`
- **技术开发**：`06_政府信息化业务/项目运营中心/项目研发团队/项目研发模板`
- **合同签署**：`10_法务合规中心/合同模板库`
- **质量管控**：`06_政府信息化业务/项目运营中心/质量成本团队`
- **客户服务**：`05_海外物联网业务/客户服务部` → `07_保障性住房业务/租户管理部`

### 📝 文档贡献

1. **文档创建**：按照对应目录结构创建文档
2. **版本管理**：遵循 `11_知识库管理规范/版本控制机制`
3. **权限申请**：按照 `11_知识库管理规范/权限管理体系` 申请相应权限
4. **质量标准**：参考 `11_知识库管理规范/文档分类标准`

### 🔧 维护更新

- **定期审查**：每季度对文档进行审查更新
- **权限管理**：定期检查和调整访问权限
- **搜索优化**：持续优化文档标签和关键词
- **用户反馈**：收集并处理用户使用反馈

## 🚀 特色功能

### 📊 项目研发模板
位于 `06_政府信息化业务/项目运营中心/项目研发团队/项目研发模板`，包含：
- 完整的项目文档结构
- 标准化的交付模板
- 技术设计规范
- 测试验收流程

### 🎯 业务专项知识
- **海外物联网**：技术、市场、销售、服务全链条
- **政府信息化**：市场商务、项目研发、质量成本一体化管理
- **保障性住房**：建设、物业、合规、租户管理

### 🔗 统一协同体系
- 标准化的项目管理方法论
- 规范化的技术研发流程
- 完善的法务合规体系
- 系统化的知识管理规范

## 📞 联系支持

如有任何问题或建议，请联系：
- **知识库管理员**：[管理员邮箱]
- **技术支持**：[技术支持邮箱]
- **业务咨询**：[业务咨询邮箱]

---

*最后更新时间：2024年12月*
*版本：v2.0*
*更新内容：重构政府信息化业务目录结构，优化知识库导航体系*