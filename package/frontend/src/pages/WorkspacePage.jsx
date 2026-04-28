import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Play, History, AlertCircle, CheckCircle, Trash2, RefreshCw, ChevronRight, Layers, Paperclip } from 'lucide-react';
import { optimizationAPI } from '../api';
import { useAuth } from '../auth/AuthContext';
import AnnouncementBell from '../components/AnnouncementBell';
import { useRef } from 'react';

const STATUS = {
  completed: { label: '已完成', badge: 'badge-o-green' },
  processing: { label: '处理中', badge: 'badge-o-warm' },
  queued:     { label: '排队中', badge: 'badge-o-gray' },
  failed:     { label: '失败',   badge: 'badge-o-red' },
  stopped:    { label: '已停止', badge: 'badge-o-gray' },
};

const MODES = [
  { id: 'paper_polish_enhance', label: '润色 + 增强', desc: '两阶段完整处理' },
  { id: 'paper_polish',         label: '论文润色',   desc: '提升学术表达质量' },
  { id: 'paper_enhance',        label: '原创增强',   desc: '直接提升原创性' },
  { id: 'emotion_polish',       label: '感情文章',   desc: '自然人性化表达' },
];

const STAGE = { polish: '润色阶段', emotion_polish: '感情润色', enhance: '增强阶段' };

