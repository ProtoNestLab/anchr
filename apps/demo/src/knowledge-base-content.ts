// Anchor SDK 项目解读文档 - 用于知识库测试

export const knowledgeBaseContent = `# Anchor SDK 项目解读

## 一、项目概述

### 1.1 项目定位

**Anchor SDK** 是一个基于 Vue 3 的软件开发工具包，核心目标是为任何 UI 元素附加讨论线程功能。它允许开发者快速为应用中的任意组件添加评论、讨论和协作能力。当前版本 v1.5.0 新增了 AI Agent 智能助手功能，支持通过 @agent 指令在讨论中调用 AI 能力。

### 1.2 核心价值

| 维度 | 价值描述 |
|------|----------|
| 可锚定性 | 能够将讨论功能附加到任何 UI 元素上 |
| 全生命周期 | 支持线程的创建、解决、重开、删除完整流程 |
| 富交互 | 支持 markdown 编辑、表情反应、附件上传、@mentions |
| 实时性 | WebSocket 实时同步、在线状态、打字指示器 |
| 健壮性 | 乐观更新、离线队列、错误处理 |
| AI Agent | v1.5 新增：通过 @agent 指令调用 Kimi 大模型、知识库检索、搜索、数据分析 |
| 灵活性 | 支持 Headless 模式和自定义主题 |

## 二、项目架构

### 2.1 Monorepo 结构

anchr/
├── apps/
│   ├── demo/                    # 演示应用（含 AI Agent Demo）
│   └── serverDemo/              # 服务端演示
├── docs/                        # 文档站点 (VitePress)
├── packages/
│   ├── core/                    # 核心包（含 Agent 模块）
│   ├── vue/                     # Vue 集成包
│   └── ui/                      # UI 组件包
├── .changeset/                  # 版本变更管理
├── .github/workflows/           # CI/CD 工作流
└── package.json                 # 根配置

### 2.2 包职责划分

| 包名 | 发布名称 | 职责描述 |
|------|----------|----------|
| packages/core | @anchor-sdk/core | 类型定义、客户端、适配器、插件系统、AI Agent 模块 |
| packages/vue | @anchor-sdk/vue | Vue 3 组件和 Composables（包含 useAgent） |
| packages/ui | @anchor-sdk/ui | 预构建 UI 组件（讨论面板、编辑器等） |

## 三、核心模块详解

### 3.1 Core 包

#### 3.1.1 核心类型定义

| 类型 | 说明 | 关键字段 |
|------|------|----------|
| User | 用户信息 | id, name, avatar |
| Message | 消息 | id, content, user, reactions, attachments |
| Thread | 讨论线程 | id, anchorId, messages, resolved, lastActivityAt |
| Attachment | 附件 | id, name, url, mimeType, size |

#### 3.1.6 AI Agent 模块（v1.5 新增）

| 组件 | 说明 | 位置 |
|------|------|------|
| AgentParser | @agent 指令解析器 | packages/core/src/agent/parser.ts |
| LangChainAgent | Agent 核心实现，集成 Kimi、工具调用 | packages/core/src/agent/langchain.ts |
| KnowledgeBase | 知识库管理，基于向量检索 | packages/core/src/agent/knowledgeBase.ts |
| AgentPlugin | 插件实现，拦截消息流程 | packages/core/src/agent/plugin.ts |
| 工具集 | 搜索、分析、可视化工具 | packages/core/src/agent/tools/ |

## 四、快速开始

### 4.1 安装依赖

pnpm add @anchor-sdk/core @anchor-sdk/vue @anchor-sdk/ui

### 4.2 基础使用

import { createClient, createMemoryAdapter } from '@anchor-sdk/core'
import { CollabProvider } from '@anchor-sdk/vue'
import { AnchorDiscussion } from '@anchor-sdk/ui'

// 创建客户端
const client = createClient({
  adapter: createMemoryAdapter(),
  user: { id: 'u1', name: 'Alice' },
})

// 在模板中使用
CollabProvider 包裹应用，AnchorDiscussion 包裹需要讨论的元素

## 五、开发与启动

### 5.1 环境要求

- Node.js >= 18
- pnpm >= 8

### 5.2 启动命令

安装依赖：pnpm install

启动演示应用：pnpm dev

运行测试：pnpm test

构建所有包：pnpm build

启动文档开发服务器：pnpm docs:dev

代码检查：pnpm lint, pnpm format

## 六、关键特性

### 6.1 乐观更新

所有写操作先在本地更新 UI，失败时自动回滚。

### 6.2 实时同步

WebSocket 适配器支持实时订阅。

### 6.3 主题定制

通过 CSS 自定义属性定制外观。

### 6.4 插件系统

通过插件扩展生命周期，支持 AI Agent。

### 6.5 AI Agent 能力（v1.5 新增）

| 能力 | 说明 | 调用方式 |
|------|------|----------|
| Kimi 集成 | 调用 Moonshot AI Kimi 大模型 | 自动 / 通过 customLLMCall |
| 知识库检索 | 基于向量相似度的文档检索 | knowledge_base 工具 |
| 意图解析 | 解析 @agent 指令 | AgentParser |
| 工具调用 | 搜索、分析、可视化 | 插件系统 |
| 聊天历史 | 自动获取最近 10 条上下文 | getChatHistory() |

## 七、REST API 规范

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /threads?anchorId=:id | 获取线程列表 |
| POST | /threads | 创建线程 |
| PATCH | /threads/:id/resolve | 解决线程 |
| POST | /threads/:id/messages | 添加消息 |
| PATCH | /messages/:id | 编辑消息 |
| DELETE | /threads/:tid/messages/:mid | 删除消息 |

## 八、总结

Anchor SDK 是一个高度可扩展的 Vue 3 讨论线程 SDK，其核心优势包括：

1. 架构清晰：三层架构（Core / Vue / UI）职责分明
2. 灵活性强：支持开箱即用和 Headless 两种模式
3. 健壮性高：乐观更新、离线队列、错误处理完善
4. 扩展性好：插件系统和适配器模式易于扩展
5. AI 赋能：v1.5 新增 AI Agent，支持 Kimi 大模型、知识库、工具调用

适合需要为应用添加讨论、评论、协作功能的场景，如文档协作、订单管理、内容平台等。

## 附录：版本信息

- 当前版本：v1.5.0
- 许可证：MIT
- 文档站点：https://protonestlab.github.io/anchr/
- GitHub：https://github.com/ProtoNestLab/anchr
`
