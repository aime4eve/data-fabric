import pytest
import json
from unittest.mock import patch, MagicMock
from datetime import datetime, timedelta

# Assuming Flask app structure
from api.app import create_app
from api.services.search_service import SearchService
from api.models.document import Document
from api.utils.search_indexer import SearchIndexer
from api.utils.text_processor import TextProcessor


@pytest.fixture
def app():
    """Create and configure a test Flask app."""
    app = create_app(testing=True)
    app.config['TESTING'] = True
    app.config['ELASTICSEARCH_URL'] = 'http://localhost:9200'
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
def sample_documents():
    """Create sample documents for testing."""
    return [
        {
            'id': 1,
            'title': 'React开发指南',
            'content': '这是一个关于React开发的详细指南，包含组件、状态管理、路由等内容。',
            'category': '技术文档',
            'tags': ['React', 'JavaScript', '前端'],
            'author': '张三',
            'created_at': datetime.utcnow() - timedelta(days=1)
        },
        {
            'id': 2,
            'title': 'Python Flask教程',
            'content': '学习如何使用Flask框架构建Web应用程序，包括路由、模板、数据库集成。',
            'category': '技术文档',
            'tags': ['Python', 'Flask', '后端'],
            'author': '李四',
            'created_at': datetime.utcnow() - timedelta(days=2)
        },
        {
            'id': 3,
            'title': '项目管理最佳实践',
            'content': '介绍敏捷开发、Scrum方法论以及项目管理工具的使用。',
            'category': '管理文档',
            'tags': ['项目管理', 'Scrum', '敏捷'],
            'author': '王五',
            'created_at': datetime.utcnow() - timedelta(days=3)
        }
    ]


