#!/bin/bash
# 本爬虫仅供学习研究使用，请遵守目标网站的robots协议及所有法律法规。不得用于任何商业用途或非法用途。

echo "=========================================================="
echo "    Milesight网站静态HTML保存爬虫"
echo "=========================================================="
echo ""
echo "本爬虫将:"
echo "1. 从sitemap.xml获取所有公开页面URL"
echo "2. 下载每个页面的HTML内容"
echo "3. 保存为本地静态HTML文件"
echo ""
echo "注意: 请确保已安装Python和所需依赖库"
echo ""

cd "$(dirname "$0")"

# 尝试激活虚拟环境
if [ -f "venv/bin/activate" ]; then
    echo "正在激活虚拟环境..."
    source venv/bin/activate
else
    echo "未找到虚拟环境，将使用系统 Python..."
fi

scrapy crawl milesight

echo ""
echo "=========================================================="
echo "爬取完成! HTML文件已保存到 output/ 目录"
echo "=========================================================="
echo ""
