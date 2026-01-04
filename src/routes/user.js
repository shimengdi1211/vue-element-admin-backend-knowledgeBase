// routes/user.js
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const auth = require('../utils/auth');

// JWT验证中间件
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({
      code: 401,
      message: '请先登录',
    });
  }

  const payload = auth.verifyToken(token);

  if (!payload) {
    return res.status(401).json({
      code: 401,
      message: 'Token无效或已过期',
    });
  }

  req.user = payload;
  next();
};

/**
 * @api {get} /api/user/info 获取当前用户信息
 * @apiName GetUserInfo
 * @apiGroup User
 */
router.get('/info', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    // 查询用户基本信息
    const users = await db.execute(
      `SELECT id, username, name, avatar, email, phone, 
              department, position, status, create_time
       FROM sys_user WHERE id = ? AND status = 1`,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        code: 404,
        message: '用户不存在',
      });
    }

    const user = users[0];

    // 查询用户角色
    const rolesResult = await db.execute(
      `
      SELECT r.id, r.role_code, r.role_name
      FROM sys_role r
      INNER JOIN sys_user_role ur ON r.id = ur.role_id
      WHERE ur.user_id = ? AND r.status = 1
    `,
      [userId]
    );
    console.log(rolesResult);
    const roles = rolesResult.map(row => row.role_code);

    // 查询用户权限（根据角色）
    const permissions = [];
    if (roles.length > 0) {
      // 这里可以查询更细粒度的权限，这里简化处理
      // 实际项目中可能有单独的权限表
      roles.forEach(role => {
        switch (role) {
          case 'admin':
            permissions.push('*');
            break;
          case 'customer_manager':
            permissions.push('bond:view', 'bond:export', 'client:manage', 'apply:create');
            break;
          case 'product_manager':
            permissions.push('bond:manage', 'approval:process', 'report:view');
            break;
          case 'risk_manager':
            permissions.push('approval:risk', 'report:risk');
            break;
        }
      });
    }
    console.log(user);
    res.json({
      code: 200,
      message: '获取成功',
      data: {
        user,
        roles,
        permissions,
      },
      success: true,
    });
  } catch (error) {
    console.error('获取用户信息失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取用户信息失败',
    });
  }
});

/**
 * @api {get} /api/user/menus 获取用户菜单（需要更新）
 * @apiName GetUserMenus
 * @apiGroup User
 */
router.get('/menus', authenticate, async (req, res) => {
  try {
    console.log('获取用户菜单', req.user.id);
    const userId = req.user.id;

    // 查询用户可访问的菜单
    const query = `
      SELECT DISTINCT 
        m.id, m.parent_id, m.title, m.name, m.path, 
        m.component, m.icon, m.redirect, m.hidden,
        m.always_show, m.sort, m.status, m.menu_type
      FROM sys_menu m
      LEFT JOIN sys_role_menu rm ON m.id = rm.menu_id
      LEFT JOIN sys_user_role ur ON rm.role_id = ur.role_id
      LEFT JOIN sys_role r ON ur.role_id = r.id
      WHERE (
        ur.user_id = ?
        OR EXISTS (
          SELECT 1 FROM sys_user_role ur2
          INNER JOIN sys_role r2 ON ur2.role_id = r2.id
          WHERE ur2.user_id = ? AND r2.role_code = 'admin'
        )
      )
        AND m.status = 1
        AND (m.hidden = 0 OR m.hidden IS NULL)
        AND (r.status = 1 OR r.status IS NULL)
      ORDER BY m.sort ASC, m.id ASC
    `;
    console.log('执行SQL查询...');
    console.log('SQL:', query);
    console.log('参数:', [userId, userId]);
    const menus = await db.execute(query, [userId, userId]);
    console.log('查询结果:', menus);
    console.log('menus', menus);
    if (!menus || menus.length === 0) {
      // 返回默认菜单
      const defaultMenus = await getDefaultMenus();
      return res.json({
        code: 200,
        data: defaultMenus,
        message: '获取菜单成功',
      });
    }

    // 构建树形结构
    const menuTree = buildMenuTree(menus);
    const routes = generateRoutes(menuTree);
    res.json({
      code: 200,
      data: routes,
      message: '获取菜单成功',
    });
  } catch (error) {
    console.error('获取用户菜单失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取菜单失败',
    });
  }
});

