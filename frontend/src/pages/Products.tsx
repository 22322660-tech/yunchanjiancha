import React, { useEffect, useState, useCallback } from 'react';
import {
  Table, Button, Modal, Form, Input, Select, InputNumber, Tag, Space, Progress,
  Row, Col, Popconfirm, message, Typography,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { productApi } from '../api';
import type { Product } from '../types';
import { CATEGORIES, COLORS } from '../types';

const { Title } = Typography;

const productTypeOptions = [
  { label: '预告品', value: '预告品' },
  { label: '非预告品', value: '非预告品' },
  { label: '备选品', value: '备选品' },
];

const statusOptions = [
  { label: '在售', value: '在售' },
  { label: '下架', value: '下架' },
  { label: '待上架', value: '待上架' },
];

const productTypeColorMap: Record<string, string> = {
  '预告品': 'orange',
  '非预告品': 'blue',
  '备选品': 'default',
};

const Products: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form] = Form.useForm();

  // Filters
  const [filterCategory, setFilterCategory] = useState<string | undefined>();
  const [filterType, setFilterType] = useState<string | undefined>();
  const [filterStatus, setFilterStatus] = useState<string | undefined>();
  const [keyword, setKeyword] = useState('');

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filterCategory) params.category = filterCategory;
      if (filterType) params.product_type = filterType;
      if (filterStatus) params.status = filterStatus;
      if (keyword) params.keyword = keyword;
      const res = await productApi.list(params);
      const data = Array.isArray(res.data) ? res.data : res.data.items || [];
      setProducts(data);
    } catch {
      // API not available
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [filterCategory, filterType, filterStatus, keyword]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleAdd = () => {
    setEditingProduct(null);
    form.resetFields();
    setModalOpen(true);
  };

  const handleEdit = (record: Product) => {
    setEditingProduct(record);
    form.setFieldsValue(record);
    setModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await productApi.delete(id);
      message.success('删除成功');
      fetchProducts();
    } catch {
      message.error('删除失败');
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (editingProduct) {
        await productApi.update(editingProduct.id, values);
        message.success('更新成功');
      } else {
        await productApi.create(values);
        message.success('添加成功');
      }
      setModalOpen(false);
      fetchProducts();
    } catch {
      // validation or API error
    }
  };

  const columns = [
    {
      title: '商品名称',
      dataIndex: 'name',
      key: 'name',
      width: 160,
      ellipsis: true,
    },
    {
      title: '品牌',
      dataIndex: 'brand',
      key: 'brand',
      width: 100,
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 80,
    },
    {
      title: '类型',
      dataIndex: 'product_type',
      key: 'product_type',
      width: 90,
      render: (val: string) => (
        <Tag color={productTypeColorMap[val] || 'default'}>{val}</Tag>
      ),
    },
    {
      title: '适用月龄',
      dataIndex: 'target_age_range',
      key: 'target_age_range',
      width: 90,
    },
    {
      title: '季节',
      dataIndex: 'season_tag',
      key: 'season_tag',
      width: 70,
    },
    {
      title: '复推周期',
      dataIndex: 'repurchase_cycle',
      key: 'repurchase_cycle',
      width: 80,
      render: (val: number) => val ? `${val}天` : '-',
    },
    {
      title: '佣金',
      dataIndex: 'commission_rate',
      key: 'commission_rate',
      width: 70,
      render: (val: number) => val ? `${val}%` : '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (val: string) => {
        const colorMap: Record<string, string> = {
          '在售': 'green',
          '下架': 'default',
          '待上架': 'processing',
        };
        return <Tag color={colorMap[val] || 'default'}>{val}</Tag>;
      },
    },
    {
      title: '健康度',
      dataIndex: 'health_score',
      key: 'health_score',
      width: 120,
      render: (val: number) => {
        let color = COLORS.healthy;
        if (val < 40) color = COLORS.hot;
        else if (val < 70) color = COLORS.warning;
        return <Progress percent={val || 0} size="small" strokeColor={color} />;
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: unknown, record: Product) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm title="确认删除?" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>商品库</Title>
        </Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            添加商品
          </Button>
        </Col>
      </Row>

      {/* Filter bar */}
      <Row gutter={12} style={{ marginBottom: 16 }}>
        <Col>
          <Select
            placeholder="分类"
            allowClear
            style={{ width: 120 }}
            value={filterCategory}
            onChange={setFilterCategory}
            options={CATEGORIES.map((c) => ({ label: c, value: c }))}
          />
        </Col>
        <Col>
          <Select
            placeholder="类型"
            allowClear
            style={{ width: 120 }}
            value={filterType}
            onChange={setFilterType}
            options={productTypeOptions}
          />
        </Col>
        <Col>
          <Select
            placeholder="状态"
            allowClear
            style={{ width: 120 }}
            value={filterStatus}
            onChange={setFilterStatus}
            options={statusOptions}
          />
        </Col>
        <Col>
          <Input
            placeholder="搜索商品名称"
            prefix={<SearchOutlined />}
            style={{ width: 200 }}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onPressEnter={fetchProducts}
            allowClear
          />
        </Col>
      </Row>

      <Table
        columns={columns}
        dataSource={products.map((p) => ({ ...p, key: p.id }))}
        loading={loading}
        size="middle"
        pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t) => `共 ${t} 件商品` }}
        scroll={{ x: 1100 }}
        locale={{ emptyText: '暂无商品数据' }}
      />

      {/* Add/Edit Modal */}
      <Modal
        title={editingProduct ? '编辑商品' : '添加商品'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        width={640}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="商品名称" rules={[{ required: true, message: '请输入商品名称' }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="brand" label="品牌" rules={[{ required: true, message: '请输入品牌' }]}>
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="category" label="分类" rules={[{ required: true }]}>
                <Select options={CATEGORIES.map((c) => ({ label: c, value: c }))} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="product_type" label="类型" rules={[{ required: true }]}>
                <Select options={productTypeOptions} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="status" label="状态" initialValue="在售">
                <Select options={statusOptions} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="target_age_range" label="适用月龄">
                <Input placeholder="例: 0-6个月" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="season_tag" label="季节标签">
                <Select
                  allowClear
                  options={[
                    { label: '春', value: '春' },
                    { label: '夏', value: '夏' },
                    { label: '秋', value: '秋' },
                    { label: '冬', value: '冬' },
                    { label: '四季', value: '四季' },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="repurchase_cycle" label="复推周期(天)">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="commission_rate" label="佣金率(%)">
                <InputNumber min={0} max={100} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="health_score" label="健康度评分">
                <InputNumber min={0} max={100} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default Products;
