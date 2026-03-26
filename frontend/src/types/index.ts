export interface Product {
  id: number;
  name: string;
  brand: string;
  category: string;
  product_type: '预告品' | '非预告品' | '备选品';
  target_age_range: string;
  season_tag: string;
  repurchase_cycle: number;
  commission_rate: number;
  status: '在售' | '下架' | '待上架';
  health_score: number;
  created_at: string;
  updated_at: string;
}

export interface ScheduleRecord {
  id: number;
  product_id: number;
  product_name?: string;
  schedule_date: string;
  time_slot: '上午' | '下午';
  group_type: '新群' | '老群';
  operator: string;
  order_count: number;
  gmv: number;
  performance_tag: '爆款' | '正常' | '一般' | '销量下降' | '很差';
  feedback_text: string;
  ai_predicted_orders: number;
  notes: string;
}

export interface SchedulePlan {
  id: number;
  product_id: number;
  product_name?: string;
  plan_date: string;
  time_slot: '上午' | '下午';
  group_type: '新群' | '老群';
  operator: string;
  source: '手动排期' | '复推采纳' | 'AI自动生成';
  status: '待审核' | '已确认' | '已执行' | '已取消';
  ai_copy: string;
}

export type GroupType = '新群' | '老群';
export type ViewMode = '群视图' | '个人视图';

export const NEW_GROUP_OPERATORS = ['玛丽', '彩云', '芊芊', 'coco'];
export const OLD_GROUP_OPERATORS = ['乃心', '于心', '敏敏', '欣欣'];

export const CATEGORIES = ['奶粉', '纸尿裤', '辅食', '护肤', '玩具', '服装', '营养品', '清洗剂', '日用消耗', '大件', '其他'];
export const PERFORMANCE_TAGS: Array<'爆款' | '正常' | '一般' | '销量下降' | '很差'> = ['爆款', '正常', '一般', '销量下降', '很差'];

// Color system from PRD
export const COLORS = {
  hot: '#E74C3C',      // 销量好/爆款
  preview: '#E67E22',  // 预告品/主推
  afternoon: '#2E86C1',// 非预告品/下午品
  warning: '#F39C12',  // 销量下滑/注意
  healthy: '#27AE60',  // 可以返场/健康
  inactive: '#95A5A6', // 暂停/淘汰
  ai: '#8E44AD',       // AI生成/智能推荐
};