const SessionItem = memo(({ session, onView, onDelete, onRetry }) => {
  const s = STATUS[session.status] || STATUS.queued;
  return (
    <div
      onClick={() => onView(session.session_id)}
      style={{
        padding: '0.875rem 1rem',
        cursor: 'pointer',
        borderBottom: '1px solid rgba(140,120,96,0.1)',
        transition: 'background 200ms ease',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,250,243,0.7)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'0.4rem' }}>
        <span className={s.badge} style={{ fontSize:'0.75rem' }}>{s.label}</span>
        <span style={{ fontSize:'0.75rem', color:'var(--ink-soft)', opacity:0.7 }}>
          {new Date(session.created_at).toLocaleDateString('zh-CN')}
        </span>
      </div>
      <p style={{ margin:'0 0 0.5rem', fontSize:'0.875rem', color:'var(--ink-soft)', lineHeight:1.5, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>
        {session.preview_text || '暂无预览'}
      </p>
      {session.status === 'processing' && (
        <div className="progress-o" style={{ marginBottom:'0.4rem' }}>
          <div className="progress-o-bar" style={{ width: `${session.progress}%` }} />
        </div>
      )}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', gap:'0.25rem' }}>
        {session.status === 'failed' && (
          <button
            onClick={e => { e.stopPropagation(); onRetry(session); }}
            style={{ display:'inline-flex', alignItems:'center', gap:'0.25rem', padding:'0.2rem 0.5rem', borderRadius:'999px', fontSize:'0.75rem', fontWeight:600, background:'rgba(195,160,106,0.15)', border:'none', color:'var(--accent)', cursor:'pointer' }}
          >
            <RefreshCw size={11} /> 重试
          </button>
        )}
        <button
          onClick={e => { e.stopPropagation(); onDelete(session); }}
          style={{ padding:'0.25rem', borderRadius:'6px', background:'none', border:'none', color:'rgba(92,74,56,0.35)', cursor:'pointer', transition:'all 150ms ease' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#8b3a2a'; e.currentTarget.style.background = 'rgba(180,70,50,0.08)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(92,74,56,0.35)'; e.currentTarget.style.background = 'none'; }}
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
});
SessionItem.displayName = 'SessionItem';

export default function WorkspacePage() {
  const [text, setText] = useState('');
  const [mode, setMode] = useState('paper_polish_enhance');
  const [sessions, setSessions] = useState([]);
  const [queueStatus, setQueueStatus] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const { userInfo, logout } = useAuth();

  const loadSessions = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await optimizationAPI.listSessions();
      setSessions(res.data);
      const proc = res.data.find(s => s.status === 'processing' || s.status === 'queued');
      if (proc) setActiveSession(proc.session_id);
    } catch { /* silent */ } finally { setIsLoading(false); }
  }, []);

  const loadQueue = useCallback(async () => {
    try { const r = await optimizationAPI.getQueueStatus(); setQueueStatus(r.data); } catch { /* */ }
  }, []);

  const updateProgress = useCallback(async (sid) => {
    try {
      const { data } = await optimizationAPI.getSessionProgress(sid);
      setSessions(prev => {
        const t = prev.find(s => s.session_id === sid);
        if (t && t.progress === data.progress && t.status === data.status) return prev;
        return prev.map(s => s.session_id === sid ? { ...s, ...data } : s);
      });
      if (data.status === 'completed' || data.status === 'failed') {
        setActiveSession(null);
        loadSessions();
        data.status === 'completed' ? toast.success('优化完成！') : toast.error('优化失败，可重试');
      }
    } catch { /* */ }
  }, [loadSessions]);

  useEffect(() => { loadSessions(); loadQueue(); }, [loadSessions, loadQueue]);
  useEffect(() => { const t = setInterval(loadQueue, 15000); return () => clearInterval(t); }, [loadQueue]);
  useEffect(() => {
    if (!activeSession) return;
    const t = setInterval(() => updateProgress(activeSession), 4000);
    return () => clearInterval(t);
  }, [activeSession, updateProgress]);

  const handleStart = useCallback(async () => {
    if (!text.trim()) { toast.error('请输入要优化的文本'); return; }
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await optimizationAPI.startOptimization({ original_text: text, processing_mode: mode });
      setActiveSession(res.data.session_id);
      toast.success('优化任务已启动');
      setText('');
      loadSessions();
    } catch (err) { toast.error(err.response?.data?.detail || '启动失败，请重试'); }
    finally { setIsSubmitting(false); }
  }, [text, mode, isSubmitting, loadSessions]);

  const handleDelete = useCallback(async (session) => {
    if (!window.confirm('确认删除该会话及其结果？')) return;
    try {
      await optimizationAPI.deleteSession(session.session_id);
      if (activeSession === session.session_id) setActiveSession(null);
      toast.success('已删除');
      loadSessions();
    } catch { toast.error('删除失败'); }
  }, [activeSession, loadSessions]);

  const handleRetry = useCallback(async (session) => {
    if (!window.confirm('继续处理未完成的段落？')) return;
    try {
      await optimizationAPI.retryFailedSegments(session.session_id);
      setActiveSession(session.session_id);
      toast.success('已重新排队');
      loadSessions();
    } catch { toast.error('重试失败'); }
  }, [loadSessions]);

  const handleFileUpload = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const ext = file.name.split('.').pop().toLowerCase();
    if (!['txt', 'docx'].includes(ext)) {
      toast.error('仅支持 .txt 和 .docx 文件');
      return;
    }

    setIsExtracting(true);
    try {
      const res = await optimizationAPI.extractFile(file);
      setText(res.data.text);
      toast.success(`已导入「${file.name}」，共 ${res.data.char_count.toLocaleString()} 字符`);
    } catch (err) {
      toast.error(err.response?.data?.detail || '文件解析失败，请检查文件格式');
    } finally {
      setIsExtracting(false);
    }
  }, []);

  const activeSess = useMemo(() => sessions.find(s => s.session_id === activeSession), [sessions, activeSession]);
  const currentMode = MODES.find(m => m.id === mode);

  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', background: 'linear-gradient(180deg, #fcfaf5 0%, #f2ece1 44%, #f8f5ee 100%)' }}>
      {/* 顶部导航 */}
      <header className="header-o">
        <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', flex:1 }}>
          <a href="/" className="brand-o">
            <span className="brand-mark-o" />
            <span>OriginFlow</span>
          </a>
          <span style={{ width:1, height:20, background:'rgba(140,120,96,0.2)', margin:'0 0.25rem' }} />
          <span style={{ fontSize:'0.875rem', color:'var(--ink-soft)', fontWeight:500 }}>AI 学术写作</span>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
          {queueStatus && queueStatus.queue_length > 0 && (
            <span className="badge-o-warm" style={{ fontSize:'0.78rem' }}>
              排队 {queueStatus.queue_length}
            </span>
          )}
          <AnnouncementBell />
          {userInfo?.username && (
            <button
              onClick={() => navigate('/profile')}
              style={{ display:'flex', alignItems:'center', gap:'0.5rem', background:'none', border:'none', cursor:'pointer', padding:'0.25rem 0.5rem', borderRadius:8, transition:'background 150ms' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(140,120,96,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
              title="个人中心"
            >
              <div style={{
                width:28, height:28, borderRadius:'50%',
                background:'linear-gradient(135deg, #3d5a4e, #5f856f)',
                display:'flex', alignItems:'center', justifyContent:'center',
                color:'#fdf8f0', fontSize:'0.75rem', fontWeight:700,
              }}>
                {userInfo.username[0].toUpperCase()}
              </div>
              <span style={{ fontSize:'0.875rem', color:'var(--ink)', fontWeight:500 }}>{userInfo.username}</span>
              {userInfo.remaining_uses !== undefined && (
                <span className={userInfo.remaining_uses > 0 ? 'badge-o-green' : 'badge-o-red'} style={{ fontSize:'0.78rem' }}>
                  余 {userInfo.remaining_uses} 次
                </span>
              )}
            </button>
          )}
          <button
            onClick={() => { logout(); navigate('/'); }}
            className="btn-o-ghost btn-o-sm"
            style={{ borderRadius:'999px' }}
          >
            退出
          </button>
        </div>
      </header>

      {/* 主布局 */}
      <div style={{ flex:1, display:'flex', overflow:'hidden', position:'relative', zIndex:1 }}>

        {/* 左侧历史侧栏 */}
        <aside style={{
          width:280, flexShrink:0,
          background:'rgba(255,251,244,0.6)',
          borderRight:'1px solid rgba(140,120,96,0.14)',
          display:'flex', flexDirection:'column',
          backdropFilter:'blur(16px)',
        }}>
          <div style={{ padding:'1rem 1rem 0.75rem', borderBottom:'1px solid rgba(140,120,96,0.1)', display:'flex', alignItems:'center', gap:'0.5rem' }}>
            <History size={15} style={{ color:'var(--ink-soft)' }} />
            <span style={{ fontSize:'0.875rem', fontWeight:600, color:'var(--ink)' }}>历史记录</span>
            {sessions.length > 0 && (
              <span style={{ marginLeft:'auto', fontSize:'0.75rem', color:'var(--ink-soft)', opacity:0.7 }}>{sessions.length}</span>
            )}
          </div>
          <div style={{ flex:1, overflowY:'auto' }} className="custom-scrollbar">
            {isLoading ? (
              <div style={{ padding:'2rem', display:'flex', justifyContent:'center' }}>
                <div style={{ width:20, height:20, border:'2px solid rgba(140,120,96,0.2)', borderTopColor:'var(--green)', borderRadius:'50%', animation:'spin 1s linear infinite' }} />
              </div>
            ) : sessions.length === 0 ? (
              <div style={{ padding:'3rem 1rem', textAlign:'center' }}>
                <History size={28} style={{ color:'rgba(140,120,96,0.3)', margin:'0 auto 0.75rem', display:'block' }} />
                <p style={{ fontSize:'0.875rem', color:'var(--ink-soft)', opacity:0.6, margin:0 }}>暂无历史记录</p>
              </div>
            ) : sessions.map(s => (
              <SessionItem
                key={s.id}
                session={s}
                onView={id => navigate(`/session/${id}`)}
                onDelete={handleDelete}
                onRetry={handleRetry}
              />
            ))}
          </div>
        </aside>

        {/* 主内容区 */}
        <main style={{ flex:1, overflowY:'auto', padding:'1.75rem' }} className="custom-scrollbar">
          <div style={{ maxWidth:680, margin:'0 auto', display:'flex', flexDirection:'column', gap:'1.25rem' }}>

            {/* 模式选择 */}
            <div>
              <p className="text-o-label" style={{ marginBottom:'0.75rem' }}>处理模式</p>
              <div style={{ display:'flex', flexWrap:'wrap', gap:'0.5rem' }}>
                {MODES.map(m => (
                  <button
                    key={m.id}
                    onClick={() => setMode(m.id)}
                    className={`chip-o ${mode === m.id ? 'selected' : ''}`}
                    title={m.desc}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              <p style={{ marginTop:'0.5rem', fontSize:'0.8rem', color:'var(--ink-soft)', opacity:0.8 }}>
                {currentMode?.desc}
              </p>
            </div>

            {/* 文本输入卡片 */}
            <div className="card-o" style={{ overflow:'hidden' }}>
              {/* hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.docx"
                style={{ display:'none' }}
                onChange={handleFileUpload}
              />
              <div style={{ padding:'1rem 1.25rem 0.75rem', borderBottom:'1px solid rgba(140,120,96,0.1)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
                  <Layers size={15} style={{ color:'var(--ink-soft)' }} />
                  <span style={{ fontSize:'0.875rem', fontWeight:600, color:'var(--ink)' }}>粘贴内容</span>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isExtracting}
                    style={{
                      display:'flex', alignItems:'center', gap:'0.375rem',
                      padding:'0.3rem 0.75rem', borderRadius:6,
                      border:'1px solid rgba(140,120,96,0.25)',
                      background: isExtracting ? 'rgba(140,120,96,0.08)' : 'rgba(255,251,244,0.8)',
                      color:'var(--ink-soft)', fontSize:'0.8rem', fontWeight:500,
                      cursor: isExtracting ? 'not-allowed' : 'pointer',
                      transition:'all 150ms',
                    }}
                    onMouseEnter={e => { if (!isExtracting) { e.currentTarget.style.borderColor='var(--accent)'; e.currentTarget.style.color='var(--accent)'; }}}
                    onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(140,120,96,0.25)'; e.currentTarget.style.color='var(--ink-soft)'; }}
                    title="支持 .txt 和 .docx 文件"
                  >
                    {isExtracting ? (
                      <><span style={{ width:11, height:11, border:'1.5px solid rgba(140,120,96,0.3)', borderTopColor:'var(--accent)', borderRadius:'50%', display:'inline-block', animation:'spin 1s linear infinite' }} />解析中…</>
                    ) : (
                      <><Paperclip size={12} />上传文件</>
                    )}
                  </button>
                  <span style={{ fontSize:'0.78rem', color:'var(--ink-soft)', opacity:0.6 }}>{text.length.toLocaleString()} 字</span>
                </div>
              </div>
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="在此粘贴您需要优化的论文内容…"
                style={{
                  display:'block', width:'100%', minHeight:200,
                  padding:'1rem 1.25rem',
                  background:'transparent',
                  border:'none', outline:'none', resize:'none',
                  fontFamily:'Manrope, sans-serif', fontSize:'0.95rem',
                  color:'var(--ink)', lineHeight:1.75,
                }}
              />
              <div style={{ padding:'0.75rem 1.25rem', borderTop:'1px solid rgba(140,120,96,0.1)', display:'flex', justifyContent:'flex-end' }}>
                <button
                  onClick={handleStart}
                  disabled={!text.trim() || !!activeSession || isSubmitting}
                  className="btn-o-primary"
                  style={{ gap:'0.5rem' }}
                >
                  {isSubmitting ? (
                    <><span style={{ width:14, height:14, border:'2px solid rgba(255,248,240,0.3)', borderTopColor:'#fdf8f0', borderRadius:'50%', display:'inline-block', animation:'spin 1s linear infinite' }} />提交中…</>
                  ) : (
                    <><Play size={14} fill="#fdf8f0" />开始优化</>
                  )}
                </button>
              </div>
            </div>

            {/* 活跃任务进度卡片 */}
            {activeSession && activeSess && (
              <div className="card-o-sm" style={{ padding:'1.25rem', borderColor:'rgba(61,90,78,0.25)' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'0.875rem' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
                    <span style={{ width:8, height:8, borderRadius:'50%', background:'#3d5a4e', display:'inline-block', animation:'pulse 2s ease-in-out infinite' }} />
                    <span style={{ fontSize:'0.9rem', fontWeight:600, color:'var(--ink)' }}>正在处理</span>
                  </div>
                  <span className="badge-o-green">{STAGE[activeSess.current_stage] || activeSess.current_stage}</span>
                </div>
                <div className="progress-o" style={{ marginBottom:'0.75rem' }}>
                  <div className="progress-o-bar" style={{ width:`${activeSess.progress}%` }} />
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.8rem', color:'var(--ink-soft)' }}>
                  <span>段落 {activeSess.current_position + 1} / {activeSess.total_segments}</span>
                  <span style={{ fontWeight:600, color:'var(--green)' }}>{activeSess.progress.toFixed(1)}%</span>
                </div>
                {activeSess.status === 'queued' && queueStatus?.your_position && (
                  <p style={{ margin:'0.5rem 0 0', fontSize:'0.8rem', color:'var(--accent-soft, #a8835a)' }}>
                    排队第 {queueStatus.your_position} 位，约 {Math.ceil(queueStatus.estimated_wait_time / 60)} 分钟
                  </p>
                )}
              </div>
            )}

          </div>
        </main>
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes fadeInUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }
      `}</style>
    </div>
  );
}
