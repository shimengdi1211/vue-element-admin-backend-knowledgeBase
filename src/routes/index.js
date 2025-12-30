// routes/index.js - Express后端
const express = require('express');
const router = express.Router();
const db = require('../config/db');

// 获取用户动态路由
// router.get('/user/menus', async (req, res) => {
//   try {
//     const userId = req.user.id; // 从token中获取用户ID

//     // 查询用户拥有的菜单权限
//     const query = `
//       SELECT DISTINCT m.*
//       FROM sys_menu m
//       LEFT JOIN sys_role_menu rm ON m.id = rm.menu_id
//       LEFT JOIN sys_user_role ur ON rm.role_id = ur.role_id
//       WHERE ur.user_id = ?
//         AND m.status = 1
//         AND (m.hidden = 0 OR m.hidden IS NULL)
//       ORDER BY m.sort ASC, m.id ASC
//     `;

//     const [menus] = await db.execute(query, [userId]);

//     // 构建树形结构
//     const menuTree = buildMenuTree(menus);

//     // 生成Vue路由配置
//     const routes = generateRoutes(menuTree);

//     res.json({
//       code: 200,
//       data: routes,
//       message: '获取成功',
//     });
//   } catch (error) {
//     console.error('获取菜单失败:', error);
//     res.status(500).json({
//       code: 500,
//       message: '获取菜单失败',
//     });
//   }
// });

// 构建菜单树
// function buildMenuTree(menus) {
//   const menuMap = {};
//   const rootMenus = [];

//   // 创建映射
//   menus.forEach(menu => {
//     menu.children = [];
//     menuMap[menu.id] = menu;
//   });

//   // 构建树
//   menus.forEach(menu => {
//     if (menu.parent_id === 0) {
//       rootMenus.push(menu);
//     } else {
//       const parent = menuMap[menu.parent_id];
//       if (parent) {
//         parent.children.push(menu);
//       }
//     }
//   });

//   return rootMenus;
// }

// 生成Vue路由配置
// function generateRoutes(menuTree) {
//   const routes = [];

//   menuTree.forEach(menu => {
//     const route = {
//       path: menu.path,
//       component: resolveComponent(menu.component),
//       meta: {
//         title: menu.title,
//         icon: menu.icon,
//         hidden: menu.hidden === 1,
//       },
//     };

//     if (menu.redirect) {
//       route.redirect = menu.redirect;
//     }

//     if (menu.always_show === 1) {
//       route.alwaysShow = true;
//     }

//     if (menu.children && menu.children.length > 0) {
//       route.children = generateRoutes(menu.children);
//     }

//     routes.push(route);
//   });

//   return routes;
// }

// 解析组件路径
function resolveComponent(componentPath) {
  if (!componentPath) return null;

  // 动态导入组件
  if (componentPath.startsWith('@/')) {
    return () => import(componentPath.replace('@/', ''));
  }

  return () => import(`@/views/${componentPath}`);
}

module.exports = router;