class TestSearchEndpoints:
    """Test search-related endpoints."""

    def test_basic_search_success(self, client, auth_headers):
        """Test basic search functionality."""
        response = client.get('/api/search?q=React', headers=auth_headers)
        
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert response_data['success'] is True
        assert 'results' in response_data
        assert 'total' in response_data
        assert 'query' in response_data
        assert response_data['query'] == 'React'

    def test_search_with_pagination(self, client, auth_headers):
        """Test search with pagination parameters."""
        response = client.get('/api/search?q=技术&page=1&per_page=5', headers=auth_headers)
        
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert response_data['success'] is True
        assert response_data['page'] == 1
        assert response_data['per_page'] == 5

    def test_search_with_category_filter(self, client, auth_headers):
        """Test search with category filtering."""
        response = client.get('/api/search?q=文档&category=技术文档', headers=auth_headers)
        
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert response_data['success'] is True
        assert 'filters' in response_data
        assert response_data['filters']['category'] == '技术文档'

    def test_search_with_date_range(self, client, auth_headers):
        """Test search with date range filtering."""
        start_date = (datetime.utcnow() - timedelta(days=7)).isoformat()
        end_date = datetime.utcnow().isoformat()
        
        response = client.get(f'/api/search?q=开发&start_date={start_date}&end_date={end_date}', 
                            headers=auth_headers)
        
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert response_data['success'] is True

    def test_search_with_sorting(self, client, auth_headers):
        """Test search with different sorting options."""
        sort_options = ['relevance', 'date', 'title', 'author']
        
        for sort_by in sort_options:
            response = client.get(f'/api/search?q=文档&sort_by={sort_by}&sort_order=desc', 
                                headers=auth_headers)
            
            assert response.status_code == 200
            response_data = json.loads(response.data)
            assert response_data['success'] is True
            assert response_data['sort_by'] == sort_by

    def test_search_empty_query(self, client, auth_headers):
        """Test search with empty query."""
        response = client.get('/api/search?q=', headers=auth_headers)
        
        assert response.status_code == 400
        response_data = json.loads(response.data)
        assert response_data['success'] is False
        assert '搜索关键词不能为空' in response_data['message']

    def test_search_unauthorized(self, client):
        """Test search without authentication."""
        response = client.get('/api/search?q=test')
        
        assert response.status_code == 401
        response_data = json.loads(response.data)
        assert response_data['success'] is False

    def test_advanced_search(self, client, auth_headers):
        """Test advanced search functionality."""
        search_params = {
            'title': 'React',
            'content': '开发',
            'author': '张三',
            'category': '技术文档',
            'tags': 'JavaScript,前端',
            'start_date': (datetime.utcnow() - timedelta(days=30)).isoformat(),
            'end_date': datetime.utcnow().isoformat()
        }
        
        query_string = '&'.join([f'{k}={v}' for k, v in search_params.items()])
        response = client.get(f'/api/search/advanced?{query_string}', headers=auth_headers)
        
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert response_data['success'] is True
        assert 'advanced_filters' in response_data

    def test_search_suggestions(self, client, auth_headers):
        """Test search suggestions endpoint."""
        response = client.get('/api/search/suggestions?q=Rea', headers=auth_headers)
        
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert response_data['success'] is True
        assert 'suggestions' in response_data
        assert isinstance(response_data['suggestions'], list)

    def test_search_autocomplete(self, client, auth_headers):
        """Test search autocomplete functionality."""
        response = client.get('/api/search/autocomplete?q=Pyt', headers=auth_headers)
        
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert response_data['success'] is True
        assert 'completions' in response_data

    def test_search_history(self, client, auth_headers):
        """Test search history functionality."""
        # First perform some searches
        search_queries = ['React', 'Python', '项目管理']
        for query in search_queries:
            client.get(f'/api/search?q={query}', headers=auth_headers)
        
        # Get search history
        response = client.get('/api/search/history', headers=auth_headers)
        
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert response_data['success'] is True
        assert 'history' in response_data

    def test_clear_search_history(self, client, auth_headers):
        """Test clearing search history."""
        response = client.delete('/api/search/history', headers=auth_headers)
        
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert response_data['success'] is True
        assert response_data['message'] == '搜索历史已清空'

    def test_search_filters(self, client, auth_headers):
        """Test getting available search filters."""
        response = client.get('/api/search/filters', headers=auth_headers)
        
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert response_data['success'] is True
        assert 'categories' in response_data
        assert 'authors' in response_data
        assert 'tags' in response_data

    def test_search_statistics(self, client, auth_headers):
        """Test search statistics endpoint."""
        response = client.get('/api/search/statistics', headers=auth_headers)
        
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert response_data['success'] is True
        assert 'total_searches' in response_data
        assert 'popular_queries' in response_data
        assert 'search_trends' in response_data


