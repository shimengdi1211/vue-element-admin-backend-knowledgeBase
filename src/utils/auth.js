// utils/auth.js - 后端认证工具
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const secret = 'ibank-secret-key-2024'; // JWT密钥，实际项目要从环境变量读取
const expiresIn = '8h'; // token有效期

/**
 * 生成JWT token
 * @param {Object} payload - 用户信息
 * @returns {String} token
 */
function generateToken(payload) {
  return jwt.sign(payload, secret, { expiresIn });
}

/**
 * 验证JWT token
 * @param {String} token - token字符串
 * @returns {Object|null} 解码后的payload或null
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, secret);
  } catch (error) {
    return null;
  }
}

/**
 * 密码加密
 * @param {String} password - 明文密码
 * @returns {String} 加密后的密码
 */
function encryptPassword(password) {
  const salt = bcrypt.genSaltSync(10);
  return bcrypt.hashSync(password, salt);
}

/**
 * 验证密码
 * @param {String} password - 明文密码
 * @param {String} hash - 加密后的密码
 * @returns {Boolean} 是否匹配
 */
function validatePassword(password, hash) {
  console.log(password);
  console.log(hash);
  console.log(bcrypt.compareSync(password, hash));
  return bcrypt.compareSync(password, hash);
}

/**
 * 生成随机密码
 * @param {Number} length - 密码长度
 * @returns {String} 随机密码
 */
function generateRandomPassword(length = 12) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  const randomBytes = crypto.randomBytes(length);
  let password = '';

  for (let i = 0; i < length; i++) {
    password += chars[randomBytes[i] % chars.length];
  }

  return password;
}

module.exports = {
  generateToken,
  verifyToken,
  encryptPassword,
  validatePassword,
  generateRandomPassword,
};
