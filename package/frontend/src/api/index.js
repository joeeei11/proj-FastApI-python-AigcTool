import axios from 'axios';
import { getMemoryToken } from '../auth/AuthContext';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

// 请求拦截器：从内存读取 token（刷新即清空，不持久化）
api.interceptors.request.use(
  (config) => {
    const token = getMemoryToken();
    if (token) {
      config.headers = config.headers || {};
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器：只有已登录时收到 401 才跳转（token 过期），登录/注册失败不跳转
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && getMemoryToken()) {
      // 已有 token 但返回 401 = 会话过期，回到登录页
      window.location.href = '/app/';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  changePassword: (data) => api.post('/auth/change-password', data),
  redeem: (code) => api.post('/auth/redeem', { code }),
};

// Admin API（使用 JWT Bearer Token，通过 adminToken 临时替换）
const adminAxios = axios.create({ baseURL: '/api', timeout: 30000 });
adminAxios.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  if (token) {
    config.headers = config.headers || {};
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

export const adminAPI = {
  login: (data) => adminAxios.post('/admin/login', data),
  verifyToken: () => adminAxios.post('/admin/verify-token'),
  getStatistics: () => adminAxios.get('/admin/statistics'),
  getUsers: () => adminAxios.get('/admin/users'),
  toggleUser: (userId) => adminAxios.patch(`/admin/users/${userId}/toggle`),
  deleteUser: (userId) => adminAxios.delete(`/admin/users/${userId}`),
  updateUserUsage: (userId, data) => adminAxios.patch(`/admin/users/${userId}/usage`, data),
  getUserDetails: (userId) => adminAxios.get(`/admin/users/${userId}/details`),
  getUserSessions: (userId) => adminAxios.get(`/admin/users/${userId}/sessions`),
  stopSession: (sessionId) => adminAxios.post(`/admin/sessions/${sessionId}/stop`),
  getSessions: (params) => adminAxios.get('/admin/sessions', { params }),
  getActiveSessions: () => adminAxios.get('/admin/sessions/active'),
  getAdminSessionDetail: (sessionId) => adminAxios.get(`/admin/sessions/${sessionId}/detail`),
  addUserCredits: (userId, credits) => adminAxios.post(`/admin/users/${userId}/add-credits`, { credits }),
  // 公告管理
  listAnnouncements: () => adminAxios.get('/admin/announcements'),
  createAnnouncement: (data) => adminAxios.post('/admin/announcements', data),
  updateAnnouncement: (id, data) => adminAxios.put(`/admin/announcements/${id}`, data),
  toggleAnnouncement: (id) => adminAxios.patch(`/admin/announcements/${id}/toggle`),
  deleteAnnouncement: (id) => adminAxios.delete(`/admin/announcements/${id}`),
  getConfig: () => adminAxios.get('/admin/config'),
  updateConfig: (data) => adminAxios.post('/admin/config', data),
  // 卡券管理
  createCoupons: (data) => adminAxios.post('/admin/coupons', data),
  listCoupons: () => adminAxios.get('/admin/coupons'),
  toggleCoupon: (id) => adminAxios.patch(`/admin/coupons/${id}/toggle`),
  deleteCoupon: (id) => adminAxios.delete(`/admin/coupons/${id}`),
};

// Prompts API
export const promptsAPI = {
  getSystemPrompts: () => api.get('/prompts/system'),
  getUserPrompts: (stage = null) =>
    api.get('/prompts/', { params: stage ? { stage } : {} }),
  createPrompt: (data) => api.post('/prompts/', data),
  updatePrompt: (promptId, data) => api.put(`/prompts/${promptId}`, data),
  deletePrompt: (promptId) => api.delete(`/prompts/${promptId}`),
  setDefaultPrompt: (promptId) => api.post(`/prompts/${promptId}/set-default`),
};

// Optimization API
export const optimizationAPI = {
  extractFile: (file) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/optimization/extract-file', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 30000,
    });
  },
  startOptimization: (data) => api.post('/optimization/start', data, { timeout: 60000 }),
  getQueueStatus: (sessionId = null) =>
    api.get('/optimization/status', {
      params: sessionId ? { session_id: sessionId } : {},
      timeout: 10000,
    }),
  listSessions: () => api.get('/optimization/sessions', { timeout: 15000 }),
  getSessionDetail: (sessionId) =>
    api.get(`/optimization/sessions/${sessionId}`, { timeout: 20000 }),
  getSessionProgress: (sessionId) =>
    api.get(`/optimization/sessions/${sessionId}/progress`, { timeout: 10000 }),
  getSessionChanges: (sessionId) =>
    api.get(`/optimization/sessions/${sessionId}/changes`, { timeout: 20000 }),
  stopSession: (sessionId) =>
    api.post(`/optimization/sessions/${sessionId}/stop`, null, { timeout: 10000 }),
  exportSession: (sessionId, confirmation) =>
    api.post(`/optimization/sessions/${sessionId}/export`, confirmation, { timeout: 30000 }),
  deleteSession: (sessionId) =>
    api.delete(`/optimization/sessions/${sessionId}`, { timeout: 10000 }),
  retryFailedSegments: (sessionId) =>
    api.post(`/optimization/sessions/${sessionId}/retry`, null, { timeout: 15000 }),
  getStreamUrl: (sessionId) => {
    const token = localStorage.getItem('authToken');
    return `/api/optimization/sessions/${sessionId}/stream?token=${token}`;
  },
};