class TestSearchService:
    """Test search service layer."""

    def test_basic_search(self, sample_documents):
        """Test basic search functionality in service layer."""
        with patch('api.utils.search_indexer.SearchIndexer.search') as mock_search:
            mock_search.return_value = {
                'hits': sample_documents[:2],
                'total': 2,
                'max_score': 1.5
            }
            
            service = SearchService()
            result = service.search('React', page=1, per_page=10)
            
            assert len(result['results']) == 2
            assert result['total'] == 2
            assert result['query'] == 'React'
            mock_search.assert_called_once()

    def test_search_with_filters(self, sample_documents):
        """Test search with various filters."""
        filters = {
            'category': '技术文档',
            'author': '张三',
            'tags': ['React', 'JavaScript'],
            'start_date': datetime.utcnow() - timedelta(days=7),
            'end_date': datetime.utcnow()
        }
        
        with patch('api.utils.search_indexer.SearchIndexer.search') as mock_search:
            mock_search.return_value = {
                'hits': [sample_documents[0]],
                'total': 1,
                'max_score': 2.0
            }
            
            service = SearchService()
            result = service.search('React', filters=filters)
            
            assert len(result['results']) == 1
            assert result['total'] == 1
            mock_search.assert_called_once()

    def test_search_with_highlighting(self, sample_documents):
        """Test search with text highlighting."""
        with patch('api.utils.search_indexer.SearchIndexer.search') as mock_search:
            mock_search.return_value = {
                'hits': sample_documents[:1],
                'total': 1,
                'highlights': {
                    '1': {
                        'title': ['<em>React</em>开发指南'],
                        'content': ['这是一个关于<em>React</em>开发的详细指南']
                    }
                }
            }
            
            service = SearchService()
            result = service.search('React', highlight=True)
            
            assert 'highlights' in result
            assert '1' in result['highlights']
            assert '<em>React</em>' in result['highlights']['1']['title'][0]

    def test_advanced_search(self, sample_documents):
        """Test advanced search functionality."""
        search_criteria = {
            'title': 'React',
            'content': '开发',
            'author': '张三',
            'category': '技术文档',
            'tags': ['React', 'JavaScript']
        }
        
        with patch('api.utils.search_indexer.SearchIndexer.advanced_search') as mock_search:
            mock_search.return_value = {
                'hits': [sample_documents[0]],
                'total': 1,
                'max_score': 3.0
            }
            
            service = SearchService()
            result = service.advanced_search(search_criteria)
            
            assert len(result['results']) == 1
            assert result['total'] == 1
            mock_search.assert_called_once_with(search_criteria)

    def test_search_suggestions(self):
        """Test search suggestions generation."""
        with patch('api.utils.search_indexer.SearchIndexer.get_suggestions') as mock_suggestions:
            mock_suggestions.return_value = [
                'React开发',
                'React组件',
                'React路由',
                'React状态管理'
            ]
            
            service = SearchService()
            result = service.get_suggestions('Rea')
            
            assert len(result) == 4
            assert all('React' in suggestion for suggestion in result)
            mock_suggestions.assert_called_once_with('Rea')

    def test_search_autocomplete(self):
        """Test search autocomplete functionality."""
        with patch('api.utils.search_indexer.SearchIndexer.get_completions') as mock_completions:
            mock_completions.return_value = [
                {'text': 'Python', 'score': 10},
                {'text': 'Python Flask', 'score': 8},
                {'text': 'Python教程', 'score': 6}
            ]
            
            service = SearchService()
            result = service.get_autocomplete('Pyt')
            
            assert len(result) == 3
            assert result[0]['text'] == 'Python'
            assert result[0]['score'] == 10

    def test_save_search_history(self):
        """Test saving search history."""
        with patch('api.models.search_history.SearchHistory.save') as mock_save:
            service = SearchService()
            service.save_search_history(user_id=1, query='React', results_count=5)
            
            mock_save.assert_called_once()

    def test_get_search_history(self):
        """Test getting user search history."""
        mock_history = [
            {'query': 'React', 'timestamp': datetime.utcnow(), 'results_count': 5},
            {'query': 'Python', 'timestamp': datetime.utcnow(), 'results_count': 3},
        ]
        
        with patch('api.models.search_history.SearchHistory.get_by_user') as mock_get:
            mock_get.return_value = mock_history
            
            service = SearchService()
            result = service.get_search_history(user_id=1, limit=10)
            
            assert len(result) == 2
            assert result[0]['query'] == 'React'

    def test_get_popular_searches(self):
        """Test getting popular search queries."""
        mock_popular = [
            {'query': 'React', 'count': 50},
            {'query': 'Python', 'count': 35},
            {'query': '项目管理', 'count': 20}
        ]
        
        with patch('api.models.search_history.SearchHistory.get_popular') as mock_get:
            mock_get.return_value = mock_popular
            
            service = SearchService()
            result = service.get_popular_searches(limit=10)
            
            assert len(result) == 3
            assert result[0]['query'] == 'React'
            assert result[0]['count'] == 50

    def test_search_analytics(self):
        """Test search analytics functionality."""
        mock_analytics = {
            'total_searches': 1000,
            'unique_queries': 250,
            'avg_results_per_search': 4.2,
            'top_categories': [
                {'category': '技术文档', 'count': 600},
                {'category': '管理文档', 'count': 400}
            ]
        }
        
        with patch('api.models.search_history.SearchHistory.get_analytics') as mock_get:
            mock_get.return_value = mock_analytics
            
            service = SearchService()
            result = service.get_search_analytics()
            
            assert result['total_searches'] == 1000
            assert result['unique_queries'] == 250
            assert len(result['top_categories']) == 2


