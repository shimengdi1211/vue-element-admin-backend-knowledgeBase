// routes/auth.js
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const auth = require('../utils/auth');
const { body, validationResult } = require('express-validator');

/**
 * @api {post} /api/auth/login 用户登录
 * @apiName Login
 * @apiGroup Auth
 *
 * @apiParam {String} username 用户名
 * @apiParam {String} password 密码
 * @apiParam {Boolean} [rememberMe] 是否记住我
 *
 * @apiSuccess {Number} code 状态码
 * @apiSuccess {String} message 提示信息
 * @apiSuccess {Object} data 返回数据
 * @apiSuccess {String} data.token JWT token
 * @apiSuccess {Object} data.user 用户信息
 */
router.post(
  '/login',
  [
    body('username').notEmpty().withMessage('用户名不能为空'),
    body('password').notEmpty().withMessage('密码不能为空'),
  ],
  async (req, res) => {
    try {
      // 验证参数
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          code: 400,
          message: errors.array()[0].msg,
          success: false,
        });
      }

      const { username, password, rememberMe } = req.body;
      const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

      console.log('用户登录尝试:', { username, clientIp });
      // 查询用户
      const users = await db.execute('SELECT * FROM sys_user WHERE username = ? AND status = 1', [
        username,
      ]);

      console.log('查询结果:', users);
      if (users.length === 0) {
        console.log('用户不存在或已禁用:', username);
        return res.status(401).json({
          code: 401,
          message: '用户名或密码错误',
          success: false,
        });
      }

      const user = users[0];
      console.log('找到用户:', user.username);

      // 验证密码
      const isValid = auth.validatePassword(password, user.password);
      if (!isValid) {
        return res.status(401).json({
          code: 401,
          message: '用户名或密码错误',
          success: false,
        });
      }

      // 更新最后登录信息
      await db.execute(
        'UPDATE sys_user SET last_login_time = NOW(), last_login_ip = ? WHERE id = ?',
        [clientIp, user.id]
      );

      // 生成token
      const tokenPayload = {
        id: user.id,
        username: user.username,
        name: user.name,
      };

      const token = auth.generateToken(tokenPayload);

      // 移除密码字段
      delete user.password;

      res.json({
        code: 200,
        message: '登录成功',
        data: {
          token,
          user: {
            id: user.id,
            username: user.username,
            name: user.name,
            avatar: user.avatar,
            email: user.email,
            phone: user.phone,
            department: user.department,
            position: user.position,
          },
        },
        success: true,
      });
    } catch (error) {
      console.error('登录失败:', error);
      res.status(500).json({
        code: 500,
        message: '登录失败，请稍后重试',
        success: false,
      });
    }
  }
);

/**
 * @api {post} /api/auth/logout 用户退出
 * @apiName Logout
 * @apiGroup Auth
 */
router.post('/logout', async (req, res) => {
  try {
    // JWT是无状态的，通常不需要后端处理
    // 如果有token黑名单需求，可以在这里实现
    res.json({
      code: 200,
      message: '退出成功',
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      code: 500,
      message: '退出失败',
      success: false,
    });
  }
});

/**
 * @api {get} /api/auth/refresh-token 刷新token
 * @apiName RefreshToken
 * @apiGroup Auth
 */
router.get('/refresh-token', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        code: 401,
        message: 'Token不存在',
        success: false,
      });
    }

    const payload = auth.verifyToken(token);

    if (!payload) {
      return res.status(401).json({
        code: 401,
        message: 'Token无效或已过期',
        success: false,
      });
    }

    // 生成新token
    const newToken = auth.generateToken({
      id: payload.id,
      username: payload.username,
      name: payload.name,
    });

    res.json({
      code: 200,
      message: 'Token刷新成功',
      data: {
        token: newToken,
      },
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      code: 500,
      message: '刷新Token失败',
      success: false,
    });
  }
});

module.exports = router;
