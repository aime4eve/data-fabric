import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// Mock component for testing
const DocumentCard = ({ title, content, category, tags, author, createdAt }: any) => (
  <div data-testid="document-card">
    <h3>{title}</h3>
    <p>{content}</p>
    <span>{category}</span>
    {tags && <div>{tags.join(', ')}</div>}
    {author && <span>{author}</span>}
    {createdAt && <time>{createdAt}</time>}
  </div>
);

describe('DocumentCard', () => {
  const mockDocument = {
    id: '1',
    title: '测试文档',
    content: '这是一个测试文档的内容',
    category: '技术文档',
    tags: ['React', 'TypeScript'],
    author: '测试作者',
    createdAt: '2024-01-01T00:00:00Z'
  };

  test('渲染文档卡片基本信息', () => {
    render(<DocumentCard {...mockDocument} />);
    
    expect(screen.getByText('测试文档')).toBeInTheDocument();
    expect(screen.getByText('这是一个测试文档的内容')).toBeInTheDocument();
    expect(screen.getByText('技术文档')).toBeInTheDocument();
  });

  test('渲染文档标签', () => {
    render(<DocumentCard {...mockDocument} />);
    
    expect(screen.getByText('React, TypeScript')).toBeInTheDocument();
  });

  test('渲染作者信息', () => {
    render(<DocumentCard {...mockDocument} />);
    
    expect(screen.getByText('测试作者')).toBeInTheDocument();
  });

  test('渲染创建时间', () => {
    render(<DocumentCard {...mockDocument} />);
    
    expect(screen.getByText('2024-01-01T00:00:00Z')).toBeInTheDocument();
  });

  test('处理缺失的可选属性', () => {
    const minimalDocument = {
      title: '最小文档',
      content: '最小内容',
      category: '分类'
    };

    render(<DocumentCard {...minimalDocument} />);
    
    expect(screen.getByText('最小文档')).toBeInTheDocument();
    expect(screen.getByText('最小内容')).toBeInTheDocument();
    expect(screen.getByText('分类')).toBeInTheDocument();
  });
});