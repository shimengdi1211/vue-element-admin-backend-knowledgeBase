// app.js
const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: '.env.development' });
const authRoutes = require('./src/routes/auth');
const userRoutes = require('./src/routes/user');
const morgan = require('morgan');
const helmet = require('helmet');
const db = require('./src/config/database'); // 添加数据库连接
const chatModel = require('./src/models/chatModel'); // 添加模型
const app = express();

const PORT = process.env.PORT || 3000;
// 数据库初始化
async function initializeDatabase() {
  try {
    await chatModel.initDatabase();

    console.log('数据库初始化完成');
  } catch (error) {
    console.error('数据库初始化失败:', error);
  }
}

// 调用初始化
initializeDatabase();

// 添加数据库健康检查
app.get('/api/db-health', async (req, res) => {
  try {
    // 测试数据库连接
    const [result] = await db.query('SELECT 1 as connected');

    res.json({
      status: 'OK',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('数据库健康检查失败:', error);
    res.status(500).json({
      status: 'ERROR',
      database: 'disconnected',
      error: error.message,
    });
  }
});

app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// 1. 添加请求体解析调试
app.use((req, res, next) => {
  console.log('进入');
  next();
});

// 2. Body 解析中间件
app.use(helmet()); // 安全头
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev')); // 日志

const chatRoutes = require('./src/routes/chat');
// 4. 注册路由
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/chat', chatRoutes);

app.get('/api/health', (req, res) => {
  console.log('健康检查被调用');
  res.json({ status: 'OK', message: '后端服务运行正常' });
});

// 5. 错误处理中间件
app.use((err, req, res, next) => {
  console.error('\n=== 全局错误处理 ===');
  console.error('错误:', err.message);
  console.error('堆栈:', err.stack);
  res.status(500).json({ error: '服务器内部错误' });
});

// 6. 404 处理
app.use('*', (req, res) => {
  console.log('\n=== 404 未找到 ===');
  console.log('请求路径:', req.originalUrl);
  console.log('请求方法:', req.method);
  res.status(404).json({ error: '接口不存在' });
});

app.timeout = 30000;

app.listen(PORT, () => {
  console.log(`后端服务运行在 http://localhost:${PORT}`);
});
