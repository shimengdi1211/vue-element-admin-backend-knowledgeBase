// models/ChatModel.js
const db = require('../config/database');

class ChatModel {
  // 创建会话
  async createSession(userId = null, userInfo = {}) {
    try {
      const sql = `
        INSERT INTO chat_sessions 
        (session_id, user_id, user_ip, user_agent, platform, created_at) 
        VALUES (UUID(), ?, ?, ?, ?, NOW())
      `;

      const result = await db.execute(sql, [
        userId,
        userInfo.ip || '',
        userInfo.userAgent || '',
        userInfo.platform || 'web',
      ]);

      return result.insertId;
    } catch (error) {
      console.error('创建会话失败:', error);
      throw error;
    }
  }

  // 获取会话
  async getSession(sessionId) {
    try {
      const sql = `
        SELECT * FROM chat_sessions 
        WHERE session_id = ? 
        ORDER BY created_at DESC 
        LIMIT 1
      `;

      const sessions = await db.query(sql, [sessionId]);
      return sessions[0] || null;
    } catch (error) {
      console.error('获取会话失败:', error);
      throw error;
    }
  }

  // 保存消息到数据库
  async saveMessage(sessionId, role, content, metadata = {}) {
    try {
      const sql = `
        INSERT INTO chat_messages 
        (session_id, role, content, token_count, source, category, response_time, created_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
      `;

      const result = await db.execute(sql, [
        sessionId,
        role,
        content,
        metadata.tokenCount || 0,
        metadata.source || 'user',
        metadata.category || 'general',
        metadata.responseTime || 0,
      ]);

      // 更新会话的最后活动时间
      await this.updateSessionActivity(sessionId);

      return result.insertId;
    } catch (error) {
      console.error('保存消息失败:', error);
      throw error;
    }
  }

  // 更新会话活动时间
  async updateSessionActivity(sessionId) {
    try {
      const sql = `
        UPDATE chat_sessions 
        SET last_activity_at = NOW(), 
            message_count = message_count + 1 
        WHERE session_id = ?
      `;

      await db.execute(sql, [sessionId]);
    } catch (error) {
      console.error('更新会话活动失败:', error);
      throw error;
    }
  }

  // 获取会话历史
  async getSessionHistory(sessionId, limit = 20) {
    try {
      const sql = `
        SELECT 
          id, session_id, role, content, 
          source, category, response_time, 
          created_at 
        FROM chat_messages 
        WHERE session_id = ? 
        ORDER BY created_at ASC 
        LIMIT ?
      `;

      const messages = await db.query(sql, [sessionId, limit]);
      return messages;
    } catch (error) {
      console.error('获取会话历史失败:', error);
      throw error;
    }
  }

  // 获取最近会话
  async getRecentSessions(hours = 24, limit = 100) {
    try {
      const sql = `
        SELECT 
          s.session_id,
          s.user_id,
          s.user_ip,
          s.user_agent,
          s.platform,
          s.created_at,
          s.last_activity_at,
          s.message_count,
          COUNT(m.id) as total_messages
        FROM chat_sessions s
        LEFT JOIN chat_messages m ON s.session_id = m.session_id
        WHERE s.last_activity_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)
        GROUP BY s.session_id
        ORDER BY s.last_activity_at DESC
        LIMIT ?
      `;

      return await db.query(sql, [hours, limit]);
    } catch (error) {
      console.error('获取最近会话失败:', error);
      throw error;
    }
  }

  // 获取统计信息
  async getStatistics(startDate = null, endDate = null) {
    try {
      let dateFilter = '';
      const params = [];

      if (startDate && endDate) {
        dateFilter = 'WHERE m.created_at BETWEEN ? AND ?';
        params.push(startDate, endDate);
      }

      const sql = `
        SELECT 
          COUNT(DISTINCT s.session_id) as total_sessions,
          COUNT(DISTINCT s.user_id) as total_users,
          COUNT(m.id) as total_messages,
          AVG(m.response_time) as avg_response_time,
          SUM(CASE WHEN m.role = 'user' THEN 1 ELSE 0 END) as user_messages,
          SUM(CASE WHEN m.role = 'assistant' THEN 1 ELSE 0 END) as assistant_messages,
          COUNT(DISTINCT m.category) as unique_categories,
          MAX(s.last_activity_at) as latest_activity
        FROM chat_sessions s
        LEFT JOIN chat_messages m ON s.session_id = m.session_id
        ${dateFilter}
      `;

      const stats = await db.query(sql, params);
      return stats[0] || {};
    } catch (error) {
      console.error('获取统计信息失败:', error);
      throw error;
    }
  }

  // 清理旧消息
  async cleanupOldMessages(daysToKeep = 30) {
    try {
      const sql = `
        DELETE FROM chat_messages 
        WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)
      `;

      const result = await db.execute(sql, [daysToKeep]);
      return result.affectedRows;
    } catch (error) {
      console.error('清理旧消息失败:', error);
      throw error;
    }
  }

  // 创建表格（初始化用）
  async createTables() {
    try {
      // 创建会话表
      const createSessionsTable = `
        CREATE TABLE IF NOT EXISTS chat_sessions (
          id INT PRIMARY KEY AUTO_INCREMENT,
          session_id VARCHAR(36) NOT NULL UNIQUE,
          user_id VARCHAR(100),
          user_ip VARCHAR(45),
          user_agent TEXT,
          platform VARCHAR(50),
          message_count INT DEFAULT 0,
          created_at DATETIME NOT NULL,
          last_activity_at DATETIME,
          INDEX idx_session_id (session_id),
          INDEX idx_user_id (user_id),
          INDEX idx_created_at (created_at),
          INDEX idx_last_activity (last_activity_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `;

      // 创建消息表
      const createMessagesTable = `
        CREATE TABLE IF NOT EXISTS chat_messages (
          id INT PRIMARY KEY AUTO_INCREMENT,
          session_id VARCHAR(36) NOT NULL,
          role VARCHAR(20) NOT NULL,
          content TEXT NOT NULL,
          token_count INT DEFAULT 0,
          source VARCHAR(50),
          category VARCHAR(50),
          response_time INT DEFAULT 0,
          created_at DATETIME NOT NULL,
          FOREIGN KEY (session_id) REFERENCES chat_sessions(session_id) ON DELETE CASCADE,
          INDEX idx_session_id (session_id),
          INDEX idx_role (role),
          INDEX idx_created_at (created_at),
          INDEX idx_category (category)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `;

      await db.execute(createSessionsTable);
      await db.execute(createMessagesTable);

      console.log('数据库表创建完成');
    } catch (error) {
      console.error('创建表失败:', error);
      throw error;
    }
  }
}

module.exports = new ChatModel();
