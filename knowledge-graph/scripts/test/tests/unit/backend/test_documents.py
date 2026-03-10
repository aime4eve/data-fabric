import pytest
import json
import os
import tempfile
from unittest.mock import patch, MagicMock
from datetime import datetime
from werkzeug.datastructures import FileStorage
from io import BytesIO

# Assuming Flask app structure
from api.app import create_app
from api.models.document import Document
from api.services.document_service import DocumentService
from api.utils.file_handler import FileHandler


@pytest.fixture
def app():
    """Create and configure a test Flask app."""
    app = create_app(testing=True)
    app.config['TESTING'] = True
    app.config['UPLOAD_FOLDER'] = tempfile.mkdtemp()
    app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB
    return app


@pytest.fixture
def client(app):
    """Create a test client for the Flask app."""
    return app.test_client()


@pytest.fixture
def auth_headers():
    """Generate authentication headers for testing."""
    from api.utils.auth import generate_token
    token = generate_token({'user_id': 1, 'username': 'testuser'})
    return {'Authorization': f'Bearer {token}'}


@pytest.fixture
def sample_document():
    """Create a sample document for testing."""
    return {
        'title': '测试文档',
        'content': '这是一个测试文档的内容',
        'category': '技术文档',
        'tags': ['React', 'TypeScript', '测试'],
        'author_id': 1,
        'file_type': 'pdf',
        'file_size': 1024
    }


