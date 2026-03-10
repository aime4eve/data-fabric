/**
 * 关键词提取模块
 * 从 Markdown 文档或 CSV 文件提取关键词
 */

const fs = require('fs');
const path = require('path');

// 产品相关关键词模式
const KEYWORD_PATTERNS = [
  // 产品类型
  /solenoid\s*valve/gi,
  /electromagnetic\s*valve/gi,
  /valve\s*controller/gi,
  /controller/gi,
  /lorawan/gi,
  /irrigation/gi,
  /agricultural/gi,
  /wireless/gi,
  /smart/gi,
  /remote/gi,
  /automation/gi,
  /industrial/gi,
  /equipment/gi,
  /solution/gi,
  /system/gi,
  // 中文关键词
  /电磁阀/g,
  /控制器/g,
  /无线/g,
  /灌溉/g,
  /农业/g,
  /智能/g,
  /远程/g,
  /自动化/g,
  /设备/g,
  /解决方案/g
];

// 同义词模式
const SYNONYM_PATTERN = /[-*]\s*(.+?)\s*=\s*(.+?)(?:\n|$)/g;

/**
 * 从 Markdown 内容提取关键词
 * @param {string} content - Markdown 内容
 * @returns {string[]} 关键词数组
 */
function extractKeywordsFromMarkdown(content) {
  const keywords = new Set();

  // 提取标准关键词
  for (const pattern of KEYWORD_PATTERNS) {
    const matches = content.match(pattern);
    if (matches) {
      matches.forEach(m => keywords.add(m.trim()));
    }
  }

  // 提取同义词部分
  let match;
  while ((match = SYNONYM_PATTERN.exec(content)) !== null) {
    const synonyms = match[2].split(',').map(s => s.trim());
    synonyms.forEach(s => {
      if (s && s.length > 2) {
        keywords.add(s);
      }
    });
  }

  // 提取标题中的英文单词组合
  const titleMatch = content.match(/^#\s+(.+)$/m);
  if (titleMatch) {
    const title = titleMatch[1];
    // 提取首字母大写的词组
    const phrases = title.match(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+/g);
    if (phrases) {
      phrases.forEach(p => keywords.add(p));
    }
  }

  return Array.from(keywords);
}

/**
 * 读取关键词 CSV 文件
 * 支持两种格式：
 * 1. 标准 CSV 格式：category,keyword,synonyms（带表头）
 * 2. 简单列表格式：每行一个关键词
 * @param {string} filePath - CSV 文件路径
 * @returns {Object[]} 关键词对象数组 { category, keyword, synonyms }
 */
function readKeywordsCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());

  if (lines.length === 0) {
    return [];
  }

  // 检测是否为标准 CSV 格式（第一行包含 category, keyword 等表头）
  const firstLine = lines[0].toLowerCase();
  const isStandardFormat = firstLine.includes('category') || firstLine.includes('keyword');

  // 如果是标准格式，跳过表头
  const dataLines = isStandardFormat ? lines.slice(1) : lines;

  return dataLines.map(line => {
    // 简单 CSV 解析（处理引号内的逗号）
    const parts = [];
    let current = '';
    let inQuotes = false;

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        parts.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    parts.push(current.trim());

    // 如果只有一列，当作简单关键词
    if (parts.length === 1 && parts[0]) {
      return {
        category: 'general',
        keyword: parts[0],
        synonyms: []
      };
    }

    return {
      category: parts[0] || '',
      keyword: parts[1] || '',
      synonyms: parts[2] ? parts[2].split(',').map(s => s.trim()) : []
    };
  }).filter(k => k.keyword);
}

/**
 * 从文件提取关键词（根据扩展名）
 * @param {string} filePath - 文件路径
 * @returns {Promise<string[]>} 关键词数组
 */
async function extractKeywords(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  switch (ext) {
    case '.md':
      const content = fs.readFileSync(filePath, 'utf-8');
      return extractKeywordsFromMarkdown(content);

    case '.csv':
      const keywords = readKeywordsCSV(filePath);
      // 将 CSV 关键词展开为关键词列表
      const result = [];
      for (const k of keywords) {
        result.push(k.keyword);
        result.push(...k.synonyms);
      }
      return [...new Set(result)];

    default:
      throw new Error(`Unsupported file type: ${ext}`);
  }
}

module.exports = {
  extractKeywordsFromMarkdown,
  readKeywordsCSV,
  extractKeywords
};
