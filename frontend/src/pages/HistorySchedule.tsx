import React, { useEffect, useState, useCallback } from 'react';
import {
  Tabs, Upload, Button, Table, Tag, DatePicker, Select, Row, Col, message,
  Typography, Space, Card,
} from 'antd';
import { InboxOutlined, UploadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { useAppContext } from '../context/AppContext';
import { scheduleRecordApi, importApi } from '../api';
import type { ScheduleRecord } from '../types';
import { COLORS, PERFORMANCE_TAGS, NEW_GROUP_OPERATORS, OLD_GROUP_OPERATORS } from '../types';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Dragger } = Upload;

const perfColorMap: Record<string, string> = {
  '爆款': COLORS.hot,
  '正常': COLORS.healthy,
  '一般': COLORS.inactive,
  '销量下降': COLORS.warning,
  '很差': COLORS.inactive,
};

const productTypeColorMap: Record<string, string> = {
  '预告品': 'orange',
  '非预告品': 'blue',
  '备选品': 'default',
};

const HistorySchedule: React.FC = () => {
  const { groupType, viewMode, currentOperator } = useAppContext();
  const [activeTab, setActiveTab] = useState('import');
  const [records, setRecords] = useState<ScheduleRecord[]>([]);
  const [loading, setLoading] = useState(false);

  // Import state
  const [previewData, setPreviewData] = useState<Record<string, unknown>[]>([]);
  const [importOperator, setImportOperator] = useState<string>('');

  // Filter state
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [filterOperator, setFilterOperator] = useState<string | undefined>();
  const [filterPerf, setFilterPerf] = useState<string | undefined>();

  const operators = groupType === '新群' ? NEW_GROUP_OPERATORS : OLD_GROUP_OPERATORS;

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { group_type: groupType };
      if (viewMode === '个人视图') params.operator = currentOperator;
      if (filterOperator) params.operator = filterOperator;
      if (filterPerf) params.performance_tag = filterPerf;
      if (dateRange) {
        params.start_date = dateRange[0].format('YYYY-MM-DD');
        params.end_date = dateRange[1].format('YYYY-MM-DD');
      }
      const res = await scheduleRecordApi.list(params);
      const data = Array.isArray(res.data) ? res.data : res.data.items || [];
      setRecords(data);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [groupType, viewMode, currentOperator, filterOperator, filterPerf, dateRange]);

  useEffect(() => {
    if (activeTab === 'view') {
      fetchRecords();
    }
  }, [activeTab, fetchRecords]);

  const handleUpload = async (file: File) => {
    try {
      const res = await importApi.upload(file, importOperator || undefined);
      if (res.data?.preview) {
        setPreviewData(res.data.preview);
        message.success(`解析成功，共 ${res.data.preview.length} 条记录`);
      } else {
        message.info('文件已上传');
      }
    } catch {
      message.error('上传失败，请检查文件格式');
    }
    return false; // prevent default upload
  };

  const handleConfirmImport = async () => {
    try {
      await importApi.confirm({ records: previewData, operator: importOperator });
      message.success('导入成功');
      setPreviewData([]);
    } catch {
      message.error('导入失败');
    }
  };

  // Build weekly grid view from records
  const buildWeeklyGrid = () => {
    const weekDays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    const grouped: Record<string, ScheduleRecord[]> = {};

    records.forEach((r) => {
      const dayOfWeek = dayjs(r.schedule_date).day();
      const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const key = weekDays[dayIndex];
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(r);
    });

    const columns = weekDays.map((day) => ({
      title: day,
      dataIndex: day,
      key: day,
      width: `${100 / 7}%`,
      render: () => {
        const dayRecords = grouped[day] || [];
        if (dayRecords.length === 0) {
          return (
            <div className="schedule-cell">
              <Text type="secondary" style={{ fontSize: 12 }}>暂无</Text>
            </div>
          );
        }
        return (
          <div className="schedule-cell">
            {dayRecords.map((r) => (
              <div
                key={r.id}
                className={`product-card perf-${r.performance_tag === '爆款' ? 'hot' : r.performance_tag === '正常' ? 'normal' : r.performance_tag === '销量下降' ? 'declining' : 'average'}`}
              >
                <div style={{ fontWeight: 500 }}>{r.product_name || `商品#${r.product_id}`}</div>
                <Space size={4}>
                  <Tag color={perfColorMap[r.performance_tag]} style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px' }}>
                    {r.performance_tag}
                  </Tag>
                  <Text style={{ fontSize: 11 }}>{r.order_count}单</Text>
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
        dataSource={[{ key: 'row1' }, { key: 'row2' }, { key: 'row3' }, { key: 'row4' }, { key: 'row5' }]}
        pagination={false}
        bordered
        size="small"
      />
    );
  };

  const recordColumns = [
    { title: '日期', dataIndex: 'schedule_date', key: 'schedule_date', width: 100 },
    { title: '时段', dataIndex: 'time_slot', key: 'time_slot', width: 60 },
    {
      title: '商品名称',
      dataIndex: 'product_name',
      key: 'product_name',
      width: 160,
      render: (val: string, record: ScheduleRecord) => val || `商品#${record.product_id}`,
    },
    { title: '操盘手', dataIndex: 'operator', key: 'operator', width: 80 },
    { title: '出单数', dataIndex: 'order_count', key: 'order_count', width: 70 },
    {
      title: 'GMV',
      dataIndex: 'gmv',
      key: 'gmv',
      width: 90,
      render: (val: number) => val ? `¥${val.toFixed(0)}` : '-',
    },
    {
      title: '表现',
      dataIndex: 'performance_tag',
      key: 'performance_tag',
      width: 80,
      render: (val: string) => <Tag color={perfColorMap[val]}>{val}</Tag>,
    },
    { title: '反馈', dataIndex: 'feedback_text', key: 'feedback_text', ellipsis: true },
  ];

  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}>历史排品</Title>
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={[
        {
          key: 'import',
          label: '数据导入',
          children: (
            <div>
              <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col>
                  <Select
                    placeholder="选择操盘手"
                    style={{ width: 150 }}
                    value={importOperator || undefined}
                    onChange={setImportOperator}
                    allowClear
                    options={operators.map((o) => ({ label: o, value: o }))}
                  />
                </Col>
              </Row>
              <Dragger
                accept=".xlsx,.xls,.csv"
                showUploadList={false}
                beforeUpload={(file) => {
                  handleUpload(file);
                  return false;
                }}
                style={{ marginBottom: 24 }}
              >
                <p className="ant-upload-drag-icon">
                  <InboxOutlined />
                </p>
                <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
                <p className="ant-upload-hint">支持 .xlsx, .xls, .csv 格式的排品记录文件</p>
              </Dragger>

              {previewData.length > 0 && (
                <Card title={`预览数据 (${previewData.length} 条)`} style={{ marginTop: 16 }}>
                  <Table
                    dataSource={previewData.map((r, i) => ({ ...r, key: i }))}
                    columns={[
                      { title: '日期', dataIndex: 'schedule_date', key: 'schedule_date' },
                      { title: '商品', dataIndex: 'product_name', key: 'product_name' },
                      { title: '时段', dataIndex: 'time_slot', key: 'time_slot' },
                      { title: '出单数', dataIndex: 'order_count', key: 'order_count' },
                      {
                        title: '表现',
                        dataIndex: 'performance_tag',
                        key: 'performance_tag',
                        render: (val: string) => <Tag color={perfColorMap[val]}>{val}</Tag>,
                      },
                    ]}
                    size="small"
                    pagination={{ pageSize: 10 }}
                  />
                  <Row justify="end" style={{ marginTop: 12 }}>
                    <Button type="primary" icon={<UploadOutlined />} onClick={handleConfirmImport}>
                      确认导入
                    </Button>
                  </Row>
                </Card>
              )}
            </div>
          ),
        },
        {
          key: 'view',
          label: '历史查看',
          children: (
            <div>
              <Row gutter={12} style={{ marginBottom: 16 }}>
                <Col>
                  <RangePicker
                    value={dateRange as [Dayjs, Dayjs] | undefined}
                    onChange={(vals) => setDateRange(vals as [Dayjs, Dayjs] | null)}
                  />
                </Col>
                <Col>
                  <Select
                    placeholder="操盘手"
                    allowClear
                    style={{ width: 120 }}
                    value={filterOperator}
                    onChange={setFilterOperator}
                    options={operators.map((o) => ({ label: o, value: o }))}
                  />
                </Col>
                <Col>
                  <Select
                    placeholder="表现"
                    allowClear
                    style={{ width: 120 }}
                    value={filterPerf}
                    onChange={setFilterPerf}
                    options={PERFORMANCE_TAGS.map((t) => ({ label: t, value: t }))}
                  />
                </Col>
                <Col>
                  <Button type="primary" onClick={fetchRecords}>查询</Button>
                </Col>
              </Row>

              {/* Weekly grid view */}
              <Card title="周视图" style={{ marginBottom: 16 }}>
                {buildWeeklyGrid()}
              </Card>

              {/* Table view */}
              <Card title="详细记录">
                <Table
                  columns={recordColumns}
                  dataSource={records.map((r) => ({ ...r, key: r.id }))}
                  loading={loading}
                  size="small"
                  pagination={{ pageSize: 20 }}
                  locale={{ emptyText: '暂无历史排品数据' }}
                />
              </Card>
            </div>
          ),
        },
      ]} />
    </div>
  );
};

export default HistorySchedule;