class TestDocumentEndpoints:
    """Test document management endpoints."""

    def test_get_documents_success(self, client, auth_headers):
        """Test successful retrieval of documents."""
        response = client.get('/api/documents', headers=auth_headers)
        
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert response_data['success'] is True
        assert 'documents' in response_data
        assert 'total' in response_data
        assert 'page' in response_data
        assert 'per_page' in response_data

    def test_get_documents_with_pagination(self, client, auth_headers):
        """Test document retrieval with pagination."""
        response = client.get('/api/documents?page=1&per_page=10', headers=auth_headers)
        
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert response_data['page'] == 1
        assert response_data['per_page'] == 10

    def test_get_documents_with_search(self, client, auth_headers):
        """Test document retrieval with search query."""
        response = client.get('/api/documents?search=测试', headers=auth_headers)
        
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert response_data['success'] is True

    def test_get_documents_with_category_filter(self, client, auth_headers):
        """Test document retrieval with category filter."""
        response = client.get('/api/documents?category=技术文档', headers=auth_headers)
        
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert response_data['success'] is True

    def test_get_documents_with_sorting(self, client, auth_headers):
        """Test document retrieval with sorting."""
        response = client.get('/api/documents?sort_by=created_at&sort_order=desc', headers=auth_headers)
        
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert response_data['success'] is True

    def test_get_documents_unauthorized(self, client):
        """Test document retrieval without authentication."""
        response = client.get('/api/documents')
        
        assert response.status_code == 401
        response_data = json.loads(response.data)
        assert response_data['success'] is False

    def test_get_document_by_id_success(self, client, auth_headers):
        """Test successful retrieval of document by ID."""
        # First create a document
        document_data = {
            'title': '测试文档',
            'content': '测试内容',
            'category': '技术文档'
        }
        create_response = client.post('/api/documents', 
                                    data=json.dumps(document_data),
                                    content_type='application/json',
                                    headers=auth_headers)
        
        created_doc = json.loads(create_response.data)['document']
        doc_id = created_doc['id']
        
        # Get the document
        response = client.get(f'/api/documents/{doc_id}', headers=auth_headers)
        
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert response_data['success'] is True
        assert response_data['document']['id'] == doc_id
        assert response_data['document']['title'] == '测试文档'

    def test_get_document_by_id_not_found(self, client, auth_headers):
        """Test retrieval of non-existent document."""
        response = client.get('/api/documents/999999', headers=auth_headers)
        
        assert response.status_code == 404
        response_data = json.loads(response.data)
        assert response_data['success'] is False
        assert '文档不存在' in response_data['message']

    def test_create_document_success(self, client, auth_headers, sample_document):
        """Test successful document creation."""
        response = client.post('/api/documents', 
                             data=json.dumps(sample_document),
                             content_type='application/json',
                             headers=auth_headers)
        
        assert response.status_code == 201
        response_data = json.loads(response.data)
        assert response_data['success'] is True
        assert 'document' in response_data
        assert response_data['document']['title'] == sample_document['title']
        assert response_data['document']['content'] == sample_document['content']
        assert response_data['document']['category'] == sample_document['category']

    def test_create_document_invalid_data(self, client, auth_headers):
        """Test document creation with invalid data."""
        invalid_documents = [
            {},  # Empty data
            {'content': '只有内容'},  # Missing title
            {'title': '只有标题'},  # Missing content
            {'title': '', 'content': '空标题'},  # Empty title
            {'title': '空内容', 'content': ''},  # Empty content
        ]
        
        for doc_data in invalid_documents:
            response = client.post('/api/documents', 
                                 data=json.dumps(doc_data),
                                 content_type='application/json',
                                 headers=auth_headers)
            
            assert response.status_code == 400
            response_data = json.loads(response.data)
            assert response_data['success'] is False

    def test_update_document_success(self, client, auth_headers, sample_document):
        """Test successful document update."""
        # Create document first
        create_response = client.post('/api/documents', 
                                    data=json.dumps(sample_document),
                                    content_type='application/json',
                                    headers=auth_headers)
        
        created_doc = json.loads(create_response.data)['document']
        doc_id = created_doc['id']
        
        # Update document
        update_data = {
            'title': '更新后的标题',
            'content': '更新后的内容',
            'category': '更新后的分类'
        }
        
        response = client.put(f'/api/documents/{doc_id}', 
                            data=json.dumps(update_data),
                            content_type='application/json',
                            headers=auth_headers)
        
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert response_data['success'] is True
        assert response_data['document']['title'] == update_data['title']
        assert response_data['document']['content'] == update_data['content']
        assert response_data['document']['category'] == update_data['category']

    def test_update_document_not_found(self, client, auth_headers):
        """Test updating non-existent document."""
        update_data = {
            'title': '更新标题',
            'content': '更新内容'
        }
        
        response = client.put('/api/documents/999999', 
                            data=json.dumps(update_data),
                            content_type='application/json',
                            headers=auth_headers)
        
        assert response.status_code == 404
        response_data = json.loads(response.data)
        assert response_data['success'] is False

    def test_update_document_unauthorized(self, client, auth_headers, sample_document):
        """Test updating document by unauthorized user."""
        # Create document with user 1
        create_response = client.post('/api/documents', 
                                    data=json.dumps(sample_document),
                                    content_type='application/json',
                                    headers=auth_headers)
        
        created_doc = json.loads(create_response.data)['document']
        doc_id = created_doc['id']
        
        # Try to update with different user
        from api.utils.auth import generate_token
        other_user_token = generate_token({'user_id': 2, 'username': 'otheruser'})
        other_headers = {'Authorization': f'Bearer {other_user_token}'}
        
        update_data = {'title': '恶意更新'}
        
        response = client.put(f'/api/documents/{doc_id}', 
                            data=json.dumps(update_data),
                            content_type='application/json',
                            headers=other_headers)
        
        assert response.status_code == 403
        response_data = json.loads(response.data)
        assert response_data['success'] is False
        assert '权限不足' in response_data['message']

    def test_delete_document_success(self, client, auth_headers, sample_document):
        """Test successful document deletion."""
        # Create document first
        create_response = client.post('/api/documents', 
                                    data=json.dumps(sample_document),
                                    content_type='application/json',
                                    headers=auth_headers)
        
        created_doc = json.loads(create_response.data)['document']
        doc_id = created_doc['id']
        
        # Delete document
        response = client.delete(f'/api/documents/{doc_id}', headers=auth_headers)
        
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert response_data['success'] is True
        assert response_data['message'] == '文档删除成功'

    def test_delete_document_not_found(self, client, auth_headers):
        """Test deleting non-existent document."""
        response = client.delete('/api/documents/999999', headers=auth_headers)
        
        assert response.status_code == 404
        response_data = json.loads(response.data)
        assert response_data['success'] is False

    def test_upload_file_success(self, client, auth_headers):
        """Test successful file upload."""
        # Create a test file
        test_file_content = b'This is a test PDF content'
        test_file = FileStorage(
            stream=BytesIO(test_file_content),
            filename='test.pdf',
            content_type='application/pdf'
        )
        
        data = {
            'file': test_file,
            'title': '上传的文档',
            'category': '技术文档'
        }
        
        response = client.post('/api/documents/upload', 
                             data=data,
                             headers=auth_headers)
        
        assert response.status_code == 201
        response_data = json.loads(response.data)
        assert response_data['success'] is True
        assert 'document' in response_data
        assert response_data['document']['title'] == '上传的文档'
        assert response_data['document']['file_type'] == 'pdf'

    def test_upload_file_invalid_type(self, client, auth_headers):
        """Test file upload with invalid file type."""
        # Create a test file with invalid extension
        test_file = FileStorage(
            stream=BytesIO(b'invalid content'),
            filename='test.exe',
            content_type='application/octet-stream'
        )
        
        data = {
            'file': test_file,
            'title': '无效文件',
            'category': '技术文档'
        }
        
        response = client.post('/api/documents/upload', 
                             data=data,
                             headers=auth_headers)
        
        assert response.status_code == 400
        response_data = json.loads(response.data)
        assert response_data['success'] is False
        assert '不支持的文件类型' in response_data['message']

    def test_upload_file_too_large(self, client, auth_headers):
        """Test file upload with file too large."""
        # Create a large test file (larger than MAX_CONTENT_LENGTH)
        large_content = b'x' * (17 * 1024 * 1024)  # 17MB
        test_file = FileStorage(
            stream=BytesIO(large_content),
            filename='large.pdf',
            content_type='application/pdf'
        )
        
        data = {
            'file': test_file,
            'title': '大文件',
            'category': '技术文档'
        }
        
        response = client.post('/api/documents/upload', 
                             data=data,
                             headers=auth_headers)
        
        assert response.status_code == 413
        response_data = json.loads(response.data)
        assert response_data['success'] is False
        assert '文件过大' in response_data['message']

    def test_download_file_success(self, client, auth_headers, sample_document):
        """Test successful file download."""
        # Create document with file first
        create_response = client.post('/api/documents', 
                                    data=json.dumps(sample_document),
                                    content_type='application/json',
                                    headers=auth_headers)
        
        created_doc = json.loads(create_response.data)['document']
        doc_id = created_doc['id']
        
        # Mock file existence
        with patch('os.path.exists', return_value=True), \
             patch('flask.send_file') as mock_send_file:
            
            response = client.get(f'/api/documents/{doc_id}/download', headers=auth_headers)
            
            mock_send_file.assert_called_once()

    def test_download_file_not_found(self, client, auth_headers):
        """Test downloading non-existent file."""
        response = client.get('/api/documents/999999/download', headers=auth_headers)
        
        assert response.status_code == 404
        response_data = json.loads(response.data)
        assert response_data['success'] is False


