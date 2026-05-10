import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Bell, CheckCircle, Eye, Flag, ImagePlus, Lock, LogOut, MessageCircle,
  MessageSquare, Pin, Plus, Search, Sparkles, Star,
} from 'lucide-react';
import { forumAPI, formatApiError, resolveAssetUrl } from '../api';
import { useAuth } from '../auth/AuthContext';
import AnnouncementBell from '../components/AnnouncementBell';

const TYPE_LABELS = {
  discussion: '讨论',
  question: '提问',
  feedback: '反馈',
};

const TYPE_OPTIONS = [
  { id: '', label: '全部' },
  { id: 'discussion', label: '讨论' },
  { id: 'question', label: '提问' },
  { id: 'feedback', label: '反馈' },
];

const POST_TITLE_MIN_LENGTH = 5;
const POST_CONTENT_MIN_LENGTH = 10;
const MAX_POST_IMAGES = 6;
const MAX_POST_IMAGE_SIZE = 5 * 1024 * 1024;

function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function PostBadges({ post }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {post.is_pinned && <span className="badge-o-warm"><Pin size={11} /> 置顶</span>}
      {post.is_featured && <span className="badge-o-green"><Star size={11} /> 精华</span>}
      {post.is_solved && <span className="badge-o-green"><CheckCircle size={11} /> 已解决</span>}
      {post.is_locked && <span className="badge-o-gray"><Lock size={11} /> 已锁定</span>}
      <span className="badge-o-gray">{TYPE_LABELS[post.post_type] || post.post_type}</span>
    </div>
  );
}