class TestSearchIndexer:
    """Test search indexer functionality."""

    def test_index_document(self, sample_documents):
        """Test document indexing."""
        with patch('elasticsearch.Elasticsearch.index') as mock_index:
            mock_index.return_value = {'_id': '1', 'result': 'created'}
            
            indexer = SearchIndexer()
            result = indexer.index_document(sample_documents[0])
            
            assert result['result'] == 'created'
            mock_index.assert_called_once()

    def test_bulk_index_documents(self, sample_documents):
        """Test bulk document indexing."""
        with patch('elasticsearch.helpers.bulk') as mock_bulk:
            mock_bulk.return_value = (3, [])
            
            indexer = SearchIndexer()
            result = indexer.bulk_index(sample_documents)
            
            assert result['indexed'] == 3
            assert result['errors'] == []
            mock_bulk.assert_called_once()

    def test_search_documents(self):
        """Test document searching in index."""
        mock_response = {
            'hits': {
                'total': {'value': 2},
                'max_score': 1.5,
                'hits': [
                    {
                        '_id': '1',
                        '_score': 1.5,
                        '_source': {
                            'title': 'React开发指南',
                            'content': '这是一个关于React开发的详细指南'
                        },
                        'highlight': {
                            'title': ['<em>React</em>开发指南']
                        }
                    }
                ]
            }
        }
        
        with patch('elasticsearch.Elasticsearch.search') as mock_search:
            mock_search.return_value = mock_response
            
            indexer = SearchIndexer()
            result = indexer.search('React', size=10, from_=0)
            
            assert result['total'] == 2
            assert result['max_score'] == 1.5
            assert len(result['hits']) == 1
            mock_search.assert_called_once()

    def test_delete_document_from_index(self):
        """Test document deletion from index."""
        with patch('elasticsearch.Elasticsearch.delete') as mock_delete:
            mock_delete.return_value = {'result': 'deleted'}
            
            indexer = SearchIndexer()
            result = indexer.delete_document('1')
            
            assert result['result'] == 'deleted'
            mock_delete.assert_called_once()

    def test_update_document_in_index(self, sample_documents):
        """Test document update in index."""
        with patch('elasticsearch.Elasticsearch.update') as mock_update:
            mock_update.return_value = {'result': 'updated'}
            
            indexer = SearchIndexer()
            updated_doc = sample_documents[0].copy()
            updated_doc['title'] = '更新后的标题'
            
            result = indexer.update_document('1', updated_doc)
            
            assert result['result'] == 'updated'
            mock_update.assert_called_once()

    def test_create_index_mapping(self):
        """Test index mapping creation."""
        with patch('elasticsearch.Elasticsearch.indices.create') as mock_create:
            mock_create.return_value = {'acknowledged': True}
            
            indexer = SearchIndexer()
            result = indexer.create_index('documents')
            
            assert result['acknowledged'] is True
            mock_create.assert_called_once()

    def test_get_index_statistics(self):
        """Test getting index statistics."""
        mock_stats = {
            'indices': {
                'documents': {
                    'total': {
                        'docs': {'count': 100},
                        'store': {'size_in_bytes': 1024000}
                    }
                }
            }
        }
        
        with patch('elasticsearch.Elasticsearch.indices.stats') as mock_stats_call:
            mock_stats_call.return_value = mock_stats
            
            indexer = SearchIndexer()
            result = indexer.get_index_stats('documents')
            
            assert result['doc_count'] == 100
            assert result['size_in_bytes'] == 1024000


