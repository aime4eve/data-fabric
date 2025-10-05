#!/usr/bin/env python3
"""
初始化知识库文档数据脚本
根据 company_knowledge_base 目录结构生成文档列表
"""
import os
import sys
import logging
from pathlib import Path
from datetime import datetime
import uuid

# 添加项目根目录到Python路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from infrastructure.persistence.database import db
from infrastructure.persistence.models import DocumentModel, CategoryModel

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# 知识库目录结构映射
KNOWLEDGE_BASE_STRUCTURE = {
    "01_公司基本信息": {
        "name": "公司基本信息",
        "description": "企业文化、公司简介、证照资质、战略规划、组织架构等基础信息",
        "subdirs": {
            "企业文化和价值观": "企业文化价值观相关文档",
            "公司简介与发展历程": "公司发展历史和简介资料",
            "公司证照资质": "营业执照、资质证书等法定文件",
            "战略规划与年度目标": "公司战略规划和年度目标文档",
            "组织架构与岗位职责": "组织架构图和岗位职责说明",
            "规章制度手册": "公司各项规章制度文档"
        }
    },
    "02_人力资源中心": {
        "name": "人力资源中心",
        "description": "人事档案、员工关系、培训体系、招聘管理、绩效考核、薪酬福利等",
        "subdirs": {
            "人事档案管理": "员工档案管理相关文档",
            "员工关系管理": "员工关系处理和管理制度",
            "培训发展体系": "员工培训和发展体系文档",
            "招聘与入职管理": "招聘流程和入职管理制度",
            "绩效考核体系": "绩效考核制度和流程文档",
            "薪酬福利制度": "薪酬体系和福利制度文档"
        }
    },
    "03_财务管理中心": {
        "name": "财务管理中心",
        "description": "成本控制、税务管理、财务制度、财务报表、资金管理、预算管理等",
        "subdirs": {
            "成本控制": "成本控制方法和制度文档",
            "税务管理": "税务处理和管理制度",
            "财务制度与流程": "财务管理制度和业务流程",
            "财务报表与分析": "财务报表模板和分析方法",
            "资金管理": "资金管理制度和流程",
            "预算管理": "预算编制和管理制度"
        }
    },
    "04_行政后勤管理": {
        "name": "行政后勤管理",
        "description": "会议管理、办公资产、后勤服务、文档管理、行政采购等",
        "subdirs": {
            "会议管理": "会议组织和管理制度",
            "办公资产管理": "办公设备和资产管理制度",
            "后勤服务管理": "后勤服务标准和管理制度",
            "文档管理规范": "文档管理和归档规范",
            "行政采购管理": "行政采购流程和管理制度"
        }
    },
    "05_海外物联网业务": {
        "name": "海外物联网业务",
        "description": "客户服务、市场拓展、技术研发、销售管理等物联网业务相关",
        "subdirs": {
            "客户服务部": "客户服务流程和标准",
            "市场拓展部": "市场推广和拓展策略",
            "技术研发中心": "技术研发文档和规范",
            "销售管理部": "销售流程和管理制度"
        }
    },
    "06_政府信息化业务": {
        "name": "政府信息化业务",
        "description": "政府信息化项目运营和管理",
        "subdirs": {
            "项目运营中心": "政府信息化项目运营管理"
        }
    },
    "07_保障性住房业务": {
        "name": "保障性住房业务",
        "description": "政策合规、物业管理、租户管理、项目建设等保障房业务",
        "subdirs": {
            "政策合规部": "保障房政策和合规管理",
            "物业管理部": "物业服务和管理标准",
            "租户管理部": "租户服务和管理制度",
            "项目建设部": "项目建设和工程管理"
        }
    },
    "08_技术研发中心": {
        "name": "技术研发中心",
        "description": "创新项目、技术培训、技术架构、知识产权、研发流程等",
        "subdirs": {
            "创新项目库": "创新项目管理和文档",
            "技术培训资料": "技术培训和学习资料",
            "技术架构规范": "技术架构设计和规范",
            "知识产权管理": "知识产权保护和管理",
            "研发流程管理": "研发流程和项目管理"
        }
    },
    "09_项目管理办公室": {
        "name": "项目管理办公室",
        "description": "项目模板、管理方法论、经验总结、绩效评估、风险管理等",
        "subdirs": {
            "项目模板库": "项目管理模板和工具",
            "项目管理方法论": "项目管理方法和理论",
            "项目经验总结": "项目实施经验和总结",
            "项目绩效评估": "项目绩效评估方法",
            "项目风险管理": "项目风险识别和管理"
        }
    },
    "10_法务合规中心": {
        "name": "法务合规中心",
        "description": "合同模板、合规审查、法律咨询、风险防控、诉讼管理等",
        "subdirs": {
            "合同模板库": "各类合同模板和范本",
            "合规审查流程": "合规审查制度和流程",
            "法律咨询记录": "法律咨询和意见记录",
            "法律风险防控": "法律风险识别和防控",
            "诉讼案件管理": "诉讼案件处理和管理"
        }
    },
    "11_知识库管理规范": {
        "name": "知识库管理规范",
        "description": "知识库维护、搜索优化、分类标准、权限管理、版本控制等",
        "subdirs": {
            "定期维护计划": "知识库维护计划和制度",
            "搜索优化策略": "知识库搜索优化方法",
            "文档分类标准": "文档分类和标准规范",
            "权限管理体系": "知识库权限管理制度",
            "版本控制机制": "文档版本控制和管理",
            "知识贡献激励": "知识贡献激励机制"
        }
    }
}


