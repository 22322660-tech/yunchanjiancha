import React, { useEffect, useState, useCallback } from 'react';
import {
  Table, Button, Tag, Segmented, Row, Col, message, Typography, Card, Space,
} from 'antd';
import { RocketOutlined, PlusCircleOutlined } from '@ant-design/icons';
import { useAppContext } from '../context/AppContext';
import { dashboardApi, schedulePlanApi } from '../api';
import { COLORS } from '../types';

const { Title, Text } = Typography;

interface RepushItem {
  product_id: number;
  product_name: string;
  product_type: string;
  last_schedule_date: string;
  gap_days: number;
  avg_orders: number;
  repush_score: number;
  suggested_date: string;
}

const productTypeColorMap: Record<string, string> = {
  '预告品': 'orange',
  '非预告品': 'blue',
  '备选品': 'default',
};

const RepushList: React.FC = () => {
  const { groupType, viewMode, currentOperator } = useAppContext();
  const [items, setItems] = useState<RepushItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState<string>('7天');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const daysMap: Record<string, number> = { '7天': 7, '14天': 14, '30天': 30 };
      const params: Record<string, string | number> = {
        group_type: groupType,
        days: daysMap[timeRange] || 7,
      };
      if (viewMode === '个人视图') params.operator = currentOperator;
      const res = await dashboardApi.repushSuggestions(params);
      const data = Array.isArray(res.data) ? res.data : res.data.items || [];
      setItems(data);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [groupType, viewMode, currentOperator, timeRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddToPlan = async (item: RepushItem) => {
    try {
      await schedulePlanApi.create({
        product_id: item.product_id,
        plan_date: item.suggested_date,
        time_slot: '上午',
        group_type: groupType,
        operator: viewMode === '个人视图' ? currentOperator : '',
        source: '复推采纳',
        status: '待审核',
      });
      message.success(`已将「${item.product_name}」加入排期`);
    } catch {
      message.error('加入排期失败');
    }
  };

  const columns = [
    {
      title: '商品名称',
      dataIndex: 'product_name',
      key: 'product_name',
      width: 180,
    },
    {
      title: '类型',
      dataIndex: 'product_type',
      key: 'product_type',
      width: 90,
      render: (val: string) => <Tag color={productTypeColorMap[val]}>{val}</Tag>,
    },
    {
      title: '上次排品日期',
      dataIndex: 'last_schedule_date',
      key: 'last_schedule_date',
      width: 120,
    },
    {
      title: '间隔天数',
      dataIndex: 'gap_days',
      key: 'gap_days',
      width: 80,
      render: (val: number) => (
        <Text style={{ color: val > 14 ? COLORS.warning : undefined, fontWeight: val > 14 ? 600 : 400 }}>
          {val}天
        </Text>
      ),
    },
    {
      title: '历史平均出单',
      dataIndex: 'avg_orders',
      key: 'avg_orders',
      width: 100,
      render: (val: number) => val ? val.toFixed(1) : '-',
    },
    {
      title: '复推评分',
      dataIndex: 'repush_score',
      key: 'repush_score',
      width: 90,
      sorter: (a: RepushItem, b: RepushItem) => b.repush_score - a.repush_score,
      render: (val: number) => (
        <Tag color={val >= 80 ? COLORS.hot : val >= 60 ? COLORS.preview : COLORS.inactive}>
          {val ? val.toFixed(0) : '-'}
        </Tag>
      ),
    },
    {
      title: '建议日期',
      dataIndex: 'suggested_date',
      key: 'suggested_date',
      width: 110,
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: unknown, record: RepushItem) => (
        <Button
          type="primary"
          size="small"
          icon={<PlusCircleOutlined />}
          onClick={() => handleAddToPlan(record)}
        >
          加入排期
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>
            <RocketOutlined style={{ marginRight: 8, color: COLORS.ai }} />
            复推清单
          </Title>
        </Col>
        <Col>
          <Space>
            <Text>时间范围:</Text>
            <Segmented
              options={['7天', '14天', '30天']}
              value={timeRange}
              onChange={(val) => setTimeRange(val as string)}
            />
          </Space>
        </Col>
      </Row>

      <Card>
        <Table
          columns={columns}
          dataSource={items.map((item, i) => ({ ...item, key: item.product_id || i }))}
          loading={loading}
          size="middle"
          pagination={{ pageSize: 20, showTotal: (t) => `共 ${t} 条建议` }}
          locale={{ emptyText: '暂无复推建议，请先导入历史排品数据' }}
        />
      </Card>
    </div>
  );
};

export default RepushList;