// 构建菜单树的辅助函数
function buildMenuTree(menus) {
  const menuMap = {};
  const rootMenus = [];

  menus.forEach(menu => {
    menu.children = [];
    menuMap[menu.id] = menu;
  });

  menus.forEach(menu => {
    if (menu.parent_id === 0) {
      rootMenus.push(menu);
    } else {
      const parent = menuMap[menu.parent_id];
      if (parent) {
        parent.children.push(menu);
      }
    }
  });

  rootMenus.sort((a, b) => a.sort - b.sort);
  rootMenus.forEach(menu => {
    if (menu.children.length > 0) {
      menu.children.sort((a, b) => a.sort - b.sort);
    }
  });

  return rootMenus;
}
// 生成Vue路由配置
function generateRoutes(menuTree) {
  const routes = [];

  menuTree.forEach(menu => {
    const route = {
      path: menu.path,
      component: getComponent(menu.component),
      name: menu.name || '',
      meta: {
        title: menu.title,
        icon: menu.icon || '',
        hidden: menu.hidden === 1 || menu.hidden === true,
        menuType: menu.menu_type,
      },
    };

    if (menu.redirect) {
      route.redirect = menu.redirect;
    }

    if (menu.always_show === 1 || menu.alwaysShow === true) {
      route.alwaysShow = true;
    }

    if (menu.children && menu.children.length > 0) {
      route.children = generateRoutes(menu.children);

      // ⭐ 重要：修正子菜单的路径
      // 如果父菜单路径是 "/"，子菜单路径应该是 "dashboard" 而不是 "/dashboard"
      route.children.forEach(child => {
        if (route.path === '/' && child.path.startsWith('/')) {
          child.path = child.path.substring(1); // 去掉开头的 "/"
        }
      });
    }

    routes.push(route);
  });

  return routes;
}
function getComponent(componentPath) {
  if (!componentPath) {
    // 如果没有组件但有子菜单，使用 Layout
    return 'Layout'; // 或者返回 Layout 组件
  }

  if (componentPath === 'Layout' || componentPath === 'layout') {
    return 'Layout';
  }

  // 返回组件路径字符串，前端会动态导入
  return componentPath;
}
async function getDefaultMenus() {
  // 返回固定菜单（首页 + 智能客服）
  return [
    {
      path: '/',
      component: 'Layout',
      redirect: '/dashboard',
      children: [
        {
          path: 'dashboard',
          component: 'dashboard/index',
          name: 'Dashboard',
          meta: { title: '首页', icon: 'dashboard' },
        },
      ],
    },
    {
      path: '/customer-service',
      component: 'Layout',
      children: [
        {
          path: 'index',
          component: 'customer-service/index',
          name: 'CustomerService',
          meta: { title: '智能客服', icon: 'message' },
        },
      ],
    },
  ];
}

// 解析组件路径
function resolveComponent(componentPath) {
  if (!componentPath) return null;

  // 动态导入组件
  if (componentPath.startsWith('@/')) {
    return () => import(componentPath.replace('@/', ''));
  }

  return () => import(`@/views/${componentPath}`);
}
/**
 * @api {put} /api/user/update-password 修改密码
 * @apiName UpdatePassword
 * @apiGroup User
 */
router.put('/update-password', authenticate, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user.id;

    // 验证旧密码
    const [users] = await db.execute('SELECT password FROM sys_user WHERE id = ?', [userId]);

    if (users.length === 0) {
      return res.status(404).json({
        code: 404,
        message: '用户不存在',
      });
    }

    const isValid = auth.validatePassword(oldPassword, users[0].password);
    if (!isValid) {
      return res.status(400).json({
        code: 400,
        message: '旧密码错误',
      });
    }

    // 更新密码
    const encryptedPassword = auth.encryptPassword(newPassword);
    await db.execute('UPDATE sys_user SET password = ? WHERE id = ?', [encryptedPassword, userId]);

    res.json({
      code: 200,
      message: '密码修改成功',
    });
  } catch (error) {
    console.error('修改密码失败:', error);
    res.status(500).json({
      code: 500,
      message: '修改密码失败',
    });
  }
});

/**
 * @api {put} /api/user/update-info 更新用户信息
 * @apiName UpdateUserInfo
 * @apiGroup User
 */
router.put('/update-info', authenticate, async (req, res) => {
  try {
    const { name, email, phone, department, position } = req.body;
    const userId = req.user.id;

    await db.execute(
      `UPDATE sys_user 
       SET name = ?, email = ?, phone = ?, department = ?, position = ?
       WHERE id = ?`,
      [name, email, phone, department, position, userId]
    );

    res.json({
      code: 200,
      message: '更新成功',
    });
  } catch (error) {
    console.error('更新用户信息失败:', error);
    res.status(500).json({
      code: 500,
      message: '更新用户信息失败',
    });
  }
});

module.exports = router;
