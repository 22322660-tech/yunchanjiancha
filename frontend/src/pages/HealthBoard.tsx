import React from 'react';
import { Typography, Card } from 'antd';
import { HeartOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const HealthBoard: React.FC = () => {
  return (
    <div className="placeholder-page">
      <Card style={{ textAlign: 'center', maxWidth: 400 }}>
        <HeartOutlined style={{ fontSize: 64, color: '#27AE60', marginBottom: 24 }} />
        <Title level={4}>商品健康度看板</Title>
        <Text type="secondary">功能开发中，敬请期待...</Text>
        <br />
        <Text type="secondary" style={{ fontSize: 12, marginTop: 8, display: 'block' }}>
          将展示商品效果趋势、健康度评分、淘汰预警等数据
        </Text>
      </Card>
    </div>
  );
};

export default HealthBoard;
