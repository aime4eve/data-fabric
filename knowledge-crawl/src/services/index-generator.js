/**
 * 索引页生成服务模块
 * 负责生成离线厂商库的索引页面
 */

const fs = require('fs');
const path = require('path');
const csv = require('csv-parse/sync');
const { formatBeijingTime } = require('../utils/time');

/**
 * 从 vendors_enriched.csv 加载厂商数据
 * @param {string} csvPath - CSV 文件路径
 * @returns {Object[]} 厂商数据数组
 */
function loadVendorsData(csvPath) {
  if (!csvPath || !fs.existsSync(csvPath)) {
    return [];
  }

  const content = fs.readFileSync(csvPath, 'utf-8');

  try {
    return csv.parse(content, {
      columns: true,
      skip_empty_lines: true
    });
  } catch (error) {
    console.log(`  警告: 无法解析厂商数据文件: ${error.message}`);
    return [];
  }
}

/**
 * 从 download_history.csv 加载下载历史
 * @param {string} archiveDir - 归档目录
 * @returns {Object[]} 下载历史数组
 */
function loadHistoryData(archiveDir) {
  const historyPath = path.join(archiveDir, 'download_history.csv');

  if (!fs.existsSync(historyPath)) {
    return [];
  }

  const content = fs.readFileSync(historyPath, 'utf-8');

  try {
    return csv.parse(content, {
      columns: true,
      skip_empty_lines: true
    });
  } catch (error) {
    console.log(`  警告: 无法解析下载历史文件: ${error.message}`);
    return [];
  }
}

/**
 * 聚合数据（只保留成功下载的）
 * @param {Object[]} vendors - 厂商数据数组
 * @param {Object[]} history - 下载历史数组
 * @returns {Object[]} 聚合后的数据数组
 */
function mergeData(vendors, history) {
  // 只保留成功的下载记录
  const successHistory = history.filter(record => record.status === 'SUCCESS');

  // 创建 URL 到厂商信息的映射
  const vendorMap = new Map();
  for (const vendor of vendors) {
    const url = vendor.home_url;
    if (url) {
      vendorMap.set(url, vendor);
    }
  }

  // 聚合数据
  return successHistory.map(record => {
    const vendor = vendorMap.get(record.original_url) || {};

    return {
      company: vendor.company_name || extractDomainName(record.original_url),
      localPath: record.local_path,
      tags: vendor.ai_tags || '',
      score: parseInt(vendor.intent_score, 10) || 0,
      country: vendor.country || '',
      originalUrl: record.original_url,
      fileSizeKb: parseInt(record.file_size_kb, 10) || 0,
      downloadTime: record.download_time
    };
  });
}

/**
 * 从 URL 提取域名
 * @param {string} url - URL
 * @returns {string} 域名
 */
function extractDomainName(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return url;
  }
}

/**
 * 生成 HTML 索引页（内联 CSS/JS）
 * @param {Object[]} data - 聚合后的数据
 * @param {Object} options - 选项
 * @returns {string} HTML 内容
 */
