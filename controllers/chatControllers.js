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
    // 优先使用 Moonshot API，如果没有则用 DeepSeek
    const apiConfig = this.getBestAPIConfig();
    
    if (!apiConfig) {
      console.log('没有配置有效的API，使用模拟回复');
      return await getMockReply(userMessage);
    }

    console.log(`尝试调用 ${apiConfig.provider} API...`);
    
    // 添加超时保护
    const aiPromise = axios.post(
      apiConfig.url,
      {
        model: apiConfig.model,
        messages: [
          {
            role: "system",
            content: "你是专业的客服助手，请友好、准确地回答用户问题。如果问题超出知识范围，请礼貌地表示无法回答。"
          },
          {
            role: "user",
            content: userMessage
          }
        ],
        max_tokens: 500, // 增加 token 数量以获得更完整回答
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${apiConfig.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000 // axios 超时
      }
    );

    // 设置总超时
    const response = await Promise.race([
      aiPromise,
      this.timeout(20000)
    ]);

    console.log(`${apiConfig.provider} 调用成功`);
    return response.data.choices[0].message.content;
    
  } catch (error) {
    console.error('AI 处理错误:', error.message);
    // 确保无论如何都返回一个回复
    return await getMockReply(userMessage);
  }
};

// 获取最佳API配置
exports.getBestAPIConfig = () => {
  console.log(process.env.MOONSHOT_API_KEY)
  const providers = [
    {
      provider: 'Moonshot AI',
      url: 'https://api.moonshot.cn/v1/chat/completions',
      apiKey: process.env.MOONSHOT_API_KEY,
      model: 'moonshot-v1-8k',
      enabled: !!process.env.MOONSHOT_API_KEY && process.env.MOONSHOT_API_KEY.length > 20
    },
    {
      provider: 'DeepSeek',
      url: 'https://api.deepseek.com/v1/chat/completions',
      apiKey: process.env.OPENAI_API_KEY,
      model: 'deepseek-chat',
      enabled: !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.length > 20
    }
  ];
  
  // 返回第一个启用的提供商
  return providers.find(p => p.enabled) || null;
};

// 超时函数
exports.timeout = (ms) => {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`请求超时 (${ms}ms)`));
    }, ms);
  });
};

// 模拟回复函数
// async function getMockReply(userMessage) {
//   const lowerMsg = userMessage.toLowerCase();
  
//   // 预定义的回复映射
//   const replyMap = [
//     {
//       keywords: ['你好', '您好', 'hi', 'hello', 'hey'],
//       reply: '您好！我是AI客服助手，有什么可以帮助您的吗？'
//     },
//     {
//       keywords: ['谢谢', '感谢', '多谢'],
//       reply: '不客气！很高兴能帮助您。如果还有其他问题，随时问我哦！'
//     },
//     {
//       keywords: ['再见', '拜拜', '结束', '拜拜', '结束对话'],
//       reply: '感谢您的咨询！祝您有愉快的一天！如有需要，随时回来找我。'
//     },
//     {
//       keywords: ['客服', '人工', '真人', '转人工'],
//       reply: '如果您需要人工客服协助，请拨打我们的客服热线：400-xxx-xxxx（工作时间：周一至周五 9:00-18:00）'
//     },
//     {
//       keywords: ['价格', '多少钱', '费用', '收费', '价格表'],
//       reply: '具体价格信息需要根据您的需求来确定。您可以访问我们的官网查看价目表，或联系销售顾问获取详细报价。'
//     },
//     {
//       keywords: ['时间', '营业', '几点', '上班', '下班', '工作时间'],
//       reply: '我们的工作时间是周一至周五 9:00-18:00，周末和法定节假日休息。'
//     },
//     {
//       keywords: ['地址', '位置', '在哪', 'location', '公司地址'],
//       reply: '公司地址：XX省XX市XX区XX路XX号XX大厦XX层。您也可以在我们的官网"联系我们"页面查看详细地图。'
//     },
//     {
//       keywords: ['产品', '服务', '功能', '有什么服务'],
//       reply: '我们提供多种产品和服务，包括企业解决方案、技术支持、咨询培训等。您可以访问官网的"产品服务"板块了解详情。'
//     },
//     {
//       keywords: ['怎么用', '如何使用', '教程', '帮助'],
//       reply: '我们有详细的使用文档和教程视频，您可以访问官网的"帮助中心"或下载用户手册。'
//     },
//     {
//       keywords: ['问题', '故障', '错误', 'bug', '无法使用'],
//       reply: '抱歉给您带来不便！请描述具体问题现象，或联系技术支持：support@example.com'
//     }
//   ];
  
//   // 查找匹配的关键词
//   for (const item of replyMap) {
//     if (item.keywords.some(keyword => lowerMsg.includes(keyword))) {
//       return item.reply;
//     }
//   }
  
//   // 如果没有匹配，返回智能一点的默认回复
//   if (lowerMsg.includes('?') || lowerMsg.includes('？') || 
//       lowerMsg.includes('什么') || lowerMsg.includes('怎么') || 
//       lowerMsg.includes('如何')) {
//     return `关于"${userMessage}"这个问题，我需要更多上下文信息来给您准确的回答。您可以：
// 1. 提供更多细节
// 2. 查看我们的帮助文档
// 3. 联系人工客服获取专业支持`;
//   }
  
//   // 通用回复
//   return `我已经收到您的消息："${userMessage}"。
    
// 由于当前AI服务正在配置中，我已记录您的问题。您可以：
// 1. 稍后重试获取AI回复
// 2. 联系客服热线：400-xxx-xxxx
// 3. 发送邮件至：support@example.com
    
// 我们会尽快处理您的问题！`;
// };
exports.getMockReply = getMockReply;