// controllers/chatControllers.js - 优化版本
const axios = require('axios');

// ==================== 固定回复系统 ====================
/**
 * 检查是否有固定回复（优先级最高）
 * 如果有匹配，直接返回固定回复，不调用API
 */
function checkFixedReply(userMessage) {
  console.log('检查固定回复...');
  
  const fixedReplies = [
    {
      // 问候类
      patterns: ['你好', '您好', 'hi', 'hello', 'hey', '哈喽', '在吗', '在么'],
      reply: '您好！我是智能客服助手，有什么可以帮助您的吗？😊',
      category: 'greeting'
    },
    {
      // 感谢类
      patterns: ['谢谢', '感谢', '多谢', 'thx', 'thanks'],
      reply: '不客气！很高兴能帮助您。如果还有其他问题，随时问我哦！😄',
      category: 'thanks'
    },
    {
      // 告别类
      patterns: ['再见', '拜拜', '结束', '88', 'goodbye', 'bye', '结束对话'],
      reply: '感谢您的咨询！祝您有愉快的一天！如有需要，随时回来找我。👋',
      category: 'farewell'
    },
    {
      // 客服转接
      patterns: ['人工', '真人', '转人工', '人工客服', '找人工', '活人'],
      reply: '如果您需要人工客服协助，请拨打我们的客服热线：400-xxxx-xxxx\n工作时间：周一至周五 9:00-18:00',
      category: 'human_service'
    },
    {
      // 工作时间
      patterns: ['时间', '营业', '几点', '上班', '下班', '工作时间', '几点下班'],
      reply: '我们的工作时间是：\n📅 周一至周五：9:00-18:00\n🚫 周末和法定节假日休息',
      category: 'working_hours'
    },
    {
      // 地址信息
      patterns: ['地址', '位置', '在哪', '公司地址', 'location', 'where'],
      reply: '公司地址：XX省XX市XX区XX路XX号XX大厦XX层\n📍 您可以在官网"联系我们"页面查看详细地图和交通指南',
      category: 'address'
    },
    {
      // 联系方式
      patterns: ['电话', '手机', '联系方式', '怎么联系', '联系你们'],
      reply: '📞 客服热线：400-xxxx-xxxx\n📧 客服邮箱：support@example.com\n💬 在线咨询：工作日 9:00-18:00',
      category: 'contact'
    },
    {
      // 产品服务
      patterns: ['产品', '服务', '功能', '有什么服务', '提供什么'],
      reply: '我们提供以下服务：\n✅ 企业解决方案\n✅ 技术支持服务\n✅ 咨询与培训\n✅ 定制化开发\n🔗 详情请访问官网"产品服务"板块',
      category: 'products'
    },
    {
      // 价格费用
      patterns: ['价格', '多少钱', '费用', '收费', '价格表', '多少钱', '报价'],
      reply: '💰 具体价格根据您的需求而定：\n1. 基础版：XXXX元/年\n2. 专业版：XXXX元/年\n3. 企业版：请联系销售顾问\n📋 完整价目表请访问官网',
      category: 'pricing'
    },
    {
      // 使用方法
      patterns: ['怎么用', '如何使用', '教程', '帮助', '使用说明', '怎么操作'],
      reply: '📚 使用指南：\n1. 访问官网"帮助中心"\n2. 下载用户手册（PDF）\n3. 观看教程视频\n4. 参加在线培训课程\n💡 需要具体帮助请告诉我您遇到的问题',
      category: 'usage'
    },
    {
      // 问题故障
      patterns: ['问题', '故障', '错误', 'bug', '无法使用', '用不了', '报错'],
      reply: '抱歉给您带来不便！🔧\n请尝试：\n1. 刷新页面\n2. 清除缓存\n3. 检查网络连接\n如果问题依旧，请提供：\n📝 具体错误信息\n🖥️ 操作系统和浏览器\n📱 问题发生时间\n我们将尽快为您解决！',
      category: 'troubleshooting'
    },
    {
      // 关于我们
      patterns: ['你们公司', '公司介绍', '关于你们', '什么公司', '介绍'],
      reply: '🏢 公司简介：\n我们是一家专注于企业服务的科技公司，成立于2010年，致力于为客户提供优质的解决方案。\n\n🌟 核心价值：专业、创新、服务、共赢\n\n📖 了解更多请访问官网"关于我们"',
      category: 'about'
    }
  ];
  
  // 特殊匹配模式（完全匹配）
  const exactMatchPatterns = {
    // 简单的问答
    '你是谁': '我是智能客服助手，专门为您解答问题和提供帮助的AI机器人。🤖',
    '你叫什么': '我是您的智能客服助手，没有具体的名字，但您可以叫我小助手！😊',
    '今天天气': '抱歉，我是客服助手，无法获取实时天气信息。建议您查看天气预报应用或网站。',
    '现在几点': '我无法获取实时时间，请查看您的设备时钟。',
    
    // 系统状态
    '系统状态': '系统运行正常，所有服务均可使用。如有问题请联系技术支持。',
    '服务器状态': '服务器运行正常，感谢关注！',
    
    // 简单确认
    '好的': '好的，有什么其他需要帮助的吗？',
    '明白': '明白，请继续提问。',
    '知道了': '好的，如有问题随时问我。'
  };
  
  const lowerMsg = userMessage.toLowerCase().trim();
  const exactMsg = userMessage.trim();
  
  // 1. 首先检查完全匹配
  if (exactMatchPatterns[exactMsg]) {
    console.log(`完全匹配: "${exactMsg}"`);
    return {
      hasFixedReply: true,
      reply: exactMatchPatterns[exactMsg],
      matchType: 'exact',
      category: 'direct_match'
    };
  }
  
  // 2. 检查关键词匹配
  for (const item of fixedReplies) {
    if (item.patterns.some(pattern => lowerMsg.includes(pattern))) {
      console.log(`关键词匹配: "${item.patterns.join(',')}" -> ${item.category}`);
      return {
        hasFixedReply: true,
        reply: item.reply,
        matchType: 'keyword',
        category: item.category
      };
    }
  }
  
  // 3. 检查是否只是简单问候或结束语（短文本处理）
  const shortResponses = {
    // 长度小于3且无特殊字符
    '短问候': msg => msg.length <= 3 && /^[你好哈嗨]+$/.test(msg),
    // 只有表情或符号
    '纯符号': msg => /^[\s\p{P}\p{S}]+$/u.test(msg) && msg.length <= 5
  };
  
  if (shortResponses['短问候'](userMessage)) {
    return {
      hasFixedReply: true,
      reply: '您好！请问有什么可以帮助您的？😊',
      matchType: 'short_greeting',
      category: 'greeting'
    };
  }
  
  console.log('没有找到固定回复，将尝试调用AI');
  return {
    hasFixedReply: false,
    reply: null,
    matchType: 'none'
  };
}