class TestDocumentService:
    """Test document service layer."""

    def test_create_document(self, sample_document):
        """Test document creation in service layer."""
        with patch('api.models.document.Document.save') as mock_save:
            mock_save.return_value = Document(**sample_document, id=1)
            
            service = DocumentService()
            result = service.create_document(sample_document)
            
            assert result.title == sample_document['title']
            assert result.content == sample_document['content']
            mock_save.assert_called_once()

    def test_get_documents_with_filters(self):
        """Test getting documents with various filters."""
        mock_documents = [
            Document(id=1, title='文档1', category='技术', author_id=1),
            Document(id=2, title='文档2', category='管理', author_id=1),
        ]
        
        with patch('api.models.document.Document.query') as mock_query:
            mock_query.filter.return_value.paginate.return_value.items = mock_documents
            mock_query.filter.return_value.paginate.return_value.total = 2
            
            service = DocumentService()
            result = service.get_documents(
                search='文档',
                category='技术',
                page=1,
                per_page=10
            )
            
            assert len(result['documents']) == 2
            assert result['total'] == 2

    def test_update_document(self, sample_document):
        """Test document update in service layer."""
        existing_doc = Document(**sample_document, id=1)
        update_data = {'title': '更新后的标题'}
        
        with patch('api.models.document.Document.get_by_id', return_value=existing_doc), \
             patch.object(existing_doc, 'save') as mock_save:
            
            service = DocumentService()
            result = service.update_document(1, update_data, user_id=1)
            
            assert result.title == '更新后的标题'
            mock_save.assert_called_once()

    def test_delete_document(self, sample_document):
        """Test document deletion in service layer."""
        existing_doc = Document(**sample_document, id=1)
        
        with patch('api.models.document.Document.get_by_id', return_value=existing_doc), \
             patch.object(existing_doc, 'delete') as mock_delete:
            
            service = DocumentService()
            result = service.delete_document(1, user_id=1)
            
            assert result is True
            mock_delete.assert_called_once()

    def test_search_documents(self):
        """Test document search functionality."""
        mock_results = [
            Document(id=1, title='测试文档', content='测试内容'),
            Document(id=2, title='另一个文档', content='包含测试关键词'),
        ]
        
        with patch('api.services.search_service.SearchService.search') as mock_search:
            mock_search.return_value = {
                'documents': mock_results,
                'total': 2,
                'highlights': {'测试': ['测试文档', '测试内容']}
            }
            
            service = DocumentService()
            result = service.search_documents('测试', page=1, per_page=10)
            
            assert len(result['documents']) == 2
            assert result['total'] == 2
            assert '测试' in result['highlights']

    def test_get_document_statistics(self):
        """Test getting document statistics."""
        mock_stats = {
            'total_documents': 100,
            'documents_by_category': {
                '技术文档': 60,
                '管理文档': 30,
                '其他': 10
            },
            'documents_by_author': {
                '张三': 40,
                '李四': 35,
                '王五': 25
            },
            'recent_uploads': 15
        }
        
        with patch('api.models.document.Document.get_statistics', return_value=mock_stats):
            service = DocumentService()
            result = service.get_statistics()
            
            assert result['total_documents'] == 100
            assert '技术文档' in result['documents_by_category']
            assert result['recent_uploads'] == 15


