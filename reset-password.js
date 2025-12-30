// reset-password.js
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function resetPassword() {
  try {
    const connection = await mysql.createConnection({
      host: '127.0.0.1', // 改为 127.0.0.1
      port: 3307, // 添加端口 3307
      user: 'root',
      password: '123456', // 改为 123456
      database: 'chat_assistant', // 改为 chat_assistant
    });

    console.log('✅ 数据库连接成功！');

    // 先检查表是否存在
    const [tables] = await connection.execute('SHOW TABLES');
    const tableNames = tables.map(t => Object.values(t)[0]);

    if (!tableNames.includes('sys_user')) {
      console.log('❌ sys_user表不存在，正在创建...');

      await connection.execute(`
        CREATE TABLE sys_user (
          id INT NOT NULL AUTO_INCREMENT,
          username VARCHAR(50) NOT NULL COMMENT '用户名',
          password VARCHAR(100) NOT NULL COMMENT '密码（加密后）',
          name VARCHAR(50) DEFAULT NULL COMMENT '真实姓名',
          avatar VARCHAR(200) DEFAULT NULL COMMENT '头像',
          email VARCHAR(100) DEFAULT NULL COMMENT '邮箱',
          phone VARCHAR(20) DEFAULT NULL COMMENT '手机号',
          department VARCHAR(100) DEFAULT NULL COMMENT '部门',
          position VARCHAR(100) DEFAULT NULL COMMENT '职位',
          status TINYINT(1) DEFAULT '1' COMMENT '状态：0-禁用，1-启用',
          last_login_time DATETIME DEFAULT NULL,
          last_login_ip VARCHAR(50) DEFAULT NULL,
          create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
          update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY uk_username (username)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表'
      `);
      console.log('✅ 创建sys_user表成功');
    }

    // 生成新的密码hash
    const plainPassword = '123456';
    const newHash = bcrypt.hashSync(plainPassword, 10);

    console.log('新密码:', plainPassword);
    console.log('新hash:', newHash);

    // 检查admin用户是否存在
    const [existingUsers] = await connection.execute('SELECT id FROM sys_user WHERE username = ?', [
      'admin',
    ]);

    if (existingUsers.length > 0) {
      // 更新密码
      await connection.execute('UPDATE sys_user SET password = ? WHERE username = ?', [
        newHash,
        'admin',
      ]);
      console.log('✅ 更新admin密码成功');
    } else {
      // 创建新用户
      await connection.execute(
        `INSERT INTO sys_user (username, password, name, department, position, status) 
         VALUES (?, ?, ?, ?, ?, 1)`,
        ['admin', newHash, '管理员', 'IT部', '系统管理员']
      );
      console.log('✅ 创建admin用户成功');
    }

    // 验证更新
    const [users] = await connection.execute(
      'SELECT username, password FROM sys_user WHERE username = ?',
      ['admin']
    );

    if (users.length === 0) {
      console.log('❌ 验证失败：未找到admin用户');
      await connection.end();
      return;
    }

    console.log('更新后的密码hash:', users[0].password);

    // 测试验证
    const testResult = bcrypt.compareSync(plainPassword, users[0].password);
    console.log('验证结果:', testResult ? '✅ 成功' : '❌ 失败');

    // 创建另一个测试用户（zhangsan）
    const [zhangsanExists] = await connection.execute(
      'SELECT id FROM sys_user WHERE username = ?',
      ['zhangsan']
    );

    if (zhangsanExists.length === 0) {
      await connection.execute(
        `INSERT INTO sys_user (username, password, name, department, position, status) 
         VALUES (?, ?, ?, ?, ?, 1)`,
        ['zhangsan', newHash, '张三', '投行部', '客户经理']
      );
      console.log('✅ 创建zhangsan用户成功');
    }

    // 显示所有用户
    const [allUsers] = await connection.execute('SELECT username, name, department FROM sys_user');

    console.log('\n📋 数据库用户列表:');
    allUsers.forEach(user => {
      console.log(`  ${user.username} - ${user.name} (${user.department})`);
    });

    await connection.end();

    if (testResult) {
      console.log('\n🎉 密码重置成功！');
      console.log('登录账号:');
      console.log('  admin / 123456');
      console.log('  zhangsan / 123456');
    } else {
      console.log('\n⚠️  验证失败，请检查数据库');
    }
  } catch (error) {
    console.error('❌ 重置密码失败:', error.message);

    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('\n🔑 数据库连接失败，请检查:');
      console.log('  1. MySQL服务是否运行');
      console.log('  2. 主机: 127.0.0.1');
      console.log('  3. 端口: 3307');
      console.log('  4. 用户名: root');
      console.log('  5. 密码: 123456');
      console.log('  6. 数据库: chat_assistant');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.log('\n🗃️  数据库不存在，请先创建数据库:');
      console.log('  CREATE DATABASE chat_assistant;');
    }
  }
}

resetPassword();
