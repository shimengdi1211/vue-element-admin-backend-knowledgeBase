// app.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

// 1. 添加请求体解析调试
app.use((req, res, next) => {
  console.log('进入')
  
  next();
});


// 2. Body 解析中间件
app.use(express.json());

app.use(express.urlencoded({ extended: true }));


// 4. 路由
app.use('/api/chat', require('./routes/chat'));

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