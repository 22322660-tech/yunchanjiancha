import React, { useEffect, useState, useCallback } from 'react';
import {
  Card, Button, Tag, Row, Col, message, Typography, Progress, Collapse, Space,
  Spin, Empty, Tooltip, Statistic,
} from 'antd';
import {
  HeartOutlined, ReloadOutlined, StarOutlined, FallOutlined,
  EyeInvisibleOutlined, StopOutlined, ArrowUpOutlined,
  ArrowDownOutlined, MinusOutlined, PlusCircleOutlined,
  RightOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAppContext } from '../context/AppContext';
import { dashboardApi, schedulePlanApi } from '../api';
import { COLORS } from '../types';

const { Title, Text } = Typography;

interface HealthProduct {
  product_id: number;
  product_name: string;
  category: string;
  product_type: string;
  health_score: number;
  trend: '上升' | '下降' | '平稳';
  avg_orders: number;
  last_schedule_date: string;
  gap_days: number;
  status?: string;
}

interface HealthData {
  star: HealthProduct[];
  declining: HealthProduct[];
  forgotten: HealthProduct[];
  eliminate: HealthProduct[];
}

const HEALTH_CATEGORIES = [
  {
    key: 'star' as const,
    label: '明星商品',
    color: '#27AE60',
    icon: <StarOutlined />,
    description: '表现优秀，持续复推',
  },
  {
    key: 'declining' as const,
    label: '效果递减',
    color: '#F39C12',
    icon: <FallOutlined />,
    description: '出单下滑，需要关注',
  },
  {
    key: 'forgotten' as const,
    label: '被遗漏',
    color: '#2E86C1',
    icon: <EyeInvisibleOutlined />,
    description: '超期未排，建议复推',
  },
  {
    key: 'eliminate' as const,
    label: '建议淘汰',
    color: '#E74C3C',
    icon: <StopOutlined />,
    description: '效果不佳，考虑淘汰',
  },
];

const trendIcon = (trend: string) => {
  if (trend === '上升') return <ArrowUpOutlined style={{ color: COLORS.healthy }} />;
  if (trend === '下降') return <ArrowDownOutlined style={{ color: COLORS.hot }} />;
  return <MinusOutlined style={{ color: COLORS.inactive }} />;
};

const trendColor = (trend: string) => {
  if (trend === '上升') return COLORS.healthy;
  if (trend === '下降') return COLORS.hot;
  return COLORS.inactive;
};

