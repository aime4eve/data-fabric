/**
 * 知识图谱页面
 */
import React, { useEffect, useRef, useState } from 'react';
import { Card, Button, Space, Select, Slider, Typography, Spin, message } from 'antd';
import {
  FullscreenOutlined,
  ReloadOutlined,
  SettingOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
} from '@ant-design/icons';
import * as d3 from 'd3';

const { Title, Text } = Typography;
const { Option } = Select;

interface GraphNode {
  id: string;
  name: string;
  type: 'document' | 'entity' | 'concept';
  size: number;
  color: string;
}

interface GraphLink {
  source: string;
  target: string;
  type: 'reference' | 'similarity' | 'contains';
  weight: number;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export const KnowledgeGraph: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [loading, setLoading] = useState(false);
  const [selectedLayout, setSelectedLayout] = useState<'force' | 'circular' | 'hierarchical'>('force');
  const [linkDistance, setLinkDistance] = useState(100);
  const [nodeSize, setNodeSize] = useState(5);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    loadGraphData();
  }, []);

  useEffect(() => {
    if (graphData.nodes.length > 0) {
      renderGraph();
    }
  }, [graphData, selectedLayout, linkDistance, nodeSize]);

  const loadGraphData = async () => {
    try {
      setLoading(true);
      
      // 模拟知识图谱数据
      const mockData: GraphData = {
        nodes: [
          { id: '1', name: '技术文档', type: 'document', size: 20, color: '#1890ff' },
          { id: '2', name: 'API设计', type: 'concept', size: 15, color: '#52c41a' },
          { id: '3', name: '数据库设计', type: 'concept', size: 18, color: '#52c41a' },
          { id: '4', name: '用户手册', type: 'document', size: 16, color: '#1890ff' },
          { id: '5', name: '系统架构', type: 'concept', size: 22, color: '#52c41a' },
          { id: '6', name: '安全规范', type: 'document', size: 14, color: '#1890ff' },
          { id: '7', name: '认证授权', type: 'entity', size: 12, color: '#fa8c16' },
          { id: '8', name: '数据加密', type: 'entity', size: 10, color: '#fa8c16' },
          { id: '9', name: '性能优化', type: 'concept', size: 17, color: '#52c41a' },
          { id: '10', name: '监控告警', type: 'entity', size: 13, color: '#fa8c16' },
        ],
        links: [
          { source: '1', target: '2', type: 'contains', weight: 0.8 },
          { source: '1', target: '3', type: 'contains', weight: 0.9 },
          { source: '2', target: '5', type: 'reference', weight: 0.7 },
          { source: '3', target: '5', type: 'reference', weight: 0.8 },
          { source: '4', target: '7', type: 'contains', weight: 0.6 },
          { source: '6', target: '7', type: 'contains', weight: 0.9 },
          { source: '6', target: '8', type: 'contains', weight: 0.8 },
          { source: '5', target: '9', type: 'reference', weight: 0.7 },
          { source: '9', target: '10', type: 'reference', weight: 0.6 },
          { source: '7', target: '8', type: 'similarity', weight: 0.5 },
        ],
      };

      setGraphData(mockData);
    } catch (error) {
      message.error('加载知识图谱数据失败');
    } finally {
      setLoading(false);
    }
  };

  const renderGraph = () => {
    if (!svgRef.current || graphData.nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    // 创建缩放行为
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    const g = svg.append('g');

    // 创建力导向布局
    const simulation = d3.forceSimulation(graphData.nodes as any)
      .force('link', d3.forceLink(graphData.links).id((d: any) => d.id).distance(linkDistance))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2));

    // 绘制连线
    const link = g.append('g')
      .selectAll('line')
      .data(graphData.links)
      .enter().append('line')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', (d) => Math.sqrt(d.weight * 5));

    // 绘制节点
    const node = g.append('g')
      .selectAll('circle')
      .data(graphData.nodes)
      .enter().append('circle')
      .attr('r', (d) => d.size * nodeSize / 5)
      .attr('fill', (d) => d.color)
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .call(d3.drag<SVGCircleElement, GraphNode>()
        .on('start', (event, d: any) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d: any) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d: any) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }));

    // 添加节点标签
    const label = g.append('g')
      .selectAll('text')
      .data(graphData.nodes)
      .enter().append('text')
      .text((d) => d.name)
      .attr('font-size', 12)
      .attr('font-family', 'Arial, sans-serif')
      .attr('text-anchor', 'middle')
      .attr('dy', '.35em')
      .attr('fill', '#333');

    // 添加悬停效果
    node
      .on('mouseover', function(event, d) {
        d3.select(this).attr('stroke-width', 4);
        // 高亮相关连线
        link
          .attr('stroke', (l) => 
            l.source === d.id || l.target === d.id ? '#ff4d4f' : '#999'
          )
          .attr('stroke-width', (l) => 
            l.source === d.id || l.target === d.id ? 3 : Math.sqrt(l.weight * 5)
          );
      })
      .on('mouseout', function(event, d) {
        d3.select(this).attr('stroke-width', 2);
        // 恢复连线样式
        link
          .attr('stroke', '#999')
          .attr('stroke-width', (l) => Math.sqrt(l.weight * 5));
      });

    // 更新位置
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node
        .attr('cx', (d: any) => d.x)
        .attr('cy', (d: any) => d.y);

      label
        .attr('x', (d: any) => d.x)
        .attr('y', (d: any) => d.y + (d.size * nodeSize / 5) + 15);
    });
  };

  const handleZoomIn = () => {
    const svg = d3.select(svgRef.current);
    svg.transition().call(
      d3.zoom<SVGSVGElement, unknown>().scaleBy as any,
      1.5
    );
  };

  const handleZoomOut = () => {
    const svg = d3.select(svgRef.current);
    svg.transition().call(
      d3.zoom<SVGSVGElement, unknown>().scaleBy as any,
      1 / 1.5
    );
  };

  const handleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div className={`space-y-6 ${isFullscreen ? 'fixed inset-0 z-50 bg-white p-6' : ''}`}>
      {/* 控制面板 */}
      <Card>
        <div className="flex items-center justify-between">
          <Title level={3} className="mb-0">知识图谱</Title>
          
          <Space>
            <Select
              value={selectedLayout}
              onChange={setSelectedLayout}
              style={{ width: 120 }}
            >
              <Option value="force">力导向</Option>
              <Option value="circular">环形</Option>
              <Option value="hierarchical">层次</Option>
            </Select>
            
            <Button icon={<ZoomInOutlined />} onClick={handleZoomIn}>
              放大
            </Button>
            
            <Button icon={<ZoomOutOutlined />} onClick={handleZoomOut}>
              缩小
            </Button>
            
            <Button icon={<ReloadOutlined />} onClick={loadGraphData}>
              刷新
            </Button>
            
            <Button icon={<FullscreenOutlined />} onClick={handleFullscreen}>
              {isFullscreen ? '退出全屏' : '全屏'}
            </Button>
          </Space>
        </div>

        {/* 参数调节 */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Text strong>连线距离: {linkDistance}</Text>
            <Slider
              min={50}
              max={200}
              value={linkDistance}
              onChange={setLinkDistance}
              className="mt-2"
            />
          </div>
          
          <div>
            <Text strong>节点大小: {nodeSize}</Text>
            <Slider
              min={1}
              max={10}
              value={nodeSize}
              onChange={setNodeSize}
              className="mt-2"
            />
          </div>
        </div>
      </Card>

      {/* 图谱可视化区域 */}
      <Card className={isFullscreen ? 'flex-1' : ''}>
        <Spin spinning={loading}>
          <div className={`relative ${isFullscreen ? 'h-full' : 'h-96'}`}>
            <svg
              ref={svgRef}
              width="100%"
              height="100%"
              className="border border-gray-200 rounded"
            />
            
            {/* 图例 */}
            <div className="absolute top-4 right-4 bg-white p-3 rounded shadow-md">
              <Title level={5} className="mb-2">图例</Title>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                  <Text>文档</Text>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 rounded-full bg-green-500"></div>
                  <Text>概念</Text>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 rounded-full bg-orange-500"></div>
                  <Text>实体</Text>
                </div>
              </div>
            </div>
          </div>
        </Spin>
      </Card>

      {/* 统计信息 */}
      {!isFullscreen && (
        <Card title="图谱统计">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {graphData.nodes.filter(n => n.type === 'document').length}
              </div>
              <div className="text-gray-500">文档节点</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {graphData.nodes.filter(n => n.type === 'concept').length}
              </div>
              <div className="text-gray-500">概念节点</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {graphData.nodes.filter(n => n.type === 'entity').length}
              </div>
              <div className="text-gray-500">实体节点</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {graphData.links.length}
              </div>
              <div className="text-gray-500">关系连线</div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};