class TestFileHandler:
    """Test file handling utilities."""

    def test_allowed_file_types(self):
        """Test file type validation."""
        handler = FileHandler()
        
        allowed_files = [
            'document.pdf',
            'spreadsheet.xlsx',
            'presentation.pptx',
            'text.txt',
            'image.jpg'
        ]
        
        disallowed_files = [
            'executable.exe',
            'script.bat',
            'archive.zip',
            'unknown.xyz'
        ]
        
        for filename in allowed_files:
            assert handler.is_allowed_file(filename) is True
        
        for filename in disallowed_files:
            assert handler.is_allowed_file(filename) is False

    def test_file_size_validation(self):
        """Test file size validation."""
        handler = FileHandler(max_size=1024 * 1024)  # 1MB
        
        # Valid size
        assert handler.is_valid_size(512 * 1024) is True  # 512KB
        
        # Invalid size
        assert handler.is_valid_size(2 * 1024 * 1024) is False  # 2MB

    def test_generate_unique_filename(self):
        """Test unique filename generation."""
        handler = FileHandler()
        
        filename1 = handler.generate_unique_filename('test.pdf')
        filename2 = handler.generate_unique_filename('test.pdf')
        
        assert filename1 != filename2
        assert filename1.endswith('.pdf')
        assert filename2.endswith('.pdf')

    def test_extract_file_metadata(self):
        """Test file metadata extraction."""
        handler = FileHandler()
        
        # Mock file
        test_file = FileStorage(
            stream=BytesIO(b'test content'),
            filename='test.pdf',
            content_type='application/pdf'
        )
        
        metadata = handler.extract_metadata(test_file)
        
        assert metadata['filename'] == 'test.pdf'
        assert metadata['content_type'] == 'application/pdf'
        assert metadata['size'] == len(b'test content')

    @patch('os.makedirs')
    @patch('builtins.open', create=True)
    def test_save_file(self, mock_open, mock_makedirs):
        """Test file saving functionality."""
        handler = FileHandler(upload_folder='/tmp/uploads')
        
        test_file = FileStorage(
            stream=BytesIO(b'test content'),
            filename='test.pdf',
            content_type='application/pdf'
        )
        
        mock_file = MagicMock()
        mock_open.return_value.__enter__.return_value = mock_file
        
        result = handler.save_file(test_file)
        
        assert result['success'] is True
        assert 'filepath' in result
        assert 'filename' in result
        mock_makedirs.assert_called_once()

    @patch('os.path.exists', return_value=True)
    @patch('os.remove')
    def test_delete_file(self, mock_remove, mock_exists):
        """Test file deletion."""
        handler = FileHandler()
        
        result = handler.delete_file('/tmp/uploads/test.pdf')
        
        assert result is True
        mock_remove.assert_called_once_with('/tmp/uploads/test.pdf')

    @patch('os.path.exists', return_value=False)
    def test_delete_nonexistent_file(self, mock_exists):
        """Test deletion of non-existent file."""
        handler = FileHandler()
        
        result = handler.delete_file('/tmp/uploads/nonexistent.pdf')
        
        assert result is False


