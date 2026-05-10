import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import {
  LogIn,
  LogOut,
  Users,
  Key,
  Trash2,
  CheckCircle,
  XCircle,
  Shield,
  Plus,
  TrendingUp,
  Activity,
  Calendar,
  Eye,
  Download,
  RefreshCw,
  Settings,
  BarChart3,
  Database,
  Edit2,
  Clock,
  FileText,
  Loader2,
  Ticket,
  Copy,
  ToggleLeft,
  ToggleRight,
  MessageSquare
} from 'lucide-react';
import { adminAPI } from '../api';
import ConfigManager from '../components/ConfigManager';
import SessionMonitor from '../components/SessionMonitor';
import DatabaseManager from '../components/DatabaseManager';
import ForumManager from '../components/ForumManager';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [adminToken, setAdminToken] = useState(localStorage.getItem('adminToken'));
  
  // Tab state
  const [activeTab, setActiveTab] = useState('dashboard');

  // Login form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Users state
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Statistics state
  const [statistics, setStatistics] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Card key generation state
  
  // Batch generation state
  
  // Edit usage limit modal
  const [editingUserId, setEditingUserId] = useState(null);
  const [newUsageLimit, setNewUsageLimit] = useState('');
  
  // User details modal
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [showUserDetails, setShowUserDetails] = useState(false);

  // Add credits modal
  const [addCreditsUserId, setAddCreditsUserId] = useState(null);
  const [addCreditsAmount, setAddCreditsAmount] = useState(10);

  // Announcement state
  const [announcements, setAnnouncements] = useState([]);
  const [loadingAnn, setLoadingAnn] = useState(false);
  const emptyAnnForm = { title:'', content:'', type:'info', is_active:true, show_on_login:false, expires_at:'' };
  const [annForm, setAnnForm] = useState(emptyAnnForm);
  const [editingAnnId, setEditingAnnId] = useState(null);
  const [showAnnForm, setShowAnnForm] = useState(false);

  // Coupon state
  const [coupons, setCoupons] = useState([]);
  const [loadingCoupons, setLoadingCoupons] = useState(false);
  const [couponCount, setCouponCount] = useState(1);
  const [couponType, setCouponType] = useState('usage');
  const [couponCredits, setCouponCredits] = useState(10);
  const [couponMaxRedemptions, setCouponMaxRedemptions] = useState(0);
  const [couponExpiresAt, setCouponExpiresAt] = useState('');
  const [couponPrefix, setCouponPrefix] = useState('');

  useEffect(() => {
    if (adminToken) {
      verifyToken();
    }
  }, [adminToken]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchStatistics();
      // 每30秒自动刷新统计数据
      const interval = setInterval(fetchStatistics, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const verifyToken = async () => {
    try {
      await axios.post('/api/admin/verify-token', {}, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      setIsAuthenticated(true);
      fetchUsers();
    } catch (error) {
      localStorage.removeItem('adminToken');
      setAdminToken(null);
      setIsAuthenticated(false);
    }
  };

  const fetchCoupons = async () => {
    setLoadingCoupons(true);
    try {
      const res = await adminAPI.listCoupons();
      setCoupons(res.data);
    } catch (err) {
      toast.error('获取卡券列表失败');
    } finally {
      setLoadingCoupons(false);
    }
  };

  const handleAddCredits = async () => {
    if (!addCreditsUserId || addCreditsAmount < 1) return;
    try {
      await adminAPI.addUserCredits(addCreditsUserId, addCreditsAmount);
      toast.success(`已赠送 ${addCreditsAmount} 次`);
      setAddCreditsUserId(null);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.detail || '操作失败');
    }
  };

  const fetchAnnouncements = async () => {
    setLoadingAnn(true);
    try {
      const res = await adminAPI.listAnnouncements();
      setAnnouncements(res.data);
    } catch { toast.error('获取公告失败'); }
    finally { setLoadingAnn(false); }
  };

  const handleSaveAnn = async () => {
    if (!annForm.title.trim() || !annForm.content.trim()) {
      toast.error('标题和内容不能为空'); return;
    }
    try {
      const payload = {
        ...annForm,
        is_active: annForm.show_on_login ? true : annForm.is_active,
        expires_at: annForm.expires_at || null,
      };
      if (editingAnnId) {
        await adminAPI.updateAnnouncement(editingAnnId, payload);
        toast.success('公告已更新');
      } else {
        await adminAPI.createAnnouncement(payload);
        toast.success('公告已发布');
      }
      setShowAnnForm(false);
      setEditingAnnId(null);
      setAnnForm(emptyAnnForm);
      fetchAnnouncements();
    } catch (err) { toast.error(err.response?.data?.detail || '操作失败'); }
  };

  const handleToggleAnn = async (id) => {
    try { await adminAPI.toggleAnnouncement(id); fetchAnnouncements(); }
    catch { toast.error('操作失败'); }
  };

  const handleDeleteAnn = async (id) => {
    if (!window.confirm('确定删除该公告？')) return;
    try { await adminAPI.deleteAnnouncement(id); toast.success('已删除'); fetchAnnouncements(); }
    catch { toast.error('删除失败'); }
  };

  const startEditAnn = (ann) => {
    setAnnForm({
      title: ann.title, content: ann.content, type: ann.type,
      is_active: ann.is_active,
      show_on_login: !!ann.show_on_login,
      expires_at: ann.expires_at ? ann.expires_at.slice(0, 16) : '',
    });
    setEditingAnnId(ann.id);
    setShowAnnForm(true);
  };

  const handleCreateCoupons = async () => {
    try {
      const res = await adminAPI.createCoupons({
        coupon_type: couponType,
        credits: couponCredits,
        max_redemptions: couponMaxRedemptions,
        expires_at: couponExpiresAt || null,
        count: couponCount,
        prefix: couponPrefix || undefined,
      });
      toast.success(`成功创建 ${res.data.length} 张卡券`);
      fetchCoupons();
    } catch (err) {
      toast.error(err.response?.data?.detail || '创建失败');
    }
  };

  const handleToggleCoupon = async (id) => {
    try {
      await adminAPI.toggleCoupon(id);
      fetchCoupons();
    } catch {
      toast.error('操作失败');
    }
  };

  const handleDeleteCoupon = async (id) => {
    if (!window.confirm('确定删除该卡券？')) return;
    try {
      await adminAPI.deleteCoupon(id);
      toast.success('卡券已删除');
      fetchCoupons();
    } catch {
      toast.error('删除失败');
    }
  };



  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post('/api/admin/login', {
        username,
        password
      });

      const { access_token } = response.data;
      localStorage.setItem('adminToken', access_token);
      setAdminToken(access_token);
      setIsAuthenticated(true);
      toast.success('登录成功！');
      // fetchUsers 由 useEffect 监听 adminToken 变化后通过 verifyToken 触发，无需重复调用
    } catch (error) {
      toast.error(error.response?.data?.detail || '登录失败，请检查用户名和密码');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setAdminToken(null);
    setIsAuthenticated(false);
    setUsername('');
    setPassword('');
    toast.success('已退出登录');
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await axios.get('/api/admin/users', {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      setUsers(response.data);
    } catch (error) {
      toast.error('获取用户列表失败');
      console.error('Error fetching users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchStatistics = async () => {
    setLoadingStats(true);
    try {
      const response = await axios.get('/api/admin/statistics', {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      setStatistics(response.data);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setLoadingStats(false);
    }
  };


  const handleToggleUserStatus = async (userId, currentStatus) => {
    try {
      await axios.patch(`/api/admin/users/${userId}/toggle`, 
        {},
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      toast.success(currentStatus ? '用户已禁用' : '用户已启用');
      fetchUsers();
    } catch (error) {
      toast.error('操作失败');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('确定要删除这个用户吗？此操作不可撤销。')) {
      return;
    }

    try {
      await axios.delete(`/api/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      toast.success('用户已删除');
      fetchUsers();
    } catch (error) {
      toast.error('删除用户失败');
    }
  };

  const copyToClipboard = (text) => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(() => toast.success('已复制'));
    } else {
      const el = document.createElement('textarea');
      el.value = text;
      el.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
      document.body.appendChild(el);
      el.focus(); el.select();
      try { document.execCommand('copy'); toast.success('已复制'); }
      catch { toast.error('复制失败，请手动复制'); }
      document.body.removeChild(el);
    }
  };
  const copyCouponCode = (code) => copyToClipboard(code);


  const handleUpdateUsageLimit = async (userId, newLimit) => {
    try {
      await axios.patch(
        `/api/admin/users/${userId}/usage`,
        { usage_limit: parseInt(newLimit) },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      toast.success('使用次数已更新');
      setEditingUserId(null);
      setNewUsageLimit('');
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || '更新失败');
    }
  };

  const handleViewUserDetails = async (userId) => {
    try {
      const response = await axios.get(`/api/admin/users/${userId}/details`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      setUserDetails(response.data);
      setSelectedUser(userId);
      setShowUserDetails(true);
    } catch (error) {
      toast.error('获取用户详情失败');
    }
  };

  const exportUsersToCSV = () => {
    const headers = ['卡密', '状态', '创建时间', '最后使用'];
    const rows = users.map(user => [
      user.card_key,
      user.is_active ? '启用' : '禁用',
      new Date(user.created_at).toLocaleString('zh-CN'),
      user.last_used ? new Date(user.last_used).toLocaleString('zh-CN') : '从未使用'
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `users_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('用户数据已导出');
  };

  // Login Page
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 animate-fade-in-up">
          <div className="flex items-center justify-center mb-8">
            <div className="bg-blue-600 p-3 rounded-full">
              <Shield className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-center mb-2 text-gray-800">
            管理后台
          </h1>
          <p className="text-center text-gray-600 mb-8">
            请使用管理员账号登录
          </p>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                用户名
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="请输入用户名"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                密码
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="请输入密码"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  登录中...
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  登录
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/')}
              className="text-blue-600 hover:text-blue-700 text-sm"
            >
              返回首页
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Admin Dashboard
  return (
    <div className="min-h-screen bg-g-bg">
      {/* Header */}
      <div className="toolbar-g px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-g-blue" />
          <h1 className="text-base font-medium text-g-text">OriginFlow 管理后台</h1>
        </div>
        <button onClick={handleLogout} className="btn-g-text text-g-red text-sm">
          <LogOut className="w-4 h-4" /> 退出登录
        </button>
      </div>

      {/* Tabs Navigation - Google Docs 下划线风格 */}
      <div className="bg-g-surface border-b border-g-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="tabs-g overflow-x-auto flex-nowrap border-b-0">
            {[
              { key: 'dashboard', label: '数据面板',   icon: BarChart3 },
              { key: 'sessions',  label: '会话监控',   icon: Activity },
              { key: 'database',  label: '数据库管理', icon: Database },
              { key: 'config',    label: '系统配置',   icon: Settings },
              { key: 'coupons',       label: '卡券管理',   icon: Ticket,    onClick: fetchCoupons },
              { key: 'announcements', label: '公告管理',   icon: FileText,  onClick: fetchAnnouncements },
              { key: 'forum', label: '论坛管理', icon: MessageSquare },
            ].map(({ key, label, icon: Icon, onClick }) => (
              <button
                key={key}
                onClick={() => { setActiveTab(key); onClick && onClick(); }}
                className={`tab-g flex items-center gap-1.5 ${activeTab === key ? 'active' : ''}`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Tab Content */}
        {activeTab === 'dashboard' && (
          <>
            {/* Statistics Cards */}
            {statistics && (
              <>
                {/* 第一行：用户和会话统计 */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                  {/* Total Users */}
                  <div className="bg-white rounded-2xl shadow-ios p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-500 mb-1">总用户数</p>
                        <p className="text-3xl font-bold text-gray-900 tracking-tight">{statistics.users.total}</p>
                        <div className="flex items-center gap-1 mt-2">
                          <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                            +{statistics.users.today_new} 今日
                          </span>
                        </div>
                      </div>
                      <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center">
                        <Users className="w-6 h-6 text-gray-600" />
                      </div>
                    </div>
                  </div>

                  {/* Active Users */}
                  <div className="bg-white rounded-2xl shadow-ios p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-500 mb-1">启用用户</p>
                        <p className="text-3xl font-bold text-gray-900 tracking-tight">{statistics.users.active}</p>
                        <div className="flex items-center gap-1 mt-2">
                          <span className="text-xs font-medium text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full">
                            {statistics.users.inactive} 禁用
                          </span>
                        </div>
                      </div>
                      <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      </div>
                    </div>
                  </div>

                  {/* Today Active */}
                  <div className="bg-white rounded-2xl shadow-ios p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-500 mb-1">今日活跃</p>
                        <p className="text-3xl font-bold text-gray-900 tracking-tight">{statistics.users.today_active}</p>
                        <div className="flex items-center gap-1 mt-2">
                          <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                            {statistics.users.recent_active_7days} (7日)
                          </span>
                        </div>
                      </div>
                      <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                        <Activity className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                  </div>

                  {/* Total Sessions */}
                  <div className="bg-white rounded-2xl shadow-ios p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-500 mb-1">总会话数</p>
                        <p className="text-3xl font-bold text-gray-900 tracking-tight">{statistics.sessions.total}</p>
                        <div className="flex items-center gap-1 mt-2">
                          <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                            {statistics.sessions.today} 今日
                          </span>
                        </div>
                      </div>
                      <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                        <Database className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 第二行：处理统计 - 统一使用白色背景，更专业 */}
                {statistics.processing && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {/* Total Characters Processed */}
                    <div className="bg-white rounded-2xl shadow-ios p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                          <BarChart3 className="w-5 h-5 text-blue-600" />
                        </div>
                        <span className="text-xs font-medium text-gray-400">累计</span>
                      </div>
                      <p className="text-sm font-medium text-gray-500 mb-1">处理字符数</p>
                      <p className="text-2xl font-bold text-gray-900 tracking-tight">
                        {statistics.processing.total_chars_processed.toLocaleString()}
                      </p>
                    </div>

                    {/* Average Processing Time */}
                    <div className="bg-white rounded-2xl shadow-ios p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                          <Clock className="w-5 h-5 text-orange-600" />
                        </div>
                        <span className="text-xs font-medium text-gray-400">平均</span>
                      </div>
                      <p className="text-sm font-medium text-gray-500 mb-1">处理耗时</p>
                      <p className="text-2xl font-bold text-gray-900 tracking-tight">
                        {Math.round(statistics.processing.avg_processing_time)}
                        <span className="text-sm font-normal text-gray-500 ml-1">秒</span>
                      </p>
                    </div>

                    {/* Paper Polish Count */}
                    <div className="bg-white rounded-2xl shadow-ios p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 bg-teal-50 rounded-lg flex items-center justify-center">
                          <FileText className="w-5 h-5 text-teal-600" />
                        </div>
                        <span className="text-xs font-medium text-gray-400">计数</span>
                      </div>
                      <p className="text-sm font-medium text-gray-500 mb-1">论文润色</p>
                      <p className="text-2xl font-bold text-gray-900 tracking-tight">
                        {statistics.processing.paper_polish_count}
                      </p>
                    </div>

                    {/* Paper Polish Enhance Count */}
                    <div className="bg-white rounded-2xl shadow-ios p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 bg-rose-50 rounded-lg flex items-center justify-center">
                          <TrendingUp className="w-5 h-5 text-rose-600" />
                        </div>
                        <span className="text-xs font-medium text-gray-400">计数</span>
                      </div>
                      <p className="text-sm font-medium text-gray-500 mb-1">润色 + 增强</p>
                      <p className="text-2xl font-bold text-gray-900 tracking-tight">
                        {statistics.processing.paper_polish_enhance_count}
                      </p>
                    </div>
                  </div>
                )}

                {/* 第三行：Word Formatter 统计 */}
                {statistics.word_formatter && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
                    {/* Total Word Formatter Jobs */}
                    <div className="bg-white rounded-2xl shadow-ios p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                          <FileText className="w-5 h-5 text-blue-600" />
                        </div>
                      </div>
                      <p className="text-sm font-medium text-gray-500 mb-1">排版任务</p>
                      <p className="text-2xl font-bold text-gray-900 tracking-tight">
                        {statistics.word_formatter.total}
                      </p>
                    </div>

                    {/* Completed */}
                    <div className="bg-white rounded-2xl shadow-ios p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        </div>
                      </div>
                      <p className="text-sm font-medium text-gray-500 mb-1">已完成</p>
                      <p className="text-2xl font-bold text-gray-900 tracking-tight">
                        {statistics.word_formatter.completed}
                      </p>
                    </div>

                    {/* Running */}
                    <div className="bg-white rounded-2xl shadow-ios p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                          <Loader2 className="w-5 h-5 text-blue-600" />
                        </div>
                      </div>
                      <p className="text-sm font-medium text-gray-500 mb-1">运行中</p>
                      <p className="text-2xl font-bold text-gray-900 tracking-tight">
                        {statistics.word_formatter.running}
                      </p>
                    </div>

                    {/* Pending */}
                    <div className="bg-white rounded-2xl shadow-ios p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 bg-yellow-50 rounded-xl flex items-center justify-center">
                          <Clock className="w-5 h-5 text-yellow-600" />
                        </div>
                      </div>
                      <p className="text-sm font-medium text-gray-500 mb-1">等待中</p>
                      <p className="text-2xl font-bold text-gray-900 tracking-tight">
                        {statistics.word_formatter.pending}
                      </p>
                    </div>

                    {/* Failed */}
                    <div className="bg-white rounded-2xl shadow-ios p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                          <XCircle className="w-5 h-5 text-red-600" />
                        </div>
                      </div>
                      <p className="text-sm font-medium text-gray-500 mb-1">失败</p>
                      <p className="text-2xl font-bold text-gray-900 tracking-tight">
                        {statistics.word_formatter.failed}
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="grid grid-cols-1 gap-8">
              {/* Users List */}
              <div>
                <div className="bg-white rounded-2xl shadow-ios overflow-hidden">
                  <div className="p-6 border-b border-gray-100">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center">
                          <Users className="w-5 h-5 text-gray-600" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-900">用户管理</h2>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={exportUsersToCSV}
                          className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors text-sm font-medium"
                        >
                          <Download className="w-4 h-4" />
                          导出CSV
                        </button>
                        <button
                          onClick={() => { fetchUsers(); fetchStatistics(); }}
                          disabled={loadingUsers}
                          className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors text-sm font-medium shadow-sm"
                        >
                          <RefreshCw className={`w-4 h-4 ${loadingUsers ? 'animate-spin' : ''}`} />
                          刷新
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    {loadingUsers ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : users.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        暂无用户数据
                      </div>
                    ) : (
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">用户名</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">邮箱</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">剩余 / 已用</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">注册时间</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">最后登录</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {users.map((user) => (
                            <tr key={user.id} className="hover:bg-gray-50">
                              {/* 用户名 */}
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                    {(user.username || user.card_key || '?')[0].toUpperCase()}
                                  </div>
                                  <span className="text-sm font-medium text-gray-900">
                                    {user.username || <span className="text-gray-400 text-xs font-mono">{user.card_key?.slice(0,12)}…</span>}
                                  </span>
                                </div>
                              </td>
                              {/* 邮箱 */}
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                {user.email || <span className="text-gray-300">—</span>}
                              </td>
                              {/* 次数 */}
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                                {editingUserId === user.id ? (
                                  <div className="flex items-center justify-center gap-1">
                                    <input
                                      type="number"
                                      value={newUsageLimit}
                                      onChange={(e) => setNewUsageLimit(e.target.value)}
                                      className="w-16 px-2 py-1 border border-gray-300 rounded text-center text-xs"
                                      min="0"
                                    />
                                    <button onClick={() => handleUpdateUsageLimit(user.id, newUsageLimit)} className="text-green-600 hover:text-green-800">
                                      <CheckCircle className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={() => { setEditingUserId(null); setNewUsageLimit(''); }} className="text-red-500 hover:text-red-700">
                                      <XCircle className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center gap-1.5">
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                      (user.remaining_uses ?? 0) === 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                                    }`}>
                                      剩 {user.remaining_uses ?? 0}
                                    </span>
                                    <span className="text-xs text-gray-400">用 {user.usage_count || 0}</span>
                                    <button onClick={() => { setEditingUserId(user.id); setNewUsageLimit(user.usage_limit ?? 0); }} className="text-gray-400 hover:text-blue-600" title="设置上限">
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                )}
                              </td>
                              {/* 注册时间 */}
                              <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                                {new Date(user.created_at).toLocaleDateString('zh-CN')}
                              </td>
                              {/* 最后登录 */}
                              <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                                {user.last_login ? new Date(user.last_login).toLocaleDateString('zh-CN') : '—'}
                              </td>
                              {/* 状态 */}
                              <td className="px-4 py-3 whitespace-nowrap text-center">
                                {user.is_active ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                                    <CheckCircle className="w-3 h-3" />启用
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                                    <XCircle className="w-3 h-3" />禁用
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <button
                                    onClick={() => { setAddCreditsUserId(user.id); setAddCreditsAmount(10); }}
                                    className="px-2.5 py-1 bg-green-100 hover:bg-green-200 text-green-800 rounded transition-colors flex items-center gap-1 text-xs"
                                    title="赠送次数"
                                  >
                                    <Plus className="w-3 h-3" />赠送
                                  </button>
                                  <button
                                    onClick={() => handleViewUserDetails(user.id)}
                                    className="px-2.5 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded transition-colors flex items-center gap-1 text-xs"
                                  >
                                    <Eye className="w-3 h-3" />详情
                                  </button>
                                  <button
                                    onClick={() => handleToggleUserStatus(user.id, user.is_active)}
                                    className={`px-2.5 py-1 rounded transition-colors text-xs ${
                                      user.is_active ? 'bg-yellow-100 hover:bg-yellow-200 text-yellow-800' : 'bg-green-100 hover:bg-green-200 text-green-800'
                                    }`}
                                  >
                                    {user.is_active ? '禁用' : '启用'}
                                  </button>
                                  <button
                                    onClick={() => handleDeleteUser(user.id)}
                                    className="px-2.5 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded transition-colors flex items-center gap-1 text-xs"
                                  >
                                    <Trash2 className="w-3 h-3" />删除
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
        
        {/* Session Monitor Tab */}
        {activeTab === 'sessions' && (
          <SessionMonitor adminToken={adminToken} />
        )}
        
        {/* Database Manager Tab */}
        {activeTab === 'database' && (
          <DatabaseManager adminToken={adminToken} />
        )}
        
        {/* Config Manager Tab */}
        {activeTab === 'config' && (
          <ConfigManager adminToken={adminToken} />
        )}

        {/* Coupon Manager Tab */}
        {activeTab === 'coupons' && (
          <div className="space-y-6">
            {/* 创建卡券 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
                <Plus className="w-5 h-5 text-purple-600" />
                创建卡券
              </h3>

              {/* 第一行：核心参数 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    卡券类型
                  </label>
                  <select
                    value={couponType}
                    onChange={(e) => setCouponType(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none bg-white"
                  >
                    <option value="usage">使用次数（论文优化）</option>
                    <option value="image">图片点数（AI 生图）</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    每人获得数量
                    <span className="ml-1 text-xs text-gray-400 font-normal">次数或图片点数</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={couponCredits}
                    onChange={(e) => setCouponCredits(Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    最多兑换人数
                    <span className="ml-1 text-xs text-gray-400 font-normal">0 = 不限人数</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={couponMaxRedemptions}
                    onChange={(e) => setCouponMaxRedemptions(Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    过期时间
                    <span className="ml-1 text-xs text-gray-400 font-normal">留空 = 永不过期</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={couponExpiresAt}
                    onChange={(e) => setCouponExpiresAt(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    前缀（可选）
                    <span className="ml-1 text-xs text-gray-400 font-normal">用于批量区分</span>
                  </label>
                  <input
                    type="text"
                    value={couponPrefix}
                    onChange={(e) => setCouponPrefix(e.target.value)}
                    placeholder="如: VIP"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                  />
                </div>
              </div>

              {/* 第二行：批量生成 + 预览 + 按钮 */}
              <div className="flex items-end gap-4">
                <div className="w-36">
                  <label className="block text-sm font-medium text-gray-700 mb-1">批量生成张数</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={couponCount}
                    onChange={(e) => setCouponCount(Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                  />
                </div>
                {/* 预览说明 */}
                <div className="flex-1 bg-purple-50 border border-purple-100 rounded-lg px-4 py-2.5 text-sm text-purple-700">
                  将生成 <strong>{couponCount}</strong> 张卡券，每张可被
                  {couponMaxRedemptions > 0
                    ? <strong> 最多 {couponMaxRedemptions} 人 </strong>
                    : <strong> 不限人数 </strong>}
                  兑换，每人获得 <strong>{couponCredits} 次</strong> 使用机会
                  {couponExpiresAt && <>，有效期至 <strong>{new Date(couponExpiresAt).toLocaleDateString('zh-CN')}</strong></>}
                </div>
                <button
                  onClick={handleCreateCoupons}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-6 py-2.5 rounded-lg transition-all flex items-center gap-2 text-sm whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  生成卡券
                </button>
              </div>
            </div>

            {/* 卡券列表 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h3 className="text-lg font-bold text-gray-800">
                  卡券列表 <span className="text-sm text-gray-500 font-normal">({coupons.length})</span>
                </h3>
                <button
                  onClick={fetchCoupons}
                  className="text-gray-500 hover:text-purple-600 p-1.5 rounded-lg hover:bg-purple-50 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {loadingCoupons ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                </div>
              ) : coupons.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Ticket className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">暂无卡券</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                      <tr>
                        <th className="px-4 py-3 text-left">卡券码</th>
                        <th className="px-4 py-3 text-center">每人获得</th>
                        <th className="px-4 py-3 text-center">兑换进度</th>
                        <th className="px-4 py-3 text-center">过期时间</th>
                        <th className="px-4 py-3 text-center">状态</th>
                        <th className="px-4 py-3 text-center">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {coupons.map((c) => {
                        const statusMap = {
                          available: { label: '可用', cls: 'bg-green-50 text-green-700' },
                          exhausted:  { label: '已用尽', cls: 'bg-gray-100 text-gray-500' },
                          expired:    { label: '已过期', cls: 'bg-orange-50 text-orange-600' },
                          disabled:   { label: '已禁用', cls: 'bg-red-50 text-red-600' },
                        };
                        const st = statusMap[c.status] || statusMap.available;
                        const maxLabel = c.max_redemptions > 0 ? `/${c.max_redemptions}` : '（不限）';
                        return (
                          <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                            {/* 卡券码 */}
                            <td className="px-4 py-3 font-mono text-gray-800">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">{c.code}</span>
                                <button
                                  onClick={() => copyCouponCode(c.code)}
                                  className="text-gray-400 hover:text-purple-600 transition-colors"
                                  title="复制"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                            {/* 类型 + 每人获得数量 */}
                            <td className="px-4 py-3 text-center">
                              <div className="flex flex-col items-center gap-1">
                                <span className={`px-2 py-0.5 rounded-full font-semibold text-xs ${c.coupon_type === 'image' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-700'}`}>
                                  {c.coupon_type === 'image' ? '🖼 图片' : '📝 次数'}
                                </span>
                                <span className="text-xs text-gray-600">{c.credits} {c.coupon_type === 'image' ? '点' : '次'}</span>
                              </div>
                            </td>
                            {/* 兑换进度 */}
                            <td className="px-4 py-3 text-center">
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-xs font-medium text-gray-700">
                                  {c.used_count || 0} 人{maxLabel}
                                </span>
                                {c.max_redemptions > 0 && (
                                  <div className="w-20 bg-gray-200 rounded-full h-1.5">
                                    <div
                                      className="bg-purple-500 h-1.5 rounded-full transition-all"
                                      style={{ width: `${Math.min(100, ((c.used_count || 0) / c.max_redemptions) * 100)}%` }}
                                    />
                                  </div>
                                )}
                              </div>
                            </td>
                            {/* 过期时间 */}
                            <td className="px-4 py-3 text-center text-xs text-gray-500">
                              {c.expires_at
                                ? new Date(c.expires_at).toLocaleDateString('zh-CN')
                                : <span className="text-gray-300">永不过期</span>}
                            </td>
                            {/* 状态 */}
                            <td className="px-4 py-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${st.cls}`}>
                                {st.label}
                              </span>
                            </td>
                            {/* 操作 */}
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => handleToggleCoupon(c.id)}
                                  className="text-gray-400 hover:text-blue-600 transition-colors"
                                  title={c.is_active ? '禁用' : '启用'}
                                >
                                  {c.is_active
                                    ? <ToggleRight className="w-4 h-4 text-green-500" />
                                    : <ToggleLeft className="w-4 h-4" />}
                                </button>
                                <button
                                  onClick={() => handleDeleteCoupon(c.id)}
                                  className="text-gray-400 hover:text-red-600 transition-colors"
                                  title="删除"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 公告管理 Tab */}
        {activeTab === 'announcements' && (
          <div className="space-y-6">
            {/* 头部操作 */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-500" />
                公告管理
              </h3>
              <button
                onClick={() => { setShowAnnForm(true); setEditingAnnId(null); setAnnForm(emptyAnnForm); }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" /> 发布公告
              </button>
            </div>

            {/* 公告表单 */}
            {showAnnForm && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <h4 className="font-semibold text-gray-800 mb-4">{editingAnnId ? '编辑公告' : '发布新公告'}</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">标题</label>
                    <input type="text" value={annForm.title} onChange={e => setAnnForm(p => ({...p, title: e.target.value}))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                      placeholder="公告标题" maxLength={100} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">内容</label>
                    <textarea value={annForm.content} onChange={e => setAnnForm(p => ({...p, content: e.target.value}))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none"
                      rows={4} placeholder="公告内容…" />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">类型</label>
                      <select value={annForm.type} onChange={e => setAnnForm(p => ({...p, type: e.target.value}))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none">
                        <option value="info">📢 通知</option>
                        <option value="warning">⚠️ 警告</option>
                        <option value="event">🎉 活动</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">过期时间（可选）</label>
                      <input type="datetime-local" value={annForm.expires_at} onChange={e => setAnnForm(p => ({...p, expires_at: e.target.value}))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
                    </div>
                    <div className="flex items-end pb-0.5">
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={annForm.is_active} onChange={e => setAnnForm(p => ({...p, is_active: e.target.checked}))}
                            className="w-4 h-4 rounded" />
                          <span className="text-sm font-medium text-gray-700">立即启用</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={annForm.show_on_login} onChange={e => setAnnForm(p => ({...p, show_on_login: e.target.checked, is_active: e.target.checked ? true : p.is_active}))}
                            className="w-4 h-4 rounded" />
                          <span className="text-sm font-medium text-gray-700">登录即推送</span>
                        </label>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3 pt-1">
                    <button onClick={handleSaveAnn} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
                      {editingAnnId ? '保存修改' : '发布'}
                    </button>
                    <button onClick={() => { setShowAnnForm(false); setEditingAnnId(null); }} className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors">
                      取消
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 公告列表 */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <span className="text-sm font-medium text-gray-700">共 {announcements.length} 条公告</span>
                <button onClick={fetchAnnouncements} className="text-gray-400 hover:text-blue-600 p-1 rounded transition-colors"><RefreshCw className="w-4 h-4" /></button>
              </div>
              {loadingAnn ? (
                <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
              ) : announcements.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">暂无公告</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {announcements.map(ann => {
                    const typeMap = { info:'📢 通知', warning:'⚠️ 警告', event:'🎉 活动' };
                    const now = new Date();
                    const expired = ann.expires_at && new Date(ann.expires_at) < now;
                    return (
                      <div key={ann.id} className={`px-6 py-4 ${!ann.is_active || expired ? 'opacity-50' : ''}`}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{typeMap[ann.type] || ann.type}</span>
                              {ann.is_active && !expired
                                ? <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">已发布</span>
                                : expired
                                ? <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full">已过期</span>
                                : <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">已禁用</span>}
                              {ann.show_on_login && <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">登录即推送</span>}
                              <span className="text-xs text-gray-400">{new Date(ann.created_at).toLocaleDateString('zh-CN')}</span>
                              {ann.expires_at && <span className="text-xs text-gray-400">· 有效至 {new Date(ann.expires_at).toLocaleDateString('zh-CN')}</span>}
                            </div>
                            <p className="text-sm font-semibold text-gray-900 mb-0.5">{ann.title}</p>
                            <p className="text-sm text-gray-500 line-clamp-2 whitespace-pre-line">{ann.content}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button onClick={() => startEditAnn(ann)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="编辑">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleToggleAnn(ann.id)} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors" title={ann.is_active ? '禁用' : '启用'}>
                              {ann.is_active ? <ToggleRight className="w-4 h-4 text-green-500" /> : <ToggleLeft className="w-4 h-4" />}
                            </button>
                            <button onClick={() => handleDeleteAnn(ann.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="删除">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'forum' && (
          <ForumManager />
        )}
      </div>

      {/* 赠送次数弹窗 */}
      {addCreditsUserId && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">赠送次数</h3>
            <p className="text-sm text-gray-500 mb-4">
              在现有次数基础上增加，不影响已使用的次数。
            </p>
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">赠送数量</label>
              <input
                type="number" min={1} value={addCreditsAmount}
                onChange={e => setAddCreditsAmount(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={handleAddCredits} className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors">
                确认赠送
              </button>
              <button onClick={() => setAddCreditsUserId(null)} className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors">
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Details Modal */}
      {showUserDetails && userDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800">用户详细信息</h3>
              <button
                onClick={() => setShowUserDetails(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {/* User Info */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h4 className="font-semibold text-gray-800 mb-3">基本信息</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-600">卡密：</span>
                  <code className="ml-2 font-mono text-blue-600">{userDetails.user.card_key}</code>
                </div>
                <div>
                  <span className="text-gray-600">状态：</span>
                  <span className={`ml-2 ${userDetails.user.is_active ? 'text-green-600' : 'text-red-600'}`}>
                    {userDetails.user.is_active ? '启用' : '禁用'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">创建时间：</span>
                  <span className="ml-2">{new Date(userDetails.user.created_at).toLocaleString('zh-CN')}</span>
                </div>
                <div>
                  <span className="text-gray-600">最后使用：</span>
                  <span className="ml-2">
                    {userDetails.user.last_used 
                      ? new Date(userDetails.user.last_used).toLocaleString('zh-CN')
                      : '从未使用'}
                  </span>
                </div>
              </div>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-blue-600">{userDetails.statistics.total_sessions}</p>
                <p className="text-xs text-gray-600 mt-1">总会话数</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-green-600">{userDetails.statistics.completed_sessions}</p>
                <p className="text-xs text-gray-600 mt-1">完成会话</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-blue-600">{userDetails.statistics.total_segments}</p>
                <p className="text-xs text-gray-600 mt-1">处理段落</p>
              </div>
              <div className="bg-orange-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-orange-600">{userDetails.statistics.completed_segments}</p>
                <p className="text-xs text-gray-600 mt-1">完成段落</p>
              </div>
            </div>

            {/* Recent Sessions */}
            {userDetails.recent_sessions.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-800 mb-3">最近会话</h4>
                <div className="space-y-2">
                  {userDetails.recent_sessions.map((session) => (
                    <div key={session.id} className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Activity className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-800">
                            会话 #{session.id}
                            {session.processing_mode && (
                              <span className="ml-2 text-xs font-normal text-blue-600">
                                {session.processing_mode === 'paper_polish' ? '论文润色' :
                                 session.processing_mode === 'paper_enhance' ? '论文增强' :
                                 session.processing_mode === 'paper_polish_enhance' ? '润色+增强' :
                                 session.processing_mode === 'emotion_polish' ? '感情润色' :
                                 session.processing_mode}
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(session.created_at).toLocaleString('zh-CN')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          session.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : session.status === 'failed'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {session.status === 'completed' ? '已完成' :
                           session.status === 'failed' ? '失败' : '处理中'}
                        </span>
                        <button
                          onClick={() => {
                            setShowUserDetails(false);
                            setActiveTab('sessions');
                          }}
                          className="px-2 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                          title="在会话监控中查看详情"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => setShowUserDetails(false)}
              className="w-full mt-6 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition-colors"
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
