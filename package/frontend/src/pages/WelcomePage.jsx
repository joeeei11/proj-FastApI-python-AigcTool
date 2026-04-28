import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Eye, EyeOff } from 'lucide-react';
import { authAPI } from '../api';
import { useAuth } from '../auth/AuthContext';

export default function WelcomePage() {
  const [tab, setTab] = useState('login');
  const [form, setForm] = useState({ username: '', password: '', confirm: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  // 解析后端错误信息（兼容 Pydantic 422 数组格式和普通字符串格式）
  const parseError = (err, fallback) => {
    const detail = err.response?.data?.detail;
    if (!detail) return fallback;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail) && detail.length > 0) {
      return detail[0]?.msg || fallback;
    }
    return fallback;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username.trim() || !form.password.trim()) { toast.error('请填写用户名和密码'); return; }
    if (tab === 'register') {
      if (form.username.trim().length < 3) { toast.error('用户名至少 3 个字符'); return; }
      if (form.password !== form.confirm) { toast.error('两次密码不一致'); return; }
      if (form.password.length < 6) { toast.error('密码至少 6 位'); return; }
    }
    setLoading(true);
    try {
      const res = tab === 'login'
        ? await authAPI.login({ username: form.username, password: form.password })
        : await authAPI.register({ username: form.username, password: form.password });
      const { access_token, user_id, username, remaining_uses } = res.data;
      login(access_token, { id: user_id, username, remaining_uses });
      toast.success(tab === 'login' ? '欢迎回来' : '账号创建成功');
      navigate(remaining_uses === 0 ? '/redeem' : '/workspace');
    } catch (err) {
      toast.error(parseError(err, tab === 'login' ? '用户名或密码错误' : '注册失败，请重试'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-bg flex flex-col min-h-screen">
      {/* 顶部导航 */}
      <header style={{ position:'relative', zIndex:10, padding:'1.25rem 1.5rem 0', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <a href="/" className="brand-o">
          <span className="brand-mark-o" />
          <span>OriginFlow</span>
        </a>
        <button
          onClick={() => navigate('/admin')}
          style={{
            background: 'rgba(255,250,243,0.58)',
            border: '1px solid rgba(83,67,49,0.14)',
            borderRadius: '999px',
            padding: '0.5rem 1rem',
            fontSize: '0.875rem',
            color: 'var(--ink-soft)',
            cursor: 'pointer',
            fontFamily: 'Manrope, sans-serif',
            fontWeight: 500,
            backdropFilter: 'blur(14px)',
            transition: 'all 240ms ease',
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--ink)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--ink-soft)'}
        >
          管理后台
        </button>
      </header>

      {/* 主体 */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem', position: 'relative', zIndex: 1 }}>
        <div style={{ width: '100%', maxWidth: '420px', animation: 'fadeInUp 0.6s cubic-bezier(0.16,1,0.3,1) both' }}>

          {/* 标题区 */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 52, height: 52, borderRadius: '50%', marginBottom: '1.25rem',
              background: 'linear-gradient(135deg, #3d5a4e, #5f856f 60%, #c3a06a)',
              boxShadow: '0 12px 28px rgba(61,82,72,0.25)',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 9.414V19a2 2 0 01-2 2z" stroke="#fdf8f0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.04em', color: 'var(--ink)', margin: '0 0 0.4rem' }}>
              {tab === 'login' ? '欢迎回来' : '创建账号'}
            </h1>
            <p style={{ color: 'var(--ink-soft)', fontSize: '0.9rem', margin: 0 }}>
              AI 学术写作 · 论文润色增强
            </p>
          </div>

          {/* 卡片 */}
          <div className="card-o" style={{ padding: '2rem' }}>
            {/* Tab */}
            <div className="tabs-o" style={{ marginBottom: '1.5rem' }}>
              {[['login', '登录'], ['register', '注册账号']].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => { setTab(key); setForm({ username: '', password: '', confirm: '' }); }}
                  className={`tab-o ${tab === key ? 'active' : ''}`}
                >
                  {label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display:'block', fontSize:'0.85rem', fontWeight:600, color:'var(--ink)', marginBottom:'0.5rem' }}>
                  用户名
                </label>
                <input
                  name="username"
                  type="text"
                  value={form.username}
                  onChange={handleChange}
                  placeholder="请输入用户名"
                  autoComplete="username"
                  className="input-o"
                />
              </div>

              <div>
                <label style={{ display:'block', fontSize:'0.85rem', fontWeight:600, color:'var(--ink)', marginBottom:'0.5rem' }}>
                  密码
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    name="password"
                    type={showPwd ? 'text' : 'password'}
                    value={form.password}
                    onChange={handleChange}
                    placeholder={tab === 'register' ? '至少 6 位' : '请输入密码'}
                    autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                    className="input-o"
                    style={{ paddingRight: '2.75rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    style={{ position:'absolute', right:'0.75rem', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'var(--ink-soft)', cursor:'pointer', padding:'0.2rem', opacity:0.7 }}
                  >
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {tab === 'register' && (
                <div>
                  <label style={{ display:'block', fontSize:'0.85rem', fontWeight:600, color:'var(--ink)', marginBottom:'0.5rem' }}>
                    确认密码
                  </label>
                  <input
                    name="confirm"
                    type="password"
                    value={form.confirm}
                    onChange={handleChange}
                    placeholder="再次输入密码"
                    autoComplete="new-password"
                    className="input-o"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-o-primary"
                style={{ width: '100%', marginTop: '0.5rem', justifyContent: 'center' }}
              >
                {loading ? (
                  <><span style={{ width:16, height:16, border:'2px solid rgba(255,248,240,0.3)', borderTopColor:'#fdf8f0', borderRadius:'50%', display:'inline-block', animation:'spin-slow 2s linear infinite' }} />{tab === 'login' ? '登录中…' : '创建中…'}</>
                ) : (tab === 'login' ? '登录' : '创建账号')}
              </button>
            </form>
          </div>

          <p style={{ textAlign:'center', fontSize:'0.78rem', color:'var(--ink-dis, rgba(92,74,56,0.45))', marginTop:'1.5rem' }}>
            使用本系统即表示您同意遵守学术诚信规范
          </p>
        </div>
      </div>
    </div>
  );
}
