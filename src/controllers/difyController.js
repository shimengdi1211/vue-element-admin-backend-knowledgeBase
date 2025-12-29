const axios = require('axios');

const DIFY_API_KEY = process.env.DIFY_API_KEY || 'app-0c4lNnaVpVZwwywy9BG04cx5';
const DIFY_WORKFLOW_URL = process.env.DIFY_WORKFLOW_URL || 'https://api.dify.ai/v1/chat-messages';

/**
 * 调用Dify知识库工作流
 * @param {string} userQuestion - 用户问题
 * @param {string} userId - 用户标识
 * @returns {Promise<{success: boolean, answer?: string, error?: string}>}
 */
async function callDifyWorkflow(userQuestion, userId = 'default') {
  try {
    console.log(
      `[Dify] 查询知识库: "${userQuestion.substring(0, 50)}${userQuestion.length > 50 ? '...' : ''}"`
    );

    const response = await axios.post(
      DIFY_WORKFLOW_URL,
      {
        inputs: {}, // 对于对话应用，inputs通常为空或包含额外参数
        query: userQuestion,
        response_mode: 'blocking',
        user: userId,
      },
      {
        headers: {
          Authorization: `Bearer ${DIFY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000, // 15秒超时
      }
    );

    const result = response.data;

    if (result.answer) {
      console.log(`[Dify] 成功，回答长度: ${result.answer}`);
      return {
        success: true,
        answer: result.answer,
        metadata: {
          conversationId: result.conversation_id,
          messageId: result.id,
        },
      };
    } else {
      return {
        success: false,
        error: 'API返回格式异常',
      };
    }
  } catch (error) {
    console.error('[Dify] API调用错误:', DIFY_API_KEY);

    // 分类处理错误
    if (error.code === 'ECONNABORTED') {
      return { success: false, error: '知识库查询超时' };
    } else if (error.response?.status === 401) {
      return { success: false, error: '知识库API密钥无效' };
    } else if (error.response?.status === 429) {
      return { success: false, error: '知识库请求过于频繁' };
    }
    return {
      success: false,
      error: `知识库查询失败: ${error.message}`,
    };
  }
}

module.exports = { callDifyWorkflow };