// ==================== AI API 调用 ====================
/**
 * 获取最佳可用的 API 配置
 */
function getBestAPIConfig() {
  const providers = [
    {
      name: 'Moonshot AI',
      url: 'https://api.moonshot.cn/v1/chat/completions',
      apiKey: process.env.MOONSHOT_API_KEY,
      model: 'moonshot-v1-8k',
      enabled: process.env.MOONSHOT_API_KEY && 
               process.env.MOONSHOT_API_KEY.length > 20 &&
               !process.env.MOONSHOT_API_KEY.includes('your_')
    },
    {
      name: 'DeepSeek',
      url: 'https://api.deepseek.com/chat/completions',
      apiKey: process.env.DEEPSEEK_API_KEY,
      model: 'deepseek-chat',
      enabled: process.env.DEEPSEEK_API_KEY && 
               process.env.DEEPSEEK_API_KEY.length > 20 &&
               !process.env.DEEPSEEK_API_KEY.includes('your_')
    },
  ];
  
  // 返回第一个启用的提供商
  const availableProvider = providers.find(p => p.enabled);
  
  if (availableProvider) {
    console.log(`选择 API 提供商: ${availableProvider.name}`);
    return availableProvider;
  }
  
  console.log('没有可用的 API 提供商');
  return null;
}

