import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { DocumentManagement } from '../pages/DocumentManagement';
import { DocumentService } from '../services/documentService';
import { CategoryService } from '../services/categoryService';

// Mock services
jest.mock('../services/documentService');
jest.mock('../services/categoryService');

const mockDocumentService = DocumentService as jest.Mocked<typeof DocumentService>;
const mockCategoryService = CategoryService as jest.Mocked<typeof CategoryService>;

// Mock data
const mockDocuments = [
  {
    id: '1',
    title: 'Test Document 1',
    content_path: '/path/to/doc1.pdf',
    category_id: '1',
    author_id: '1',
    status: 'published' as any,
    metadata: {},
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    title: 'Test Document 2',
    content_path: '/path/to/doc2.pdf',
    category_id: '1',
    author_id: '1',
    status: 'published' as any,
    metadata: {},
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

const mockCategories = [
  {
    id: '1',
    name: 'Category 1',
    level: 0,
    sort_order: 0,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

describe('DocumentManagement', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup default mock implementations
    mockDocumentService.getDocuments.mockResolvedValue({
      documents: mockDocuments,
      total: 2,
      page: 1,
      size: 10,
    });
    
    mockCategoryService.getCategoryTree.mockResolvedValue({
      data: mockCategories,
    });
  });

  const renderComponent = () => {
    return render(
      <BrowserRouter>
        <DocumentManagement />
      </BrowserRouter>
    );
  };

  test('renders document management page', async () => {
    renderComponent();
    
    expect(screen.getByText('文档管理')).toBeInTheDocument();
    
    // Wait for documents to load
    await waitFor(() => {
      expect(screen.getByText('Test Document 1')).toBeInTheDocument();
    });
  });

  test('loads and displays documents', async () => {
    renderComponent();
    
    await waitFor(() => {
      expect(mockDocumentService.getDocuments).toHaveBeenCalled();
      expect(screen.getByText('Test Document 1')).toBeInTheDocument();
      expect(screen.getByText('Test Document 2')).toBeInTheDocument();
    });
  });

  test('handles search functionality', async () => {
    renderComponent();
    
    const searchInput = screen.getByPlaceholderText('搜索文档...');
    fireEvent.change(searchInput, { target: { value: 'Test Document 1' } });
    
    await waitFor(() => {
      expect(mockDocumentService.getDocuments).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'Test Document 1',
        })
      );
    });
  });

  test('handles API errors gracefully', async () => {
    mockDocumentService.getDocuments.mockRejectedValue(new Error('API Error'));
    
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('加载文档失败')).toBeInTheDocument();
    });
  });
});
