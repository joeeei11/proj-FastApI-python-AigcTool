![Language](https://img.shields.io/badge/language-Python-blue) ![License](https://img.shields.io/badge/license-CC%20BY--NC--SA%204.0-green)

# proj-FastApI-python-AigcTool

**基于 FastAPI 的 AI 学术写作助手——专业论文润色与 AIGC 痕迹消除系统，支持卡密授权与多模型配置。**

## 功能特性

- 双阶段优化：第一阶段论文润色 + 第二阶段学术增强，有效降低 AIGC 检测率
- 智能分段处理：自动识别标题结构，跳过短段落，保留原文层次
- 卡密授权系统：管理员生成卡券，支持次数限制与有效期控制
- 并发队列管理：配置最大并发用户数，超出自动排队等候
- 实时系统配置：模型参数、并发数、流式开关可在管理后台热更新
- 可视化管理后台：用户管理、会话监控、数据库管理一体化界面

## 快速开始

### 环境要求

- Python 3.10+
- Node.js 18+（仅本地构建前端时需要）
- Redis（用于并发控制与队列）
- OpenAI 兼容格式的 API（支持 Gemini / DeepSeek 等）

### 安装步骤

```bash
git clone https://github.com/joeeei11/proj-FastApI-python-AigcTool.git
cd proj-FastApI-python-AigcTool/package/backend
pip install -r requirements.txt
```

复制并编辑配置文件：

```bash
cp .env.example .env
# 填入 API Key、管理员密码、SECRET_KEY 等
```

### 启动服务

```bash
# 启动后端
cd package/backend
uvicorn app.main:app --host 0.0.0.0 --port 8000

# 启动前端（开发模式）
cd package/frontend
npm install && npm run dev
```

访问地址：

- 用户界面：http://localhost:8000
- 管理后台：http://localhost:8000/admin
- API 文档：http://localhost:8000/docs

### 主要配置项

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| `POLISH_MODEL` | 第一阶段润色模型 | gemini-2.5-pro |
| `ENHANCE_MODEL` | 第二阶段增强模型 | gemini-2.5-pro |
| `MAX_CONCURRENT_USERS` | 最大并发用户数 | 7 |
| `DEFAULT_USAGE_LIMIT` | 新用户默认次数 | 1 |
| `USE_STREAMING` | 流式输出（Gemini 建议关闭）| false |

## License

Creative Commons CC BY-NC-SA 4.0 — 未经许可禁止商业使用
