import { useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { ConfigProvider, Layout, Menu, Segmented, Select, Typography } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import {
  DashboardOutlined,
  HistoryOutlined,
  RedoOutlined,
  CalendarOutlined,
  ShoppingOutlined,
  RobotOutlined,
  HeartOutlined,
  FileSearchOutlined,
  SwapOutlined,
  BulbOutlined,
  BarChartOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import { AppProvider, useAppContext } from './context/AppContext';
import type { GroupType, ViewMode } from './types';
import { NEW_GROUP_OPERATORS, OLD_GROUP_OPERATORS } from './types';

import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import HistorySchedule from './pages/HistorySchedule';
import SchedulePlanner from './pages/SchedulePlanner';
import RepushList from './pages/RepushList';
import AIAssistant from './pages/AIAssistant';
import HealthBoard from './pages/HealthBoard';
import ProductSubmissions from './pages/ProductSubmissions';
import CrossComparison from './pages/CrossComparison';
import DemandPool from './pages/DemandPool';
import Reports from './pages/Reports';

import './App.css';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

const menuItems = [
  { key: '/', icon: <DashboardOutlined />, label: '仪表盘' },
  { key: '/history', icon: <HistoryOutlined />, label: '历史排品' },
  { key: '/repush', icon: <RedoOutlined />, label: '复推清单' },
  { key: '/planner', icon: <CalendarOutlined />, label: '排期计划' },
  { key: '/products', icon: <ShoppingOutlined />, label: '商品库' },
  { key: '/ai', icon: <RobotOutlined />, label: 'AI助手' },
  { key: '/health', icon: <HeartOutlined />, label: '健康度看板' },
  { key: '/submissions', icon: <FileSearchOutlined />, label: '选品工作流' },
  { key: '/compare', icon: <SwapOutlined />, label: '跨人对比' },
  { key: '/demand', icon: <BulbOutlined />, label: '需求池' },
  { key: '/reports', icon: <BarChartOutlined />, label: '数据报表' },
];

function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { groupType, setGroupType, viewMode, setViewMode, currentOperator, setCurrentOperator } =
    useAppContext();

  const operators = groupType === '新群' ? NEW_GROUP_OPERATORS : OLD_GROUP_OPERATORS;

  return (
    <Layout className="app-layout">
      <Sider
        width={220}
        collapsedWidth={80}
        collapsed={collapsed}
        onCollapse={setCollapsed}
        theme="dark"
        breakpoint="lg"
      >
        <div className="sidebar-logo">
          {!collapsed ? <Title level={4} style={{ color: '#fff', margin: 0 }}>兜爸心选</Title> : <Title level={4} style={{ color: '#fff', margin: 0 }}>兜</Title>}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout className={`site-layout ${collapsed ? 'collapsed' : ''}`}>
        <Header>
          <div className="header-controls">
            {collapsed ? (
              <MenuUnfoldOutlined onClick={() => setCollapsed(false)} style={{ fontSize: 18, cursor: 'pointer' }} />
            ) : (
              <MenuFoldOutlined onClick={() => setCollapsed(true)} style={{ fontSize: 18, cursor: 'pointer' }} />
            )}
            <Segmented
              options={['新群', '老群']}
              value={groupType}
              onChange={(val) => setGroupType(val as GroupType)}
            />
            <Segmented
              options={['群视图', '个人视图']}
              value={viewMode}
              onChange={(val) => setViewMode(val as ViewMode)}
            />
            {viewMode === '个人视图' && (
              <Select
                value={currentOperator}
                onChange={setCurrentOperator}
                style={{ width: 120 }}
                options={operators.map((op) => ({ label: op, value: op }))}
              />
            )}
          </div>
        </Header>
        <Content>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/history" element={<HistorySchedule />} />
            <Route path="/repush" element={<RepushList />} />
            <Route path="/planner" element={<SchedulePlanner />} />
            <Route path="/products" element={<Products />} />
            <Route path="/ai" element={<AIAssistant />} />
            <Route path="/health" element={<HealthBoard />} />
            <Route path="/submissions" element={<ProductSubmissions />} />
            <Route path="/compare" element={<CrossComparison />} />
            <Route path="/demand" element={<DemandPool />} />
            <Route path="/reports" element={<Reports />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
}

function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <AppProvider>
        <BrowserRouter>
          <AppLayout />
        </BrowserRouter>
      </AppProvider>
    </ConfigProvider>
  );
}

export default App;
