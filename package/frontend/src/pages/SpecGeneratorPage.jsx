import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Sparkles, Save, Download, Trash2, Edit3,
  CheckCircle, FileText, List, Code, Eye,
  Copy, Upload, Paperclip, ChevronDown, ChevronUp,
} from 'lucide-react';
import { wordFormatterAPI } from '../api';
import { useAuth } from '../auth/AuthContext';
import AnnouncementBell from '../components/AnnouncementBell';

const PRESET_TEMPLATES = [
  {
    id: 'undergraduate',
    name: '本科毕业论文',
    requirements: '本科毕业论文格式：标题三号黑体居中，摘要四号宋体，正文小四号宋体1.5倍行距，一级标题三号黑体，二级标题四号黑体，三级标题小四号黑体，参考文献五号宋体，页边距上下2.54cm左右3.17cm，页眉学校名称居中小五宋体，图注在图下方图×-×格式',
  },
  {
    id: 'master',
    name: '硕士学位论文',
    requirements: '硕士学位论文格式：封面标题二号黑体，摘要小四号宋体，正文小四号宋体1.5倍行距，章标题三号黑体居中，节标题四号黑体，段落首行缩进2字符，参考文献五号宋体悬挂缩进，页边距上下2.54cm左右3cm，页眉论文题目居中小五宋体',
  },
  {
    id: 'journal',
    name: '期刊论文',
    requirements: '期刊论文格式：标题三号黑体居中，作者信息五号宋体居中，摘要小五号宋体，关键词小五号宋体，正文五号宋体单倍行距，一级标题四号黑体，图表标题小五号宋体居中，参考文献小五号宋体',
  },
];

const HEADER_CONTENT_LABELS = {
  blank: '空白',
  school_name: '学校名称',
  thesis_title: '论文题目',
  chapter_title: '章节标题',
  custom: '自定义文字',
};

