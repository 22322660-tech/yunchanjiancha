import React from 'react';
import { Typography, Card } from 'antd';
import { SwapOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const CrossComparison: React.FC = () => {
  return (
    <div className="placeholder-page">
      <Card style={{ textAlign: 'center', maxWidth: 400 }}>
        <SwapOutlined style={{ fontSize: 64, color: '#E67E22', marginBottom: 24 }} />
        <Title level={4}>跨人对比</Title>
        <Text type="secondary">功能开发中，敬请期待...</Text>
        <br />
        <Text type="secondary" style={{ fontSize: 12, marginTop: 8, display: 'block' }}>
          将支持不同操盘手之间的排品效果对比分析
        </Text>
      </Card>
    </div>
  );
};

export default CrossComparison;