def create_category(name, description, parent_id=None, sort_order=0):
    """创建分类"""
    category = CategoryModel(
        id=str(uuid.uuid4()),
        name=name,
        description=description,
        parent_id=parent_id,
        sort_order=sort_order,
        created_at=datetime.now(),
        updated_at=datetime.now()
    )
    db.session.add(category)
    db.session.flush()  # 获取ID
    return category


def create_document(title, content_path, category_id, description="", author_id="admin"):
    """创建文档"""
    document = DocumentModel(
        id=str(uuid.uuid4()),
        title=title,
        content_path=content_path,
        category_id=category_id,
        author_id=author_id,
        status="published",
        description=description,
        metadata={
            "file_type": "directory",
            "auto_generated": True,
            "source": "company_knowledge_base"
        },
        created_at=datetime.now(),
        updated_at=datetime.now()
    )
    db.session.add(document)
    return document


def init_knowledge_base_data():
    """初始化知识库数据"""
    logger.info("开始初始化知识库文档数据...")
    
    # 检查是否已有数据
    existing_docs = DocumentModel.query.filter(
        DocumentModel.metadata.op('->>')('source') == 'company_knowledge_base'
    ).count()
    
    if existing_docs > 0:
        logger.info(f"发现已有 {existing_docs} 个知识库文档，跳过初始化")
        return
    
    # 创建根分类
    root_category = create_category(
        name="企业知识库",
        description="企业知识库根目录",
        sort_order=0
    )
    
    logger.info(f"创建根分类: {root_category.name}")
    
    # 遍历知识库结构
    for dir_code, dir_info in KNOWLEDGE_BASE_STRUCTURE.items():
        # 创建主分类
        main_category = create_category(
            name=dir_info["name"],
            description=dir_info["description"],
            parent_id=root_category.id,
            sort_order=int(dir_code.split('_')[0])
        )
        
        logger.info(f"创建主分类: {main_category.name}")
        
        # 创建主分类文档
        main_doc = create_document(
            title=f"{dir_info['name']} - 概览",
            content_path=f"company_knowledge_base/{dir_code}",
            category_id=main_category.id,
            description=dir_info["description"]
        )
        
        # 创建子分类和文档
        for subdir_name, subdir_desc in dir_info["subdirs"].items():
            sub_category = create_category(
                name=subdir_name,
                description=subdir_desc,
                parent_id=main_category.id,
                sort_order=len(dir_info["subdirs"])
            )
            
            logger.info(f"  创建子分类: {sub_category.name}")
            
            # 创建子分类文档
            sub_doc = create_document(
                title=f"{subdir_name} - 文档集合",
                content_path=f"company_knowledge_base/{dir_code}/{subdir_name}",
                category_id=sub_category.id,
                description=subdir_desc
            )
    
    # 提交所有更改
    db.session.commit()
    
    # 统计创建的数据
    total_categories = CategoryModel.query.count()
    total_documents = DocumentModel.query.count()
    
    logger.info(f"知识库数据初始化完成！")
    logger.info(f"创建分类: {total_categories} 个")
    logger.info(f"创建文档: {total_documents} 个")


def main():
    """主函数"""
    # 初始化Flask应用上下文
    from app import create_app
    app = create_app()
    
    with app.app_context():
        try:
            init_knowledge_base_data()
        except Exception as e:
            logger.error(f"初始化过程中发生错误: {str(e)}")
            db.session.rollback()
            sys.exit(1)


if __name__ == "__main__":
    main()