function generateHtml(data, options = {}) {
  const generatedTime = formatBeijingTime(new Date());
  const totalCount = data.length;

  // 获取唯一的国家和标签列表
  const countries = [...new Set(data.map(d => d.country).filter(Boolean))].sort();
  const tags = [...new Set(data.map(d => d.tags).filter(Boolean))].sort();

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>离线厂商库</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: #f5f7fa;
      color: #333;
      line-height: 1.6;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px 20px;
      text-align: center;
    }
    .header h1 {
      font-size: 28px;
      margin-bottom: 10px;
    }
    .header .meta {
      font-size: 14px;
      opacity: 0.9;
    }
    .controls {
      background: white;
      padding: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      display: flex;
      flex-wrap: wrap;
      gap: 15px;
      align-items: center;
      justify-content: center;
    }
    .search-box {
      flex: 1;
      min-width: 200px;
      max-width: 400px;
    }
    .search-box input {
      width: 100%;
      padding: 10px 15px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 14px;
    }
    .filter-select {
      padding: 10px 15px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 14px;
      background: white;
      min-width: 150px;
    }
    .container {
      max-width: 1200px;
      margin: 20px auto;
      padding: 0 20px;
    }
    .stats {
      background: white;
      padding: 15px 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    table {
      width: 100%;
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      border-collapse: collapse;
    }
    th {
      background: #f8f9fa;
      padding: 15px 12px;
      text-align: left;
      font-weight: 600;
      cursor: pointer;
      user-select: none;
      border-bottom: 2px solid #e9ecef;
    }
    th:hover {
      background: #e9ecef;
    }
    th.sortable::after {
      content: ' ↕';
      opacity: 0.5;
    }
    th.sort-asc::after {
      content: ' ↑';
      opacity: 1;
    }
    th.sort-desc::after {
      content: ' ↓';
      opacity: 1;
    }
    td {
      padding: 12px;
      border-bottom: 1px solid #e9ecef;
      vertical-align: middle;
    }
    tr:hover {
      background: #f8f9fa;
    }
    .company-link {
      color: #667eea;
      text-decoration: none;
      font-weight: 500;
    }
    .company-link:hover {
      text-decoration: underline;
    }
    .tag {
      display: inline-block;
      padding: 3px 8px;
      background: #e3f2fd;
      color: #1976d2;
      border-radius: 4px;
      font-size: 12px;
      margin-right: 4px;
    }
    .tag.manufacturer {
      background: #e8f5e9;
      color: #388e3c;
    }
    .tag.oem {
      background: #fff3e0;
      color: #f57c00;
    }
    .tag.distributor {
      background: #fce4ec;
      color: #c2185b;
    }
    .score {
      font-weight: 600;
    }
    .score.high {
      color: #388e3c;
    }
    .score.medium {
      color: #f57c00;
    }
    .score.low {
      color: #757575;
    }
    .external-link {
      color: #666;
      text-decoration: none;
    }
    .external-link:hover {
      color: #667eea;
    }
    .no-results {
      text-align: center;
      padding: 40px;
      color: #666;
    }
    .footer {
      text-align: center;
      padding: 20px;
      color: #666;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>📦 离线厂商库</h1>
    <div class="meta">共收录 <strong>${totalCount}</strong> 家厂商 | 生成时间: ${generatedTime}</div>
  </div>

  <div class="controls">
    <div class="search-box">
      <input type="text" id="searchInput" placeholder="🔍 搜索厂商名称...">
    </div>
    <select class="filter-select" id="countryFilter">
      <option value="">所有国家</option>
      ${countries.map(c => `<option value="${c}">${c}</option>`).join('\n      ')}
    </select>
    <select class="filter-select" id="tagFilter">
      <option value="">所有标签</option>
      ${tags.map(t => `<option value="${t}">${t}</option>`).join('\n      ')}
    </select>
  </div>

  <div class="container">
    <div class="stats">
      显示 <span id="visibleCount">${totalCount}</span> 条记录
    </div>
    <table id="dataTable">
      <thead>
        <tr>
          <th class="sortable" data-sort="company">Company</th>
          <th>Tags</th>
          <th class="sortable" data-sort="score">Score</th>
          <th class="sortable" data-sort="country">Country</th>
          <th>链接</th>
        </tr>
      </thead>
      <tbody id="tableBody">
        ${generateTableRows(data)}
      </tbody>
    </table>
    <div class="no-results" id="noResults" style="display: none;">
      未找到匹配的厂商
    </div>
  </div>

  <div class="footer">
    由 Phase 3 离线归档系统生成
  </div>

  <script>
    const data = ${JSON.stringify(data)};

    let currentSort = { field: null, direction: 'asc' };

    function renderTable(filteredData) {
      const tbody = document.getElementById('tableBody');
      const noResults = document.getElementById('noResults');
      const visibleCount = document.getElementById('visibleCount');

      if (filteredData.length === 0) {
        tbody.innerHTML = '';
        noResults.style.display = 'block';
        visibleCount.textContent = '0';
        return;
      }

      noResults.style.display = 'none';
      visibleCount.textContent = filteredData.length;

      tbody.innerHTML = filteredData.map(item => \`
        <tr>
          <td>
            <a class="company-link" href="\${item.localPath}">\${escapeHtml(item.company)}</a>
          </td>
          <td>\${formatTags(item.tags)}</td>
          <td>\${formatScore(item.score)}</td>
          <td>\${escapeHtml(item.country)}</td>
          <td>
            <a class="external-link" href="\${item.originalUrl}" target="_blank" title="打开原始链接">🔗</a>
          </td>
        </tr>
      \`).join('');
    }

    function escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    function formatTags(tags) {
      if (!tags) return '';
      return tags.split(',').map(tag => {
        const t = tag.trim().toLowerCase();
        const className = t === 'manufacturer' ? 'manufacturer' : t === 'oem' ? 'oem' : t === 'distributor' ? 'distributor' : '';
        return \`<span class="tag \${className}">\${tag.trim()}</span>\`;
      }).join(' ');
    }

    function formatScore(score) {
      const s = parseInt(score, 10) || 0;
      const className = s >= 80 ? 'high' : s >= 50 ? 'medium' : 'low';
      return \`<span class="score \${className}">\${s}</span>\`;
    }

    function filterAndSort() {
      let filtered = [...data];

      // 搜索过滤
      const searchTerm = document.getElementById('searchInput').value.toLowerCase();
      if (searchTerm) {
        filtered = filtered.filter(item =>
          item.company.toLowerCase().includes(searchTerm)
        );
      }

      // 国家过滤
      const country = document.getElementById('countryFilter').value;
      if (country) {
        filtered = filtered.filter(item => item.country === country);
      }

      // 标签过滤
      const tag = document.getElementById('tagFilter').value;
      if (tag) {
        filtered = filtered.filter(item => item.tags && item.tags.includes(tag));
      }

      // 排序
      if (currentSort.field) {
        filtered.sort((a, b) => {
          let va = a[currentSort.field];
          let vb = b[currentSort.field];

          if (currentSort.field === 'score') {
            va = parseInt(va, 10) || 0;
            vb = parseInt(vb, 10) || 0;
          } else {
            va = (va || '').toString().toLowerCase();
            vb = (vb || '').toString().toLowerCase();
          }

          if (va < vb) return currentSort.direction === 'asc' ? -1 : 1;
          if (va > vb) return currentSort.direction === 'asc' ? 1 : -1;
          return 0;
        });
      }

      renderTable(filtered);
    }

    // 事件绑定
    document.getElementById('searchInput').addEventListener('input', filterAndSort);
    document.getElementById('countryFilter').addEventListener('change', filterAndSort);
    document.getElementById('tagFilter').addEventListener('change', filterAndSort);

    // 排序点击
    document.querySelectorAll('th.sortable').forEach(th => {
      th.addEventListener('click', () => {
        const field = th.dataset.sort;

        // 更新排序方向
        if (currentSort.field === field) {
          currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
          currentSort.field = field;
          currentSort.direction = 'asc';
        }

        // 更新样式
        document.querySelectorAll('th.sortable').forEach(t => {
          t.classList.remove('sort-asc', 'sort-desc');
        });
        th.classList.add(currentSort.direction === 'asc' ? 'sort-asc' : 'sort-desc');

        filterAndSort();
      });
    });
  </script>
</body>
</html>`;
}

/**
 * 生成表格行 HTML
 * @param {Object[]} data - 数据数组
 * @returns {string} HTML 内容
 */
function generateTableRows(data) {
  if (data.length === 0) {
    return '<tr><td colspan="5" class="no-results">暂无数据</td></tr>';
  }

  return data.map(item => {
    const tags = formatTagsHtml(item.tags);
    const score = formatScoreHtml(item.score);

    return `        <tr>
          <td>
            <a class="company-link" href="${escapeHtml(item.localPath)}">${escapeHtml(item.company)}</a>
          </td>
          <td>${tags}</td>
          <td>${score}</td>
          <td>${escapeHtml(item.country)}</td>
          <td>
            <a class="external-link" href="${escapeHtml(item.originalUrl)}" target="_blank" title="打开原始链接">🔗</a>
          </td>
        </tr>`;
  }).join('\n');
}

/**
 * 转义 HTML
 * @param {string} str - 原始字符串
 * @returns {string} 转义后的字符串
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * 格式化标签 HTML
 * @param {string} tags - 标签字符串
 * @returns {string} HTML 内容
 */
function formatTagsHtml(tags) {
  if (!tags) return '';

  return tags.split(',').map(tag => {
    const t = tag.trim().toLowerCase();
    const className = t === 'manufacturer' ? 'manufacturer' :
                      t === 'oem' ? 'oem' :
                      t === 'distributor' ? 'distributor' : '';
    return `<span class="tag ${className}">${tag.trim()}</span>`;
  }).join(' ');
}

/**
 * 格式化分数 HTML
 * @param {number} score - 分数
 * @returns {string} HTML 内容
 */
function formatScoreHtml(score) {
  const s = parseInt(score, 10) || 0;
  const className = s >= 80 ? 'high' : s >= 50 ? 'medium' : 'low';
  return `<span class="score ${className}">${s}</span>`;
}

/**
 * 写入索引页
 * @param {string} archiveDir - 归档目录
 * @param {string} html - HTML 内容
 */
function writeIndex(archiveDir, html) {
  const indexPath = path.join(archiveDir, 'offline_index.html');

  // 确保目录存在
  if (!fs.existsSync(archiveDir)) {
    fs.mkdirSync(archiveDir, { recursive: true });
  }

  fs.writeFileSync(indexPath, html, 'utf-8');
  console.log(`  索引页已生成: ${indexPath}`);
}

/**
 * 生成并写入索引页（便捷函数）
 * @param {string} archiveDir - 归档目录
 * @param {string} vendorsCsvPath - 厂商 CSV 路径
 */
function generateIndex(archiveDir, vendorsCsvPath) {
  // 加载数据
  const vendors = loadVendorsData(vendorsCsvPath);
  const history = loadHistoryData(archiveDir);

  // 聚合数据
  const data = mergeData(vendors, history);

  // 按分数排序
  data.sort((a, b) => b.score - a.score);

  // 生成 HTML
  const html = generateHtml(data);

  // 写入文件
  writeIndex(archiveDir, html);

  return {
    totalCount: data.length,
    archiveDir
  };
}

module.exports = {
  loadVendorsData,
  loadHistoryData,
  mergeData,
  generateHtml,
  writeIndex,
  generateIndex
};
