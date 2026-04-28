import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, Info, AlertTriangle, Sparkles } from 'lucide-react';
import axios from 'axios';

const STORAGE_KEY = 'dismissed_announcements';

const TYPE_CFG = {
  info:    { icon: Info,          color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', label: '通知' },
  warning: { icon: AlertTriangle, color: '#d97706', bg: '#fffbeb', border: '#fde68a', label: '警告' },
  event:   { icon: Sparkles,      color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', label: '活动' },
};

export default function AnnouncementBell() {
  const [announcements, setAnnouncements] = useState([]);
  const [dismissed, setDismissed]         = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch { return []; }
  });
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    axios.get('/api/announcements').then(r => setAnnouncements(r.data)).catch(() => {});
  }, []);

  // 点击外部关闭
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const visible = announcements.filter(a => !dismissed.includes(a.id));
  const unread  = visible.length;

  const dismiss = (id) => {
    const next = [...dismissed, id];
    setDismissed(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const dismissAll = () => {
    const next = [...dismissed, ...visible.map(a => a.id)];
    setDismissed(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setOpen(false);
  };

  return (
    <div ref={ref} style={{ position:'relative' }}>
      {/* 铃铛按钮 */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position:'relative', display:'flex', alignItems:'center', justifyContent:'center',
          width:34, height:34, borderRadius:'50%',
          background: open ? 'rgba(140,120,96,0.12)' : 'none',
          border:'none', cursor:'pointer', transition:'background 150ms',
          color: unread > 0 ? 'var(--accent)' : 'var(--ink-soft)',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(140,120,96,0.1)'}
        onMouseLeave={e => e.currentTarget.style.background = open ? 'rgba(140,120,96,0.12)' : 'none'}
        title="公告"
      >
        <Bell size={17} />
        {unread > 0 && (
          <span style={{
            position:'absolute', top:4, right:4,
            width:8, height:8, borderRadius:'50%',
            background:'#ef4444', border:'1.5px solid #fdf8f0',
            animation: 'pulse-bell 2s ease-in-out infinite',
          }} />
        )}
      </button>

      {/* 下拉面板 */}
      {open && (
        <div style={{
          position:'absolute', top:'calc(100% + 8px)', right:0,
          width:320, maxHeight:440, overflowY:'auto',
          background:'#fff', borderRadius:12,
          border:'1px solid rgba(140,120,96,0.15)',
          boxShadow:'0 8px 32px rgba(0,0,0,0.12)',
          zIndex:200,
        }}>
          {/* 面板头 */}
          <div style={{ padding:'0.875rem 1rem 0.75rem', borderBottom:'1px solid rgba(140,120,96,0.1)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <span style={{ fontSize:'0.875rem', fontWeight:700, color:'var(--ink)' }}>
              公告 {unread > 0 && <span style={{ marginLeft:4, fontSize:'0.75rem', color:'var(--ink-soft)', fontWeight:400 }}>({unread} 条未读)</span>}
            </span>
            {unread > 0 && (
              <button
                onClick={dismissAll}
                style={{ fontSize:'0.75rem', color:'var(--ink-soft)', background:'none', border:'none', cursor:'pointer', padding:'2px 6px', borderRadius:4 }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--ink)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--ink-soft)'}
              >
                全部已读
              </button>
            )}
          </div>

          {/* 公告列表 */}
          {visible.length === 0 ? (
            <div style={{ padding:'2.5rem 1rem', textAlign:'center' }}>
              <Bell size={28} style={{ color:'rgba(140,120,96,0.25)', display:'block', margin:'0 auto 0.5rem' }} />
              <p style={{ margin:0, fontSize:'0.875rem', color:'var(--ink-soft)', opacity:0.6 }}>暂无公告</p>
            </div>
          ) : (
            <div>
              {visible.map(ann => {
                const cfg = TYPE_CFG[ann.type] || TYPE_CFG.info;
                const Icon = cfg.icon;
                return (
                  <div
                    key={ann.id}
                    style={{
                      padding:'0.875rem 1rem',
                      borderBottom:'1px solid rgba(140,120,96,0.07)',
                      background:cfg.bg,
                    }}
                  >
                    <div style={{ display:'flex', alignItems:'flex-start', gap:'0.625rem' }}>
                      <div style={{ width:28, height:28, borderRadius:8, background:cfg.border, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 }}>
                        <Icon size={14} style={{ color:cfg.color }} />
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'0.3rem' }}>
                          <p style={{ margin:0, fontSize:'0.875rem', fontWeight:700, color:'var(--ink)' }}>{ann.title}</p>
                          <button
                            onClick={() => dismiss(ann.id)}
                            style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(140,120,96,0.5)', padding:2, borderRadius:4, flexShrink:0, marginLeft:8 }}
                            onMouseEnter={e => e.currentTarget.style.color = 'var(--ink)'}
                            onMouseLeave={e => e.currentTarget.style.color = 'rgba(140,120,96,0.5)'}
                          >
                            <X size={13} />
                          </button>
                        </div>
                        <p style={{ margin:0, fontSize:'0.82rem', color:'var(--ink-soft)', lineHeight:1.55, whiteSpace:'pre-line' }}>{ann.content}</p>
                        <p style={{ margin:'0.4rem 0 0', fontSize:'0.73rem', color:'rgba(140,120,96,0.55)' }}>
                          {new Date(ann.created_at).toLocaleDateString('zh-CN')}
                          {ann.expires_at && ` · 有效至 ${new Date(ann.expires_at).toLocaleDateString('zh-CN')}`}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes pulse-bell {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.3); }
        }
      `}</style>
    </div>
  );
}
