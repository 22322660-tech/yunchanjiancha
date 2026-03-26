import React from 'react';
import { Typography, Card } from 'antd';
import { FileSearchOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const ProductSubmissions: React.FC = () => {
  return (
    <div className="placeholder-page">
      <Card style={{ textAlign: 'center', maxWidth: 400 }}>
        <FileSearchOutlined style={{ fontSize: 64, color: '#2E86C1', marginBottom: 24 }} />
        <Title level={4}>选品工作流</Title>
        <Text type="secondary">功能开发中，敬请期待...</Text>
        <br />
        <Text type="secondary" style={{ fontSize: 12, marginTop: 8, display: 'block' }}>
          将支持选品提报、审核流程、品牌方对接等功能
        </Text>
      </Card>
    </div>
  );
};

export default ProductSubmissions;
