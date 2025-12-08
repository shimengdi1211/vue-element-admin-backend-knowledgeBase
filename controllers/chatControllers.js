// controllers/chatControllers.js - 修复版本
const axios = require('axios');

// 添加超时函数
const timeout = (ms) => new Promise((_, reject) => 
  setTimeout(() => reject(new Error(`超时 ${ms}ms`)), ms)
);

// 模拟回复函数
const getMockReply = async (userMessage) => {
  console.log('getMockReply 被调用');
  
  const mockReplies = {
    '你好': '您好！我是智能客服，很高兴为您服务。',
    '帮助': '我可以帮您解答系统使用问题、功能咨询等。',
    '默认': '感谢您的提问！我会尽力为您解答。'
  };

  const lowerMessage = userMessage.toLowerCase();
  
  if (lowerMessage.includes('你好')) {
    return mockReplies['你好'];
  } else if (lowerMessage.includes('帮助')) {
    return mockReplies['帮助'];
  } else {
    return mockReplies['默认'];
  }
};

// 智能客服处理函数
exports.chatWithAI = async (userMessage, sessionId) => {
  console.log(`[${sessionId}] 用户消息: ${userMessage}`);
  
  try {
    // 如果没有配置 OpenAI API，使用模拟回复
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === '') {
      console.log('使用模拟回复');
      return await getMockReply(userMessage);
    }

    console.log('尝试调用 OpenAI API...');
    
    // 添加超时保护
    const openaiPromise = axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "你是客服助手"
          },
          {
            role: "user",
            content: userMessage
          }
        ],
        max_tokens: 100,
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000 // axios 超时
      }
    );

    // 设置总超时
    const response = await Promise.race([
      openaiPromise,
      timeout(15000)
    ]);

    console.log('OpenAI 调用成功');
    return response.data.choices[0].message.content;
    
  } catch (error) {
    console.error('AI 处理错误:', error.message);
    // 确保无论如何都返回一个回复
    return await getMockReply(userMessage);
  }
};

exports.getMockReply = getMockReply;