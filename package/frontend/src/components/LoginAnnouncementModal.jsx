import React, { useEffect, useMemo, useState } from 'react';
import { X, Info, AlertTriangle, Sparkles, Bell } from 'lucide-react';
import { announcementAPI } from '../api';

const STORAGE_KEY = 'login_push_announcements_read';

const TYPE_CFG = {
  info: { icon: Info, color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', label: '通知' },
  warning: { icon: AlertTriangle, color: '#d97706', bg: '#fffbeb', border: '#fde68a', label: '警告' },
  event: { icon: Sparkles, color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', label: '活动' },
};

export default function LoginAnnouncementModal({ enabled, userId }) {
  const storageKey = useMemo(() => `${STORAGE_KEY}_${userId || 'anonymous'}`, [userId]);
  const [announcements, setAnnouncements] = useState([]);
  const [readIds, setReadIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || '[]'); }
    catch { return []; }
  });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try { setReadIds(JSON.parse(localStorage.getItem(storageKey) || '[]')); }
    catch { setReadIds([]); }
  }, [storageKey]);

  useEffect(() => {
    if (!enabled || !userId) return;
    let mounted = true;
    announcementAPI
      .listLoginPush()
      .then((res) => {
        if (!mounted) return;
        setAnnouncements(res.data || []);
        const unread = (res.data || []).some((ann) => !readIds.includes(ann.id));
        setOpen(unread);
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, [enabled, userId, readIds]);

  const visible = useMemo(
    () => announcements.filter((ann) => !readIds.includes(ann.id)),
    [announcements, readIds]
  );

  if (!enabled || !open || visible.length === 0) return null;

  const closeAndMarkRead = () => {
    const next = Array.from(new Set([...readIds, ...visible.map((ann) => ann.id)]));
    setReadIds(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
    setOpen(false);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(28, 24, 20, 0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
    }}>
      <div style={{
        width: '100%', maxWidth: 520, maxHeight: '82vh', overflow: 'hidden',
        background: '#fff', borderRadius: 14,
        border: '1px solid rgba(140,120,96,0.18)',
        boxShadow: '0 24px 80px rgba(0,0,0,0.22)',
      }}>
        <div style={{
          padding: '1rem 1.125rem',
          borderBottom: '1px solid rgba(140,120,96,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Bell size={18} style={{ color: 'var(--accent, #a8835a)' }} />
            <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--ink, #2f281f)' }}>
              系统公告
            </span>
          </div>
          <button
            onClick={closeAndMarkRead}
            style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'rgba(92,74,56,0.55)', padding: 4 }}
            aria-label="关闭公告"
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ maxHeight: '58vh', overflowY: 'auto' }}>
          {visible.map((ann) => {
            const cfg = TYPE_CFG[ann.type] || TYPE_CFG.info;
            const Icon = cfg.icon;
            return (
              <div key={ann.id} style={{ padding: '1rem 1.125rem', borderBottom: '1px solid rgba(140,120,96,0.08)' }}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 10,
                    background: cfg.border,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Icon size={17} style={{ color: cfg.color }} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
                      <p style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: 'var(--ink, #2f281f)' }}>
                        {ann.title}
                      </p>
                      <span style={{
                        fontSize: '0.72rem', color: cfg.color, background: cfg.bg,
                        border: `1px solid ${cfg.border}`, borderRadius: 999, padding: '0.1rem 0.45rem',
                      }}>
                        {cfg.label}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--ink-soft, #6b5d4f)', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
                      {ann.content}
                    </p>
                    <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: 'rgba(92,74,56,0.52)' }}>
                      {new Date(ann.created_at).toLocaleDateString('zh-CN')}
                      {ann.expires_at && ` · 有效至 ${new Date(ann.expires_at).toLocaleDateString('zh-CN')}`}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ padding: '0.875rem 1.125rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={closeAndMarkRead} className="btn-o-primary" style={{ borderRadius: 8 }}>
            我知道了
          </button>
        </div>
      </div>
    </div>
  );
}
