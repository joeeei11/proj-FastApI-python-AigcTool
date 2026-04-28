import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  User, Lock, History, ShoppingBag, ChevronRight,
  CheckCircle, XCircle, Clock, Ticket, LogOut, ArrowLeft,
} from 'lucide-react';
import { authAPI, optimizationAPI } from '../api';
import { useAuth } from '../auth/AuthContext';

const WECHAT_ID  = 'hx18817069896';
const WECHAT_QR  = '/wechat_qr.jpg';
const PRICE_TEXT = '2 元 / 次';

const MODE_LABELS = {
  paper_polish:         '论文润色',
  paper_enhance:        '原创增强',
  paper_polish_enhance: '润色 + 增强',
  emotion_polish:       '感情润色',
};

const STATUS_CFG = {
  completed:  { label: '已完成', color: '#2e7d5e' },
  processing: { label: '处理中', color: '#c3a06a' },
  queued:     { label: '排队中', color: '#8c8078' },
  failed:     { label: '失败',   color: '#b84c3a' },
  stopped:    { label: '已停止', color: '#8c8078' },
};

export default function ProfilePage() {
  const navigate = useNavigate();
  const { userInfo, logout, updateUserInfo } = useAuth();

  const [profile, setProfile]   = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loadingP, setLoadingP] = useState(true);
  const [loadingS, setLoadingS] = useState(true);

  // 修改密码
  const [oldPwd, setOldPwd]       = useState('');
  const [newPwd, setNewPwd]       = useState('');
  const [confirmPwd, setConfirm]  = useState('');
  const [changingPwd, setChanging] = useState(false);

  // 兑换卡券
  const [couponCode, setCouponCode] = useState('');
  const [redeeming, setRedeeming]   = useState(false);

  useEffect(() => {
    authAPI.me().then(r => { setProfile(r.data); setLoadingP(false); }).catch(() => setLoadingP(false));
    optimizationAPI.listSessions().then(r => { setSessions(r.data); setLoadingS(false); }).catch(() => setLoadingS(false));
  }, []);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPwd !== confirmPwd) { toast.error('两次密码不一致'); return; }
    if (newPwd.length < 6) { toast.error('新密码至少 6 位'); return; }
    setChanging(true);
    try {
      await authAPI.changePassword({ old_password: oldPwd, new_password: newPwd });
      toast.success('密码修改成功，下次登录使用新密码');
      setOldPwd(''); setNewPwd(''); setConfirm('');
    } catch (err) {
      toast.error(err.response?.data?.detail || '修改失败');
    } finally { setChanging(false); }
  };

  const handleRedeem = async (e) => {
    e.preventDefault();
    if (!couponCode.trim()) { toast.error('请输入卡券码'); return; }
    setRedeeming(true);
    try {
      const res = await authAPI.redeem(couponCode.trim().toUpperCase());
      const { added_uses, remaining_uses } = res.data;
      toast.success(`兑换成功！获得 ${added_uses} 次使用机会`);
      updateUserInfo({ remaining_uses });
      setProfile(prev => prev ? { ...prev, remaining_uses, usage_limit: prev.usage_limit + added_uses } : prev);
      setCouponCode('');
    } catch (err) {
      toast.error(err.response?.data?.detail || '兑换失败');
    } finally { setRedeeming(false); }
  };

  const remaining = profile?.remaining_uses ?? userInfo?.remaining_uses ?? 0;
  const usedCount = profile?.usage_count ?? 0;
  const totalGot  = profile?.usage_limit ?? 0;

  const completedCount = sessions.filter(s => s.status === 'completed').length;

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(180deg,#fcfaf5 0%,#f2ece1 44%,#f8f5ee 100%)', fontFamily:'Manrope, sans-serif' }}>

      {/* 顶部导航 */}
      <header className="header-o">
        <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', flex:1 }}>
          <button
            onClick={() => navigate('/workspace')}
            style={{ display:'flex', alignItems:'center', gap:'0.375rem', background:'none', border:'none', cursor:'pointer', color:'var(--ink-soft)', fontSize:'0.875rem', padding:'0.25rem 0.5rem', borderRadius:6 }}
          >
            <ArrowLeft size={15} /> 返回工作台
          </button>
          <span style={{ width:1, height:18, background:'rgba(140,120,96,0.2)' }} />
          <span style={{ fontSize:'0.875rem', color:'var(--ink)', fontWeight:600 }}>个人中心</span>
        </div>
        <button
          onClick={() => { logout(); navigate('/'); }}
          className="btn-o-ghost btn-o-sm"
          style={{ borderRadius:'999px', display:'flex', alignItems:'center', gap:'0.375rem' }}
        >
          <LogOut size={14} /> 退出登录
        </button>
      </header>

      {/* 主内容 */}
      <main style={{ maxWidth:760, margin:'0 auto', padding:'2rem 1.25rem 4rem' }}>

        {/* ── 账号信息 ── */}
        <section className="card-o" style={{ padding:'1.5rem', marginBottom:'1.25rem' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'1rem', marginBottom:'1.25rem' }}>
            <div style={{ width:52, height:52, borderRadius:'50%', background:'linear-gradient(135deg,#3d5a4e,#5f856f)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fdf8f0', fontSize:'1.375rem', fontWeight:700, flexShrink:0 }}>
              {(profile?.username || userInfo?.username || '?')[0].toUpperCase()}
            </div>
            <div>
              <p style={{ margin:0, fontSize:'1.1rem', fontWeight:700, color:'var(--ink)' }}>{profile?.username || userInfo?.username}</p>
              {profile?.email && <p style={{ margin:'0.2rem 0 0', fontSize:'0.85rem', color:'var(--ink-soft)' }}>{profile.email}</p>}
              {profile?.created_at && (
                <p style={{ margin:'0.15rem 0 0', fontSize:'0.8rem', color:'var(--ink-soft)', opacity:0.7 }}>
                  注册于 {new Date(profile.created_at).toLocaleDateString('zh-CN')}
                </p>
              )}
            </div>
          </div>

          {/* 使用统计 */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'0.75rem' }}>
            {[
              { label:'剩余次数', value: remaining, color: remaining > 0 ? '#2e7d5e' : '#b84c3a' },
              { label:'已使用',   value: usedCount,  color: '#c3a06a' },
              { label:'完成任务', value: completedCount, color: '#5f7a6e' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background:'rgba(255,251,244,0.8)', borderRadius:10, padding:'0.875rem', textAlign:'center', border:'1px solid rgba(140,120,96,0.1)' }}>
                <p style={{ margin:'0 0 0.25rem', fontSize:'1.75rem', fontWeight:800, color, letterSpacing:'-0.03em' }}>{value}</p>
                <p style={{ margin:0, fontSize:'0.78rem', color:'var(--ink-soft)' }}>{label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── 兑换卡券 ── */}
        <section className="card-o" style={{ padding:'1.5rem', marginBottom:'1.25rem' }}>
          <h3 style={{ margin:'0 0 1rem', fontSize:'0.95rem', fontWeight:700, color:'var(--ink)', display:'flex', alignItems:'center', gap:'0.5rem' }}>
            <Ticket size={16} style={{ color:'var(--accent)' }} /> 兑换卡券
          </h3>
          <form onSubmit={handleRedeem} style={{ display:'flex', gap:'0.625rem' }}>
            <input
              type="text"
              value={couponCode}
              onChange={e => setCouponCode(e.target.value.toUpperCase())}
              placeholder="输入卡券码"
              maxLength={24}
              className="input-o"
              style={{ flex:1, letterSpacing:'0.1em', fontWeight:600, textTransform:'uppercase' }}
            />
            <button
              type="submit"
              disabled={redeeming || !couponCode.trim()}
              className="btn-o-primary"
              style={{ whiteSpace:'nowrap' }}
            >
              {redeeming ? '兑换中…' : '立即兑换'}
            </button>
          </form>
        </section>

        {/* ── 修改密码 ── */}
        <section className="card-o" style={{ padding:'1.5rem', marginBottom:'1.25rem' }}>
          <h3 style={{ margin:'0 0 1rem', fontSize:'0.95rem', fontWeight:700, color:'var(--ink)', display:'flex', alignItems:'center', gap:'0.5rem' }}>
            <Lock size={16} style={{ color:'var(--accent)' }} /> 修改密码
          </h3>
          <form onSubmit={handleChangePassword} style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
            {[
              { label:'当前密码', value:oldPwd, setter:setOldPwd, placeholder:'输入当前密码' },
              { label:'新密码',   value:newPwd, setter:setNewPwd, placeholder:'至少 6 位' },
              { label:'确认密码', value:confirmPwd, setter:setConfirm, placeholder:'再次输入新密码' },
            ].map(({ label, value, setter, placeholder }) => (
              <div key={label}>
                <label style={{ display:'block', fontSize:'0.85rem', fontWeight:600, color:'var(--ink)', marginBottom:'0.375rem' }}>{label}</label>
                <input
                  type="password"
                  value={value}
                  onChange={e => setter(e.target.value)}
                  placeholder={placeholder}
                  className="input-o"
                  style={{ width:'100%' }}
                  required
                />
              </div>
            ))}
            <button
              type="submit"
              disabled={changingPwd}
              className="btn-o-primary"
              style={{ alignSelf:'flex-start', marginTop:'0.25rem' }}
            >
              {changingPwd ? '保存中…' : '保存修改'}
            </button>
          </form>
        </section>

        {/* ── 历史记录 ── */}
        <section className="card-o" style={{ padding:'1.5rem', marginBottom:'1.25rem' }}>
          <h3 style={{ margin:'0 0 1rem', fontSize:'0.95rem', fontWeight:700, color:'var(--ink)', display:'flex', alignItems:'center', gap:'0.5rem' }}>
            <History size={16} style={{ color:'var(--accent)' }} /> 使用历史
            <span style={{ marginLeft:'auto', fontSize:'0.8rem', color:'var(--ink-soft)', fontWeight:400 }}>{sessions.length} 条记录</span>
          </h3>

          {loadingS ? (
            <div style={{ textAlign:'center', padding:'2rem 0', color:'var(--ink-soft)' }}>加载中…</div>
          ) : sessions.length === 0 ? (
            <div style={{ textAlign:'center', padding:'2rem 0', color:'var(--ink-soft)', opacity:0.6 }}>暂无使用记录</div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
              {sessions.map(s => {
                const st = STATUS_CFG[s.status] || STATUS_CFG.queued;
                return (
                  <div
                    key={s.id || s.session_id}
                    onClick={() => navigate(`/session/${s.session_id}`)}
                    style={{ display:'flex', alignItems:'center', gap:'0.75rem', padding:'0.75rem 0.875rem', borderRadius:10, border:'1px solid rgba(140,120,96,0.1)', background:'rgba(255,251,244,0.6)', cursor:'pointer', transition:'background 150ms' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,248,238,0.9)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,251,244,0.6)'}
                  >
                    <span style={{ display:'inline-block', width:8, height:8, borderRadius:'50%', background:st.color, flexShrink:0 }} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ margin:0, fontSize:'0.875rem', color:'var(--ink)', fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {s.preview_text || '(无预览)'}
                      </p>
                      <p style={{ margin:'0.2rem 0 0', fontSize:'0.78rem', color:'var(--ink-soft)' }}>
                        {MODE_LABELS[s.processing_mode] || s.processing_mode}
                        {s.original_char_count > 0 && ` · ${s.original_char_count.toLocaleString()} 字符`}
                      </p>
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      <p style={{ margin:0, fontSize:'0.78rem', fontWeight:600, color:st.color }}>{st.label}</p>
                      <p style={{ margin:'0.15rem 0 0', fontSize:'0.75rem', color:'var(--ink-soft)' }}>
                        {new Date(s.created_at).toLocaleDateString('zh-CN')}
                      </p>
                    </div>
                    <ChevronRight size={14} style={{ color:'rgba(140,120,96,0.4)', flexShrink:0 }} />
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── 购买次数 ── */}
        <section className="card-o" style={{ padding:'1.5rem' }}>
          <h3 style={{ margin:'0 0 0.5rem', fontSize:'0.95rem', fontWeight:700, color:'var(--ink)', display:'flex', alignItems:'center', gap:'0.5rem' }}>
            <ShoppingBag size={16} style={{ color:'var(--accent)' }} /> 购买次数
          </h3>
          <p style={{ margin:'0 0 1.25rem', fontSize:'0.875rem', color:'var(--ink-soft)', lineHeight:1.6 }}>
            次数用完后，添加微信联系购买，发送卡券码后可立即兑换。
          </p>

          <div style={{ display:'flex', gap:'1.5rem', alignItems:'flex-start', flexWrap:'wrap' }}>
            {/* 二维码 */}
            <div style={{ textAlign:'center', flexShrink:0 }}>
              <img
                src={WECHAT_QR}
                alt="微信二维码"
                style={{ width:148, height:148, borderRadius:12, border:'1px solid rgba(140,120,96,0.15)', objectFit:'cover', display:'block' }}
                onError={e => { e.target.style.display='none'; }}
              />
              <p style={{ margin:'0.5rem 0 0', fontSize:'0.78rem', color:'var(--ink-soft)' }}>扫码添加微信</p>
            </div>

            {/* 文字说明 */}
            <div style={{ flex:1, minWidth:180 }}>
              <div style={{ background:'rgba(195,160,106,0.08)', borderRadius:10, padding:'1rem 1.25rem', border:'1px solid rgba(195,160,106,0.2)', marginBottom:'0.875rem' }}>
                <p style={{ margin:'0 0 0.25rem', fontSize:'1.5rem', fontWeight:800, color:'var(--accent)', letterSpacing:'-0.03em' }}>{PRICE_TEXT}</p>
                <p style={{ margin:0, fontSize:'0.85rem', color:'var(--ink-soft)' }}>按需购买，无月费</p>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem', fontSize:'0.875rem', color:'var(--ink-soft)' }}>
                {[
                  '微信号：' + WECHAT_ID,
                  '备注"购买次数"及所需数量',
                  '收款后发送卡券码，即时到账',
                ].map((t, i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
                    <CheckCircle size={13} style={{ color:'#2e7d5e', flexShrink:0 }} />
                    <span>{t}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
