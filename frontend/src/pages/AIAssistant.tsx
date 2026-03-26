import React from 'react';
import { Typography, Card } from 'antd';
import { RobotOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const AIAssistant: React.FC = () => {
  return (
    <div className="placeholder-page">
      <Card style={{ textAlign: 'center', maxWidth: 400 }}>
        <RobotOutlined style={{ fontSize: 64, color: '#8E44AD', marginBottom: 24 }} />
        <Title level={4}>AI智能助手</Title>
        <Text type="secondary">功能开发中，敬请期待...</Text>
        <br />
        <Text type="secondary" style={{ fontSize: 12, marginTop: 8, display: 'block' }}>
          将支持智能排品推荐、文案生成、销量预测等功能
        </Text>
      </Card>
    </div>
  );
};

export default AIAssistant;
