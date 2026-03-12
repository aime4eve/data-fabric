# Milesight网站静态HTML保存爬虫 - 使用说明

## 快速开始

### 1. 安装依赖

```bash
cd milesight_scraper
pip install -r requirements.txt
```

### 2. 运行爬虫

**Windows:**
```bash
run.bat
```

**Linux/Mac:**
```bash
chmod +x run.sh
./run.sh
```

**或直接运行:**
```bash
scrapy crawl milesight
```

### 3. 查看结果

爬取完成后，所有HTML文件保存在 `output/` 目录下：

```bash
cd output
start index.html  # Windows
open index.html   # Mac
```

## 爬虫特点

✅ **完全自动化** - 从sitemap.xml自动获取所有页面  
✅ **智能去重** - 自动跳过重复URL  
✅ **链接修正** - 自动将相对链接转换为绝对链接  
✅ **结构保持** - 保持网站原有目录结构  
✅ **异常处理** - 完整的错误处理和日志记录  

## 配置说明

编辑 `milesight_scraper/settings.py` 可以调整参数：

```python
# 请求延迟（秒）- 建议不小于3
DOWNLOAD_DELAY = 3

# 并发请求数
CONCURRENT_REQUESTS = 8

# 输出目录
OUTPUT_DIR = './output'
```

## 输出示例

```
output/
├── index.html                      # 首页
├── products/                       # 产品中心
│   └── index.html
├── solutions/                      # 解决方案
│   └── index.html
└── success-stories/                # 成功案例
    └── index.html
```

## 注意事项

⚠️ 请遵守网站的robots.txt协议  
⚠️ 仅用于学习研究，不得用于商业用途  
⚠️ 爬取过程中请保持网络连接稳定  
⚠️ 首次运行可能需要较长时间  

## 故障排除

### 爬虫无法启动
```bash
# 检查依赖是否安装
scrapy version

# 如果报错，重新安装依赖
pip install -r requirements.txt
```

### 大量请求失败
```bash
# 增加延迟时间到5秒
# 编辑 settings.py: DOWNLOAD_DELAY = 5
```

### 文件保存失败
```bash
# 检查输出目录权限
# Windows: 确保有管理员权限
# Linux/Mac: chmod 755 output/
```

## 技术支持

如遇问题，请检查日志输出：
```bash
scrapy crawl milesight -L DEBUG
```

---

**本爬虫仅供学习研究使用，请遵守目标网站的robots协议及所有法律法规。不得用于任何商业用途或非法用途。**
