"""
文档上传功能E2E测试
测试文档上传的完整流程，包括文件上传、表单验证、响应处理等
"""

import pytest
import requests
import os
import tempfile
import json
from typing import Dict, Any


class TestDocumentUpload:
    """文档上传E2E测试类"""
    
    BASE_URL = "http://localhost:8000/api/v1"
    UPLOAD_ENDPOINT = f"{BASE_URL}/documents/upload"
    
    @pytest.fixture
    def test_file(self):
        """创建测试文件"""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
            f.write("这是一个测试文档内容\n用于测试文档上传功能")
            temp_file_path = f.name
        
        yield temp_file_path
        
        # 清理测试文件
        if os.path.exists(temp_file_path):
            os.unlink(temp_file_path)
    
    @pytest.fixture
    def large_test_file(self):
        """创建大文件用于测试文件大小限制"""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
            # 创建一个约1MB的文件
            content = "测试内容" * 50000
            f.write(content)
            temp_file_path = f.name
        
        yield temp_file_path
        
        # 清理测试文件
        if os.path.exists(temp_file_path):
            os.unlink(temp_file_path)
    
    @pytest.fixture
    def csv_test_file(self):
        """创建CSV测试文件"""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            f.write("姓名,年龄,部门\n张三,25,技术部\n李四,30,市场部")
            temp_file_path = f.name
        
        yield temp_file_path
        
        # 清理测试文件
        if os.path.exists(temp_file_path):
            os.unlink(temp_file_path)
    
    def test_successful_document_upload(self, test_file):
        """测试成功上传文档"""
        with open(test_file, 'rb') as f:
            files = {'file': ('test_document.txt', f, 'text/plain')}
            data = {
                'title': '测试文档标题',
                'description': '这是一个测试文档的描述',
                'category_id': 'test_category'
            }
            
            response = requests.post(self.UPLOAD_ENDPOINT, files=files, data=data)
            
            # 验证响应状态码
            assert response.status_code == 201, f"期望状态码201，实际得到{response.status_code}"
            
            # 验证响应内容
            response_data = response.json()
            assert response_data['success'] is True
            assert '成功' in response_data['message']
            assert 'data' in response_data
            
            # 验证返回的文档数据
            document_data = response_data['data']
            assert document_data['title'] == '测试文档标题'
            assert document_data['id'] is not None
            assert document_data['content_path'] is not None
            assert document_data['status'] == 'draft'
            assert document_data['created_at'] is not None
            assert document_data['updated_at'] is not None
    
    def test_upload_without_file(self):
        """测试没有文件的上传请求"""
        data = {
            'title': '测试文档标题',
            'description': '测试描述',
            'category_id': 'test_category'
        }
        
        response = requests.post(self.UPLOAD_ENDPOINT, data=data)
        
        # 应该返回400错误
        assert response.status_code == 400
        response_data = response.json()
        assert response_data['success'] is False
        assert '文件' in response_data['message']
    
    def test_upload_without_title(self, test_file):
        """测试没有标题的上传请求"""
        with open(test_file, 'rb') as f:
            files = {'file': ('test_document.txt', f, 'text/plain')}
            data = {
                'description': '测试描述',
                'category_id': 'test_category'
            }
            
            response = requests.post(self.UPLOAD_ENDPOINT, files=files, data=data)
            
            # 由于后端当前实现会使用文件名作为默认标题，所以应该成功
            assert response.status_code == 201
            response_data = response.json()
            assert response_data['success'] is True
            # 验证使用了文件名作为标题
            assert response_data['data']['title'] == 'test_document.txt'
    
    def test_upload_csv_file(self, csv_test_file):
        """测试上传CSV文件"""
        with open(csv_test_file, 'rb') as f:
            files = {'file': ('test_data.csv', f, 'text/csv')}
            data = {
                'title': 'CSV测试文档',
                'description': 'CSV文件上传测试',
                'category_id': 'test_category'
            }
            
            response = requests.post(self.UPLOAD_ENDPOINT, files=files, data=data)
            
            # 验证CSV文件可以成功上传
            assert response.status_code == 201
            response_data = response.json()
            assert response_data['success'] is True
    
    def test_upload_with_directory(self, test_file):
        """测试指定上传目录的文档上传"""
        with open(test_file, 'rb') as f:
            files = {'file': ('test_document.txt', f, 'text/plain')}
            data = {
                'title': '目录测试文档',
                'description': '测试指定目录上传',
                'category_id': 'test_category',
                'upload_directory': 'test_folder'
            }
            
            response = requests.post(self.UPLOAD_ENDPOINT, files=files, data=data)
            
            assert response.status_code == 201
            response_data = response.json()
            assert response_data['success'] is True
            
            # 验证文档路径包含指定目录
            document_data = response_data['data']
            assert 'test_folder' in document_data['metadata']['full_path']
    
    def test_upload_large_file(self, large_test_file):
        """测试上传大文件（测试文件大小限制）"""
        with open(large_test_file, 'rb') as f:
            files = {'file': ('large_test.txt', f, 'text/plain')}
            data = {
                'title': '大文件测试',
                'description': '测试大文件上传',
                'category_id': 'test_category'
            }
            
            response = requests.post(self.UPLOAD_ENDPOINT, files=files, data=data)
            
            # 根据后端配置，可能成功或失败
            # 这里我们检查响应是否合理
            assert response.status_code in [201, 400, 413]
            
            if response.status_code != 201:
                response_data = response.json()
                assert response_data['success'] is False
                assert '大小' in response_data['message'] or '限制' in response_data['message']
    
    def test_upload_empty_file(self):
        """测试上传空文件"""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
            # 创建空文件
            temp_file_path = f.name
        
        try:
            with open(temp_file_path, 'rb') as f:
                files = {'file': ('empty.txt', f, 'text/plain')}
                data = {
                    'title': '空文件测试',
                    'description': '测试空文件上传',
                    'category_id': 'test_category'
                }
                
                response = requests.post(self.UPLOAD_ENDPOINT, files=files, data=data)
                
                # 当前后端实现允许空文件上传
                assert response.status_code == 201
                response_data = response.json()
                assert response_data['success'] is True
                # 验证文件大小为0
                assert response_data['data']['metadata']['file_size'] == 0
        finally:
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
    
    def test_upload_with_special_characters_in_title(self, test_file):
        """测试标题包含特殊字符的文档上传"""
        with open(test_file, 'rb') as f:
            files = {'file': ('test_document.txt', f, 'text/plain')}
            data = {
                'title': '测试文档@#$%^&*()_+-={}[]|\\:";\'<>?,./~`',
                'description': '特殊字符标题测试',
                'category_id': 'test_category'
            }
            
            response = requests.post(self.UPLOAD_ENDPOINT, files=files, data=data)
            
            # 应该能够处理特殊字符
            assert response.status_code == 201
            response_data = response.json()
            assert response_data['success'] is True
    
    def test_upload_response_format(self, test_file):
        """测试上传响应格式的完整性"""
        with open(test_file, 'rb') as f:
            files = {'file': ('test_document.txt', f, 'text/plain')}
            data = {
                'title': '响应格式测试',
                'description': '测试响应数据格式',
                'category_id': 'test_category'
            }
            
            response = requests.post(self.UPLOAD_ENDPOINT, files=files, data=data)
            
            assert response.status_code == 201
            response_data = response.json()
            
            # 验证响应结构
            required_fields = ['success', 'message', 'data']
            for field in required_fields:
                assert field in response_data, f"响应中缺少字段: {field}"
            
            # 验证文档数据结构
            document_data = response_data['data']
            required_doc_fields = ['id', 'title', 'content_path', 'status', 'created_at', 'updated_at', 'metadata']
            for field in required_doc_fields:
                assert field in document_data, f"文档数据中缺少字段: {field}"
            
            # 验证元数据结构
            metadata = document_data['metadata']
            required_metadata_fields = ['original_filename', 'content_type', 'file_size', 'full_path']
            for field in required_metadata_fields:
                assert field in metadata, f"元数据中缺少字段: {field}"
    
    def test_concurrent_uploads(self, test_file):
        """测试并发上传"""
        import threading
        import time
        
        results = []
        
        def upload_document(index):
            with open(test_file, 'rb') as f:
                files = {'file': (f'concurrent_test_{index}.txt', f, 'text/plain')}
                data = {
                    'title': f'并发测试文档_{index}',
                    'description': f'并发上传测试_{index}',
                    'category_id': 'test_category'
                }
                
                response = requests.post(self.UPLOAD_ENDPOINT, files=files, data=data)
                results.append((index, response.status_code, response.json()))
        
        # 创建5个并发上传线程
        threads = []
        for i in range(5):
            thread = threading.Thread(target=upload_document, args=(i,))
            threads.append(thread)
        
        # 启动所有线程
        for thread in threads:
            thread.start()
        
        # 等待所有线程完成
        for thread in threads:
            thread.join()
        
        # 验证所有上传都成功
        assert len(results) == 5
        for index, status_code, response_data in results:
            assert status_code == 201, f"并发上传{index}失败，状态码: {status_code}"
            assert response_data['success'] is True
    
    def test_upload_file_persistence(self, test_file):
        """测试上传文件的持久化存储"""
        with open(test_file, 'rb') as f:
            files = {'file': ('persistence_test.txt', f, 'text/plain')}
            data = {
                'title': '持久化测试文档',
                'description': '测试文件持久化存储',
                'category_id': 'test_category'
            }
            
            response = requests.post(self.UPLOAD_ENDPOINT, files=files, data=data)
            
            assert response.status_code == 201
            response_data = response.json()
            assert response_data['success'] is True
            
            # 验证文件是否真的被保存到磁盘
            document_data = response_data['data']
            file_path = document_data['metadata']['full_path']
            
            # 检查文件是否存在
            assert os.path.exists(file_path), f"上传的文件未找到: {file_path}"
            
            # 验证文件内容
            with open(file_path, 'r', encoding='utf-8') as saved_file:
                saved_content = saved_file.read()
                with open(test_file, 'r', encoding='utf-8') as original_file:
                    original_content = original_file.read()
                assert saved_content == original_content, "保存的文件内容与原文件不匹配"


if __name__ == "__main__":
    # 运行测试
    pytest.main([__file__, "-v", "--tb=short"])