export default function ForumPage() {
  const navigate = useNavigate();
  const { userInfo, logout } = useAuth();
  const [categories, setCategories] = useState([]);
  const [posts, setPosts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [categoryId, setCategoryId] = useState('');
  const [postType, setPostType] = useState('');
  const [keyword, setKeyword] = useState('');
  const [showComposer, setShowComposer] = useState(false);
  const [draft, setDraft] = useState({ title: '', content: '', category_id: '', post_type: 'discussion' });
  const [imageUrls, setImageUrls] = useState([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const selectedCategory = useMemo(
    () => categories.find(c => String(c.id) === String(categoryId)),
    [categories, categoryId]
  );

  const loadCategories = async () => {
    const res = await forumAPI.listCategories();
    setCategories(res.data);
    setDraft(prev => ({ ...prev, category_id: prev.category_id || res.data[0]?.id || '' }));
  };

  const loadPosts = async () => {
    setLoading(true);
    try {
      const params = {
        category_id: categoryId || undefined,
        post_type: postType || undefined,
        keyword: keyword.trim() || undefined,
        page: 1,
        page_size: 30,
      };
      const res = await forumAPI.listPosts(params);
      setPosts(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      toast.error(formatApiError(err, '获取帖子失败'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCategories().catch(() => {}); }, []);
  useEffect(() => { loadPosts(); }, [categoryId, postType]);

  const handleSearch = (e) => {
    e.preventDefault();
    loadPosts();
  };

  const handleImageSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    if (imageUrls.length + files.length > MAX_POST_IMAGES) {
      toast.error(`最多上传 ${MAX_POST_IMAGES} 张图片`);
      return;
    }

    setUploadingImage(true);
    try {
      const uploaded = [];
      for (const file of files) {
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} 不是图片文件`);
          continue;
        }
        if (file.size > MAX_POST_IMAGE_SIZE) {
          toast.error(`${file.name} 超过 5MB`);
          continue;
        }
        const res = await forumAPI.uploadImage(file);
        uploaded.push(res.data.url);
      }
      if (uploaded.length) {
        setImageUrls(prev => [...prev, ...uploaded].slice(0, MAX_POST_IMAGES));
        toast.success(`已上传 ${uploaded.length} 张图片`);
      }
    } catch (err) {
      toast.error(formatApiError(err, '图片上传失败'));
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = (url) => {
    setImageUrls(prev => prev.filter(item => item !== url));
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!userInfo) { toast.error('请先登录'); return; }
    const title = draft.title.trim();
    const content = draft.content.trim();
    if (title.length < POST_TITLE_MIN_LENGTH) {
      toast.error(`标题至少需要 ${POST_TITLE_MIN_LENGTH} 个字`);
      return;
    }
    if (content.length < POST_CONTENT_MIN_LENGTH) {
      toast.error(`正文至少需要 ${POST_CONTENT_MIN_LENGTH} 个字`);
      return;
    }
    if (!draft.category_id || Number.isNaN(Number(draft.category_id))) {
      toast.error('请选择帖子分类');
      return;
    }
    setSubmitting(true);
    try {
      const payload = { ...draft, title, content, category_id: Number(draft.category_id), image_urls: imageUrls };
      const res = await forumAPI.createPost(payload);
      toast.success('帖子已发布');
      setShowComposer(false);
      setDraft({ title: '', content: '', category_id: categories[0]?.id || '', post_type: 'discussion' });
      setImageUrls([]);
      navigate(`/forum/posts/${res.data.id}`);
    } catch (err) {
      toast.error(formatApiError(err, '发布失败'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg,#fcfaf5 0%,#f2ece1 44%,#f8f5ee 100%)' }}>
      <header className="header-o">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1 }}>
          <a href="/app/profile" className="brand-o"><span className="brand-mark-o" /><span>OriginFlow</span></a>
          <span style={{ width: 1, height: 20, background: 'rgba(140,120,96,0.2)' }} />
          <span style={{ fontSize: 14, color: 'var(--ink-soft)', fontWeight: 600 }}>交流社区</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => navigate('/profile')} className="btn-o-ghost btn-o-sm">返回工作台</button>
          <AnnouncementBell />
          <button onClick={() => { logout(); navigate('/'); }} className="btn-o-ghost btn-o-sm"><LogOut size={14} /> 退出</button>
        </div>
      </header>

      <main style={{ maxWidth: 1120, margin: '0 auto', padding: '1.5rem 1.25rem 4rem' }}>
        <section style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 18, alignItems: 'start' }}>
          <aside style={{ position: 'sticky', top: 84, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="card-o-sm" style={{ padding: 14 }}>
              <p className="text-o-label" style={{ margin: '0 0 10px' }}>分类</p>
              <button className={`chip-o ${categoryId === '' ? 'selected' : ''}`} onClick={() => setCategoryId('')} style={{ width: '100%', justifyContent: 'flex-start', marginBottom: 8 }}>全部</button>
              {categories.map(c => (
                <button key={c.id} className={`chip-o ${String(categoryId) === String(c.id) ? 'selected' : ''}`} onClick={() => setCategoryId(c.id)} style={{ width: '100%', justifyContent: 'flex-start', marginBottom: 8 }}>
                  {c.name}
                </button>
              ))}
            </div>
            <div className="card-o-sm" style={{ padding: 14 }}>
              <p className="text-o-label" style={{ margin: '0 0 10px' }}>类型</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {TYPE_OPTIONS.map(t => (
                  <button key={t.id || 'all'} className={`chip-o ${postType === t.id ? 'selected' : ''}`} onClick={() => setPostType(t.id)}>{t.label}</button>
                ))}
              </div>
            </div>
          </aside>

          <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="card-o-sm" style={{ padding: '1rem 1.125rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
                <div>
                  <h1 style={{ margin: 0, fontSize: 24, color: 'var(--ink)', fontWeight: 800 }}>论坛</h1>
                  <p style={{ margin: '3px 0 0', color: 'var(--ink-soft)', fontSize: 14 }}>
                    {selectedCategory ? selectedCategory.description : '论文写作、格式规范、AIGC 降重与工具使用交流'}
                  </p>
                </div>
                <button onClick={() => setShowComposer(true)} className="btn-o-primary btn-o-sm"><Plus size={15} /> 发布帖子</button>
              </div>
              <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8 }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-soft)' }} />
                  <input className="input-o" value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="搜索标题或正文" style={{ paddingLeft: 38 }} />
                </div>
                <button className="btn-o-ghost btn-o-sm" type="submit">搜索</button>
              </form>
            </div>

            {showComposer && (
              <div className="card-o" style={{ padding: 18, borderRadius: 14 }}>
                <form onSubmit={handleCreatePost} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px 160px', gap: 10 }}>
                    <input className="input-o" value={draft.title} onChange={e => setDraft(p => ({ ...p, title: e.target.value }))} placeholder="标题，5-100 字" maxLength={100} />
                    <select className="input-o" value={draft.category_id} onChange={e => setDraft(p => ({ ...p, category_id: e.target.value }))}>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <select className="input-o" value={draft.post_type} onChange={e => setDraft(p => ({ ...p, post_type: e.target.value }))}>
                      <option value="discussion">讨论</option>
                      <option value="question">提问</option>
                      <option value="feedback">反馈</option>
                    </select>
                  </div>
                  <textarea className="textarea-o" value={draft.content} onChange={e => setDraft(p => ({ ...p, content: e.target.value }))} placeholder="写下你的问题、经验或反馈" rows={6} maxLength={5000} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <label className="btn-o-ghost btn-o-sm" style={{ cursor: uploadingImage || imageUrls.length >= MAX_POST_IMAGES ? 'not-allowed' : 'pointer', opacity: uploadingImage || imageUrls.length >= MAX_POST_IMAGES ? 0.55 : 1 }}>
                        <ImagePlus size={14} /> {uploadingImage ? '上传中...' : '添加图片'}
                        <input type="file" accept="image/*" multiple disabled={uploadingImage || imageUrls.length >= MAX_POST_IMAGES} onChange={handleImageSelect} style={{ display: 'none' }} />
                      </label>
                      <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>最多 {MAX_POST_IMAGES} 张，每张不超过 5MB</span>
                    </div>
                    {imageUrls.length > 0 && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(92px, 1fr))', gap: 10 }}>
                        {imageUrls.map(url => (
                          <div key={url} style={{ position: 'relative', aspectRatio: '1 / 1', borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(140,120,96,0.18)', background: '#f6efe3' }}>
                            <img src={resolveAssetUrl(url)} alt="帖子图片预览" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                            <button type="button" onClick={() => removeImage(url)} aria-label="移除图片" style={{ position: 'absolute', top: 6, right: 6, border: 'none', borderRadius: 999, width: 24, height: 24, background: 'rgba(40,30,20,0.72)', color: '#fff', cursor: 'pointer', lineHeight: '24px' }}>×</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{draft.content.length}/5000</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="button" onClick={() => setShowComposer(false)} className="btn-o-ghost btn-o-sm">取消</button>
                      <button type="submit" disabled={submitting} className="btn-o-primary btn-o-sm">{submitting ? '发布中...' : '发布'}</button>
                    </div>
                  </div>
                </form>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--ink-soft)', fontSize: 13 }}>
              <span>共 {total} 个帖子</span>
              {loading && <span>加载中...</span>}
            </div>

            {posts.length === 0 && !loading ? (
              <div className="card-o-sm" style={{ padding: '3rem 1rem', textAlign: 'center' }}>
                <MessageSquare size={34} style={{ color: 'rgba(140,120,96,0.35)' }} />
                <p style={{ margin: '0.75rem 0 0', color: 'var(--ink-soft)' }}>还没有帖子，发布第一条讨论吧。</p>
              </div>
            ) : posts.map(post => (
              <article key={post.id} className="card-o-sm" onClick={() => navigate(`/forum/posts/${post.id}`)} style={{ padding: 18, cursor: 'pointer', borderColor: post.is_pinned ? 'rgba(195,160,106,0.42)' : undefined }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <PostBadges post={post} />
                    <h2 style={{ margin: '10px 0 6px', fontSize: 18, color: 'var(--ink)', lineHeight: 1.35 }}>{post.title}</h2>
                    <p style={{ margin: 0, color: 'var(--ink-soft)', fontSize: 14, lineHeight: 1.65, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {post.content}
                    </p>
                    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 12, color: 'rgba(92,74,56,0.72)', fontSize: 12 }}>
                      <span>{post.author?.username || '用户'} · {post.category?.name}</span>
                      <span>{formatDate(post.last_replied_at || post.created_at)}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 12, color: 'var(--ink-soft)', fontSize: 12, flexShrink: 0 }}>
                    <span><MessageCircle size={14} /> {post.reply_count}</span>
                    <span><Eye size={14} /> {post.view_count}</span>
                  </div>
                </div>
              </article>
            ))}
          </section>
        </section>
      </main>

      <style>{`
        @media (max-width: 860px) {
          main section[style*="grid-template-columns: 260px 1fr"] { display: block !important; }
          aside { position: static !important; margin-bottom: 14px; }
        }
      `}</style>
    </div>
  );
}
