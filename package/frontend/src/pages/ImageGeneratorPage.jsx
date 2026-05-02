import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Sparkles, Download, ImageIcon, Loader2, Ticket } from 'lucide-react';
import { imageAPI } from '../api';
import { useAuth } from '../auth/AuthContext';

const SIZES = [
  { value: '1024x1024', label: '1:1 方形', desc: '1024 × 1024' },
  { value: '1024x1536', label: '2:3 竖幅', desc: '1024 × 1536' },
  { value: '1536x1024', label: '3:2 横幅', desc: '1536 × 1024' },
];

const QUALITIES = [
  { value: 'standard', label: '标准', desc: '速度快，适合大多数场景' },
  { value: 'hd', label: '高清', desc: '细节更丰富，耗时略长' },
];

export default function ImageGeneratorPage() {
  const navigate = useNavigate();
  const { userInfo, updateUserInfo } = useAuth();

  const [prompt, setPrompt] = useState('');
  const [size, setSize] = useState('1024x1024');
  const [quality, setQuality] = useState('standard');
  const [loading, setLoading] = useState(false);

  const [result, setResult] = useState(null); // { b64_json, revised_prompt }
  const [imageCredits, setImageCredits] = useState(
    userInfo?.image_credits ?? null
  );

  const imgRef = useRef(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) { toast.error('请输入描述内容'); return; }
    if (imageCredits !== null && imageCredits <= 0) {
      toast.error('图片点数不足，请兑换图片卡券');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await imageAPI.generate({ prompt: prompt.trim(), size, quality });
      const { b64_json, revised_prompt, remaining_credits } = res.data;
      setResult({ b64_json, revised_prompt });
      setImageCredits(remaining_credits);
      updateUserInfo({ image_credits: remaining_credits });
      toast.success('生成成功！');
    } catch (err) {
      const msg = err.response?.data?.detail || '生成失败，请稍后重试';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!result?.b64_json) return;
    const src = result.b64_json.startsWith('data:')
      ? result.b64_json
      : `data:image/png;base64,${result.b64_json}`;
    const a = document.createElement('a');
    a.href = src;
    a.download = `originflow-image-${Date.now()}.png`;
    a.click();
  };

  const imgSrc = result?.b64_json
    ? (result.b64_json.startsWith('data:') ? result.b64_json : `data:image/png;base64,${result.b64_json}`)
    : null;

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg,#fcfaf5 0%,#f2ece1 44%,#f8f5ee 100%)', fontFamily: 'Manrope, sans-serif' }}>

      {/* 顶部导航 */}
      <header className="header-o">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
          <button
            onClick={() => navigate('/profile')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-soft)', fontSize: '0.875rem', padding: '0.25rem 0.5rem', borderRadius: 6 }}
          >
            <ArrowLeft size={15} /> 用户中心
          </button>
          <span style={{ width: 1, height: 18, background: 'rgba(140,120,96,0.2)' }} />
          <span style={{ fontSize: '0.875rem', color: 'var(--ink)', fontWeight: 600 }}>AI 生图</span>
        </div>

        {/* 剩余点数 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.82rem', color: 'var(--ink-soft)', background: 'rgba(140,120,96,0.07)', border: '1px solid rgba(140,120,96,0.15)', borderRadius: 8, padding: '0.3rem 0.75rem' }}>
          <ImageIcon size={13} />
          <span>图片点数：<strong style={{ color: (imageCredits ?? 0) > 0 ? '#2e7d5e' : '#b84c3a' }}>{imageCredits ?? '—'}</strong></span>
        </div>
      </header>

      <main style={{ maxWidth: 760, margin: '0 auto', padding: '2rem 1.25rem 4rem' }}>

        {/* 输入区 */}
        <section className="card-o" style={{ padding: '1.5rem', marginBottom: '1.25rem' }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: 700, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={16} style={{ color: 'var(--accent)' }} /> 描述你想生成的画面
          </h3>
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="例如：一只在秋日森林中漫步的狐狸，暖色调，写实风格…"
            rows={4}
            className="input-o"
            style={{ width: '100%', resize: 'vertical', lineHeight: 1.7, fontSize: '0.9rem' }}
          />

          {/* 尺寸选择 */}
          <div style={{ marginTop: '1rem' }}>
            <p style={{ margin: '0 0 0.5rem', fontSize: '0.82rem', fontWeight: 600, color: 'var(--ink-soft)' }}>尺寸</p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {SIZES.map(s => (
                <button
                  key={s.value}
                  onClick={() => setSize(s.value)}
                  style={{
                    padding: '0.45rem 0.875rem',
                    borderRadius: 8,
                    border: `1px solid ${size === s.value ? 'rgba(61,90,78,0.5)' : 'rgba(140,120,96,0.2)'}`,
                    background: size === s.value ? 'rgba(61,90,78,0.08)' : 'transparent',
                    color: size === s.value ? '#3d5a4e' : 'var(--ink-soft)',
                    cursor: 'pointer',
                    fontFamily: 'Manrope, sans-serif',
                    fontSize: '0.82rem',
                    fontWeight: size === s.value ? 700 : 400,
                    transition: 'all 120ms',
                  }}
                >
                  {s.label} <span style={{ opacity: 0.65 }}>{s.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 质量选择 */}
          <div style={{ marginTop: '0.875rem' }}>
            <p style={{ margin: '0 0 0.5rem', fontSize: '0.82rem', fontWeight: 600, color: 'var(--ink-soft)' }}>质量</p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {QUALITIES.map(q => (
                <button
                  key={q.value}
                  onClick={() => setQuality(q.value)}
                  style={{
                    padding: '0.45rem 0.875rem',
                    borderRadius: 8,
                    border: `1px solid ${quality === q.value ? 'rgba(61,90,78,0.5)' : 'rgba(140,120,96,0.2)'}`,
                    background: quality === q.value ? 'rgba(61,90,78,0.08)' : 'transparent',
                    color: quality === q.value ? '#3d5a4e' : 'var(--ink-soft)',
                    cursor: 'pointer',
                    fontFamily: 'Manrope, sans-serif',
                    fontSize: '0.82rem',
                    fontWeight: quality === q.value ? 700 : 400,
                    transition: 'all 120ms',
                  }}
                >
                  {q.label} <span style={{ opacity: 0.65, fontSize: '0.75rem' }}>— {q.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 生成按钮 */}
          <div style={{ marginTop: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              onClick={handleGenerate}
              disabled={loading || !prompt.trim()}
              className="btn-o-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 120, justifyContent: 'center' }}
            >
              {loading
                ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> 生成中…</>
                : <><Sparkles size={15} /> 立即生成</>
              }
            </button>
            <span style={{ fontSize: '0.8rem', color: 'var(--ink-soft)' }}>每次消耗 1 个图片点数</span>
          </div>

          {imageCredits !== null && imageCredits <= 0 && (
            <div style={{ marginTop: '0.75rem', padding: '0.625rem 0.875rem', background: 'rgba(184,76,58,0.06)', border: '1px solid rgba(184,76,58,0.2)', borderRadius: 8, fontSize: '0.82rem', color: '#b84c3a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Ticket size={13} />
              <span>图片点数不足。请返回<button onClick={() => navigate('/profile')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3d5a4e', fontWeight: 600, padding: '0 2px', fontFamily: 'Manrope, sans-serif', fontSize: '0.82rem' }}>用户中心</button>兑换图片卡券。</span>
            </div>
          )}
        </section>

        {/* 结果区 */}
        {loading && !result && (
          <section className="card-o" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
            <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent)', margin: '0 auto 1rem' }} />
            <p style={{ margin: 0, color: 'var(--ink-soft)', fontSize: '0.9rem' }}>AI 正在绘制中，通常需要 15–40 秒…</p>
          </section>
        )}

        {result && imgSrc && (
          <section className="card-o" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--ink)' }}>生成结果</h3>
              <button
                onClick={handleDownload}
                className="btn-o-ghost btn-o-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}
              >
                <Download size={14} /> 保存图片
              </button>
            </div>

            <img
              ref={imgRef}
              src={imgSrc}
              alt="生成结果"
              style={{ width: '100%', borderRadius: 12, border: '1px solid rgba(140,120,96,0.15)', display: 'block' }}
            />

            {result.revised_prompt && (
              <p style={{ margin: '0.875rem 0 0', fontSize: '0.78rem', color: 'var(--ink-soft)', lineHeight: 1.6, padding: '0.625rem 0.875rem', background: 'rgba(140,120,96,0.05)', borderRadius: 8 }}>
                <strong>AI 理解的描述：</strong>{result.revised_prompt}
              </p>
            )}

            <button
              onClick={() => { setResult(null); setPrompt(''); }}
              style={{ marginTop: '1rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.82rem', color: 'var(--ink-soft)', padding: 0, fontFamily: 'Manrope, sans-serif' }}
            >
              清空，重新生成
            </button>
          </section>
        )}

      </main>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