// Health API
export const healthAPI = {
  checkModels: () => api.get('/health/models', { timeout: 15000 }),
};

// Word Formatter API
export const wordFormatterAPI = {
  getUsage: () => api.get('/word-formatter/usage'),
  listSpecs: () => api.get('/word-formatter/specs'),
  getSpecSchema: () => api.get('/word-formatter/specs/schema'),
  validateSpec: (specJson) =>
    api.post('/word-formatter/specs/validate', null, { params: { spec_json: specJson } }),
  generateSpec: (requirements) =>
    api.post('/word-formatter/specs/generate', { requirements }, { timeout: 120000 }),
  saveSpec: (name, specJson, description = null) =>
    api.post('/word-formatter/specs/save', { name, spec_json: specJson, description }),
  listSavedSpecs: () => api.get('/word-formatter/specs/saved'),
  getSavedSpec: (specId) => api.get(`/word-formatter/specs/saved/${specId}`),
  deleteSavedSpec: (specId) => api.delete(`/word-formatter/specs/saved/${specId}`),
  formatText: (data) => api.post('/word-formatter/format/text', data, { timeout: 60000 }),
  formatFile: (file, options = {}) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/word-formatter/format/file', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      params: options,
      timeout: 120000,
    });
  },
  getJobStatus: (jobId) => api.get(`/word-formatter/jobs/${jobId}`),
  listJobs: (limit = 10) => api.get('/word-formatter/jobs', { params: { limit } }),
  deleteJob: (jobId) => api.delete(`/word-formatter/jobs/${jobId}`),
  getJobReport: (jobId) => api.get(`/word-formatter/jobs/${jobId}/report`),
  getDownloadUrl: (jobId) => {
    const token = localStorage.getItem('authToken');
    return `/api/word-formatter/jobs/${jobId}/download?token=${token}`;
  },
  getStreamUrl: (jobId) => {
    const token = localStorage.getItem('authToken');
    return `/api/word-formatter/jobs/${jobId}/stream?token=${token}`;
  },
  preprocessText: (text, options = {}) =>
    api.post('/word-formatter/preprocess/text', {
      text,
      chunk_paragraphs: options.chunkParagraphs || 40,
      chunk_chars: options.chunkChars || 8000,
    }, { timeout: 60000 }),
  preprocessFile: (file, options = {}) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/word-formatter/preprocess/file', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      params: {
        chunk_paragraphs: options.chunkParagraphs || 40,
        chunk_chars: options.chunkChars || 8000,
      },
      timeout: 120000,
    });
  },
  getPreprocessStreamUrl: (jobId) => {
    const token = localStorage.getItem('authToken');
    return `/api/word-formatter/preprocess/${jobId}/stream?token=${token}`;
  },
  getPreprocessResult: (jobId) => api.get(`/word-formatter/preprocess/${jobId}/result`),
  deletePreprocessJob: (jobId) => api.delete(`/word-formatter/preprocess/${jobId}`),
  getFormatParagraphTypes: () => api.get('/word-formatter/format-check/types'),
  checkTextFormat: (text, mode = 'loose') =>
    api.post('/word-formatter/format-check/text', { text, mode }, { timeout: 30000 }),
  checkFileFormat: (file, mode = 'loose') => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/word-formatter/format-check/file', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      params: { mode },
      timeout: 60000,
    });
  },
};

export default api;
