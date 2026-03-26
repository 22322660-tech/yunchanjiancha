import React, { useEffect, useState, useCallback } from 'react';
import {
  Table, Button, Modal, Form, Input, Select, DatePicker, Tag, Space, Row, Col,
  message, Typography, Card,
} from 'antd';
import { PlusOutlined, CalendarOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAppContext } from '../context/AppContext';
import { schedulePlanApi, productApi } from '../api';
import type { SchedulePlan, Product } from '../types';
import { COLORS, NEW_GROUP_OPERATORS, OLD_GROUP_OPERATORS } from '../types';

const { Title, Text } = Typography;

const sourceColorMap: Record<string, string> = {
  '手动排期': 'blue',
  '复推采纳': 'green',
  'AI自动生成': COLORS.ai,
};

const statusColorMap: Record<string, string> = {
  '待审核': 'processing',
  '已确认': 'success',
  '已执行': 'default',
  '已取消': 'error',
};

const SchedulePlanner: React.FC = () => {
  const { groupType, viewMode, currentOperator } = useAppContext();
  const [plans, setPlans] = useState<SchedulePlan[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const operators = groupType === '新群' ? NEW_GROUP_OPERATORS : OLD_GROUP_OPERATORS;

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { group_type: groupType };
      if (viewMode === '个人视图') params.operator = currentOperator;
      const res = await schedulePlanApi.list(params);
      const data = Array.isArray(res.data) ? res.data : res.data.items || [];
      setPlans(data);
    } catch {
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }, [groupType, viewMode, currentOperator]);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await productApi.list({ status: '在售' });
      const data = Array.isArray(res.data) ? res.data : res.data.items || [];
      setProducts(data);
    } catch {
      setProducts([]);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
    fetchProducts();
  }, [fetchPlans, fetchProducts]);

  const handleAdd = () => {
    form.resetFields();
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        ...values,
        plan_date: values.plan_date.format('YYYY-MM-DD'),
        source: '手动排期',
        status: '待审核',
        group_type: groupType,
      };
      await schedulePlanApi.create(payload);
      message.success('排期已添加');
      setModalOpen(false);
      fetchPlans();
    } catch {
      // validation error
    }
  };

  // Build weekly calendar grid
  const weekDays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  const buildWeeklyView = () => {
    const grouped: Record<string, SchedulePlan[]> = {};
    plans.forEach((p) => {
      const dayOfWeek = dayjs(p.plan_date).day();
      const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const key = weekDays[dayIndex];
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(p);
    });

    const columns = weekDays.map((day) => ({
      title: day,
      dataIndex: day,
      key: day,
      render: () => {
        const dayPlans = grouped[day] || [];
        if (dayPlans.length === 0) {
          return (
            <div style={{ minHeight: 80, padding: 4 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>空</Text>
            </div>
          );
        }
        return (
          <div style={{ minHeight: 80, padding: 4 }}>
            {dayPlans.map((p) => (
              <div
                key={p.id}
                style={{
                  marginBottom: 4,
                  padding: '4px 8px',
                  borderRadius: 4,
                  borderLeft: `3px solid ${sourceColorMap[p.source] || COLORS.afternoon}`,
                  background: '#fafafa',
                  fontSize: 12,
                }}
              >
                <div style={{ fontWeight: 500 }}>{p.product_name || `商品#${p.product_id}`}</div>
                <Space size={4}>
                  <Tag style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px' }} color={sourceColorMap[p.source]}>
                    {p.source}
                  </Tag>
                  <Text style={{ fontSize: 11 }}>{p.time_slot}</Text>
                </Space>
              </div>
            ))}
          </div>
        );
      },
    }));

    return (
      <Table
        columns={columns}
        dataSource={[
          { key: 'slot1' },
          { key: 'slot2' },
          { key: 'slot3' },
          { key: 'slot4' },
          { key: 'slot5' },
        ]}
        pagination={false}
        bordered
        size="small"
      />
    );
  };

  const planColumns = [
    { title: '日期', dataIndex: 'plan_date', key: 'plan_date', width: 100 },
    { title: '时段', dataIndex: 'time_slot', key: 'time_slot', width: 60 },
    {
      title: '商品名称',
      dataIndex: 'product_name',
      key: 'product_name',
      render: (val: string, record: SchedulePlan) => val || `商品#${record.product_id}`,
    },
    { title: '操盘手', dataIndex: 'operator', key: 'operator', width: 80 },
    {
      title: '来源',
      dataIndex: 'source',
      key: 'source',
      width: 100,
      render: (val: string) => <Tag color={sourceColorMap[val]}>{val}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (val: string) => <Tag color={statusColorMap[val]}>{val}</Tag>,
    },
    {
      title: 'AI文案',
      dataIndex: 'ai_copy',
      key: 'ai_copy',
      ellipsis: true,
      render: (val: string) => val ? <Text style={{ color: COLORS.ai }}>{val}</Text> : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: unknown, record: SchedulePlan) => (
        <Space size="small">
          {record.status === '待审核' && (
            <>
              <Button
                type="link"
                size="small"
                onClick={async () => {
                  try {
                    await schedulePlanApi.update(record.id, { status: '已确认' });
                    message.success('已确认');
                    fetchPlans();
                  } catch { /* ignore */ }
                }}
              >
                确认
              </Button>
              <Button
                type="link"
                size="small"
                danger
                onClick={async () => {
                  try {
                    await schedulePlanApi.update(record.id, { status: '已取消' });
                    message.info('已取消');
                    fetchPlans();
                  } catch { /* ignore */ }
                }}
              >
                取消
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>
            <CalendarOutlined style={{ marginRight: 8 }} />
            排期计划
          </Title>
        </Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            手动添加排期
          </Button>
        </Col>
      </Row>

      {/* Weekly calendar view */}
      <Card title="本周排期日历" style={{ marginBottom: 16 }}>
        {buildWeeklyView()}
      </Card>

      {/* Plan list */}
      <Card title="排期列表">
        <Table
          columns={planColumns}
          dataSource={plans.map((p) => ({ ...p, key: p.id }))}
          loading={loading}
          size="small"
          pagination={{ pageSize: 20 }}
          locale={{ emptyText: '暂无排期数据' }}
        />
      </Card>

      {/* Add plan modal */}
      <Modal
        title="手动添加排期"
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="product_id" label="商品" rules={[{ required: true, message: '请选择商品' }]}>
            <Select
              showSearch
              placeholder="搜索并选择商品"
              optionFilterProp="label"
              options={products.map((p) => ({ label: `${p.name} (${p.brand})`, value: p.id }))}
            />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="plan_date" label="排期日期" rules={[{ required: true, message: '请选择日期' }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="time_slot" label="时段" rules={[{ required: true }]}>
                <Select options={[{ label: '上午', value: '上午' }, { label: '下午', value: '下午' }]} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="operator" label="操盘手" rules={[{ required: true }]}>
            <Select options={operators.map((o) => ({ label: o, value: o }))} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SchedulePlanner;