class TestTextProcessor:
    """Test text processing utilities."""

    def test_extract_keywords(self):
        """Test keyword extraction from text."""
        processor = TextProcessor()
        
        text = "这是一个关于React开发的详细指南，包含组件、状态管理、路由等内容。"
        keywords = processor.extract_keywords(text, max_keywords=5)
        
        assert isinstance(keywords, list)
        assert len(keywords) <= 5
        assert any('React' in keyword for keyword in keywords)

    def test_text_similarity(self):
        """Test text similarity calculation."""
        processor = TextProcessor()
        
        text1 = "React开发指南"
        text2 = "React开发教程"
        text3 = "Python Flask教程"
        
        similarity1 = processor.calculate_similarity(text1, text2)
        similarity2 = processor.calculate_similarity(text1, text3)
        
        assert 0 <= similarity1 <= 1
        assert 0 <= similarity2 <= 1
        assert similarity1 > similarity2  # More similar texts should have higher score

    def test_text_preprocessing(self):
        """Test text preprocessing functionality."""
        processor = TextProcessor()
        
        text = "  这是一个测试文本！！！包含标点符号和空格。  "
        processed = processor.preprocess_text(text)
        
        assert processed.strip() == processed  # No leading/trailing spaces
        assert '！！！' not in processed  # Punctuation removed or normalized
        assert len(processed) > 0

    def test_text_segmentation(self):
        """Test Chinese text segmentation."""
        processor = TextProcessor()
        
        text = "这是一个关于React开发的技术文档"
        segments = processor.segment_text(text)
        
        assert isinstance(segments, list)
        assert len(segments) > 0
        assert 'React' in segments or any('React' in seg for seg in segments)

    def test_remove_stopwords(self):
        """Test stopword removal."""
        processor = TextProcessor()
        
        words = ['这是', '一个', '关于', 'React', '开发', '的', '文档']
        filtered = processor.remove_stopwords(words)
        
        assert 'React' in filtered
        assert '开发' in filtered
        assert '文档' in filtered
        assert '这是' not in filtered  # Common stopword
        assert '的' not in filtered  # Common stopword

    def test_text_normalization(self):
        """Test text normalization."""
        processor = TextProcessor()
        
        text = "React开发指南（第二版）"
        normalized = processor.normalize_text(text)
        
        assert isinstance(normalized, str)
        assert len(normalized) > 0

    def test_extract_entities(self):
        """Test named entity extraction."""
        processor = TextProcessor()
        
        text = "张三在北京使用React开发了一个Web应用程序"
        entities = processor.extract_entities(text)
        
        assert isinstance(entities, dict)
        # Should contain person, location, technology entities
        if 'PERSON' in entities:
            assert '张三' in entities['PERSON']
        if 'LOCATION' in entities:
            assert '北京' in entities['LOCATION']

    def test_calculate_text_score(self):
        """Test text relevance scoring."""
        processor = TextProcessor()
        
        query = "React开发"
        text = "这是一个关于React开发的详细指南，包含组件开发和状态管理。"
        
        score = processor.calculate_relevance_score(query, text)
        
        assert isinstance(score, (int, float))
        assert score >= 0

    def test_highlight_text(self):
        """Test text highlighting functionality."""
        processor = TextProcessor()
        
        text = "这是一个关于React开发的指南"
        query = "React"
        
        highlighted = processor.highlight_text(text, query)
        
        assert '<em>' in highlighted or '<mark>' in highlighted
        assert query in highlighted

    def test_text_summary(self):
        """Test text summarization."""
        processor = TextProcessor()
        
        long_text = """
        React是一个用于构建用户界面的JavaScript库。它由Facebook开发并维护。
        React使用组件化的方式来构建UI，每个组件都有自己的状态和生命周期。
        React的核心概念包括组件、JSX、状态管理、生命周期方法等。
        使用React可以构建单页应用程序，也可以用于移动应用开发。
        """
        
        summary = processor.summarize_text(long_text, max_sentences=2)
        
        assert isinstance(summary, str)
        assert len(summary) < len(long_text)
        assert 'React' in summary