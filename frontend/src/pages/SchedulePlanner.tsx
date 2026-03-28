import React, { useEffect, useState, useCallback } from 'react';
import {
  Card, Button, Input, Tag, Space, Row, Col, message, Typography, Modal,
  Select, Badge, Tooltip, Empty,
} from 'antd';
import {
  CalendarOutlined, LeftOutlined, RightOutlined,
  WarningOutlined, CheckOutlined, CloseOutlined, SearchOutlined,
} from '@ant-design/icons';
import {
  DndContext, useDraggable, useDroppable, DragOverlay,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import dayjs from 'dayjs';
import { useAppContext } from '../context/AppContext';
import { schedulePlanApi, productApi, dashboardApi } from '../api';
import type { SchedulePlan, Product } from '../types';
import { COLORS, NEW_GROUP_OPERATORS, OLD_GROUP_OPERATORS } from '../types';

const { Title, Text } = Typography;

const WEEKDAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

const SLOT_LABELS = ['上午', '下午-1', '下午-2', '下午-3', '下午-4'];

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

const typeColorMap: Record<string, string> = {
  '预告品': COLORS.preview,
  '非预告品': COLORS.afternoon,
  '备选品': COLORS.inactive,
};

// ---- Draggable sidebar product ----
function DraggableProduct({ product }: { product: Product }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `product-${product.id}`,
    data: { type: 'product', product },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        padding: '6px 8px',
        marginBottom: 4,
        background: isDragging ? '#e6f7ff' : '#fff',
        border: '1px solid #e8e8e8',
        borderRadius: 4,
        cursor: 'grab',
        opacity: isDragging ? 0.4 : 1,
        fontSize: 12,
      }}
    >
      <div style={{ fontWeight: 500, marginBottom: 2 }}>{product.name}</div>
      <Space size={4}>
        <Tag
          style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px', margin: 0 }}
          color={typeColorMap[product.product_type] ?? 'default'}
        >
          {product.product_type}
        </Tag>
        <Tag style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px', margin: 0 }}>
          {product.category}
        </Tag>
      </Space>
    </div>
  );
}

// ---- Draggable plan card in slot ----
function DraggablePlanCard({
  plan,
  product,
  onConfirm,
  onCancel,
}: {
  plan: SchedulePlan;
  product?: Product;
  onConfirm: (id: number) => void;
  onCancel: (id: number) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `plan-${plan.id}`,
    data: { type: 'plan', plan },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        padding: '4px 6px',
        marginBottom: 3,
        borderRadius: 4,
        borderLeft: `3px solid ${sourceColorMap[plan.source] || COLORS.afternoon}`,
        background: isDragging ? '#e6f7ff' : '#fafafa',
        fontSize: 11,
        cursor: 'grab',
        opacity: isDragging ? 0.4 : 1,
      }}
    >
      <div style={{ fontWeight: 500, marginBottom: 2 }}>
        {plan.product_name || `商品#${plan.product_id}`}
      </div>
      <Space size={2} wrap>
        {product && (
          <Tag
            style={{ fontSize: 9, lineHeight: '14px', padding: '0 3px', margin: 0 }}
            color={typeColorMap[product.product_type] ?? 'default'}
          >
            {product.product_type}
          </Tag>
        )}
        <Tag
          style={{ fontSize: 9, lineHeight: '14px', padding: '0 3px', margin: 0 }}
          color={sourceColorMap[plan.source]}
        >
          {plan.source}
        </Tag>
        <Badge status={statusColorMap[plan.status] as 'processing' | 'success' | 'default' | 'error'} text={
          <span style={{ fontSize: 9 }}>{plan.status}</span>
        } />
      </Space>
      {plan.operator && (
        <div style={{ marginTop: 2 }}>
          <Tag style={{ fontSize: 9, lineHeight: '14px', padding: '0 3px', margin: 0 }} color="purple">
            {plan.operator}
          </Tag>
        </div>
      )}
      {plan.status === '待审核' && (
        <div style={{ marginTop: 3 }}>
          <Space size={2}>
            <Tooltip title="确认">
              <Button
                type="link"
                size="small"
                icon={<CheckOutlined />}
                style={{ fontSize: 10, padding: 0, height: 'auto', color: COLORS.healthy }}
                onClick={(e) => { e.stopPropagation(); onConfirm(plan.id); }}
              />
            </Tooltip>
            <Tooltip title="取消">
              <Button
                type="link"
                size="small"
                icon={<CloseOutlined />}
                style={{ fontSize: 10, padding: 0, height: 'auto', color: COLORS.hot }}
                onClick={(e) => { e.stopPropagation(); onCancel(plan.id); }}
              />
            </Tooltip>
          </Space>
        </div>
      )}
    </div>
  );
}