function ProductCard({
  item,
  categoryColor,
  onAddToPlan,
}: {
  item: HealthProduct;
  categoryColor: string;
  onAddToPlan: (item: HealthProduct) => void;
}) {
  return (
    <Card
      size="small"
      style={{ marginBottom: 8 }}
      bodyStyle={{ padding: '12px 16px' }}
    >
      <Row align="middle" gutter={16}>
        {/* Product name and tags */}
        <Col flex="1">
          <div style={{ marginBottom: 4 }}>
            <Text strong style={{ fontSize: 14 }}>{item.product_name}</Text>
          </div>
          <Space size={4}>
            <Tag>{item.category}</Tag>
            <Tag color={item.product_type === '预告品' ? 'orange' : item.product_type === '非预告品' ? 'blue' : 'default'}>
              {item.product_type}
            </Tag>
          </Space>
        </Col>

        {/* Health score */}
        <Col>
          <Tooltip title={`健康度评分: ${item.health_score}`}>
            <Progress
              type="circle"
              percent={item.health_score}
              size={52}
              strokeColor={categoryColor}
              format={(p) => <span style={{ fontSize: 12 }}>{p}</span>}
            />
          </Tooltip>
        </Col>

        {/* Trend */}
        <Col style={{ width: 70, textAlign: 'center' }}>
          <div>{trendIcon(item.trend)}</div>
          <Text style={{ fontSize: 11, color: trendColor(item.trend) }}>{item.trend}</Text>
        </Col>

        {/* Avg orders */}
        <Col style={{ width: 80, textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>{item.avg_orders?.toFixed(1) ?? '-'}</div>
          <Text type="secondary" style={{ fontSize: 10 }}>平均出单</Text>
        </Col>

        {/* Last date + gap */}
        <Col style={{ width: 110, textAlign: 'center' }}>
          <div style={{ fontSize: 12 }}>
            {item.last_schedule_date ? dayjs(item.last_schedule_date).format('MM/DD') : '-'}
          </div>
          <Text
            style={{
              fontSize: 11,
              color: item.gap_days > 14 ? COLORS.warning : undefined,
              fontWeight: item.gap_days > 14 ? 600 : 400,
            }}
          >
            {item.gap_days != null ? `${item.gap_days}天前` : '-'}
          </Text>
        </Col>

        {/* Actions */}
        <Col>
          <Space direction="vertical" size={4}>
            <Button
              type="primary"
              size="small"
              icon={<PlusCircleOutlined />}
              onClick={() => onAddToPlan(item)}
            >
              加入排期
            </Button>
            <Button
              size="small"
              icon={<RightOutlined />}
            >
              查看详情
            </Button>
          </Space>
        </Col>
      </Row>
    </Card>
  );
}

const HealthBoard: React.FC = () => {
  const { groupType } = useAppContext();
  const [data, setData] = useState<HealthData>({ star: [], declining: [], forgotten: [], eliminate: [] });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await dashboardApi.healthBoard({ group_type: groupType });
      const raw = res.data || {};
      setData({
        star: raw.star || raw.stars || [],
        declining: raw.declining || [],
        forgotten: raw.forgotten || [],
        eliminate: raw.eliminate || [],
      });
    } catch {
      setData({ star: [], declining: [], forgotten: [], eliminate: [] });
    } finally {
      setLoading(false);
    }
  }, [groupType]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await dashboardApi.healthUpdate();
      message.success('健康度数据已更新');
      await fetchData();
    } catch {
      message.error('更新失败');
    } finally {
      setRefreshing(false);
    }
  };

  const handleAddToPlan = async (item: HealthProduct) => {
    try {
      const suggestedDate = dayjs().add(1, 'day').format('YYYY-MM-DD');
      await schedulePlanApi.create({
        product_id: item.product_id,
        plan_date: suggestedDate,
        time_slot: '上午',
        group_type: groupType,
        operator: '',
        source: '手动排期',
        status: '待审核',
      });
      message.success(`已将「${item.product_name}」加入排期`);
    } catch {
      message.error('加入排期失败');
    }
  };

  const counts = {
    star: data.star.length,
    declining: data.declining.length,
    forgotten: data.forgotten.length,
    eliminate: data.eliminate.length,
  };

  const collapseItems = HEALTH_CATEGORIES.map((cat) => ({
    key: cat.key,
    label: (
      <Space>
        <span style={{ color: cat.color }}>{cat.icon}</span>
        <Text strong>{cat.label}</Text>
        <Tag color={cat.color}>{counts[cat.key]}</Tag>
        <Text type="secondary" style={{ fontSize: 12 }}>{cat.description}</Text>
      </Space>
    ),
    children: (
      <div>
        {data[cat.key].length === 0 ? (
          <Empty description="暂无数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          data[cat.key].map((item) => (
            <ProductCard
              key={item.product_id}
              item={item}
              categoryColor={cat.color}
              onAddToPlan={handleAddToPlan}
            />
          ))
        )}
      </div>
    ),
  }));

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>
            <HeartOutlined style={{ marginRight: 8, color: COLORS.healthy }} />
            商品健康度看板
          </Title>
        </Col>
        <Col>
          <Button
            icon={<ReloadOutlined spin={refreshing} />}
            onClick={handleRefresh}
            loading={refreshing}
          >
            刷新健康度
          </Button>
        </Col>
      </Row>

      {/* Summary cards */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        {HEALTH_CATEGORIES.map((cat) => (
          <Col key={cat.key} xs={12} sm={6}>
            <Card
              size="small"
              style={{ borderTop: `3px solid ${cat.color}` }}
              bodyStyle={{ textAlign: 'center', padding: '16px 12px' }}
            >
              <Statistic
                title={
                  <Space>
                    <span style={{ color: cat.color }}>{cat.icon}</span>
                    <span>{cat.label}</span>
                  </Space>
                }
                value={counts[cat.key]}
                valueStyle={{ color: cat.color, fontSize: 28 }}
                suffix="个"
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* Product lists by category */}
      <Spin spinning={loading}>
        <Collapse
          defaultActiveKey={['star', 'declining']}
          items={collapseItems}
        />
      </Spin>
    </div>
  );
};

export default HealthBoard;
