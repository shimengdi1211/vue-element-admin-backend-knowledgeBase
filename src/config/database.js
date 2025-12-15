// config/database.js
const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.development' });

class Database {
  constructor() {
    this.pool = null;
    this.init();
  }

  init() {
    try {
      this.pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'chat_assistant',
        port: process.env.DB_PORT || 3306,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0,
      });

      console.log('MySQL连接池已创建');
    } catch (error) {
      console.error('创建数据库连接池失败:', error);
    }
  }

  async getConnection() {
    try {
      const connection = await this.pool.getConnection();
      return connection;
    } catch (error) {
      console.error('获取数据库连接失败:', error);
      throw error;
    }
  }

  async query(sql, params) {
    try {
      const [rows] = await this.pool.execute(sql, params);
      return rows;
    } catch (error) {
      console.error('数据库查询失败:', error);
      throw error;
    }
  }

  async execute(sql, params) {
    try {
      const [result] = await this.pool.execute(sql, params);
      return result;
    } catch (error) {
      console.error('数据库执行失败:', error);
      throw error;
    }
  }

  async close() {
    try {
      await this.pool.end();
      console.log('数据库连接已关闭');
    } catch (error) {
      console.error('关闭数据库连接失败:', error);
    }
  }
}

module.exports = new Database();