// ---- Droppable slot ----
function DroppableSlot({
  slotId,
  slotLabel,
  children,
}: {
  slotId: string;
  slotLabel: string;
  children: React.ReactNode;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: slotId });

  return (
    <div
      ref={setNodeRef}
      style={{
        minHeight: 70,
        padding: 4,
        border: '1px solid #f0f0f0',
        borderRadius: 4,
        background: isOver ? '#e6f7ff' : '#fff',
        transition: 'background 0.15s',
        marginBottom: 2,
      }}
    >
      <Text type="secondary" style={{ fontSize: 10, display: 'block', marginBottom: 2 }}>
        {slotLabel}
      </Text>
      {children}
    </div>
  );
}

// ---- Main component ----
const SchedulePlanner: React.FC = () => {
  const { groupType, viewMode, currentOperator } = useAppContext();
  const [plans, setPlans] = useState<SchedulePlan[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [currentWeekStart, setCurrentWeekStart] = useState<dayjs.Dayjs>(() => {
    const today = dayjs();
    const day = today.day();
    return today.subtract(day === 0 ? 6 : day - 1, 'day').startOf('day');
  });

  // Drag state
  const [_activeDragId, setActiveDragId] = useState<string | null>(null);
  const [activeDragData, setActiveDragData] = useState<{ type: string; product?: Product; plan?: SchedulePlan } | null>(null);

  // Conflict modal
  const [conflictModal, setConflictModal] = useState<{
    visible: boolean;
    conflicts: Array<{ type: string; message: string }>;
    pendingAction: (() => Promise<void>) | null;
  }>({ visible: false, conflicts: [], pendingAction: null });

  // Operator selection for new plans
  const [operatorModal, setOperatorModal] = useState<{
    visible: boolean;
    productId: number;
    dateStr: string;
    slotLabel: string;
    operator: string;
  }>({ visible: false, productId: 0, dateStr: '', slotLabel: '', operator: '' });

  const operators = groupType === '新群' ? NEW_GROUP_OPERATORS : OLD_GROUP_OPERATORS;

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const weekEnd = currentWeekStart.add(6, 'day');
      const params: Record<string, string> = {
        group_type: groupType,
        start_date: currentWeekStart.format('YYYY-MM-DD'),
        end_date: weekEnd.format('YYYY-MM-DD'),
      };
      if (viewMode === '个人视图') params.operator = currentOperator;
      const res = await schedulePlanApi.list(params);
      const data = Array.isArray(res.data) ? res.data : res.data.items || [];
      setPlans(data);
    } catch {
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }, [groupType, viewMode, currentOperator, currentWeekStart]);

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

  const productMap = new Map(products.map((p) => [p.id, p]));

  // Get plans for a specific slot
  const getSlotPlans = (dateStr: string, slotIndex: number): SchedulePlan[] => {
    const timeSlot = slotIndex === 0 ? '上午' : '下午';
    return plans.filter(
      (p) => p.plan_date === dateStr && p.time_slot === timeSlot
    );
  };

  // Week navigation
  const goToPrevWeek = () => setCurrentWeekStart((prev) => prev.subtract(7, 'day'));
  const goToNextWeek = () => setCurrentWeekStart((prev) => prev.add(7, 'day'));
  const goToThisWeek = () => {
    const today = dayjs();
    const day = today.day();
    setCurrentWeekStart(today.subtract(day === 0 ? 6 : day - 1, 'day').startOf('day'));
  };

  // Build week dates
  const weekDates = Array.from({ length: 7 }, (_, i) => currentWeekStart.add(i, 'day'));

  // Plan actions
  const handleConfirmPlan = async (id: number) => {
    try {
      await schedulePlanApi.update(id, { status: '已确认' });
      message.success('已确认');
      fetchPlans();
    } catch { /* ignore */ }
  };

  const handleCancelPlan = async (id: number) => {
    try {
      await schedulePlanApi.update(id, { status: '已取消' });
      message.info('已取消');
      fetchPlans();
    } catch { /* ignore */ }
  };

  // Create plan with conflict check
  const createPlanWithConflictCheck = async (
    productId: number,
    dateStr: string,
    slotLabel: string,
    operator: string,
  ) => {
    const timeSlot = slotLabel === '上午' ? '上午' : '下午';

    const doCreate = async () => {
      await schedulePlanApi.create({
        product_id: productId,
        plan_date: dateStr,
        time_slot: timeSlot,
        group_type: groupType,
        operator,
        source: '手动排期',
        status: '待审核',
      });
      message.success('排期已添加');
      fetchPlans();
    };

    try {
      const res = await dashboardApi.conflictCheck({
        product_id: productId,
        plan_date: dateStr,
        group_type: groupType,
        time_slot: timeSlot,
      });
      const conflicts = res.data?.conflicts || res.data?.warnings || [];
      if (conflicts.length > 0) {
        setConflictModal({
          visible: true,
          conflicts,
          pendingAction: doCreate,
        });
        return;
      }
    } catch {
      // If conflict check fails, proceed anyway
    }

    await doCreate();
  };

  // Drag handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveDragId(active.id as string);
    setActiveDragData(active.data.current as { type: string; product?: Product; plan?: SchedulePlan } | null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);
    setActiveDragData(null);

    if (!over) return;

    const overId = over.id as string;
    // over ID is like "2024-03-25-0" (dateStr-slotIndex)
    if (!overId.match(/^\d{4}-\d{2}-\d{2}-\d+$/)) return;

    const parts = overId.split('-');
    const slotIndex = parseInt(parts[3], 10);
    const dateStr = parts.slice(0, 3).join('-');
    const slotLabel = SLOT_LABELS[slotIndex];

    const data = active.data.current as { type: string; product?: Product; plan?: SchedulePlan } | undefined;
    if (!data) return;

    if (data.type === 'product' && data.product) {
      // Show operator selection modal
      setOperatorModal({
        visible: true,
        productId: data.product.id,
        dateStr,
        slotLabel,
        operator: viewMode === '个人视图' ? currentOperator : operators[0],
      });
    } else if (data.type === 'plan' && data.plan) {
      const plan = data.plan;
      const newTimeSlot = slotIndex === 0 ? '上午' : '下午';
      try {
        await schedulePlanApi.update(plan.id, {
          plan_date: dateStr,
          time_slot: newTimeSlot,
        });
        message.success('排期已移动');
        fetchPlans();
      } catch {
        message.error('移动失败');
      }
    }
  };

  const handleOperatorConfirm = async () => {
    const { productId, dateStr, slotLabel, operator } = operatorModal;
    setOperatorModal((prev) => ({ ...prev, visible: false }));
    await createPlanWithConflictCheck(productId, dateStr, slotLabel, operator);
  };

  const handleConflictConfirm = async () => {
    const action = conflictModal.pendingAction;
    setConflictModal({ visible: false, conflicts: [], pendingAction: null });
    if (action) {
      try {
        await action();
      } catch {
        message.error('操作失败');
      }
    }
  };

  // Filtered products for sidebar
  const filteredProducts = products.filter((p) =>
    !searchText || p.name.toLowerCase().includes(searchText.toLowerCase()) ||
    p.category.includes(searchText) ||
    p.brand.toLowerCase().includes(searchText.toLowerCase())
  );

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
          <Space>
            <Button icon={<LeftOutlined />} onClick={goToPrevWeek}>上一周</Button>
            <Button onClick={goToThisWeek}>本周</Button>
            <Button icon={<RightOutlined />} onClick={goToNextWeek}>下一周</Button>
            <Text strong>
              {currentWeekStart.format('YYYY/MM/DD')} - {currentWeekStart.add(6, 'day').format('MM/DD')}
            </Text>
          </Space>
        </Col>
      </Row>

      <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div style={{ display: 'flex', gap: 12 }}>
          {/* Left: Calendar grid (80%) */}
          <div style={{ flex: '1 1 80%', minWidth: 0 }}>
            <Card
              size="small"
              loading={loading}
              bodyStyle={{ padding: 8, overflowX: 'auto' }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, minWidth: 840 }}>
                {/* Headers */}
                {weekDates.map((d, i) => {
                  const isToday = d.isSame(dayjs(), 'day');
                  return (
                    <div
                      key={`header-${i}`}
                      style={{
                        textAlign: 'center',
                        padding: '6px 4px',
                        background: isToday ? '#e6f7ff' : '#fafafa',
                        borderRadius: 4,
                        fontWeight: 500,
                        fontSize: 13,
                        border: isToday ? '1px solid #91d5ff' : '1px solid #f0f0f0',
                      }}
                    >
                      <div>{d.format('M/D')}</div>
                      <div style={{ fontSize: 11, color: '#999' }}>{WEEKDAY_LABELS[i]}</div>
                    </div>
                  );
                })}

                {/* Slot rows */}
                {SLOT_LABELS.map((slotLabel, slotIndex) =>
                  weekDates.map((d, dayIndex) => {
                    const dateStr = d.format('YYYY-MM-DD');
                    const slotId = `${dateStr}-${slotIndex}`;
                    const slotPlans = getSlotPlans(dateStr, slotIndex);

                    return (
                      <DroppableSlot key={`${dayIndex}-${slotIndex}`} slotId={slotId} slotLabel={slotLabel}>
                        {slotPlans.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '12px 0' }}>
                            <Text type="secondary" style={{ fontSize: 11 }}>空</Text>
                          </div>
                        ) : (
                          slotPlans.map((plan) => (
                            <DraggablePlanCard
                              key={plan.id}
                              plan={plan}
                              product={productMap.get(plan.product_id)}
                              onConfirm={handleConfirmPlan}
                              onCancel={handleCancelPlan}
                            />
                          ))
                        )}
                      </DroppableSlot>
                    );
                  })
                )}
              </div>
            </Card>
          </div>

          {/* Right: Product sidebar (20%) */}
          <div style={{ flex: '0 0 240px' }}>
            <Card
              title="商品列表"
              size="small"
              bodyStyle={{ padding: '8px', maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}
              extra={<Text type="secondary" style={{ fontSize: 11 }}>{filteredProducts.length}个</Text>}
            >
              <Input
                prefix={<SearchOutlined />}
                placeholder="搜索商品..."
                size="small"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
                style={{ marginBottom: 8 }}
              />
              {filteredProducts.length === 0 ? (
                <Empty description="无商品" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              ) : (
                filteredProducts.map((p) => (
                  <DraggableProduct key={p.id} product={p} />
                ))
              )}
            </Card>
          </div>
        </div>

        {/* Drag overlay */}
        <DragOverlay>
          {activeDragData?.type === 'product' && activeDragData.product ? (
            <div
              style={{
                padding: '6px 8px',
                background: '#e6f7ff',
                border: '1px solid #91d5ff',
                borderRadius: 4,
                fontSize: 12,
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                width: 160,
              }}
            >
              <div style={{ fontWeight: 500 }}>{activeDragData.product.name}</div>
              <Tag
                style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px', marginTop: 2 }}
                color={typeColorMap[activeDragData.product.product_type] ?? 'default'}
              >
                {activeDragData.product.product_type}
              </Tag>
            </div>
          ) : activeDragData?.type === 'plan' && activeDragData.plan ? (
            <div
              style={{
                padding: '4px 6px',
                background: '#e6f7ff',
                border: '1px solid #91d5ff',
                borderRadius: 4,
                borderLeft: `3px solid ${sourceColorMap[activeDragData.plan.source] || COLORS.afternoon}`,
                fontSize: 11,
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                width: 140,
              }}
            >
              <div style={{ fontWeight: 500 }}>
                {activeDragData.plan.product_name || `商品#${activeDragData.plan.product_id}`}
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Operator selection modal */}
      <Modal
        title="选择操盘手"
        open={operatorModal.visible}
        onOk={handleOperatorConfirm}
        onCancel={() => setOperatorModal((prev) => ({ ...prev, visible: false }))}
        okText="确认添加"
        cancelText="取消"
        width={360}
      >
        <div style={{ marginBottom: 12 }}>
          <Text>
            将商品添加到 <Text strong>{operatorModal.dateStr}</Text> 的{' '}
            <Text strong>{operatorModal.slotLabel}</Text> 时段
          </Text>
        </div>
        <Select
          style={{ width: '100%' }}
          value={operatorModal.operator}
          onChange={(val) => setOperatorModal((prev) => ({ ...prev, operator: val }))}
          options={operators.map((o) => ({ label: o, value: o }))}
          placeholder="请选择操盘手"
        />
      </Modal>

      {/* Conflict warning modal */}
      <Modal
        title={
          <Space>
            <WarningOutlined style={{ color: COLORS.warning }} />
            <span>冲突提醒</span>
          </Space>
        }
        open={conflictModal.visible}
        onOk={handleConflictConfirm}
        onCancel={() => setConflictModal({ visible: false, conflicts: [], pendingAction: null })}
        okText="仍然添加"
        cancelText="取消"
      >
        <div style={{ marginBottom: 12 }}>
          <Text>检测到以下冲突，是否仍要添加排期？</Text>
        </div>
        {conflictModal.conflicts.map((c, i) => (
          <div
            key={i}
            style={{
              padding: '8px 12px',
              marginBottom: 8,
              background: '#fffbe6',
              border: '1px solid #ffe58f',
              borderRadius: 4,
            }}
          >
            <WarningOutlined style={{ color: COLORS.warning, marginRight: 8 }} />
            <Text>{typeof c === 'string' ? c : c.message}</Text>
          </div>
        ))}
      </Modal>
    </div>
  );
};

export default SchedulePlanner;
