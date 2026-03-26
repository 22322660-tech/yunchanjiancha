import React from 'react';
import { Typography, Card } from 'antd';
import { BulbOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const DemandPool: React.FC = () => {
  return (
    <div className="placeholder-page">
      <Card style={{ textAlign: 'center', maxWidth: 400 }}>
        <BulbOutlined style={{ fontSize: 64, color: '#F39C12', marginBottom: 24 }} />
        <Title level={4}>需求池</Title>
        <Text type="secondary">功能开发中，敬请期待...</Text>
        <br />
        <Text type="secondary" style={{ fontSize: 12, marginTop: 8, display: 'block' }}>
          将支持用户需求收集、分类管理、优先级排序等功能
        </Text>
      </Card>
    </div>
  );
};

export default DemandPool;