export default function SpecGeneratorPage() {
  const navigate = useNavigate();
  const { userInfo, logout } = useAuth();
  const fileInputRef = useRef(null);

  const [inputTab, setInputTab] = useState('file');
  const [specFile, setSpecFile] = useState(null);
  const [extractedPreview, setExtractedPreview] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);

  const [requirements, setRequirements] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const [generatedSpec, setGeneratedSpec] = useState(null);
  const [specName, setSpecName] = useState('');
  const [specDescription, setSpecDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [savedSpecs, setSavedSpecs] = useState([]);
  const [isLoadingSpecs, setIsLoadingSpecs] = useState(false);
  const [viewMode, setViewMode] = useState('structure');
  const [isEditing, setIsEditing] = useState(false);
  const [editedSpecJson, setEditedSpecJson] = useState('');
  const [usage, setUsage] = useState(null);

  useEffect(() => {
    loadUsage();
    loadSavedSpecs();
  }, []);

  const loadUsage = async () => {
    try {
      const res = await wordFormatterAPI.getUsage();
      setUsage(res.data);
    } catch {}
  };

  const loadSavedSpecs = async () => {
    setIsLoadingSpecs(true);
    try {
      const res = await wordFormatterAPI.listSavedSpecs();
      setSavedSpecs(res.data.specs || []);
    } catch {
      toast.error('加载已保存规范失败');
    } finally {
      setIsLoadingSpecs(false);
    }
  };

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const ext = f.name.toLowerCase().split('.').pop();
    if (ext === 'doc') {
      toast.error('暂不支持 .doc 格式，请在 Word 中另存为 .docx 后上传');
      return;
    }
    setSpecFile(f);
    setExtractedPreview('');
    setShowPreview(false);
  };

  const handleGenerateFromFile = async () => {
    if (!specFile) { toast.error('请先上传格式说明文件'); return; }
    try {
      setIsExtracting(true);
      const res = await wordFormatterAPI.generateSpecFromFile(specFile);
      if (res.data.success) {
        setGeneratedSpec(res.data.spec_json);
        setEditedSpecJson(res.data.spec_json);
        setSpecName(res.data.spec_name || 'AI_Generated');
        setExtractedPreview(res.data.extracted_preview || '');
        setViewMode('structure');
        toast.success('格式规范解析成功');
        loadUsage();
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || '解析失败，请稍后重试');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleGenerate = async () => {
    if (!requirements.trim()) { toast.error('请输入排版要求'); return; }
    if (requirements.length < 20) { toast.error('描述太简短，请补充更多细节'); return; }
    try {
      setIsGenerating(true);
      const res = await wordFormatterAPI.generateSpec(requirements);
      if (res.data.success) {
        setGeneratedSpec(res.data.spec_json);
        setEditedSpecJson(res.data.spec_json);
        if (!specName) setSpecName(res.data.spec_name || 'AI_Generated');
        setViewMode('structure');
        toast.success('规范生成成功');
        loadUsage();
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || '生成失败，请稍后重试');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!specName.trim()) { toast.error('请输入规范名称'); return; }
    const specJson = isEditing ? editedSpecJson : generatedSpec;
    if (!specJson) { toast.error('没有可保存的规范'); return; }
    try {
      setIsSaving(true);
      await wordFormatterAPI.saveSpec(specName, specJson, specDescription);
      toast.success('规范保存成功');
      loadSavedSpecs();
    } catch (err) {
      toast.error(err.response?.data?.detail || '保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadSpec = (spec) => {
    setGeneratedSpec(spec.spec_json);
    setEditedSpecJson(spec.spec_json);
    setSpecName(spec.name);
    setSpecDescription(spec.description || '');
    setIsEditing(false);
    setViewMode('structure');
    toast.success(`已加载规范: ${spec.name}`);
  };

  const handleDeleteSpec = async (specId) => {
    if (!window.confirm('确定删除这个规范吗？')) return;
    try {
      await wordFormatterAPI.deleteSavedSpec(specId);
      toast.success('已删除');
      loadSavedSpecs();
    } catch {
      toast.error('删除失败');
    }
  };

  const handleExportJson = () => {
    const specJson = isEditing ? editedSpecJson : generatedSpec;
    if (!specJson) { toast.error('没有可导出的规范'); return; }
    const blob = new Blob([specJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${specName || 'spec'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('已导出');
  };

  const handleCopyJson = () => {
    const specJson = isEditing ? editedSpecJson : generatedSpec;
    if (!specJson) { toast.error('没有可复制的规范'); return; }
    navigator.clipboard.writeText(specJson);
    toast.success('已复制');
  };

  const toggleEdit = () => {
    if (isEditing) {
      try {
        JSON.parse(editedSpecJson);
        setGeneratedSpec(editedSpecJson);
        setIsEditing(false);
        toast.success('规范已更新');
      } catch {
        toast.error('JSON 格式有误，请检查');
      }
    } else {
      setIsEditing(true);
    }
  };

  const renderStructuredView = () => {
    if (!generatedSpec) return null;
    try {
      const spec = JSON.parse(generatedSpec);
      return (
        <div style={{ display:'flex', flexDirection:'column', gap:'0.875rem' }}>

          {/* 基本信息 */}
          <div style={{ background:'rgba(140,120,96,0.06)', borderRadius:8, padding:'0.875rem 1rem' }}>
            <p style={{ margin:'0 0 0.5rem', fontSize:'0.8rem', fontWeight:700, color:'var(--ink-soft)', textTransform:'uppercase', letterSpacing:'0.05em' }}>基本信息</p>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.375rem', fontSize:'0.875rem' }}>
              <span><span style={{ color:'var(--ink-soft)' }}>名称：</span>{spec.meta?.name || '-'}</span>
              <span><span style={{ color:'var(--ink-soft)' }}>语言：</span>{spec.meta?.lang || 'zh'}</span>
            </div>
          </div>

          {/* 页面布局 */}
          {spec.page && (
            <div style={{ background:'rgba(140,120,96,0.06)', borderRadius:8, padding:'0.875rem 1rem' }}>
              <p style={{ margin:'0 0 0.5rem', fontSize:'0.8rem', fontWeight:700, color:'var(--ink-soft)', textTransform:'uppercase', letterSpacing:'0.05em' }}>页面布局</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.375rem', fontSize:'0.875rem' }}>
                <span><span style={{ color:'var(--ink-soft)' }}>上边距：</span>{spec.page.margins_mm?.top ?? '-'} mm</span>
                <span><span style={{ color:'var(--ink-soft)' }}>下边距：</span>{spec.page.margins_mm?.bottom ?? '-'} mm</span>
                <span><span style={{ color:'var(--ink-soft)' }}>左边距：</span>{spec.page.margins_mm?.left ?? '-'} mm</span>
                <span><span style={{ color:'var(--ink-soft)' }}>右边距：</span>{spec.page.margins_mm?.right ?? '-'} mm</span>
                <span><span style={{ color:'var(--ink-soft)' }}>页眉距：</span>{spec.page.header_mm ?? '-'} mm</span>
                <span><span style={{ color:'var(--ink-soft)' }}>页脚距：</span>{spec.page.footer_mm ?? '-'} mm</span>
              </div>
            </div>
          )}

          {/* 页眉设置 */}
          {spec.header && (
            <div style={{ background:'rgba(61,90,78,0.06)', borderRadius:8, padding:'0.875rem 1rem', border:'1px solid rgba(61,90,78,0.12)' }}>
              <p style={{ margin:'0 0 0.5rem', fontSize:'0.8rem', fontWeight:700, color:'#3d5a4e', textTransform:'uppercase', letterSpacing:'0.05em' }}>页眉设置</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.375rem', fontSize:'0.875rem' }}>
                <span><span style={{ color:'var(--ink-soft)' }}>启用：</span>{spec.header.enabled ? '是' : '否'}</span>
                <span><span style={{ color:'var(--ink-soft)' }}>内容：</span>{HEADER_CONTENT_LABELS[spec.header.content_type] || spec.header.content_type}</span>
                {spec.header.custom_text && <span style={{ gridColumn:'1/-1' }}><span style={{ color:'var(--ink-soft)' }}>自定义文字：</span>{spec.header.custom_text}</span>}
                <span><span style={{ color:'var(--ink-soft)' }}>字体：</span>{spec.header.font_name}</span>
                <span><span style={{ color:'var(--ink-soft)' }}>字号：</span>{spec.header.font_size_pt} pt</span>
                <span><span style={{ color:'var(--ink-soft)' }}>对齐：</span>{{left:'左对齐',center:'居中',right:'右对齐'}[spec.header.alignment] || spec.header.alignment}</span>
                <span><span style={{ color:'var(--ink-soft)' }}>分隔线：</span>{spec.header.separator_line ? '显示' : '隐藏'}</span>
              </div>
            </div>
          )}

          {/* 段落样式 */}
          {spec.styles && (
            <div style={{ background:'rgba(140,120,96,0.06)', borderRadius:8, padding:'0.875rem 1rem' }}>
              <p style={{ margin:'0 0 0.625rem', fontSize:'0.8rem', fontWeight:700, color:'var(--ink-soft)', textTransform:'uppercase', letterSpacing:'0.05em' }}>段落样式</p>
              <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
                {Object.entries(spec.styles).map(([key, style]) => (
                  <div key={key} style={{ paddingBottom:'0.5rem', borderBottom:'1px solid rgba(140,120,96,0.1)' }}>
                    <span style={{ fontSize:'0.8rem', fontWeight:700, color:'var(--accent)', marginRight:'0.5rem' }}>{style.name || key}</span>
                    <span style={{ fontSize:'0.8rem', color:'var(--ink-soft)' }}>
                      {style.run?.font?.eastAsia || '-'} · {style.run?.size_pt || '-'}pt · {style.paragraph?.alignment || '-'} · 行距{style.paragraph?.line_spacing_rule || '-'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 交叉引用 */}
          {spec.cross_ref && (
            <div style={{ background:'rgba(90,106,142,0.06)', borderRadius:8, padding:'0.875rem 1rem', border:'1px solid rgba(90,106,142,0.12)' }}>
              <p style={{ margin:'0 0 0.5rem', fontSize:'0.8rem', fontWeight:700, color:'#5a6a8e', textTransform:'uppercase', letterSpacing:'0.05em' }}>图表交叉引用</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.375rem', fontSize:'0.875rem' }}>
                <span><span style={{ color:'var(--ink-soft)' }}>图前缀：</span>{spec.cross_ref.figure_prefix}</span>
                <span><span style={{ color:'var(--ink-soft)' }}>表前缀：</span>{spec.cross_ref.table_prefix}</span>
                <span><span style={{ color:'var(--ink-soft)' }}>编号格式：</span>{{  'chapter-seq':'含章号（图1-1）','global-seq':'全文连续（图1）'}[spec.cross_ref.numbering_style] || spec.cross_ref.numbering_style}</span>
                <span><span style={{ color:'var(--ink-soft)' }}>分隔符：</span>「{spec.cross_ref.separator}」</span>
                <span><span style={{ color:'var(--ink-soft)' }}>图注位置：</span>{{below:'图下方',above:'图上方'}[spec.cross_ref.caption_position_figure]}</span>
                <span><span style={{ color:'var(--ink-soft)' }}>表注位置：</span>{{above:'表上方',below:'表下方'}[spec.cross_ref.caption_position_table]}</span>
                <span><span style={{ color:'var(--ink-soft)' }}>图注字号：</span>{spec.cross_ref.caption_font_size_pt} pt</span>
                <span><span style={{ color:'var(--ink-soft)' }}>图注对齐：</span>{{left:'左对齐',center:'居中',right:'右对齐'}[spec.cross_ref.caption_alignment]}</span>
              </div>
            </div>
          )}

          {/* 页码 */}
          {spec.page_numbering && (
            <div style={{ background:'rgba(140,120,96,0.06)', borderRadius:8, padding:'0.875rem 1rem' }}>
              <p style={{ margin:'0 0 0.5rem', fontSize:'0.8rem', fontWeight:700, color:'var(--ink-soft)', textTransform:'uppercase', letterSpacing:'0.05em' }}>页码设置</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.375rem', fontSize:'0.875rem' }}>
                <span><span style={{ color:'var(--ink-soft)' }}>前言格式：</span>{{romanUpper:'罗马大写',romanLower:'罗马小写',decimal:'阿拉伯数字'}[spec.page_numbering.front_format]}</span>
                <span><span style={{ color:'var(--ink-soft)' }}>正文格式：</span>{{romanUpper:'罗马大写',romanLower:'罗马小写',decimal:'阿拉伯数字'}[spec.page_numbering.main_format]}</span>
              </div>
            </div>
          )}
        </div>
      );
    } catch {
      return <p style={{ color:'#8b3a2a', fontSize:'0.875rem' }}>JSON 解析失败</p>;
    }
  };

  const renderTableView = () => {
    if (!generatedSpec) return null;
    try {
      const spec = JSON.parse(generatedSpec);
      const styles = spec.styles || {};
      return (
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', fontSize:'0.8rem', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'rgba(140,120,96,0.08)' }}>
                {['样式', '中文字体', '字号(pt)', '对齐', '行距', '首行缩进'].map(h => (
                  <th key={h} style={{ padding:'0.5rem 0.75rem', textAlign:'left', fontWeight:600, color:'var(--ink-soft)', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(styles).map(([key, s]) => (
                <tr key={key} style={{ borderBottom:'1px solid rgba(140,120,96,0.08)' }}>
                  <td style={{ padding:'0.4rem 0.75rem', fontWeight:600, color:'var(--accent)' }}>{s.name || key}</td>
                  <td style={{ padding:'0.4rem 0.75rem', color:'var(--ink)' }}>{s.run?.font?.eastAsia || '-'}</td>
                  <td style={{ padding:'0.4rem 0.75rem', color:'var(--ink)' }}>{s.run?.size_pt || '-'}</td>
                  <td style={{ padding:'0.4rem 0.75rem', color:'var(--ink)' }}>{s.paragraph?.alignment || '-'}</td>
                  <td style={{ padding:'0.4rem 0.75rem', color:'var(--ink)' }}>{s.paragraph?.line_spacing_rule || '-'}</td>
                  <td style={{ padding:'0.4rem 0.75rem', color:'var(--ink)' }}>{s.paragraph?.first_line_indent_chars ?? '-'} 字符</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    } catch {
      return <p style={{ color:'#8b3a2a', fontSize:'0.875rem' }}>JSON 解析失败</p>;
    }
  };

  const isLoading = isExtracting || isGenerating;

  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', background:'linear-gradient(180deg,#fcfaf5 0%,#f2ece1 44%,#f8f5ee 100%)' }}>

      {/* Header */}
      <header className="header-o">
        <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', flex:1 }}>
          <a href="/" className="brand-o">
            <span className="brand-mark-o" />
            <span>OriginFlow</span>
          </a>
          <span style={{ width:1, height:20, background:'rgba(140,120,96,0.2)', margin:'0 0.25rem' }} />
          <span style={{ fontSize:'0.875rem', color:'var(--ink-soft)', fontWeight:500 }}>排版规范生成</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
          <AnnouncementBell />
          {userInfo?.username && (
            <button
              onClick={() => navigate('/profile')}
              style={{ display:'flex', alignItems:'center', gap:'0.5rem', background:'none', border:'none', cursor:'pointer', padding:'0.25rem 0.5rem', borderRadius:8, transition:'background 150ms' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(140,120,96,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <div style={{ width:28, height:28, borderRadius:'50%', background:'linear-gradient(135deg,#3d5a4e,#5f856f)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fdf8f0', fontSize:'0.75rem', fontWeight:700 }}>
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
          <button onClick={() => { logout(); navigate('/'); }} className="btn-o-ghost btn-o-sm" style={{ borderRadius:'999px' }}>退出</button>
        </div>
      </header>

      {/* 主内容 */}
      <main style={{ flex:1, overflowY:'auto', padding:'1.75rem' }} className="custom-scrollbar">
        <div style={{ maxWidth:720, margin:'0 auto', display:'flex', flexDirection:'column', gap:'1.25rem' }}>

          {/* 使用量 */}
          {usage && (
            <div style={{ display:'flex', justifyContent:'flex-end' }}>
              <span style={{ fontSize:'0.78rem', color:'var(--ink-soft)', opacity:0.7 }}>
                本月已用 {usage.usage_count}/{usage.usage_limit > 0 ? usage.usage_limit : '∞'} 次
              </span>
            </div>
          )}

          {/* 输入方式 Tab */}
          <div style={{ display:'flex', gap:'0.5rem' }}>
            <button className={`chip-o${inputTab === 'file' ? ' selected' : ''}`} onClick={() => setInputTab('file')}>
              <Upload size={13} style={{ marginRight:'0.3rem' }} />上传格式文件
            </button>
            <button className={`chip-o${inputTab === 'text' ? ' selected' : ''}`} onClick={() => setInputTab('text')}>
              <Edit3 size={13} style={{ marginRight:'0.3rem' }} />文字描述
            </button>
          </div>

          {/* 输入卡片 */}
          <div className="card-o" style={{ overflow:'hidden' }}>

            {/* Tab: 上传文件 */}
            {inputTab === 'file' && (
              <div style={{ padding:'1.25rem' }}>
                <input ref={fileInputRef} type="file" accept=".docx,.txt" style={{ display:'none' }} onChange={handleFileChange} />

                {/* 上传区域 */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border:'2px dashed rgba(140,120,96,0.3)', borderRadius:10,
                    padding:'2rem 1.5rem', cursor:'pointer', textAlign:'center',
                    background: specFile ? 'rgba(61,90,78,0.04)' : 'transparent',
                    transition:'border-color 150ms, background 150ms',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(61,90,78,0.5)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(140,120,96,0.3)'}
                >
                  {specFile ? (
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'0.5rem' }}>
                      <CheckCircle size={18} style={{ color:'#3d5a4e' }} />
                      <span style={{ fontWeight:600, color:'var(--ink)' }}>{specFile.name}</span>
                      <span style={{ fontSize:'0.78rem', color:'var(--ink-soft)' }}>（点击重新选择）</span>
                    </div>
                  ) : (
                    <>
                      <Paperclip size={24} style={{ color:'rgba(140,120,96,0.4)', margin:'0 auto 0.5rem', display:'block' }} />
                      <p style={{ margin:0, fontSize:'0.9rem', color:'var(--ink-soft)', fontWeight:500 }}>点击上传学校格式说明文件</p>
                      <p style={{ margin:'0.25rem 0 0', fontSize:'0.78rem', color:'var(--ink-soft)', opacity:0.7 }}>支持 .docx · .txt（不支持旧版 .doc）</p>
                    </>
                  )}
                </div>

                {/* 文本预览 */}
                {extractedPreview && (
                  <div style={{ marginTop:'0.875rem', background:'rgba(140,120,96,0.06)', borderRadius:8, overflow:'hidden' }}>
                    <button
                      onClick={() => setShowPreview(v => !v)}
                      style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0.5rem 0.875rem', background:'none', border:'none', cursor:'pointer', color:'var(--ink-soft)', fontSize:'0.8rem', fontWeight:600 }}
                    >
                      <span>文档内容预览</span>
                      {showPreview ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    {showPreview && (
                      <p style={{ margin:0, padding:'0 0.875rem 0.75rem', fontSize:'0.78rem', color:'var(--ink-soft)', lineHeight:1.7 }}>
                        {extractedPreview}…
                      </p>
                    )}
                  </div>
                )}

                <div style={{ display:'flex', justifyContent:'flex-end', marginTop:'1rem' }}>
                  <button
                    className="btn-o-primary"
                    disabled={!specFile || isExtracting}
                    onClick={handleGenerateFromFile}
                    style={{ gap:'0.5rem' }}
                  >
                    {isExtracting ? (
                      <><span style={{ width:14, height:14, border:'2px solid rgba(255,248,240,0.3)', borderTopColor:'#fdf8f0', borderRadius:'50%', display:'inline-block', animation:'spin 1s linear infinite' }} />解析中…</>
                    ) : (
                      <><Sparkles size={14} />AI 解析格式要求</>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Tab: 文字描述 */}
            {inputTab === 'text' && (
              <div style={{ padding:'1.25rem' }}>
                <p className="text-o-label" style={{ marginBottom:'0.75rem' }}>常用模板</p>
                <div style={{ display:'flex', flexWrap:'wrap', gap:'0.5rem', marginBottom:'1rem' }}>
                  {PRESET_TEMPLATES.map(t => (
                    <button key={t.id} className="chip-o" onClick={() => { setRequirements(t.requirements); setSpecName(t.name); }}>
                      {t.name}
                    </button>
                  ))}
                </div>
                <textarea
                  value={requirements}
                  onChange={e => setRequirements(e.target.value)}
                  placeholder="请详细描述排版要求，例如：标题三号黑体居中，正文小四号宋体1.5倍行距，页边距上下2.54cm，页眉学校名称居中小五宋体…"
                  style={{
                    display:'block', width:'100%', minHeight:160, padding:'1rem',
                    background:'rgba(140,120,96,0.04)', border:'none', borderRadius:8,
                    resize:'none', outline:'none',
                    fontFamily:'Manrope,sans-serif', fontSize:'0.95rem',
                    color:'var(--ink)', lineHeight:1.75,
                  }}
                />
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'0.75rem' }}>
                  <span style={{ fontSize:'0.78rem', color:'var(--ink-soft)', opacity:0.7 }}>{requirements.length} 字符</span>
                  <button
                    className="btn-o-primary"
                    disabled={isGenerating || !requirements.trim()}
                    onClick={handleGenerate}
                    style={{ gap:'0.5rem' }}
                  >
                    {isGenerating ? (
                      <><span style={{ width:14, height:14, border:'2px solid rgba(255,248,240,0.3)', borderTopColor:'#fdf8f0', borderRadius:'50%', display:'inline-block', animation:'spin 1s linear infinite' }} />生成中…</>
                    ) : (
                      <><Sparkles size={14} />生成规范</>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 规范结果 */}
          {generatedSpec && (
            <div className="card-o" style={{ overflow:'hidden' }}>
              {/* 规范名称 */}
              <div style={{ padding:'1rem 1.25rem', borderBottom:'1px solid rgba(140,120,96,0.1)', display:'flex', gap:'0.75rem', alignItems:'center' }}>
                <input
                  value={specName}
                  onChange={e => setSpecName(e.target.value)}
                  placeholder="规范名称"
                  style={{
                    flex:1, padding:'0.4rem 0.75rem', borderRadius:6,
                    border:'1px solid rgba(140,120,96,0.2)', background:'rgba(255,251,244,0.8)',
                    fontFamily:'Manrope,sans-serif', fontSize:'0.875rem', color:'var(--ink)', outline:'none',
                  }}
                />
                <input
                  value={specDescription}
                  onChange={e => setSpecDescription(e.target.value)}
                  placeholder="备注说明（可选）"
                  style={{
                    flex:1, padding:'0.4rem 0.75rem', borderRadius:6,
                    border:'1px solid rgba(140,120,96,0.2)', background:'rgba(255,251,244,0.8)',
                    fontFamily:'Manrope,sans-serif', fontSize:'0.875rem', color:'var(--ink)', outline:'none',
                  }}
                />
              </div>

              {/* 视图切换 */}
              <div style={{ padding:'0.75rem 1.25rem', borderBottom:'1px solid rgba(140,120,96,0.1)', display:'flex', gap:'0.5rem', alignItems:'center' }}>
                {[
                  { key:'structure', icon:<Eye size={12}/>, label:'结构化' },
                  { key:'table',     icon:<List size={12}/>, label:'表格' },
                  { key:'json',      icon:<Code size={12}/>, label:'JSON' },
                ].map(v => (
                  <button key={v.key} className={`chip-o${viewMode===v.key?' selected':''}`} onClick={() => setViewMode(v.key)}
                    style={{ display:'flex', alignItems:'center', gap:'0.3rem', fontSize:'0.8rem' }}>
                    {v.icon}{v.label}
                  </button>
                ))}
                <div style={{ marginLeft:'auto', display:'flex', gap:'0.5rem' }}>
                  <button className="btn-o-ghost btn-o-sm" onClick={toggleEdit} style={{ display:'flex', alignItems:'center', gap:'0.3rem', fontSize:'0.78rem' }}>
                    <Edit3 size={12} />{isEditing ? '完成编辑' : '编辑 JSON'}
                  </button>
                </div>
              </div>

              {/* 内容区 */}
              <div style={{ padding:'1rem 1.25rem', maxHeight:420, overflowY:'auto' }} className="custom-scrollbar">
                {viewMode === 'structure' && renderStructuredView()}
                {viewMode === 'table' && renderTableView()}
                {viewMode === 'json' && (
                  isEditing ? (
                    <textarea
                      value={editedSpecJson}
                      onChange={e => setEditedSpecJson(e.target.value)}
                      style={{
                        width:'100%', height:320, fontFamily:'monospace', fontSize:'0.8rem',
                        background:'rgba(140,120,96,0.04)', border:'none', outline:'none',
                        resize:'vertical', color:'var(--ink)', lineHeight:1.6, padding:'0.5rem',
                      }}
                    />
                  ) : (
                    <pre style={{ margin:0, fontFamily:'monospace', fontSize:'0.78rem', color:'var(--ink)', lineHeight:1.6, whiteSpace:'pre-wrap', wordBreak:'break-all' }}>
                      {JSON.stringify(JSON.parse(generatedSpec), null, 2)}
                    </pre>
                  )
                )}
              </div>

              {/* 操作按钮 */}
              <div style={{ padding:'0.875rem 1.25rem', borderTop:'1px solid rgba(140,120,96,0.1)', display:'flex', gap:'0.5rem', flexWrap:'wrap' }}>
                <button className="btn-o-primary" onClick={handleSave} disabled={isSaving} style={{ gap:'0.4rem', flex:1 }}>
                  {isSaving ? (
                    <><span style={{ width:13, height:13, border:'2px solid rgba(255,248,240,0.3)', borderTopColor:'#fdf8f0', borderRadius:'50%', display:'inline-block', animation:'spin 1s linear infinite' }} />保存中…</>
                  ) : (
                    <><Save size={13} />保存规范</>
                  )}
                </button>
                <button className="btn-o-ghost btn-o-sm" onClick={handleExportJson} style={{ display:'flex', alignItems:'center', gap:'0.3rem' }}>
                  <Download size={13} />导出
                </button>
                <button className="btn-o-ghost btn-o-sm" onClick={handleCopyJson} style={{ display:'flex', alignItems:'center', gap:'0.3rem' }}>
                  <Copy size={13} />复制
                </button>
              </div>
            </div>
          )}

          {/* 已保存规范 */}
          <div className="card-o" style={{ overflow:'hidden' }}>
            <div style={{ padding:'0.875rem 1.25rem', borderBottom:'1px solid rgba(140,120,96,0.1)', display:'flex', alignItems:'center', gap:'0.5rem' }}>
              <FileText size={15} style={{ color:'var(--ink-soft)' }} />
              <span style={{ fontSize:'0.875rem', fontWeight:600, color:'var(--ink)' }}>已保存的规范</span>
              {savedSpecs.length > 0 && (
                <span style={{ marginLeft:'auto', fontSize:'0.75rem', color:'var(--ink-soft)', opacity:0.7 }}>{savedSpecs.length} 条</span>
              )}
            </div>

            {isLoadingSpecs ? (
              <div style={{ padding:'2rem', display:'flex', justifyContent:'center' }}>
                <span style={{ width:20, height:20, border:'2px solid rgba(140,120,96,0.2)', borderTopColor:'var(--green)', borderRadius:'50%', display:'inline-block', animation:'spin 1s linear infinite' }} />
              </div>
            ) : savedSpecs.length === 0 ? (
              <div style={{ padding:'2.5rem', textAlign:'center' }}>
                <FileText size={28} style={{ color:'rgba(140,120,96,0.25)', margin:'0 auto 0.5rem', display:'block' }} />
                <p style={{ margin:0, fontSize:'0.875rem', color:'var(--ink-soft)', opacity:0.6 }}>暂无保存的规范</p>
              </div>
            ) : (
              <div>
                {savedSpecs.map(s => (
                  <div
                    key={s.id}
                    style={{ padding:'0.75rem 1.25rem', borderBottom:'1px solid rgba(140,120,96,0.08)', display:'flex', alignItems:'center', gap:'0.75rem' }}
                  >
                    <div style={{ flex:1, cursor:'pointer' }} onClick={() => handleLoadSpec(s)}>
                      <p style={{ margin:0, fontSize:'0.875rem', fontWeight:600, color:'var(--ink)' }}>{s.name}</p>
                      {s.description && <p style={{ margin:'0.1rem 0 0', fontSize:'0.78rem', color:'var(--ink-soft)', opacity:0.8 }}>{s.description}</p>}
                    </div>
                    <button
                      onClick={() => handleLoadSpec(s)}
                      className="btn-o-ghost btn-o-sm"
                      style={{ fontSize:'0.78rem', whiteSpace:'nowrap' }}
                    >
                      加载
                    </button>
                    <button
                      onClick={() => handleDeleteSpec(s.id)}
                      style={{ padding:'0.25rem', borderRadius:6, background:'none', border:'none', color:'rgba(92,74,56,0.35)', cursor:'pointer', transition:'all 150ms' }}
                      onMouseEnter={e => { e.currentTarget.style.color='#8b3a2a'; e.currentTarget.style.background='rgba(180,70,50,0.08)'; }}
                      onMouseLeave={e => { e.currentTarget.style.color='rgba(92,74,56,0.35)'; e.currentTarget.style.background='none'; }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
