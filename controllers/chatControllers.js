// controllers/chatControllers.js - 修复版
const axios = require('axios');

// ==================== 会话历史管理 ====================
// 按session存储对话历史
const sessionHistories = new Map();

/**
 * 获取或初始化会话历史
 */
function getSessionHistory(sessionId) {
  if (!sessionHistories.has(sessionId)) {
    // 初始化新会话，包含系统消息
    sessionHistories.set(sessionId, [
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
      }
    ]);
  }
  
  return sessionHistories.get(sessionId);
}

/**
 * 清理会话历史（防止过长）
 */
function cleanupHistory(history, maxRounds = 10) {
  // 最大保留 system + 最近maxRounds轮对话
  const maxMessages = 1 + (maxRounds * 2); // system + (user+assistant) * rounds
  
  if (history.length > maxMessages) {
    // 保留system和最近的历史
    const newHistory = [
      history[0], // system消息
      ...history.slice(-(maxMessages - 1)) // 最近的消息
    ];
    
    // 确保新历史的第一条user消息前有对应的assistant消息
    if (newHistory.length > 1 && newHistory[1].role === 'assistant') {
      // 如果第一条是assistant，移除它（需要配对）
      newHistory.splice(1, 1);
    }
    
    return newHistory;
  }
  
  return history;
}

// ==================== 固定回复系统 ====================
/**
 * 检查是否有固定回复（优先级最高）
 * 如果有匹配，直接返回固定回复，不调用API
*/
function checkFixedReply(userMessage) {
  console.log('检查固定回复...');
  
  const fixedReplies = [
    {
      patterns: ['你好', '您好', 'hi', 'hello', 'hey', '哈喽', '在吗', '在么'],
      reply: '您好！我是智能客服助手，有什么可以帮助您的吗？😊',
      category: 'greeting'
    },
    {
      patterns: ['谢谢', '感谢', '多谢', 'thx', 'thanks'],
      reply: '不客气！很高兴能帮助您。如果还有其他问题，随时问我哦！😄',
      category: 'thanks'
    },
    {
      patterns: ['再见', '拜拜', '结束', '88', 'goodbye', 'bye', '结束对话'],
      reply: '感谢您的咨询！祝您有愉快的一天！如有需要，随时回来找我。👋',
      category: 'farewell'
    }
    // ... 其他固定回复（为了简洁省略部分）
  ];
  
  const exactMatchPatterns = {
    '你是谁': '我是智能客服助手，专门为您解答问题和提供帮助的AI机器人。🤖',
    '你叫什么': '我是您的智能客服助手，没有具体的名字，但您可以叫我小助手！😊',
    // ... 其他完全匹配
  };
  
  const lowerMsg = userMessage.toLowerCase().trim();
  const exactMsg = userMessage.trim();
  
  // 1. 完全匹配
  if (exactMatchPatterns[exactMsg]) {
    return {
      hasFixedReply: true,
      reply: exactMatchPatterns[exactMsg],
      matchType: 'exact',
      category: 'direct_match'
    };
  }
  
  // 2. 关键词匹配
  for (const item of fixedReplies) {
    if (item.patterns.some(pattern => lowerMsg.includes(pattern))) {
      return {
        hasFixedReply: true,
        reply: item.reply,
        matchType: 'keyword',
        category: item.category
      };
    }
  }
  
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
    }
  ];
  
  return providers.find(p => p.enabled) || null;
}

/**
 * 调用 AI API（多轮对话版）
 */
