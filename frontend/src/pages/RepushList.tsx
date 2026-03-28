import React, { useEffect, useState, useCallback } from 'react';
import {
  Table, Button, Tag, Segmented, Row, Col, message, Typography, Card, Space,
  Tooltip, Progress, Badge,
} from 'antd';
import { RocketOutlined, PlusCircleOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useAppContext } from '../context/AppContext';
import { dashboardApi, schedulePlanApi } from '../api';
import { COLORS } from '../types';
import type { TableRowSelection } from 'antd/es/table/interface';

const { Title, Text } = Typography;

interface RepushItem {
  product_id: number;
  product_name: string;
  category: string;
  product_type: string;
  last_schedule_date: string;
  gap_days: number;
  repurchase_cycle: number;
  avg_orders: number;
  repush_score: number;
  total_score: number;
  performance_score: number;
  cycle_score: number;
  type_score: number;
  season_score: number;
  suggested_date: string;
  already_planned: boolean;
}

const productTypeColorMap: Record<string, string> = {
  '预告品': COLORS.preview,
  '非预告品': COLORS.afternoon,
  '备选品': COLORS.inactive,
};

const scoreColor = (score: number) => {
  if (score >= 80) return COLORS.hot;
  if (score >= 60) return COLORS.preview;
  if (score >= 40) return COLORS.warning;
  return COLORS.inactive;
};

