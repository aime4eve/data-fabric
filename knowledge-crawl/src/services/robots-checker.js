/**
 * Robots Checker Service
 * robots.txt 合规检查与路径调度
 *
 * Phase 1 合规模块
 */

/**
 * 解析 robots.txt 内容
 * @param {string} content - robots.txt 文件内容
 * @returns {Object} 解析结果 { rules: { userAgent: { disallow: [], allow: [] } } }
 */
function parseRobotsTxt(content) {
  const result = {
    rules: {},
    sitemaps: []
  };

  if (!content || !content.trim()) {
    return result;
  }

  const lines = content.split('\n');
  let currentUserAgent = null;
  let currentRules = { disallow: [], allow: [] };

  for (const line of lines) {
    let trimmed = line.trim();

    // 跳过空行
    if (!trimmed) {
      continue;
    }

    // 移除行内注释
    const commentIndex = trimmed.indexOf('#');
    if (commentIndex !== -1) {
      trimmed = trimmed.substring(0, commentIndex).trim();
    }

    // 再次检查是否为空
    if (!trimmed) {
      continue;
    }

    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) continue;

    const directive = trimmed.substring(0, colonIndex).trim().toLowerCase();
    const value = trimmed.substring(colonIndex + 1).trim();

    switch (directive) {
      case 'user-agent':
        // 保存前一个 user-agent 的规则
        if (currentUserAgent !== null) {
          result.rules[currentUserAgent] = currentRules;
        }
        currentUserAgent = value.toLowerCase();
        currentRules = { disallow: [], allow: [] };
        break;

      case 'disallow':
        if (currentUserAgent !== null && value) {
          currentRules.disallow.push(value);
        }
        break;

      case 'allow':
        if (currentUserAgent !== null && value) {
          currentRules.allow.push(value);
        }
        break;

      case 'sitemap':
        if (value) {
          result.sitemaps.push(value);
        }
        break;
    }
  }

  // 保存最后一个 user-agent 的规则
  if (currentUserAgent !== null) {
    result.rules[currentUserAgent] = currentRules;
  }

  return result;
}

/**
 * 检查路径是否匹配模式（支持通配符）
 * @param {string} pattern - robots.txt 中的模式
 * @param {string} path - 要检查的路径
 * @returns {boolean} 是否匹配
 */
function matchPath(pattern, path) {
  // 将 robots.txt 模式转换为正则表达式
  // * 匹配任意字符
  // $ 匹配路径结尾
  let regexPattern = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&') // 转义特殊字符
    .replace(/\*/g, '.*'); // * 变成 .*

  // 如果模式以 $ 结尾，匹配路径结尾
  if (regexPattern.endsWith('$')) {
    regexPattern = regexPattern.slice(0, -1) + '$';
  } else {
    // 否则匹配前缀
    regexPattern = '^' + regexPattern;
  }

  const regex = new RegExp(regexPattern, 'i');
  return regex.test(path);
}

/**
 * 获取适用于指定 user-agent 的规则
 * @param {Object} robotsInfo - 解析后的 robots 信息
 * @param {string} userAgent - User-Agent 字符串
 * @returns {Object} 适用规则 { disallow: [], allow: [] }
 */
function getApplicableRules(robotsInfo, userAgent) {
  const ua = userAgent.toLowerCase();

  // 尝试精确匹配
  if (robotsInfo.rules[ua]) {
    return robotsInfo.rules[ua];
  }

  // 尝试部分匹配（如 Googlebot 匹配 Googlebot-Image）
  for (const ruleUA of Object.keys(robotsInfo.rules)) {
    if (ua.includes(ruleUA) || ruleUA.includes(ua)) {
      return robotsInfo.rules[ruleUA];
    }
  }

  // 回退到通配符规则
  if (robotsInfo.rules['*']) {
    return robotsInfo.rules['*'];
  }

  // 无规则，默认允许
  return { disallow: [], allow: [] };
}

/**
 * 检查路径是否允许访问
 * @param {Object} robotsInfo - 解析后的 robots 信息
 * @param {string} path - 要检查的路径
 * @param {string} userAgent - User-Agent 字符串
 * @returns {{ allowed: boolean, reason: string }}
 */
function isPathAllowed(robotsInfo, path, userAgent = '*') {
  const rules = getApplicableRules(robotsInfo, userAgent);

  // 先检查 Allow 规则（优先级更高）
  for (const allowPattern of rules.allow) {
    if (matchPath(allowPattern, path)) {
      return {
        allowed: true,
        reason: `Explicitly allowed by pattern: ${allowPattern}`
      };
    }
  }

  // 再检查 Disallow 规则
  for (const disallowPattern of rules.disallow) {
    if (matchPath(disallowPattern, path)) {
      return {
        allowed: false,
        reason: `Disallowed by pattern: ${disallowPattern}`
      };
    }
  }

  // 默认允许
  return {
    allowed: true,
    reason: 'No matching disallow rule'
  };
}

/**
 * 批量检查多个路径
 * @param {Object} robotsInfo - 解析后的 robots 信息
 * @param {string[]} paths - 路径列表
 * @param {string} userAgent - User-Agent 字符串
 * @returns {Array<{ path: string, allowed: boolean, reason: string }>}
 */
function checkPathsAgainstRobots(robotsInfo, paths, userAgent = '*') {
  return paths.map(path => ({
    path,
    ...isPathAllowed(robotsInfo, path, userAgent)
  }));
}

/**
 * 过滤出允许访问的路径
 * @param {Object} robotsInfo - 解析后的 robots 信息
 * @param {string[]} paths - 路径列表
 * @param {string} userAgent - User-Agent 字符串
 * @returns {{ allowed: string[], skipped: Array<{ path: string, reason: string }> }}
 */
function filterAllowedPaths(robotsInfo, paths, userAgent = '*') {
  const results = checkPathsAgainstRobots(robotsInfo, paths, userAgent);

  const allowed = results
    .filter(r => r.allowed)
    .map(r => r.path);

  const skipped = results
    .filter(r => !r.allowed)
    .map(r => ({ path: r.path, reason: r.reason }));

  return { allowed, skipped };
}

module.exports = {
  parseRobotsTxt,
  matchPath,
  isPathAllowed,
  checkPathsAgainstRobots,
  filterAllowedPaths,
  getApplicableRules
};
