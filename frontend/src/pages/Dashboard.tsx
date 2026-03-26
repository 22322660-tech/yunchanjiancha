import React, { useEffect, useState } from 'react';
import { Card, Col, Row, Statistic, Table, Tag, List, Typography, Spin, Progress } from 'antd';
import {
  CalendarOutlined,
  FireOutlined,
  AlertOutlined,
  RocketOutlined,
  AuditOutlined,
} from '@ant-design/icons';
import { useAppContext } from '../context/AppContext';
import { dashboardApi } from '../api';
import { COLORS } from '../types';

const { Title, Text } = Typography;

interface StatsData {
  weekly_schedule_count: number;
  pending_days: number;
  repush_pending: number;
  hot_rate: number;
  pending_review: number;
}

interface RepushItem {
  product_name: string;
  product_type: string;
  last_schedule_date: string;
  gap_days: number;
  avg_orders: number;
  score: number;
}

interface TopProduct {
  product_name: string;
  total_orders: number;
  total_gmv: number;
  avg_performance: string;
}

interface HealthWarning {
  type: string;
  count: number;
  products: string[];
}

const Dashboard: React.FC = () => {
  const { groupType, viewMode, currentOperator } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<StatsData>({
    weekly_schedule_count: 0,
    pending_days: 0,
    repush_pending: 0,
    hot_rate: 0,
    pending_review: 0,
  });
  const [repushList, setRepushList] = useState<RepushItem[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [healthWarnings, setHealthWarnings] = useState<HealthWarning[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const params: Record<string, string> = { group_type: groupType };
        if (viewMode === '个人视图') params.operator = currentOperator;

        const [statsRes, repushRes] = await Promise.all([
          dashboardApi.stats(params).catch(() => null),
          dashboardApi.repushSuggestions(params).catch(() => null),
        ]);

        if (statsRes?.data) {
          setStats(statsRes.data.stats || statsRes.data);
          if (statsRes.data.top_products) setTopProducts(statsRes.data.top_products);
          if (statsRes.data.health_warnings) setHealthWarnings(statsRes.data.health_warnings);
        }
        if (repushRes?.data) {
          const items = Array.isArray(repushRes.data) ? repushRes.data : repushRes.data.items || [];
          setRepushList(items.slice(0, 5));
        }
      } catch {
        // API not available yet, use empty data
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [groupType, viewMode, currentOperator]);

  const weekDays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  const calendarColumns = weekDays.map((day) => ({
    title: day,
    dataIndex: day,
    key: day,
    render: () => (
      <div style={{ minHeight: 60, background: '#fafafa', borderRadius: 4, padding: 4 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>暂无排品</Text>
      </div>
    ),
  }));

  const topColumns = [
    { title: '商品名称', dataIndex: 'product_name', key: 'product_name' },
    { title: '总出单', dataIndex: 'total_orders', key: 'total_orders' },
    {
      title: '总GMV',
      dataIndex: 'total_gmv',
      key: 'total_gmv',
      render: (v: number) => v ? `¥${v.toFixed(0)}` : '-',
    },
    {
      title: '表现',
      dataIndex: 'avg_performance',
      key: 'avg_performance',
      render: (v: string) => {
        const colorMap: Record<string, string> = {
          '爆款': COLORS.hot,
          '正常': COLORS.healthy,
          '一般': COLORS.inactive,
          '销量下降': COLORS.warning,
          '很差': COLORS.inactive,
        };
        return <Tag color={colorMap[v] || undefined}>{v || '-'}</Tag>;
      },
    },
  ];

  return (
    <Spin spinning={loading}>
      <div style={{ padding: '0 0 24px' }}>
        <Title level={4} style={{ marginBottom: 16 }}>仪表盘</Title>

        {/* Stats cards */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={5}>
            <Card>
              <Statistic
                title="本周排品数"
                value={stats.weekly_schedule_count}
                prefix={<CalendarOutlined style={{ color: COLORS.preview }} />}
              />
            </Card>
          </Col>
          <Col span={5}>
            <Card>
              <Statistic
                title="待排品天数"
                value={stats.pending_days}
                prefix={<AlertOutlined style={{ color: COLORS.warning }} />}
                valueStyle={stats.pending_days > 0 ? { color: COLORS.warning } : undefined}
              />
            </Card>
          </Col>
          <Col span={5}>
            <Card>
              <Statistic
                title="复推建议待处理"
                value={stats.repush_pending}
                prefix={<RocketOutlined style={{ color: COLORS.ai }} />}
              />
            </Card>
          </Col>
          <Col span={5}>
            <Card>
              <Statistic
                title="本周爆品率"
                value={stats.hot_rate}
                suffix="%"
                prefix={<FireOutlined style={{ color: COLORS.hot }} />}
                valueStyle={{ color: stats.hot_rate > 20 ? COLORS.hot : undefined }}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card>
              <Statistic
                title="待审核选品"
                value={stats.pending_review}
                prefix={<AuditOutlined style={{ color: COLORS.afternoon }} />}
              />
            </Card>
          </Col>
        </Row>

        {/* Weekly calendar */}
        <Card title="本周排品日历" style={{ marginBottom: 24 }}>
          <Table
            columns={calendarColumns}
            dataSource={[
              { key: 'slot1' },
              { key: 'slot2' },
              { key: 'slot3' },
              { key: 'slot4' },
            ]}
            pagination={false}
            bordered
            size="small"
          />
        </Card>

        <Row gutter={16}>
          {/* Repush reminders */}
          <Col span={12}>
            <Card title="复推提醒" style={{ marginBottom: 24 }}>
              {repushList.length > 0 ? (
                <List
                  dataSource={repushList}
                  renderItem={(item) => (
                    <List.Item>
                      <List.Item.Meta
                        title={item.product_name}
                        description={`上次排品: ${item.last_schedule_date} | 间隔: ${item.gap_days}天 | 历史平均出单: ${item.avg_orders}`}
                      />
                      <Tag color={COLORS.ai}>评分: {item.score}</Tag>
                    </List.Item>
                  )}
                />
              ) : (
                <Text type="secondary">暂无复推建议数据</Text>
              )}
            </Card>
          </Col>

          {/* Health warnings */}
          <Col span={12}>
            <Card title="商品健康度警告" style={{ marginBottom: 24 }}>
              {healthWarnings.length > 0 ? (
                <Row gutter={[8, 8]}>
                  {healthWarnings.map((w, i) => (
                    <Col span={8} key={i}>
                      <Card size="small" style={{ borderLeft: `3px solid ${COLORS.warning}` }}>
                        <Statistic title={w.type} value={w.count} suffix="件" />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {w.products?.slice(0, 2).join(', ')}
                        </Text>
                      </Card>
                    </Col>
                  ))}
                </Row>
              ) : (
                <Row gutter={[8, 8]}>
                  {['效果递减', '建议淘汰', '被遗漏'].map((label) => (
                    <Col span={8} key={label}>
                      <Card size="small" style={{ borderLeft: `3px solid ${COLORS.inactive}` }}>
                        <Statistic title={label} value={0} suffix="件" />
                        <Text type="secondary" style={{ fontSize: 12 }}>暂无数据</Text>
                      </Card>
                    </Col>
                  ))}
                </Row>
              )}
            </Card>
          </Col>
        </Row>

        {/* Top 5 */}
        <Card title="近期表现TOP5">
          <Table
            columns={topColumns}
            dataSource={topProducts.length > 0 ? topProducts.map((p, i) => ({ ...p, key: i })) : []}
            pagination={false}
            size="small"
            locale={{ emptyText: '暂无数据，请先导入历史排品记录' }}
          />
        </Card>
      </div>
    </Spin>
  );
};

export default Dashboard;
