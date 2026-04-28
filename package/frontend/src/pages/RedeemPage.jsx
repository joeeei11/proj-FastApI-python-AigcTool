import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowRight } from 'lucide-react';
import { authAPI } from '../api';
import { useAuth } from '../auth/AuthContext';

export default function RedeemPage() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { userInfo, updateUserInfo } = useAuth();

  const handleRedeem = async () => {
    if (!code.trim()) { toast.error('请输入卡券码'); return; }
    setLoading(true);
    try {
      const res = await authAPI.redeem(code.trim().toUpperCase());
      const { added_uses, remaining_uses } = res.data;
      toast.success(`兑换成功！获得 ${added_uses} 次使用机会`);
      updateUserInfo({ remaining_uses });
      navigate('/workspace');
    } catch (err) {
      toast.error(err.response?.data?.detail || '卡券无效或已被使用');
    } finally { setLoading(false); }
  };

  return (
    <div className="page-bg flex flex-col min-h-screen">
      {/* 顶部 */}
      <header style={{ position:'relative', zIndex:10, padding:'1.25rem 1.5rem 0', display:'flex', alignItems:'center' }}>
        <a href="/" className="brand-o">
          <span className="brand-mark-o" />
          <span>OriginFlow</span>
        </a>
      </header>

      <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'2rem 1rem', position:'relative', zIndex:1 }}>
        <div style={{ width:'100%', maxWidth:400, animation:'fadeInUp 0.6s cubic-bezier(0.16,1,0.3,1) both' }}>

          {/* 头部说明 */}
          <div style={{ textAlign:'center', marginBottom:'2rem' }}>
            <div style={{
              display:'inline-flex', alignItems:'center', justifyContent:'center',
              width:52, height:52, borderRadius:'50%', marginBottom:'1.25rem',
              background:'linear-gradient(135deg, #c3a06a, #b68447)',
              boxShadow:'0 12px 28px rgba(180,132,71,0.28)',
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" stroke="#fdf8f0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h1 style={{ fontFamily:'Syne, sans-serif', fontSize:'1.6rem', fontWeight:700, letterSpacing:'-0.04em', color:'var(--ink)', margin:'0 0 0.4rem' }}>
              兑换卡券
            </h1>
            {userInfo && (
              <p style={{ color:'var(--ink-soft)', fontSize:'0.9rem', margin:0 }}>
                你好，<strong style={{ color:'var(--ink)' }}>{userInfo.username}</strong>
                {userInfo.remaining_uses > 0 && (
                  <span style={{ marginLeft:'0.25rem' }}>
                    · 当前剩余 <strong style={{ color:'var(--green)' }}>{userInfo.remaining_uses}</strong> 次
                  </span>
                )}
              </p>
            )}
          </div>

          {/* 卡片 */}
          <div className="card-o" style={{ padding:'1.75rem' }}>
            <p style={{ fontSize:'0.9rem', color:'var(--ink-soft)', lineHeight:1.7, margin:'0 0 1.5rem' }}>
              请输入管理员提供的卡券码，兑换后即可获得相应次数的使用机会。
            </p>

            <div style={{ marginBottom:'1rem' }}>
              <label style={{ display:'block', fontSize:'0.85rem', fontWeight:600, color:'var(--ink)', marginBottom:'0.5rem' }}>
                卡券码
              </label>
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && !loading && handleRedeem()}
                placeholder="输入卡券码"
                maxLength={20}
                className="input-o"
                style={{ letterSpacing:'0.12em', fontWeight:600, fontSize:'1rem', textTransform:'uppercase' }}
              />
            </div>

            <button
              onClick={handleRedeem}
              disabled={loading || !code.trim()}
              className="btn-o-primary"
              style={{ width:'100%', justifyContent:'center' }}
            >
              {loading ? (
                <><span style={{ width:14, height:14, border:'2px solid rgba(255,248,240,0.3)', borderTopColor:'#fdf8f0', borderRadius:'50%', display:'inline-block', animation:'spin 1s linear infinite' }} />兑换中…</>
              ) : '兑换'}
            </button>

            {userInfo?.remaining_uses > 0 && (
              <button
                onClick={() => navigate('/workspace')}
                style={{
                  display:'flex', alignItems:'center', justifyContent:'center', gap:'0.25rem',
                  width:'100%', marginTop:'0.875rem',
                  background:'none', border:'none', cursor:'pointer',
                  fontSize:'0.875rem', color:'var(--ink-soft)', fontFamily:'Manrope, sans-serif',
                  transition:'color 150ms ease',
                }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--ink)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--ink-soft)'}
              >
                跳过，直接使用 <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes fadeInUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }
      `}</style>
    </div>
  );
}
