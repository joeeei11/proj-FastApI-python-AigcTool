import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Sparkles, Save, Download, Trash2, Edit3,
  CheckCircle, FileText, List, Code, Eye,
  Copy, Upload, Paperclip, ChevronDown, ChevronUp, ChevronRight,
} from 'lucide-react';
import { wordFormatterAPI } from '../api';
import { useAuth } from '../auth/AuthContext';
import AnnouncementBell from '../components/AnnouncementBell';

// ── 表单选项常量 ──────────────────────────────────
const CN_FONTS = [
  { label: '宋体', v: 'SimSun' },
  { label: '黑体', v: 'SimHei' },
  { label: '仿宋', v: 'FangSong' },
  { label: '楷体', v: 'KaiTi' },
  { label: '微软雅黑', v: 'Microsoft YaHei' },
];
const CN_SIZES = [
  { label: '二号 22pt', v: 22 },
  { label: '小二 18pt', v: 18 },
  { label: '三号 16pt', v: 16 },
  { label: '小三 15pt', v: 15 },
  { label: '四号 14pt', v: 14 },
  { label: '小四 12pt', v: 12 },
  { label: '五号 10.5pt', v: 10.5 },
  { label: '小五 9pt', v: 9 },
  { label: '六号 7.5pt', v: 7.5 },
];
const ALIGN_OPTS = [
  { label: '两端对齐', v: 'justify' },
  { label: '左对齐', v: 'left' },
  { label: '居中', v: 'center' },
  { label: '右对齐', v: 'right' },
];
const SPACING_OPTS = [
  { label: '单倍', v: 'single' },
  { label: '1.5倍', v: '1.5' },
  { label: '双倍', v: 'double' },
  { label: '固定值', v: 'exact' },
];
const STYLE_GROUPS = [
  { label: '标题类', ids: ['TitleCN', 'TitleEN', 'FrontHeading', 'TocTitle', 'H1', 'H2', 'H3'] },
  { label: '正文类', ids: ['Body', 'AbstractBody', 'KeywordsBody', 'AcknowledgementBody', 'Reference', 'ListBullet', 'ListNumber'] },
  { label: '辅助类', ids: ['MetaLine', 'FigureCaption', 'TableTitle', 'TableText', 'PageNumber'] },
];
// O-design 表单控件公共样式
const inputSt = {
  border: '1px solid rgba(140,120,96,0.25)', borderRadius: 6,
  padding: '3px 8px', fontSize: 12,
  background: 'rgba(255,251,244,0.9)', color: 'var(--ink)',
  outline: 'none', minWidth: 0, fontFamily: 'Manrope,sans-serif',
};
const selectSt = { ...inputSt, cursor: 'pointer', paddingRight: 4 };

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
  const [parsedSpec, setParsedSpec] = useState(null);
  const [collapsedGroups, setCollapsedGroups] = useState({ '辅助类': true });

  const updateSpec = (updater) => {
    setParsedSpec(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      updater(next);
      setGeneratedSpec(JSON.stringify(next, null, 2));
      return next;
    });
  };

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
        try { setParsedSpec(JSON.parse(res.data.spec_json)); } catch {}
        setSpecName(res.data.spec_name || 'AI_Generated');
        setExtractedPreview(res.data.extracted_preview || '');
        setViewMode('structure');
        const extra = res.data.comments_count > 0 ? `（含 ${res.data.comments_count} 条批注）` : '';
        toast.success(`格式规范解析成功${extra}`);
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
        try { setParsedSpec(JSON.parse(res.data.spec_json)); } catch {}
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
    try { setParsedSpec(JSON.parse(spec.spec_json)); } catch {}
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
        try { setParsedSpec(JSON.parse(editedSpecJson)); } catch {}
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
    const spec = parsedSpec;
    if (!spec) return null;

    const sectionHd = (label, color) => (
      <p style={{ margin:'0 0 0.625rem', fontSize:'0.75rem', fontWeight:700, color: color || 'var(--ink-soft)', textTransform:'uppercase', letterSpacing:'0.06em' }}>{label}</p>
    );
    const card = (children, extra) => (
      <div style={{ background:'rgba(140,120,96,0.06)', borderRadius:8, padding:'0.875rem 1rem', ...extra }}>{children}</div>
    );

    return (
      <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>

        {/* 基本信息 */}
        {card(<>
          {sectionHd('基本信息')}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.375rem', fontSize:'0.8rem' }}>
            <span><span style={{ color:'var(--ink-soft)' }}>名称：</span>{spec.meta?.name || '-'}</span>
            <span><span style={{ color:'var(--ink-soft)' }}>语言：</span>{spec.meta?.lang || 'zh'}</span>
          </div>
        </>)}

        {/* 页面布局（可编辑） */}
        {spec.page && card(<>
          {sectionHd('页面布局')}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.5rem 1rem' }}>
            {[
              { label:'上边距', key:'top' }, { label:'下边距', key:'bottom' },
              { label:'左边距', key:'left' }, { label:'右边距', key:'right' },
            ].map(({ label, key }) => (
              <label key={key} style={{ display:'flex', alignItems:'center', gap:5, fontSize:'0.8rem' }}>
                <span style={{ color:'var(--ink-soft)', width:44, flexShrink:0 }}>{label}</span>
                <input type="number" step="0.1" style={{ ...inputSt, width:58 }}
                  value={spec.page.margins_mm?.[key] ?? ''}
                  onChange={e => updateSpec(s => { if (!s.page.margins_mm) s.page.margins_mm = {}; s.page.margins_mm[key] = +e.target.value; })}
                />
                <span style={{ color:'var(--ink-soft)' }}>mm</span>
              </label>
            ))}
            <label style={{ display:'flex', alignItems:'center', gap:5, fontSize:'0.8rem' }}>
              <span style={{ color:'var(--ink-soft)', width:44, flexShrink:0 }}>页眉距</span>
              <input type="number" step="0.5" style={{ ...inputSt, width:58 }}
                value={spec.page.header_mm ?? ''}
                onChange={e => updateSpec(s => { s.page.header_mm = +e.target.value; })}
              />
              <span style={{ color:'var(--ink-soft)' }}>mm</span>
            </label>
            <label style={{ display:'flex', alignItems:'center', gap:5, fontSize:'0.8rem' }}>
              <span style={{ color:'var(--ink-soft)', width:44, flexShrink:0 }}>页脚距</span>
              <input type="number" step="0.5" style={{ ...inputSt, width:58 }}
                value={spec.page.footer_mm ?? ''}
                onChange={e => updateSpec(s => { s.page.footer_mm = +e.target.value; })}
              />
              <span style={{ color:'var(--ink-soft)' }}>mm</span>
            </label>
          </div>
        </>)}

        {/* 页眉设置（可编辑） */}
        {card(<>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom: spec?.header?.enabled ? '0.625rem' : 0 }}>
            {sectionHd('页眉设置', '#3d5a4e')}
            <label style={{ display:'flex', alignItems:'center', gap:4, fontSize:12, cursor:'pointer', marginLeft:'auto', marginBottom:'0.625rem' }}>
              <input type="checkbox" checked={!!spec?.header?.enabled}
                onChange={e => updateSpec(s => { if (!s.header) s.header = {}; s.header.enabled = e.target.checked; })}
              />
              启用
            </label>
          </div>
          {spec?.header?.enabled && (
            <div style={{ display:'flex', flexWrap:'wrap', gap:'0.5rem', alignItems:'center' }}>
              <label style={{ display:'flex', alignItems:'center', gap:4, fontSize:'0.8rem' }}>
                <span style={{ color:'var(--ink-soft)' }}>内容</span>
                <select style={selectSt}
                  value={spec.header?.content_type || 'blank'}
                  onChange={e => updateSpec(s => { if (!s.header) s.header = {}; s.header.content_type = e.target.value; })}
                >
                  <option value="blank">空白</option>
                  <option value="school_name">学校名称</option>
                  <option value="thesis_title">论文题目</option>
                  <option value="chapter_title">章节标题</option>
                  <option value="custom">自定义</option>
                </select>
              </label>
              {spec.header?.content_type === 'custom' && (
                <input style={{ ...inputSt, flex:1, minWidth:100 }}
                  placeholder="自定义文字"
                  value={spec.header?.custom_text || ''}
                  onChange={e => updateSpec(s => { s.header.custom_text = e.target.value; })}
                />
              )}
              <label style={{ display:'flex', alignItems:'center', gap:4, fontSize:'0.8rem', cursor:'pointer' }}>
                <input type="checkbox" checked={!!spec?.header?.separator_line}
                  onChange={e => updateSpec(s => { s.header.separator_line = e.target.checked; })}
                />
                分隔线
              </label>
            </div>
          )}
        </>, { background:'rgba(61,90,78,0.06)', border:'1px solid rgba(61,90,78,0.12)' })}

        {/* 段落样式（分组折叠，可编辑） */}
        {spec.styles && card(<>
          {sectionHd('段落样式')}
          <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
            {STYLE_GROUPS.map(group => {
              const validIds = group.ids.filter(id => spec.styles?.[id]);
              if (!validIds.length) return null;
              const collapsed = !!collapsedGroups[group.label];
              return (
                <div key={group.label} style={{ marginBottom:2 }}>
                  <button
                    onClick={() => setCollapsedGroups(p => ({ ...p, [group.label]: !p[group.label] }))}
                    style={{ width:'100%', display:'flex', alignItems:'center', gap:5, background:'none', border:'none', cursor:'pointer', padding:'5px 0 4px', textAlign:'left' }}
                  >
                    <ChevronRight size={12} style={{ color:'var(--ink-soft)', transform: collapsed ? '' : 'rotate(90deg)', transition:'transform .18s', flexShrink:0 }} />
                    <span style={{ fontSize:11, fontWeight:700, color:'var(--ink-soft)', textTransform:'uppercase', letterSpacing:'0.07em' }}>{group.label}</span>
                    <span style={{ fontSize:11, color:'var(--ink-soft)', opacity:0.45 }}>({validIds.length})</span>
                  </button>
                  {!collapsed && (
                    <div>
                      {validIds.map(id => {
                        const st = spec.styles[id];
                        return (
                          <div key={id} style={{ display:'flex', gap:5, alignItems:'center', flexWrap:'wrap', padding:'4px 0 4px 18px', borderBottom:'1px solid rgba(140,120,96,0.07)' }}>
                            <span style={{ width:70, fontSize:11, fontWeight:600, color:'var(--accent)', flexShrink:0 }}>{st.name || id}</span>
                            <select style={{ ...selectSt, fontSize:11, padding:'2px 4px' }}
                              value={st.run?.font?.eastAsia || ''}
                              onChange={e => updateSpec(s => { if (s.styles[id].run?.font) s.styles[id].run.font.eastAsia = e.target.value; })}
                            >
                              <option value="">中文字体</option>
                              {CN_FONTS.map(f => <option key={f.v} value={f.v}>{f.label}</option>)}
                            </select>
                            <select style={{ ...selectSt, fontSize:11, padding:'2px 4px' }}
                              value={st.run?.size_pt ?? 12}
                              onChange={e => updateSpec(s => { s.styles[id].run.size_pt = +e.target.value; })}
                            >
                              {CN_SIZES.map(f => <option key={f.v} value={f.v}>{f.label}</option>)}
                            </select>
                            <select style={{ ...selectSt, fontSize:11, padding:'2px 4px' }}
                              value={st.paragraph?.alignment || 'justify'}
                              onChange={e => updateSpec(s => { if (s.styles[id].paragraph) s.styles[id].paragraph.alignment = e.target.value; })}
                            >
                              {ALIGN_OPTS.map(o => <option key={o.v} value={o.v}>{o.label}</option>)}
                            </select>
                            <select style={{ ...selectSt, fontSize:11, padding:'2px 4px' }}
                              value={st.paragraph?.line_spacing_rule || 'single'}
                              onChange={e => updateSpec(s => { if (s.styles[id].paragraph) s.styles[id].paragraph.line_spacing_rule = e.target.value; })}
                            >
                              {SPACING_OPTS.map(o => <option key={o.v} value={o.v}>{o.label}</option>)}
                            </select>
                            {st.paragraph?.line_spacing_rule === 'exact' && (
                              <label style={{ display:'flex', alignItems:'center', gap:3, fontSize:11, flexShrink:0 }}>
                                <input type="number" step="0.5" min="1" style={{ ...inputSt, width:44, fontSize:11, padding:'2px 4px', textAlign:'center' }}
                                  value={st.paragraph?.line_spacing ?? ''}
                                  placeholder="pt"
                                  onChange={e => updateSpec(s => { if (s.styles[id].paragraph) s.styles[id].paragraph.line_spacing = +e.target.value; })}
                                />
                                pt
                              </label>
                            )}
                            <label style={{ display:'flex', alignItems:'center', gap:3, fontSize:11, cursor:'pointer', flexShrink:0 }}>
                              <input type="checkbox" checked={!!st.run?.bold}
                                onChange={e => updateSpec(s => { if (s.styles[id].run) s.styles[id].run.bold = e.target.checked; })}
                              />
                              粗体
                            </label>
                            <label style={{ display:'flex', alignItems:'center', gap:3, fontSize:11, flexShrink:0 }}>
                              缩进
                              <input type="number" step="0.5" style={{ ...inputSt, width:38, fontSize:11, padding:'2px 4px', textAlign:'center' }}
                                value={st.paragraph?.first_line_indent_chars ?? 0}
                                onChange={e => updateSpec(s => { if (s.styles[id].paragraph) s.styles[id].paragraph.first_line_indent_chars = +e.target.value; })}
                              />
                              字符
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>)}

        {/* 交叉引用（可编辑） */}
        {spec.cross_ref && card(<>
          {sectionHd('图表交叉引用', '#5a6a8e')}
          <div style={{ display:'flex', flexWrap:'wrap', gap:'0.5rem', alignItems:'center', fontSize:'0.8rem' }}>
            <label style={{ display:'flex', alignItems:'center', gap:4 }}>
              <span style={{ color:'var(--ink-soft)' }}>编号格式</span>
              <select style={selectSt}
                value={spec.cross_ref.numbering_style || 'chapter-seq'}
                onChange={e => updateSpec(s => { s.cross_ref.numbering_style = e.target.value; })}
              >
                <option value="chapter-seq">含章号（图1-1）</option>
                <option value="global-seq">全文连续（图1）</option>
              </select>
            </label>
            <label style={{ display:'flex', alignItems:'center', gap:4 }}>
              <span style={{ color:'var(--ink-soft)' }}>图注位置</span>
              <select style={selectSt}
                value={spec.cross_ref.caption_position_figure || 'below'}
                onChange={e => updateSpec(s => { s.cross_ref.caption_position_figure = e.target.value; })}
              >
                <option value="below">图下方</option>
                <option value="above">图上方</option>
              </select>
            </label>
            <label style={{ display:'flex', alignItems:'center', gap:4 }}>
              <span style={{ color:'var(--ink-soft)' }}>表注位置</span>
              <select style={selectSt}
                value={spec.cross_ref.caption_position_table || 'above'}
                onChange={e => updateSpec(s => { s.cross_ref.caption_position_table = e.target.value; })}
              >
                <option value="above">表上方</option>
                <option value="below">表下方</option>
              </select>
            </label>
          </div>
        </>, { background:'rgba(90,106,142,0.06)', border:'1px solid rgba(90,106,142,0.12)' })}

        {/* 页码 */}
        {spec.page_numbering && card(<>
          {sectionHd('页码设置')}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.375rem', fontSize:'0.8rem' }}>
            <span><span style={{ color:'var(--ink-soft)' }}>前言格式：</span>{{romanUpper:'罗马大写',romanLower:'罗马小写',decimal:'阿拉伯数字'}[spec.page_numbering.front_format]}</span>
            <span><span style={{ color:'var(--ink-soft)' }}>正文格式：</span>{{romanUpper:'罗马大写',romanLower:'罗马小写',decimal:'阿拉伯数字'}[spec.page_numbering.main_format]}</span>
          </div>
        </>)}
      </div>
    );
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
