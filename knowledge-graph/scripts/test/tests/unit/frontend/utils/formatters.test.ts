import '@testing-library/jest-dom';

// Mock formatters for testing
const formatters = {
  formatDate: (date: string | Date) => {
    const d = new Date(date);
    return d.toLocaleDateString('zh-CN');
  },

  formatDateTime: (date: string | Date) => {
    const d = new Date(date);
    return d.toLocaleString('zh-CN');
  },

  formatFileSize: (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  formatCurrency: (amount: number, currency = 'CNY') => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: currency
    }).format(amount);
  },

  formatPercentage: (value: number, decimals = 2) => {
    return (value * 100).toFixed(decimals) + '%';
  },

  formatNumber: (num: number) => {
    return new Intl.NumberFormat('zh-CN').format(num);
  },

  truncateText: (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  },

  capitalizeFirst: (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
};

describe('formatters', () => {
  describe('formatDate', () => {
    test('格式化日期字符串', () => {
      const result = formatters.formatDate('2023-12-25');
      expect(result).toBe('2023/12/25');
    });

    test('格式化Date对象', () => {
      const date = new Date('2023-12-25');
      const result = formatters.formatDate(date);
      expect(result).toBe('2023/12/25');
    });
  });

  describe('formatDateTime', () => {
    test('格式化日期时间', () => {
      const result = formatters.formatDateTime('2023-12-25T10:30:00');
      expect(result).toContain('2023');
      expect(result).toContain('10:30');
    });
  });

  describe('formatFileSize', () => {
    test('格式化字节数', () => {
      expect(formatters.formatFileSize(0)).toBe('0 B');
      expect(formatters.formatFileSize(1024)).toBe('1 KB');
      expect(formatters.formatFileSize(1048576)).toBe('1 MB');
      expect(formatters.formatFileSize(1073741824)).toBe('1 GB');
    });

    test('格式化小数字节数', () => {
      expect(formatters.formatFileSize(1536)).toBe('1.5 KB');
      expect(formatters.formatFileSize(2097152)).toBe('2 MB');
    });
  });

  describe('formatCurrency', () => {
    test('格式化人民币', () => {
      const result = formatters.formatCurrency(1234.56);
      expect(result).toContain('1,234.56');
      expect(result).toContain('¥');
    });

    test('格式化美元', () => {
      const result = formatters.formatCurrency(1234.56, 'USD');
      expect(result).toContain('1,234.56');
    });
  });

  describe('formatPercentage', () => {
    test('格式化百分比', () => {
      expect(formatters.formatPercentage(0.1234)).toBe('12.34%');
      expect(formatters.formatPercentage(0.5)).toBe('50.00%');
      expect(formatters.formatPercentage(1)).toBe('100.00%');
    });

    test('自定义小数位数', () => {
      expect(formatters.formatPercentage(0.1234, 1)).toBe('12.3%');
      expect(formatters.formatPercentage(0.1234, 0)).toBe('12%');
    });
  });

  describe('formatNumber', () => {
    test('格式化数字', () => {
      expect(formatters.formatNumber(1234567)).toBe('1,234,567');
      expect(formatters.formatNumber(1000)).toBe('1,000');
      expect(formatters.formatNumber(123)).toBe('123');
    });
  });

  describe('truncateText', () => {
    test('截断长文本', () => {
      const longText = 'This is a very long text that needs to be truncated';
      expect(formatters.truncateText(longText, 20)).toBe('This is a very long ...');
    });

    test('不截断短文本', () => {
      const shortText = 'Short text';
      expect(formatters.truncateText(shortText, 20)).toBe('Short text');
    });

    test('处理边界情况', () => {
      expect(formatters.truncateText('', 10)).toBe('');
      expect(formatters.truncateText('Test', 4)).toBe('Test');
      expect(formatters.truncateText('Test', 3)).toBe('Tes...');
    });
  });

  describe('capitalizeFirst', () => {
    test('首字母大写', () => {
      expect(formatters.capitalizeFirst('hello')).toBe('Hello');
      expect(formatters.capitalizeFirst('world')).toBe('World');
      expect(formatters.capitalizeFirst('test string')).toBe('Test string');
    });

    test('处理空字符串', () => {
      expect(formatters.capitalizeFirst('')).toBe('');
    });

    test('处理已经大写的字符串', () => {
      expect(formatters.capitalizeFirst('Hello')).toBe('Hello');
    });
  });
});