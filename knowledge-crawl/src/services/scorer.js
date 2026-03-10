/**
 * 评分模块
 * 计算域名候选的评分和原因
 */

// 类目词（加分）
const CATEGORY_KEYWORDS = [
  'lorawan', 'valve', 'solenoid', 'controller', 'irrigation',
  'agricultural', 'smart', 'wireless', 'remote', 'automation',
  'manufacturer', 'supplier', 'factory', 'industrial', 'equipment',
  'product', 'solution', 'technology', 'system'
];

// 负向词（扣分）
const NEGATIVE_KEYWORDS = [
  'forum', 'wiki', 'news', 'blog', 'repost', 'amazon', 'ebay',
  'aliexpress', 'alibaba', 'youtube', 'facebook', 'twitter',
  'linkedin', 'reddit', 'quora', 'medium', 'pinterest'
];

/**
 * 计算基础评分
 * @param {Object} domain - 域名数据
 * @returns {number} 评分 (0-100)
 */
function calculateScore(domain) {
  let score = 50; // 基础分

  // 排名加分：min_rank 越小越好
  // 排名 1-5: +20, 6-10: +10, 11-15: +5, 16-20: +0
  if (domain.min_rank <= 5) {
    score += 20;
  } else if (domain.min_rank <= 10) {
    score += 10;
  } else if (domain.min_rank <= 15) {
    score += 5;
  }

  // 命中次数加分
  // 1次: +0, 2次: +5, 3次: +10, 4+: +15
  if (domain.hit_count >= 4) {
    score += 15;
  } else if (domain.hit_count >= 3) {
    score += 10;
  } else if (domain.hit_count >= 2) {
    score += 5;
  }

  // 确保评分在 0-100 范围内
  return Math.max(0, Math.min(100, score));
}

/**
 * 对域名进行完整评分
 * @param {Object} domain - 域名数据（包含 _titles 和 _snippets）
 * @returns {Object} 评分结果 { score, reason, matchedKeywords, negativeKeywords }
 */
function scoreDomain(domain) {
  const scoreData = {
    baseScore: 50,
    rankBonus: 0,
    hitBonus: 0,
    keywordBonus: 0,
    negativePenalty: 0,
    matchedKeywords: [],
    negativeKeywords: []
  };

  // 排名加分
  if (domain.min_rank <= 5) {
    scoreData.rankBonus = 20;
  } else if (domain.min_rank <= 10) {
    scoreData.rankBonus = 10;
  } else if (domain.min_rank <= 15) {
    scoreData.rankBonus = 5;
  }

  // 命中次数加分
  if (domain.hit_count >= 4) {
    scoreData.hitBonus = 15;
  } else if (domain.hit_count >= 3) {
    scoreData.hitBonus = 10;
  } else if (domain.hit_count >= 2) {
    scoreData.hitBonus = 5;
  }

  // 关键词分析
  const text = [
    ...(domain._titles || []),
    ...(domain._snippets || [])
  ].join(' ').toLowerCase();

  // 类目词加分
  for (const keyword of CATEGORY_KEYWORDS) {
    if (text.includes(keyword)) {
      scoreData.keywordBonus += 2;
      scoreData.matchedKeywords.push(keyword);
    }
  }
  scoreData.keywordBonus = Math.min(scoreData.keywordBonus, 15); // 最多 +15

  // 负向词扣分
  for (const keyword of NEGATIVE_KEYWORDS) {
    if (text.includes(keyword)) {
      scoreData.negativePenalty -= 5;
      scoreData.negativeKeywords.push(keyword);
    }
  }
  scoreData.negativePenalty = Math.max(scoreData.negativePenalty, -30); // 最多 -30

  // 计算总分
  const totalScore = scoreData.baseScore +
    scoreData.rankBonus +
    scoreData.hitBonus +
    scoreData.keywordBonus +
    scoreData.negativePenalty;

  scoreData.score = Math.max(0, Math.min(100, totalScore));
  scoreData.reason = getReasonText(scoreData);

  return scoreData;
}

/**
 * 生成可解释的评分原因文本
 * @param {Object} scoreData - 评分数据
 * @returns {string} 原因文本
 */
function getReasonText(scoreData) {
  const reasons = [];

  // 排名原因
  if (scoreData.rankBonus > 0) {
    reasons.push(`排名靠前(+${scoreData.rankBonus})`);
  }

  // 命中原因
  if (scoreData.hitBonus > 0) {
    reasons.push(`多次命中(+${scoreData.hitBonus})`);
  }

  // 关键词原因
  if (scoreData.matchedKeywords.length > 0) {
    const keywords = scoreData.matchedKeywords.slice(0, 3).join(', ');
    reasons.push(`命中关键词: ${keywords}(+${scoreData.keywordBonus})`);
  }

  // 负向原因
  if (scoreData.negativeKeywords.length > 0) {
    const negatives = scoreData.negativeKeywords.slice(0, 2).join(', ');
    reasons.push(`包含非目标内容: ${negatives}(${scoreData.negativePenalty})`);
  }

  if (reasons.length === 0) {
    return '基础评分';
  }

  return reasons.join('; ');
}

module.exports = {
  calculateScore,
  scoreDomain,
  getReasonText,
  CATEGORY_KEYWORDS,
  NEGATIVE_KEYWORDS
};