function ScoreBreakdown({
  performance,
  cycle,
  type,
  season,
}: {
  performance: number;
  cycle: number;
  type: number;
  season: number;
}) {
  const items = [
    { label: '表现分', value: performance, color: '#1890ff' },
    { label: '周期分', value: cycle, color: '#52c41a' },
    { label: '类型分', value: type, color: '#722ed1' },
    { label: '季节分', value: season, color: '#fa8c16' },
  ];

  return (
    <div style={{ minWidth: 160 }}>
      {items.map((item) => (
        <div key={item.label} style={{ marginBottom: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
            <Text style={{ fontSize: 11 }}>{item.label}</Text>
            <Text style={{ fontSize: 11, fontWeight: 500 }}>{item.value ?? 0}</Text>
          </div>
          <Progress
            percent={item.value ?? 0}
            size="small"
            strokeColor={item.color}
            showInfo={false}
            style={{ margin: 0 }}
          />
        </div>
      ))}
    </div>
  );
}

const RepushList: React.FC = () => {
  const { groupType, viewMode, currentOperator } = useAppContext();
  const [items, setItems] = useState<RepushItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState<string>('7天');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

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
      fetchData();
    } catch {
      message.error('加入排期失败');
    }
  };

  const handleBatchAdd = async () => {
    const selected = items.filter(
      (item) => selectedRowKeys.includes(item.product_id) && !item.already_planned
    );
    if (selected.length === 0) {
      message.warning('请选择未排期的商品');
      return;
    }

    let successCount = 0;
    for (const item of selected) {
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
        successCount++;
      } catch {
        // continue with others
      }
    }
    message.success(`已将 ${successCount} 个商品加入排期`);
    setSelectedRowKeys([]);
    fetchData();
  };

  const columns = [
    {
      title: '商品名称',
      dataIndex: 'product_name',
      key: 'product_name',
      width: 160,
      fixed: 'left' as const,
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 80,
      render: (val: string) => <Tag>{val || '-'}</Tag>,
    },
    {
      title: '类型',
      dataIndex: 'product_type',
      key: 'product_type',
      width: 90,
      render: (val: string) => (
        <Tag color={productTypeColorMap[val] ?? 'default'}>{val}</Tag>
      ),
    },
    {
      title: '上次排品日期',
      dataIndex: 'last_schedule_date',
      key: 'last_schedule_date',
      width: 110,
    },
    {
      title: '间隔天数',
      dataIndex: 'gap_days',
      key: 'gap_days',
      width: 90,
      sorter: (a: RepushItem, b: RepushItem) => a.gap_days - b.gap_days,
      render: (val: number, record: RepushItem) => {
        const overCycle = record.repurchase_cycle > 0 && val > record.repurchase_cycle;
        return (
          <Text
            style={{
              color: overCycle ? COLORS.hot : val > 14 ? COLORS.warning : undefined,
              fontWeight: overCycle ? 700 : val > 14 ? 600 : 400,
            }}
          >
            {val}天
            {overCycle && (
              <Tooltip title={`超出复推周期 ${record.repurchase_cycle}天`}>
                <span style={{ marginLeft: 4, color: COLORS.hot }}>!</span>
              </Tooltip>
            )}
          </Text>
        );
      },
    },
    {
      title: '历史平均出单',
      dataIndex: 'avg_orders',
      key: 'avg_orders',
      width: 100,
      sorter: (a: RepushItem, b: RepushItem) => (a.avg_orders ?? 0) - (b.avg_orders ?? 0),
      render: (val: number) => (val != null ? val.toFixed(1) : '-'),
    },
    {
      title: (
        <Space size={4}>
          复推评分
          <Tooltip title="综合表现分、周期分、类型分、季节分的加权评分">
            <InfoCircleOutlined style={{ fontSize: 12 }} />
          </Tooltip>
        </Space>
      ),
      dataIndex: 'total_score',
      key: 'total_score',
      width: 100,
      sorter: (a: RepushItem, b: RepushItem) =>
        (b.total_score ?? b.repush_score ?? 0) - (a.total_score ?? a.repush_score ?? 0),
      defaultSortOrder: 'ascend' as const,
      render: (val: number, record: RepushItem) => {
        const score = val ?? record.repush_score ?? 0;
        return (
          <Tooltip
            title={
              <ScoreBreakdown
                performance={record.performance_score ?? 0}
                cycle={record.cycle_score ?? 0}
                type={record.type_score ?? 0}
                season={record.season_score ?? 0}
              />
            }
            overlayStyle={{ maxWidth: 220 }}
          >
            <Tag color={scoreColor(score)} style={{ cursor: 'pointer', fontWeight: 600 }}>
              {score ? score.toFixed(0) : '-'}
            </Tag>
          </Tooltip>
        );
      },
    },
    {
      title: '建议日期',
      dataIndex: 'suggested_date',
      key: 'suggested_date',
      width: 110,
    },
    {
      title: '状态',
      key: 'status',
      width: 80,
      render: (_: unknown, record: RepushItem) =>
        record.already_planned ? (
          <Badge status="success" text={<Text style={{ fontSize: 12 }}>已排期</Text>} />
        ) : (
          <Badge status="default" text={<Text type="secondary" style={{ fontSize: 12 }}>未排期</Text>} />
        ),
    },
    {
      title: '操作',
      key: 'action',
      width: 110,
      fixed: 'right' as const,
      render: (_: unknown, record: RepushItem) => (
        <Button
          type="primary"
          size="small"
          icon={<PlusCircleOutlined />}
          onClick={() => handleAddToPlan(record)}
          disabled={record.already_planned}
        >
          加入排期
        </Button>
      ),
    },
  ];

  const rowSelection: TableRowSelection<RepushItem> = {
    selectedRowKeys,
    onChange: (keys) => setSelectedRowKeys(keys),
    getCheckboxProps: (record) => ({
      disabled: record.already_planned,
    }),
  };

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
            {selectedRowKeys.length > 0 && (
              <Button
                type="primary"
                icon={<PlusCircleOutlined />}
                onClick={handleBatchAdd}
              >
                批量加入排期 ({selectedRowKeys.length})
              </Button>
            )}
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
          rowSelection={rowSelection}
          scroll={{ x: 1100 }}
          pagination={{ pageSize: 20, showTotal: (t) => `共 ${t} 条建议` }}
          locale={{ emptyText: '暂无复推建议，请先导入历史排品数据' }}
        />
      </Card>
    </div>
  );
};

export default RepushList;
