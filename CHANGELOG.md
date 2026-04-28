# OriginFlow AI 学术写作助手 — 改造总结

## 项目概览

| 项目 | 值 |
|---|---|
| 服务地址 | `http://8.163.10.148` |
| AI 系统入口 | `http://8.163.10.148/app` |
| 管理后台 | `http://8.163.10.148/app/admin` |
| 管理员账号 | `admin` / `LnPjPdILYwd9FJFq` |
| 技术栈 | React 18 + Vite + FastAPI + SQLite + Docker |

---

## 一、认证系统重构

**原系统**：卡密（card_key）直接作为用户身份，无账号概念。

**新流程**：

```
注册账号 → 登录（获得 JWT）→ 兑换卡券 → 使用功能
```

### 后端变更

| 文件 | 改动 |
|---|---|
| `models/models.py` | `User` 新增 `username/password_hash/email/last_login`；新增 `Coupon` 卡券表 |
| `routes/auth.py` | 新建：`/api/auth/register`、`login`、`me`、`redeem` |
| `routes/optimization.py` | 认证方式从 `card_key` query param → JWT Bearer Header |
| `routes/prompts.py` | 同上 |
| `word_formatter/routes.py` | 同上；SSE/下载端点支持 `?token=` 参数 |
| `routes/admin.py` | 新增卡券 CRUD：`GET/POST /api/admin/coupons`，`PATCH/DELETE /api/admin/coupons/{id}` |
| `utils/auth.py` | 新增 `get_current_user_from_token()` 依赖 |
| `database.py` | 新增 `users` 表字段自动迁移 |

### 前端变更

| 文件 | 改动 |
|---|---|
| `auth/AuthContext.jsx` | **新建**：内存 Token 存储（刷新即清空，不持久化） |
| `api/index.js` | 请求拦截器改用 Bearer Token；401 仅在已登录状态下才跳转 |
| `App.jsx` | `ProtectedRoute` 改为读取 Context；`basename="/app"` |
| `WelcomePage.jsx` | 重写为登录/注册页（Tab 切换） |
| `RedeemPage.jsx` | **新建**：卡券兑换页 |
| `WorkspacePage.jsx` | 退出改为清除内存 Token；显示用户名和剩余次数 |

---

## 二、落地页集成（Plan B）

**架构**：

```
http://8.163.10.148/        → OriginFlow 落地页（静态 HTML）
http://8.163.10.148/app/    → AI 系统（React SPA）
http://8.163.10.148/api/    → FastAPI 后端
```

| 文件 | 改动 |
|---|---|
| `landing/` | **新建**：落地页目录（`index.html` + `styles.css` + `script.js`） |
| `nginx.conf` | `/app/` → React SPA；`/` → 落地页；`/api/` → 后端代理 |
| `Dockerfile.frontend` | 同时复制 `landing/` 和构建产物 `dist/` 到 Nginx |
| `vite.config.js` | `base: '/app/'` |

---

## 三、UI 重设计（OriginFlow 风格）

与落地页视觉统一：暖米色背景、Manrope + Syne 字体、玻璃态卡片、深绿/金色渐变按钮。

| 页面 | 主要改动 |
|---|---|
| `WelcomePage` | 暖色渐变背景 + 玻璃卡片；品牌 Logo 圆点；渐变主按钮 |
| `WorkspacePage` | 顶部毛玻璃 Header；左侧历史侧栏；Chip 模式选择；暖色进度条 |
| `RedeemPage` | 金色图标；与登录页同款玻璃卡片 |
| `AdminDashboard` | Tab 改为下划线风格；新增卡券管理标签页 |
| `tailwind.config.js` | 新增 `o-*` 暖色系 Token（`o-bg`、`o-ink`、`o-green` 等） |
| `index.css` | 全新 `card-o`、`btn-o-primary`、`input-o`、`chip-o` 等工具类 |
| `index.html` | 引入 Manrope + Syne Google Fonts |

---

## 四、Docker 部署

```yaml
# docker-compose.yml
services:
  backend:   # FastAPI，端口 9800（内网）
  frontend:  # Nginx，端口 80（公网）
```

**数据持久化**：`/opt/BypassAIGC/data/ai_polish.db`（SQLite）

**常用运维命令**（服务器 `/opt/BypassAIGC` 目录下）：

```bash
docker compose ps              # 查看状态
docker compose logs -f backend # 查看后端日志
docker compose restart         # 重启所有服务
docker compose up -d --build frontend  # 重建前端
chmod 777 /opt/BypassAIGC/data/        # 修复数据库权限
```

---

## 五、主要 Bug 修复记录

| Bug | 原因 | 修复方式 |
|---|---|---|
| 注册失败 500 | 数据库目录权限 755，容器无写权限 | `chmod 777 /opt/BypassAIGC/data/` |
| bcrypt 注册报错 | `bcrypt==5.0.0` 与 `passlib==1.7.4` 不兼容 | `requirements.txt` 固定 `bcrypt==4.0.1` |
| 登录后跳到落地页 | 401 拦截器对所有错误执行 `window.location.href='/'` | 只在已有 Token 时才跳转 |
| 卡券列表 500 | 直接插入的卡券 `created_at=NULL`，Pydantic 校验失败 | `created_at: Optional[datetime]`；补填 NULL 记录 |
| 管理员用户列表 401 | `handleLogin` 直接调用 `fetchUsers()` 时 React State 未更新 | 删除多余的 `fetchUsers()` 调用 |
| 复制按钮失效 | HTTP 环境下 `navigator.clipboard` 被禁用 | 降级使用 `document.execCommand('copy')` |

---

## 六、卡券使用流程

```
管理后台 → 卡券管理 → 创建卡券（设置次数）
↓
将卡券码发给用户
↓
用户注册/登录 → 兑换卡券页 → 输入卡券码 → 获得使用次数
```

> 当前有效卡券：在管理后台「卡券管理」标签页查看
