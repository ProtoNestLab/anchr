const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
  }
});

// 内存数据存储
const threads = new Map();
const presence = new Map();
const typing = new Map();

// 生成唯一ID
function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

// --- REST API 端点 ---

// 获取线程列表
app.get('/threads', (req, res) => {
  const { anchorId } = req.query;
  if (!anchorId) {
    return res.status(400).json({ error: 'anchorId is required' });
  }
  
  const anchorThreads = Array.from(threads.values()).filter(t => t.anchorId === anchorId);
  res.json(anchorThreads);
});

// 创建线程
app.post('/threads', (req, res) => {
  const { anchorId, content, attachments } = req.body;
  if (!anchorId || !content) {
    return res.status(400).json({ error: 'anchorId and content are required' });
  }
  
  const thread = {
    id: generateId(),
    anchorId,
    messages: [{
      id: generateId(),
      content,
      createdAt: Date.now(),
      user: { id: 'system', name: 'System' },
      reactions: [],
      attachments
    }],
    resolved: false,
    lastActivityAt: Date.now()
  };
  
  threads.set(thread.id, thread);
  
  // 通过WebSocket广播更新
  io.emit('threads:updated', { anchorId, threads: Array.from(threads.values()).filter(t => t.anchorId === anchorId) });
  
  res.json(thread);
});

// 解决线程
app.patch('/threads/:threadId/resolve', (req, res) => {
  const { threadId } = req.params;
  const thread = threads.get(threadId);
  
  if (!thread) {
    return res.status(404).json({ error: 'Thread not found' });
  }
  
  thread.resolved = true;
  thread.lastActivityAt = Date.now();
  
  io.emit('threads:updated', { anchorId: thread.anchorId, threads: Array.from(threads.values()).filter(t => t.anchorId === thread.anchorId) });
  
  res.json(thread);
});

// 重新打开线程
app.patch('/threads/:threadId/reopen', (req, res) => {
  const { threadId } = req.params;
  const thread = threads.get(threadId);
  
  if (!thread) {
    return res.status(404).json({ error: 'Thread not found' });
  }
  
  thread.resolved = false;
  thread.lastActivityAt = Date.now();
  
  io.emit('threads:updated', { anchorId: thread.anchorId, threads: Array.from(threads.values()).filter(t => t.anchorId === thread.anchorId) });
  
  res.json(thread);
});

// 删除线程
app.delete('/threads/:threadId', (req, res) => {
  const { threadId } = req.params;
  const thread = threads.get(threadId);
  
  if (!thread) {
    return res.status(404).json({ error: 'Thread not found' });
  }
  
  const anchorId = thread.anchorId;
  threads.delete(threadId);
  
  io.emit('threads:updated', { anchorId, threads: Array.from(threads.values()).filter(t => t.anchorId === anchorId) });
  
  res.status(204).send();
});

// 添加消息
app.post('/threads/:threadId/messages', (req, res) => {
  const { threadId } = req.params;
  const { content, attachments } = req.body;
  
  const thread = threads.get(threadId);
  if (!thread) {
    return res.status(404).json({ error: 'Thread not found' });
  }
  
  const message = {
    id: generateId(),
    content,
    createdAt: Date.now(),
    user: { id: 'system', name: 'System' },
    reactions: [],
    attachments
  };
  
  thread.messages.push(message);
  thread.lastActivityAt = Date.now();
  
  io.emit('threads:updated', { anchorId: thread.anchorId, threads: Array.from(threads.values()).filter(t => t.anchorId === thread.anchorId) });
  
  res.json(message);
});

// 编辑消息
app.patch('/messages/:messageId', (req, res) => {
  const { messageId } = req.params;
  const { content } = req.body;
  
  let foundMessage = null;
  let foundThread = null;
  
  for (const thread of threads.values()) {
    const msg = thread.messages.find(m => m.id === messageId);
    if (msg) {
      foundMessage = msg;
      foundThread = thread;
      break;
    }
  }
  
  if (!foundMessage) {
    return res.status(404).json({ error: 'Message not found' });
  }
  
  foundMessage.content = content;
  foundMessage.updatedAt = Date.now();
  foundThread.lastActivityAt = Date.now();
  
  io.emit('threads:updated', { anchorId: foundThread.anchorId, threads: Array.from(threads.values()).filter(t => t.anchorId === foundThread.anchorId) });
  
  res.json(foundMessage);
});

// 删除消息
app.delete('/threads/:threadId/messages/:messageId', (req, res) => {
  const { threadId, messageId } = req.params;
  
  const thread = threads.get(threadId);
  if (!thread) {
    return res.status(404).json({ error: 'Thread not found' });
  }
  
  const index = thread.messages.findIndex(m => m.id === messageId);
  if (index === -1) {
    return res.status(404).json({ error: 'Message not found' });
  }
  
  thread.messages.splice(index, 1);
  thread.lastActivityAt = Date.now();
  
  io.emit('threads:updated', { anchorId: thread.anchorId, threads: Array.from(threads.values()).filter(t => t.anchorId === thread.anchorId) });
  
  res.status(204).send();
});

