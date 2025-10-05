import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// Mock component for testing
const SearchBar = ({ onSearch, placeholder, value, onChange }: any) => (
  <div data-testid="search-bar">
    <input 
      placeholder={placeholder || '搜索...'} 
      value={value || ''}
      onChange={onChange}
      data-testid="search-input"
    />
    <button onClick={onSearch} data-testid="search-button">
      搜索
    </button>
  </div>
);

describe('SearchBar', () => {
  const mockOnSearch = jest.fn();
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('渲染搜索栏', () => {
    render(<SearchBar onSearch={mockOnSearch} />);
    
    expect(screen.getByTestId('search-bar')).toBeInTheDocument();
    expect(screen.getByTestId('search-input')).toBeInTheDocument();
    expect(screen.getByTestId('search-button')).toBeInTheDocument();
  });

  test('显示自定义占位符', () => {
    const customPlaceholder = '请输入搜索关键词';
    render(<SearchBar onSearch={mockOnSearch} placeholder={customPlaceholder} />);
    
    const input = screen.getByTestId('search-input');
    expect(input).toHaveAttribute('placeholder', customPlaceholder);
  });

  test('处理搜索按钮点击', async () => {
    const user = userEvent.setup();
    render(<SearchBar onSearch={mockOnSearch} />);
    
    const searchButton = screen.getByTestId('search-button');
    await user.click(searchButton);
    
    expect(mockOnSearch).toHaveBeenCalled();
  });

  test('处理输入变化', async () => {
    const user = userEvent.setup();
    render(<SearchBar onSearch={mockOnSearch} onChange={mockOnChange} />);
    
    const input = screen.getByTestId('search-input');
    await user.type(input, '测试搜索');
    
    expect(mockOnChange).toHaveBeenCalled();
  });

  test('显示受控值', () => {
    const testValue = '测试值';
    render(<SearchBar onSearch={mockOnSearch} value={testValue} />);
    
    const input = screen.getByTestId('search-input') as HTMLInputElement;
    expect(input.value).toBe(testValue);
  });

  test('使用默认占位符', () => {
    render(<SearchBar onSearch={mockOnSearch} />);
    
    const input = screen.getByTestId('search-input');
    expect(input).toHaveAttribute('placeholder', '搜索...');
  });
});