async function callAIAPI(userMessage, apiConfig, history) {
  console.log(`调用 ${apiConfig.name} API...`);
  console.log('当前历史记录长度:', history.length);
  
  try {
    // 1. 添加用户消息到历史
    history.push({
      role: "user",
      content: userMessage
    });
    
    // 2. 调试：打印将要发送的消息
    console.log('发送给API的完整 messages:');
    console.log(JSON.stringify(history, null, 2));
    
    // 3. 调用API
    const response = await axios.post(
      apiConfig.url,
      {
        model: apiConfig.model,
        messages: history,  
        max_tokens: 800,
        temperature: 0.7,
        top_p: 0.9,
        stream: false  //非流式返回
      },
      {
        headers: {
          'Authorization': `Bearer ${apiConfig.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 20000
      }
    );
    
    // 4. 验证响应
    if (!response.data?.choices?.[0]?.message) {
      throw new Error('API 返回数据格式错误');
    }
    
    const aiMessage = response.data.choices[0].message;
    
    // 5. 添加AI回复到历史
    history.push(aiMessage);
    
    // 6. 清理历史（防止过长）
    const cleanedHistory = cleanupHistory(history);
    // 更新会话历史
    const sessionId = Object.keys(sessionHistories).find(
      key => sessionHistories.get(key) === history
    );
    if (sessionId) {
      sessionHistories.set(sessionId, cleanedHistory);
    }
    
    console.log(`${apiConfig.name} API 调用成功`);
    console.log('更新后历史记录长度:', cleanedHistory.length);
    
    return {
      reply: aiMessage.content,
      history: cleanedHistory
    };
    
  } catch (error) {
    console.error(`${apiConfig.name} API 调用失败:`, error.message);
    
    // 移除最后添加的用户消息（因为调用失败）
    if (history.length > 0 && history[history.length - 1].role === 'user') {
      history.pop();
    }
    
    // 详细的错误处理
    if (error.response) {
      console.error('错误状态码:', error.response.status);
      console.error('错误响应:', JSON.stringify(error.response.data, null, 2));
      
      // 提供更具体的错误信息
      if (error.response.status === 400) {
        console.error('💡 400错误可能原因:');
        console.error('1. messages格式错误');
        console.error('2. content字段类型错误');
        console.error('3. 模型不支持该参数');
        console.error('4. API Key无效');
      }
    }
    
    throw error;
  }
}

/**
 * 获取智能回复（主逻辑）
 */
async function getSmartReply(userMessage, sessionId) {
  console.log('获取智能回复，用户消息:', userMessage.substring(0, 100));
  
  // 1. 首先检查固定回复
  const fixedReply = checkFixedReply(userMessage);
  if (fixedReply.hasFixedReply) {
    console.log(`使用固定回复 (${fixedReply.category})`);
    
    // 对于固定回复，也需要添加到历史中
    const history = getSessionHistory(sessionId);
    history.push({
      role: "user",
      content: userMessage
    });
    history.push({
      role: "assistant",
      content: fixedReply.reply
    });
    
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
    
    // 同样添加到历史
    const history = getSessionHistory(sessionId);
    const genericReply = await getGenericReply(userMessage);
    
    history.push({ role: "user", content: userMessage });
    history.push({ role: "assistant", content: genericReply });
    
    return {
      reply: genericReply,
      source: 'generic',
      category: 'fallback'
    };
  }
  
  // 3. 获取会话历史
  const history = getSessionHistory(sessionId);
  
  // 4. 尝试调用 API
  try {
    const result = await callAIAPI(userMessage, apiConfig, history);
    
    return {
      reply: result.reply,
      source: apiConfig.name,
      category: 'ai',
      provider: apiConfig.name,
      historyLength: result.history.length
    };
    
  } catch (apiError) {
    console.error('API 调用失败，使用通用回复:', apiError.message);
    
    // API失败时，使用通用回复并添加到历史
    const genericReply = await getGenericReply(userMessage);
    
    history.push({ role: "user", content: userMessage });
    history.push({ role: "assistant", content: genericReply });
    
    return {
      reply: genericReply,
      source: 'generic',
      category: 'fallback',
      error: apiError.message
    };
  }
}

/**
 * 生成通用回复
 */
async function getGenericReply(userMessage) {
  // ... 保持原来的通用回复逻辑不变
  // 为了简洁，这里省略具体实现
  return `关于"${userMessage}"，我已收到您的问题。由于当前AI服务暂时不可用，建议您联系客服热线：400-xxxx-xxxx`;
}

// ==================== 主导出函数 ====================
/**
 * 智能客服处理函数（多轮对话版）
 */
exports.chatWithAI = async (userMessage, sessionId) => {
  console.log(`\n=== 新消息 [${sessionId}] ===`);
  console.log(`用户消息: ${userMessage}`);
  console.log(`消息长度: ${userMessage.length} 字符`);
  
  // 记录开始时间
  const startTime = Date.now();
  
  try {
    // 获取回复
    const result = await getSmartReply(userMessage, sessionId);
    
    // 计算处理时间
    const processTime = Date.now() - startTime;
    
    // 记录日志
    console.log(`回复来源: ${result.source} (${result.category})`);
    console.log(`处理时间: ${processTime}ms`);
    console.log(`回复长度: ${result.reply.length} 字符`);
    
    if (result.historyLength) {
      console.log(`当前对话历史: ${result.historyLength} 条消息`);
    }
    
    // 返回回复内容
    return result.reply;
    
  } catch (error) {
    console.error(`[${sessionId}] 处理失败:`, error.message);
    
    return `抱歉，处理您的消息时出现了技术问题。\n\n请稍后重试，或直接联系客服：400-xxxx-xxxx`;
  }
};

/**
 * 获取会话历史（调试用）
 */
exports.getChatHistory = (sessionId) => {
  const history = getSessionHistory(sessionId);
  return {
    sessionId,
    messageCount: history.length,
    history: history.map((msg, index) => ({
      index,
      role: msg.role,
      content: msg.content.substring(0, 100) + (msg.content.length > 100 ? '...' : '')
    }))
  };
};

/**
 * 清空会话历史
 */
exports.clearChatHistory = (sessionId) => {
  if (sessionHistories.has(sessionId)) {
    sessionHistories.delete(sessionId);
    console.log(`已清空会话 ${sessionId} 的历史记录`);
    return true;
  }
  return false;
};

/**
 * 获取所有活跃会话
 */
exports.getActiveSessions = () => {
  return Array.from(sessionHistories.keys()).map(sessionId => ({
    sessionId,
    messageCount: sessionHistories.get(sessionId).length,
    lastActivity: new Date().toISOString() // 实际应该记录最后活动时间
  }));
};

// 导出辅助函数供测试使用
exports.checkFixedReply = checkFixedReply;
exports.getBestAPIConfig = getBestAPIConfig;