/**
 * 调用 AI API
 */
async function callAIAPI(userMessage, apiConfig) {
  console.log(`调用 ${apiConfig.name} API...`);
  
  try {
    const response = await axios.post(
      apiConfig.url,
      {
        model: apiConfig.model,
        messages: [
          {
            role: "system",
            content: `你是一个专业的客服助手，请按照以下要求回答问题：
              # 角色设定：
              - 你是企业的智能客服助手
              - 友好、专业、乐于助人
              - 如果不知道答案，诚实说明

              # 回答要求：
              1. 使用中文回答
              2. 语气友好自然
              3. 回答简洁明了
              4. 如果问题需要人工处理，引导用户联系客服
              5. 适当使用表情符号让对话更友好

              # 当前上下文：
              用户的问题是关于企业服务的，请根据常识和专业知识回答。`
          },
          {
            role: "user",
            content: userMessage
          }
        ],
        max_tokens: 800,
        temperature: 0.7,
        top_p: 0.9
      },
      {
        headers: {
          'Authorization': `Bearer ${apiConfig.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 20000 // 20秒超时
      }
    );
    
    if (response.data && response.data.choices && response.data.choices[0]) {
      console.log(`${apiConfig.name} API 调用成功`);
      return response.data.choices[0].message.content;
    }
    
    throw new Error('API 返回数据格式错误');
    
  } catch (error) {
    console.error(`${apiConfig.name} API 调用失败:`, error.message);
    
    // 细化错误处理
    if (error.response) {
      console.error('错误状态码:', error.response.status);
      console.error('错误响应:', error.response.data);
      
      if (error.response.status === 401) {
        throw new Error('API Key 无效或已过期');
      } else if (error.response.status === 429) {
        throw new Error('请求过于频繁，请稍后重试');
      } else if (error.response.status === 503) {
        throw new Error('服务暂时不可用');
      }
    } else if (error.request) {
      throw new Error('网络连接失败，请检查网络');
    }
    
    throw error;
  }
}

/**
 * 获取智能回复（主逻辑）
 */
async function getSmartReply(userMessage) {
  console.log('获取智能回复，用户消息:', userMessage.substring(0, 100));
  
  // 1. 首先检查固定回复
  const fixedReply = checkFixedReply(userMessage);
  if (fixedReply.hasFixedReply) {
    console.log(`使用固定回复 (${fixedReply.category})`);
    return {
      reply: fixedReply.reply,
      source: 'fixed',
      category: fixedReply.category,
      matchType: fixedReply.matchType
    };
  }
  
  // 2. 获取可用的 API 配置
  const apiConfig = getBestAPIConfig();
  if (!apiConfig) {
    console.log('没有可用的 API，使用通用回复');
    return {
      reply: await getGenericReply(userMessage),
      source: 'generic',
      category: 'fallback'
    };
  }
  
  // 3. 尝试调用 API
  try {
    const aiReply = await callAIAPI(userMessage, apiConfig);
    return {
      reply: aiReply,
      source: apiConfig.name,
      category: 'ai',
      provider: apiConfig.name
    };
    
  } catch (apiError) {
    console.error('API 调用失败，使用通用回复:', apiError.message);
    
    // 4. API 失败时，使用通用回复
    return {
      reply: await getGenericReply(userMessage),
      source: 'generic',
      category: 'fallback',
      error: apiError.message
    };
  }
}

/**
 * 生成通用回复（当没有固定回复且API失败时）
 */
async function getGenericReply(userMessage) {
  console.log('生成通用回复...');
  
  // 根据问题类型生成不同的通用回复
  const lowerMsg = userMessage.toLowerCase();
  
  if (lowerMsg.includes('怎么') || lowerMsg.includes('如何') || lowerMsg.includes('怎样')) {
    return `关于"${userMessage}"的操作方法：
      1. 🔍 请先查看我们的帮助文档
      2. 📺 观看相关教程视频
      3. 📞 如需人工指导，请联系客服
      具体步骤可能因您的实际情况有所不同。您能描述一下您当前的具体场景吗？`;
  }
  
  if (lowerMsg.includes('为什么') || lowerMsg.includes('原因') || lowerMsg.includes('为何')) {
    return `关于"${userMessage}"的原因分析：
      这个问题可能涉及多个因素。建议您：

      1. 📊 检查相关设置或配置
      2. 🔧 确认操作步骤是否正确
      3. 💬 联系技术支持提供具体错误信息

      您能提供更多细节吗？比如错误提示或问题发生时的具体情况。`;
  }
  
  if (lowerMsg.includes('?') || lowerMsg.includes('？') || lowerMsg.includes('什么')) {
    return `感谢您的提问："${userMessage}"。

我已记录您的问题，但由于当前AI服务暂时不可用，建议您：

1. 📚 访问我们的知识库查找答案
2. 📧 发送邮件至 support@example.com
3. ☎️ 拨打客服热线 400-xxxx-xxxx

我们会在获取到AI服务后尽快为您提供更准确的回答。`;
  }
  
  // 通用回复模板
  const genericReplies = [
    `我已经收到您的消息："${userMessage}"。\n\n目前AI服务正在优化升级中，建议您：\n1. 稍后重新提问\n2. 联系人工客服获取即时帮助\n3. 查看常见问题解答`,
    
    `感谢您的咨询！关于"${userMessage}"，我需要更多信息来准确回答。\n\n您能提供：\n1. 具体的使用场景\n2. 遇到的问题细节\n3. 期望达成的目标\n\n这样我能更好地帮助您！`,
    
    `您提到的"${userMessage}"是很重要的问题。\n\n目前AI助手正在学习相关知识，建议您：\n📞 联系专业客服：400-xxxx-xxxx\n📧 发送详细需求至：info@example.com\n⏰ 我们将在24小时内回复您`
  ];
  
  return genericReplies[Math.floor(Math.random() * genericReplies.length)];
}

// ==================== 主导出函数 ====================
/**
 * 智能客服处理函数
 * @param {string} userMessage - 用户消息
 * @param {string} sessionId - 会话ID
 * @returns {Promise<string>} 回复内容
 */
exports.chatWithAI = async (userMessage, sessionId) => {
  console.log(`\n[${sessionId}] 用户消息: ${userMessage}`);
  console.log(`消息长度: ${userMessage.length} 字符`);
  
  // 记录开始时间
  const startTime = Date.now();
  
  try {
    // 获取回复
    const result = await getSmartReply(userMessage);
    
    // 计算处理时间
    const processTime = Date.now() - startTime;
    
    // 记录日志
    console.log(`[${sessionId}] 回复来源: ${result.source} (${result.category})`);
    console.log(`[${sessionId}] 处理时间: ${processTime}ms`);
    console.log(`[${sessionId}] 回复长度: ${result.reply.length} 字符`);
    
    // 返回回复内容
    return result.reply;
    
  } catch (error) {
    console.error(`[${sessionId}] 处理失败:`, error.message);
    
    // 即使出错也要返回一个回复
    return `抱歉，处理您的消息时出现了技术问题。\n\n请稍后重试，或直接联系客服：400-xxxx-xxxx\n\n错误信息：${error.message}`;
  }
};

/**
 * 获取聊天统计信息
 */
exports.getChatStats = () => {
  return {
    apiProviders: {
      moonshot: !!process.env.MOONSHOT_API_KEY,
      deepseek: !!process.env.DEEPSEEK_API_KEY,
      glm: !!process.env.GLM_API_KEY,
      openai: !!process.env.OPENAI_API_KEY
    },
    fixedReplyCategories: [
      'greeting', 'thanks', 'farewell', 'human_service', 'working_hours',
      'address', 'contact', 'products', 'pricing', 'usage', 
      'troubleshooting', 'about'
    ],
    version: '2.0.0'
  };
};



// 导出辅助函数供测试使用
exports.checkFixedReply = checkFixedReply;
exports.getBestAPIConfig = getBestAPIConfig;
exports.getSmartReply = getSmartReply;
exports.getGenericReply = getGenericReply;