// 添加表情反应
app.post('/messages/:messageId/reactions', (req, res) => {
  const { messageId } = req.params;
  const { emoji } = req.body;
  
  let foundMessage = null;
  let foundThread = null;
  
  for (const thread of threads.values()) {
    const msg = thread.messages.find(m => m.id === messageId);
    if (msg) {
      foundMessage = msg;
      foundThread = thread;
      break;
    }
  }
  
  if (!foundMessage) {
    return res.status(404).json({ error: 'Message not found' });
  }
  
  foundMessage.reactions.push({ emoji, userId: 'system' });
  foundThread.lastActivityAt = Date.now();
  
  io.emit('threads:updated', { anchorId: foundThread.anchorId, threads: Array.from(threads.values()).filter(t => t.anchorId === foundThread.anchorId) });
  
  res.json(foundMessage);
});

// 删除表情反应
app.delete('/messages/:messageId/reactions/:emoji', (req, res) => {
  const { messageId, emoji } = req.params;
  
  let foundMessage = null;
  let foundThread = null;
  
  for (const thread of threads.values()) {
    const msg = thread.messages.find(m => m.id === messageId);
    if (msg) {
      foundMessage = msg;
      foundThread = thread;
      break;
    }
  }
  
  if (!foundMessage) {
    return res.status(404).json({ error: 'Message not found' });
  }
  
  const index = foundMessage.reactions.findIndex(r => r.emoji === emoji && r.userId === 'system');
  if (index === -1) {
    return res.status(404).json({ error: 'Reaction not found' });
  }
  
  foundMessage.reactions.splice(index, 1);
  foundThread.lastActivityAt = Date.now();
  
  io.emit('threads:updated', { anchorId: foundThread.anchorId, threads: Array.from(threads.values()).filter(t => t.anchorId === foundThread.anchorId) });
  
  res.json(foundMessage);
});

// 上传附件
app.post('/attachments', (req, res) => {
  // 简化实现：不实际处理文件上传，返回模拟数据
  const attachment = {
    id: generateId(),
    name: 'uploaded-file.png',
    url: 'https://example.com/files/uploaded-file.png',
    mimeType: 'image/png',
    size: 102400,
    width: 800,
    height: 600
  };
  res.json(attachment);
});

// 获取在线状态
app.get('/presence', (req, res) => {
  const { anchorId } = req.query;
  if (!anchorId) {
    return res.status(400).json({ error: 'anchorId is required' });
  }
  
  res.json(presence.get(anchorId) || []);
});

// --- WebSocket 处理 ---

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // 订阅锚点
  socket.on('subscribe', (data) => {
    const { anchorId } = data;
    socket.join(anchorId);
    
    // 发送当前线程状态
    const anchorThreads = Array.from(threads.values()).filter(t => t.anchorId === anchorId);
    socket.emit('threads:updated', { anchorId, threads: anchorThreads });
  });
  
  // 取消订阅锚点
  socket.on('unsubscribe', (data) => {
    const { anchorId } = data;
    socket.leave(anchorId);
  });
  
  // 设置在线状态
  socket.on('presence:set', (data) => {
    const { anchorId, user, status } = data;
    
    if (!presence.has(anchorId)) {
      presence.set(anchorId, []);
    }
    
    const currentPresence = presence.get(anchorId);
    const existingIndex = currentPresence.findIndex(p => p.user.id === user.id);
    
    if (existingIndex >= 0) {
      currentPresence[existingIndex] = { user, status, lastSeen: Date.now() };
    } else {
      currentPresence.push({ user, status, lastSeen: Date.now() });
    }
    
    io.to(anchorId).emit('presence:updated', { anchorId, presence: currentPresence });
  });
  
  // 设置输入状态
  socket.on('typing:set', (data) => {
    const { anchorId, user, isTyping } = data;
    
    if (!typing.has(anchorId)) {
      typing.set(anchorId, []);
    }
    
    const currentTyping = typing.get(anchorId);
    
    if (isTyping) {
      if (!currentTyping.find(u => u.id === user.id)) {
        currentTyping.push(user);
      }
    } else {
      const index = currentTyping.findIndex(u => u.id === user.id);
      if (index >= 0) {
        currentTyping.splice(index, 1);
      }
    }
    
    io.to(anchorId).emit('typing:updated', { anchorId, users: currentTyping });
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket available at ws://localhost:${PORT}`);
  console.log(`REST API available at http://localhost:${PORT}`);
});