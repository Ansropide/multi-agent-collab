# 本地智能体管理系统 (Multi-Agent Collaboration)

多智能体协作系统，支持创建和管理 AI 智能体，进行多轮对话与群组协作。

## 技术栈

### 后端
- **框架**: FastAPI (Python)
- **数据库**: SQLite + SQLAlchemy (async)
- **API**: RESTful + SSE (流式响应)
- **服务**: 智能体引擎、LLM 客户端、流管理

### 前端
- **框架**: React 19 + TypeScript
- **构建**: Vite 8
- **样式**: Tailwind CSS 4
- **状态管理**: Zustand
- **路由**: React Router v7
- **HTTP**: Axios

## 项目结构

```
├── backend/
│   ├── app/
│   │   ├── api/            # API 路由 (agents, conversations, messages)
│   │   ├── models/         # SQLAlchemy 数据模型
│   │   ├── schemas/        # Pydantic 校验模型
│   │   ├── services/       # 业务逻辑 (智能体引擎, LLM 客户端, 流管理)
│   │   ├── config.py       # 应用配置
│   │   ├── database.py     # 数据库连接
│   │   └── main.py         # 应用入口
│   ├── data/               # SQLite 数据库文件
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/            # API 客户端
│   │   ├── features/       # 功能组件 (chat, conversations, group, tasks)
│   │   ├── pages/          # 页面 (AgentCreate, AgentList, AgentWorkspace, GroupWorkflow)
│   │   ├── store/          # Zustand 状态管理
│   │   └── types/          # TypeScript 类型定义
│   └── package.json
├── start.bat               # 一键启动脚本
├── reset-db.bat            # 重置数据库
└── README.md
```

## 快速开始

### 前置要求

- Python >= 3.11
- Node.js >= 20
- pnpm 或 npm

### 安装与启动

**后端**

```bash
cd backend
pip install -r requirements.txt
python run.py
# 或: uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

后端默认运行在 http://localhost:8000，API 文档在 http://localhost:8000/docs

**前端**

```bash
cd frontend
npm install
npm run dev
```

前端默认运行在 http://localhost:5173

**一键启动**

Windows 下直接双击 `start.bat` 即可同时启动前后端服务。

## API 概览

| 方法   | 路径                        | 说明             |
| ------ | --------------------------- | ---------------- |
| POST   | `/api/agents`               | 创建智能体       |
| GET    | `/api/agents`               | 智能体列表       |
| GET    | `/api/agents/{id}`          | 智能体详情       |
| PUT    | `/api/agents/{id}`          | 更新智能体       |
| DELETE | `/api/agents/{id}`          | 删除智能体       |
| POST   | `/api/conversations`        | 创建对话         |
| GET    | `/api/conversations`        | 对话列表         |
| POST   | `/api/conversations/{id}/messages` | 发送消息  |
| GET    | `/api/conversations/{id}/messages` | 消息流（SSE） |
| GET    | `/api/health`               | 健康检查         |

## License

MIT