class TestDocumentModel:
    """Test Document model methods."""

    def test_document_creation(self, sample_document):
        """Test document model creation."""
        doc = Document(**sample_document)
        
        assert doc.title == sample_document['title']
        assert doc.content == sample_document['content']
        assert doc.category == sample_document['category']
        assert doc.tags == sample_document['tags']

    def test_document_to_dict(self, sample_document):
        """Test document model to_dict method."""
        doc = Document(**sample_document, id=1, created_at=datetime.utcnow())
        
        doc_dict = doc.to_dict()
        
        assert doc_dict['id'] == 1
        assert doc_dict['title'] == sample_document['title']
        assert doc_dict['content'] == sample_document['content']
        assert doc_dict['category'] == sample_document['category']
        assert doc_dict['tags'] == sample_document['tags']
        assert 'created_at' in doc_dict

    def test_document_search_vector(self, sample_document):
        """Test document search vector generation."""
        doc = Document(**sample_document)
        
        search_vector = doc.generate_search_vector()
        
        assert sample_document['title'] in search_vector
        assert sample_document['content'] in search_vector
        assert sample_document['category'] in search_vector

    def test_document_update_tags(self, sample_document):
        """Test document tag updating."""
        doc = Document(**sample_document)
        
        new_tags = ['Python', 'Flask', '后端']
        doc.update_tags(new_tags)
        
        assert doc.tags == new_tags

    def test_document_get_file_path(self, sample_document):
        """Test document file path generation."""
        doc = Document(**sample_document, id=1, filename='test.pdf')
        
        file_path = doc.get_file_path()
        
        assert 'test.pdf' in file_path
        assert str(doc.id) in file_path

    def test_document_is_owned_by(self, sample_document):
        """Test document ownership checking."""
        doc = Document(**sample_document, author_id=1)
        
        assert doc.is_owned_by(1) is True
        assert doc.is_owned_by(2) is False

    def test_document_can_be_accessed_by(self, sample_document):
        """Test document access permission checking."""
        doc = Document(**sample_document, author_id=1, is_public=False)
        
        # Owner can access
        assert doc.can_be_accessed_by(1) is True
        
        # Non-owner cannot access private document
        assert doc.can_be_accessed_by(2) is False
        
        # Anyone can access public document
        doc.is_public = True
        assert doc.can_be_accessed_by(2) is True

    def test_document_increment_view_count(self, sample_document):
        """Test document view count increment."""
        doc = Document(**sample_document, view_count=0)
        
        doc.increment_view_count()
        assert doc.view_count == 1
        
        doc.increment_view_count()
        assert doc.view_count == 2