import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, CheckCircle, Eye, Flag, Lock, MessageCircle, Pin, Send, Star, Trash2 } from 'lucide-react';
import { forumAPI, formatApiError, resolveAssetUrl } from '../api';
import { useAuth } from '../auth/AuthContext';

const TYPE_LABELS = { discussion: '讨论', question: '提问', feedback: '反馈' };

function Badge({ children, tone = 'gray' }) {
  const cls = tone === 'green' ? 'badge-o-green' : tone === 'warm' ? 'badge-o-warm' : 'badge-o-gray';
  return <span className={cls}>{children}</span>;
}

export default function ForumPostPage() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { userInfo } = useAuth();
  const [post, setPost] = useState(null);
  const [replies, setReplies] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [postRes, replyRes] = await Promise.all([
        forumAPI.getPost(postId),
        forumAPI.listReplies(postId),
      ]);
      setPost(postRes.data);
      setReplies(replyRes.data || []);
    } catch (err) {
      toast.error(formatApiError(err, '帖子不存在'));
      navigate('/forum');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [postId]);

  const createReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    setSubmitting(true);
    try {
      await forumAPI.createReply(postId, { content: replyText });
      setReplyText('');
      toast.success('回复已发布');
      load();
    } catch (err) {
      toast.error(formatApiError(err, '回复失败'));
    } finally {
      setSubmitting(false);
    }
  };

  const deletePost = async () => {
    if (!window.confirm('确认删除这个帖子？')) return;
    try {
      await forumAPI.deletePost(postId);
      toast.success('帖子已删除');
      navigate('/forum');
    } catch (err) {
      toast.error(formatApiError(err, '删除失败'));
    }
  };

  const deleteReply = async (replyId) => {
    if (!window.confirm('确认删除这条回复？')) return;
    try {
      await forumAPI.deleteReply(replyId);
      toast.success('回复已删除');
      load();
    } catch (err) {
      toast.error(formatApiError(err, '删除失败'));
    }
  };

  const solvePost = async () => {
    try {
      const res = await forumAPI.solvePost(postId);
      setPost(res.data);
      toast.success('已标记为已解决');
    } catch (err) {
      toast.error(formatApiError(err, '操作失败'));
    }
  };

  const reportTarget = async (targetType, targetId) => {
    const reason = window.prompt('请输入举报原因：广告 / 辱骂攻击 / 违规内容 / 无关内容 / 其他');
    if (!reason) return;
    try {
      await forumAPI.report({ target_type: targetType, target_id: targetId, reason });
      toast.success('举报已提交');
    } catch (err) {
      toast.error(formatApiError(err, '举报失败'));
    }
  };

  if (loading || !post) {
    return <div style={{ minHeight: '100vh', background: '#faf8f2', padding: 40, color: 'var(--ink-soft)' }}>加载中...</div>;
  }

  const canManagePost = userInfo?.id === post.user_id;

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg,#fcfaf5 0%,#f2ece1 44%,#f8f5ee 100%)' }}>
      <header className="header-o">
        <button onClick={() => navigate('/forum')} className="btn-o-ghost btn-o-sm"><ArrowLeft size={14} /> 返回论坛</button>
      </header>
      <main style={{ maxWidth: 900, margin: '0 auto', padding: '1.5rem 1.25rem 4rem' }}>
        <article className="card-o" style={{ padding: 24, borderRadius: 16 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {post.is_pinned && <Badge tone="warm"><Pin size={11} /> 置顶</Badge>}
            {post.is_featured && <Badge tone="green"><Star size={11} /> 精华</Badge>}
            {post.is_solved && <Badge tone="green"><CheckCircle size={11} /> 已解决</Badge>}
            {post.is_locked && <Badge><Lock size={11} /> 已锁定</Badge>}
            <Badge>{TYPE_LABELS[post.post_type] || post.post_type}</Badge>
            <Badge>{post.category?.name}</Badge>
          </div>
          <h1 style={{ margin: 0, fontSize: 28, lineHeight: 1.25, color: 'var(--ink)' }}>{post.title}</h1>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 10, color: 'var(--ink-soft)', fontSize: 13 }}>
            <span>{post.author?.username || '用户'}</span>
            <span>{new Date(post.created_at).toLocaleString('zh-CN')}</span>
            <span><MessageCircle size={14} /> {post.reply_count}</span>
            <span><Eye size={14} /> {post.view_count}</span>
          </div>
          <div style={{ marginTop: 22, whiteSpace: 'pre-line', color: 'var(--ink)', fontSize: 16, lineHeight: 1.85 }}>
            {post.content}
          </div>
          {post.image_urls?.length > 0 && (
            <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: post.image_urls.length === 1 ? 'minmax(0, 520px)' : 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
              {post.image_urls.map((url, index) => (
                <a key={`${url}-${index}`} href={resolveAssetUrl(url)} target="_blank" rel="noreferrer" style={{ display: 'block', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(140,120,96,0.18)', background: '#f6efe3', aspectRatio: post.image_urls.length === 1 ? '4 / 3' : '1 / 1' }}>
                  <img src={resolveAssetUrl(url)} alt={`帖子图片 ${index + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </a>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 22, flexWrap: 'wrap' }}>
            {canManagePost && post.post_type === 'question' && !post.is_solved && (
              <button onClick={solvePost} className="btn-o-primary btn-o-sm"><CheckCircle size={14} /> 标记已解决</button>
            )}
            {canManagePost && <button onClick={deletePost} className="btn-o-ghost btn-o-sm"><Trash2 size={14} /> 删除</button>}
            <button onClick={() => reportTarget('post', post.id)} className="btn-o-ghost btn-o-sm"><Flag size={14} /> 举报</button>
          </div>
        </article>

        <section style={{ marginTop: 18 }}>
          <h2 style={{ fontSize: 16, color: 'var(--ink)', margin: '0 0 12px' }}>回复 {replies.length}</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {replies.map(reply => (
              <div key={reply.id} className="card-o-sm" style={{ padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ color: 'var(--ink-soft)', fontSize: 13 }}>
                    <strong style={{ color: 'var(--ink)' }}>{reply.author?.username || '用户'}</strong>
                    <span style={{ marginLeft: 8 }}>{new Date(reply.created_at).toLocaleString('zh-CN')}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {userInfo?.id === reply.user_id && (
                      <button onClick={() => deleteReply(reply.id)} style={{ border: 'none', background: 'none', color: '#8b3a2a', cursor: 'pointer' }}><Trash2 size={14} /></button>
                    )}
                    <button onClick={() => reportTarget('reply', reply.id)} style={{ border: 'none', background: 'none', color: 'var(--ink-soft)', cursor: 'pointer' }}><Flag size={14} /></button>
                  </div>
                </div>
                <p style={{ margin: '10px 0 0', whiteSpace: 'pre-line', lineHeight: 1.75, color: 'var(--ink)' }}>{reply.content}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="card-o-sm" style={{ marginTop: 16, padding: 16 }}>
          {post.is_locked ? (
            <p style={{ margin: 0, color: 'var(--ink-soft)' }}><Lock size={14} /> 该帖子已锁定，无法继续回复。</p>
          ) : (
            <form onSubmit={createReply} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <textarea className="textarea-o" value={replyText} onChange={e => setReplyText(e.target.value)} rows={4} maxLength={2000} placeholder="写下你的回复" />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{replyText.length}/2000</span>
                <button disabled={submitting || !replyText.trim()} className="btn-o-primary btn-o-sm"><Send size={14} /> {submitting ? '发布中...' : '发布回复'}</button>
              </div>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
