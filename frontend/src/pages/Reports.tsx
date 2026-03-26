import React from 'react';
import { Typography, Card } from 'antd';
import { BarChartOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const Reports: React.FC = () => {
  return (
    <div className="placeholder-page">
      <Card style={{ textAlign: 'center', maxWidth: 400 }}>
        <BarChartOutlined style={{ fontSize: 64, color: '#E74C3C', marginBottom: 24 }} />
        <Title level={4}>数据报表</Title>
        <Text type="secondary">功能开发中，敬请期待...</Text>
        <br />
        <Text type="secondary" style={{ fontSize: 12, marginTop: 8, display: 'block' }}>
          将支持排品数据统计、趋势分析、导出报表等功能
        </Text>
      </Card>
    </div>
  );
};

export default Reports;
