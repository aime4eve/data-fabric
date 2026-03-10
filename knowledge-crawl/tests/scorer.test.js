/**
 * 评分模块测试
 */

const { test, describe } = require('node:test');
const assert = require('node:assert');
const { calculateScore, scoreDomain, getReasonText } = require('../src/services/scorer');

describe('Scorer', () => {
  test('calculateScore should give higher score for better rank', () => {
    const domainHigh = { min_rank: 1, hit_count: 1 };
    const domainLow = { min_rank: 20, hit_count: 1 };

    const scoreHigh = calculateScore(domainHigh);
    const scoreLow = calculateScore(domainLow);

    assert.ok(scoreHigh > scoreLow);
  });

  test('calculateScore should give higher score for more hits', () => {
    const domainMany = { min_rank: 10, hit_count: 5 };
    const domainFew = { min_rank: 10, hit_count: 1 };

    const scoreMany = calculateScore(domainMany);
    const scoreFew = calculateScore(domainFew);

    assert.ok(scoreMany > scoreFew);
  });

  test('calculateScore should give score between 0 and 100', () => {
    const domain = { min_rank: 1, hit_count: 10 };
    const score = calculateScore(domain);

    assert.ok(score >= 0 && score <= 100);
  });

  test('scoreDomain should score domain with category keywords', () => {
    const domain = {
      min_rank: 5,
      hit_count: 3,
      _titles: ['Solenoid Valve Controller', 'LoRaWAN Products'],
      _snippets: ['Best irrigation controllers']
    };

    const result = scoreDomain(domain);

    assert.ok(result.score > 0);
    assert.ok(result.reason);
  });

  test('scoreDomain should penalize negative keywords', () => {
    const domainNormal = {
      min_rank: 5,
      hit_count: 1,
      _titles: ['Product Page'],
      _snippets: ['Product description']
    };

    const domainForum = {
      min_rank: 5,
      hit_count: 1,
      _titles: ['Forum Discussion'],
      _snippets: ['Discussion about products']
    };

    const scoreNormal = scoreDomain(domainNormal);
    const scoreForum = scoreDomain(domainForum);

    assert.ok(scoreForum.score < scoreNormal.score);
  });

  test('scoreDomain should detect category keywords', () => {
    const domain = {
      min_rank: 5,
      hit_count: 2,
      _titles: ['LoRaWAN Solenoid Valve Controller'],
      _snippets: ['Professional irrigation solutions']
    };

    const result = scoreDomain(domain);

    assert.ok(result.matchedKeywords.length > 0);
    assert.ok(result.matchedKeywords.some(k =>
      ['lorawan', 'solenoid', 'valve', 'controller', 'irrigation'].includes(k.toLowerCase())
    ));
  });

  test('getReasonText should generate readable reason text', () => {
    const scoreData = {
      baseScore: 60,
      rankBonus: 10,
      hitBonus: 5,
      keywordBonus: 10,
      negativePenalty: -5,
      matchedKeywords: ['solenoid', 'valve'],
      negativeKeywords: ['forum']
    };

    const reason = getReasonText(scoreData);

    assert.ok(reason.length > 10);
  });
});
