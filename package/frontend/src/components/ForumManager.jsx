import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { CheckCircle, Flag, Lock, Pin, RefreshCw, Star, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';
import { adminAPI } from '../api';

const TYPE_LABELS = { discussion: '讨论', question: '提问', feedback: '反馈' };

export default function ForumManager() {
  const [tab, setTab] = useState('posts');
  const [posts, setPosts] = useState([]);
  const [reports, setReports] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '', sort_order: 100, is_active: true });

  const loadPosts = async () => {
    setLoading(true);
    try { setPosts((await adminAPI.listForumPosts()).data || []); }
    catch { toast.error('获取帖子失败'); }
    finally { setLoading(false); }
  };

  const loadReports = async () => {
    setLoading(true);
    try { setReports((await adminAPI.listForumReports()).data || []); }
    catch { toast.error('获取举报失败'); }
    finally { setLoading(false); }
  };

  const loadCategories = async () => {
    setLoading(true);
    try { setCategories((await adminAPI.listForumCategories()).data || []); }
    catch { toast.error('获取分类失败'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (tab === 'posts') loadPosts();
    if (tab === 'reports') loadReports();
    if (tab === 'categories') loadCategories();
  }, [tab]);

  const patchPost = async (post, patch) => {
    try {
      await adminAPI.updateForumPost(post.id, patch);
      toast.success('已更新');
      loadPosts();
    } catch (err) {
      toast.error(err.response?.data?.detail || '操作失败');
    }
  };

  const updateReport = async (report, status) => {
    try {
      await adminAPI.updateForumReport(report.id, { status });
      toast.success('举报已处理');
      loadReports();
    } catch {
      toast.error('操作失败');
    }
  };

  const saveCategory = async (e) => {
    e.preventDefault();
    try {
      await adminAPI.createForumCategory({ ...categoryForm, sort_order: Number(categoryForm.sort_order) });
      toast.success('分类已创建');
      setCategoryForm({ name: '', description: '', sort_order: 100, is_active: true });
      loadCategories();
    } catch (err) {
      toast.error(err.response?.data?.detail || '创建失败');
    }
  };

  const toggleCategory = async (category) => {
    try {
      await adminAPI.updateForumCategory(category.id, { ...category, is_active: !category.is_active });
      loadCategories();
    } catch {
      toast.error('操作失败');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="tabs-g border-b-0">
          {[
            ['posts', '帖子管理'],
            ['reports', '举报处理'],
            ['categories', '分类管理'],
          ].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} className={`tab-g ${tab === key ? 'active' : ''}`}>{label}</button>
          ))}
        </div>
        <button
          onClick={() => tab === 'posts' ? loadPosts() : tab === 'reports' ? loadReports() : loadCategories()}
          className="btn-g-text"
        >
          <RefreshCw className="w-4 h-4" /> 刷新
        </button>
      </div>

      {tab === 'posts' && (
        <div className="card-g overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="text-left px-4 py-3">帖子</th>
                <th className="text-left px-4 py-3">作者</th>
                <th className="text-left px-4 py-3">状态</th>
                <th className="text-right px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {posts.map(post => (
                <tr key={post.id} className={post.is_deleted ? 'opacity-50' : ''}>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900">{post.title}</p>
                    <p className="text-xs text-gray-500">{post.category?.name} · {TYPE_LABELS[post.post_type]} · {post.reply_count} 回复 · {post.view_count} 浏览</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{post.author?.username || '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {post.is_pinned && <span className="badge-g-orange">置顶</span>}
                      {post.is_featured && <span className="badge-g-green">精华</span>}
                      {post.is_locked && <span className="badge-g-gray">锁定</span>}
                      {post.is_solved && <span className="badge-g-blue">已解决</span>}
                      {post.is_deleted && <span className="badge-g-red">已删除</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button title="置顶" onClick={() => patchPost(post, { is_pinned: !post.is_pinned })} className="btn-g-text"><Pin className="w-4 h-4" /></button>
                      <button title="精华" onClick={() => patchPost(post, { is_featured: !post.is_featured })} className="btn-g-text"><Star className="w-4 h-4" /></button>
                      <button title="锁定" onClick={() => patchPost(post, { is_locked: !post.is_locked })} className="btn-g-text"><Lock className="w-4 h-4" /></button>
                      <button title="已解决" onClick={() => patchPost(post, { is_solved: !post.is_solved })} className="btn-g-text"><CheckCircle className="w-4 h-4" /></button>
                      <button title="删除/恢复" onClick={() => patchPost(post, { is_deleted: !post.is_deleted })} className="btn-g-text text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {posts.length === 0 && <tr><td colSpan={4} className="px-4 py-10 text-center text-gray-400">{loading ? '加载中...' : '暂无帖子'}</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'reports' && (
        <div className="space-y-3">
          {reports.map(report => (
            <div key={report.id} className="card-g-flat p-4 flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-gray-900 flex items-center gap-2"><Flag className="w-4 h-4 text-red-500" /> {report.reason}</p>
                <p className="text-sm text-gray-500 mt-1">{report.target_type} #{report.target_id} · 举报人 {report.reporter?.username || report.reporter_id}</p>
                {report.description && <p className="text-sm text-gray-600 mt-2 whitespace-pre-line">{report.description}</p>}
              </div>
              <div className="flex items-center gap-2">
                <span className={report.status === 'pending' ? 'badge-g-orange' : report.status === 'resolved' ? 'badge-g-green' : 'badge-g-gray'}>{report.status}</span>
                <button onClick={() => updateReport(report, 'resolved')} className="btn-g-filled">已处理</button>
                <button onClick={() => updateReport(report, 'rejected')} className="btn-g-outlined">驳回</button>
              </div>
            </div>
          ))}
          {reports.length === 0 && <div className="card-g-flat p-10 text-center text-gray-400">{loading ? '加载中...' : '暂无举报'}</div>}
        </div>
      )}

      {tab === 'categories' && (
        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-5">
          <form onSubmit={saveCategory} className="card-g-flat p-5 space-y-4">
            <h3 className="font-semibold text-gray-900">新增分类</h3>
            <input className="input-g" value={categoryForm.name} onChange={e => setCategoryForm(p => ({ ...p, name: e.target.value }))} placeholder="分类名称" required />
            <input className="input-g" value={categoryForm.description} onChange={e => setCategoryForm(p => ({ ...p, description: e.target.value }))} placeholder="分类说明" />
            <input className="input-g" type="number" value={categoryForm.sort_order} onChange={e => setCategoryForm(p => ({ ...p, sort_order: e.target.value }))} placeholder="排序" />
            <button className="btn-g-filled w-full">创建分类</button>
          </form>
          <div className="card-g overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr><th className="text-left px-4 py-3">分类</th><th className="text-left px-4 py-3">排序</th><th className="text-right px-4 py-3">状态</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {categories.map(c => (
                  <tr key={c.id}>
                    <td className="px-4 py-3"><p className="font-semibold text-gray-900">{c.name}</p><p className="text-xs text-gray-500">{c.description}</p></td>
                    <td className="px-4 py-3">{c.sort_order}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => toggleCategory(c)} className="btn-g-text">
                        {c.is_active ? <ToggleRight className="w-5 h-5 text-green-500" /> : <ToggleLeft className="w-5 h-5 text-gray-400" />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
