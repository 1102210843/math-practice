# 口算小达人

面向一二年级小学生的数学每日练习：口算闯关、读题训练、打卡与成长报告。

## 仓库结构

```
math-practice/
├── client/          # 微信小程序（原生）
├── server/          # Node.js + Express API
└── docs/            # PRD、技术方案、UI 线框说明
```

## 环境要求

- **Node.js**：建议 18 LTS 及以上  
- **MySQL**：5.7+ / 8.x（项目约定不使用外键）  
- **微信开发者工具**：用于打开与调试 `client/`

## 后端

```bash
cd server
cp .env.example .env
# 编辑 .env：填写 DB_*、JWT_SECRET、WX_APP_ID / WX_APP_SECRET（正式环境登录需要）

npm install
npm run db:init    # 建表 + 种子数据
npm run dev        # 默认 http://localhost:3000 ，见 .env 中 PORT
```

常用脚本见 `server/package.json`：`start`、`dev`、`db:init`。

## Docker 镜像

- **Dockerfile**：`server/Dockerfile`（Node 20 Alpine，生产依赖 `npm ci --omit=dev`，非 root 用户 `node` 运行）  
- **本地构建**：

```bash
cd server
docker build -t math-practice-server:local .
docker run --rm -p 3000:3000 --env-file .env math-practice-server:local
```

- **健康检查**：容器内请求 `GET /health`（默认监听 `PORT` 未设置时为 `3000`；若改端口请同步调整镜像 `HEALTHCHECK` 或使用 Compose 覆盖）。

## GitHub Actions

工作流：`.github/workflows/docker-build.yml`

| 触发条件 | 行为 |
|----------|------|
| `push` 到 `main` / `master`（且变更在 `server/**` 或该 workflow） | 构建并推送到 **GHCR**：`latest` + `sha-<commit>` |
| 推送 `v*` 标签（如 `v1.0.0`） | 额外打上 **semver** 标签 |
| `pull_request` | 仅构建校验，**不推送** |
| `workflow_dispatch` | 手动触发构建并推送 |

镜像地址：`ghcr.io/<GitHub 用户名小写>/math-practice-server`（与仓库 Owner 对应，首推后可在仓库 **Packages** 中查看并设置可见性）。

## 小程序前端

1. 用微信开发者工具 **导入项目**，目录选择本仓库下的 `client/`。  
2. 在 `client/utils/request.js` 中修改 **`BASE_URL`**、**`STATIC_URL`**，使其指向你的后端（真机调试需本机 IP 或 HTTPS 合法域名）。  
3. 开发阶段可在开发者工具中勾选 **不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书**。  
4. 首次进入为登录页，需后端可用并完成 `wx.login` / 开发环境 `dev_user` 登录逻辑。

## 文档

| 文件 | 说明 |
|------|------|
| `docs/PRD.md` | 产品需求 |
| `docs/TECH-DESIGN.md` | 接口与数据设计 |
| `docs/UI-WIREFRAME.md` | 页面与交互说明 |

## 技术栈摘要

| 层级 | 技术 |
|------|------|
| 小程序 | WXML / WXSS / JS |
| 后端 | Express、JWT、mysql2 |
| 数据 | MySQL（无外键约束） |

## 常见问题

- **数据库连接失败**：检查 MySQL 是否启动、`server/.env` 中 `DB_HOST` / `DB_PORT` / 账号密码。  
- **小程序请求失败**：核对 `BASE_URL`、本机防火墙、开发者工具域名校验设置。  
- **登录 401**：清除本地 token 后重新进入登录页；确认后端 `JWT_SECRET` 与签发一致。

## 许可证

内部 / 教育用途项目；如需开源请自行补充 `LICENSE`。
