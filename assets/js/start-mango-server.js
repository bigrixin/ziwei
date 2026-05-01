const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// 获取 mango-server.js 的路径
const mangoServerPath = path.join(__dirname, 'mango-server.js');

// 检查文件是否存在
if (!fs.existsSync(mangoServerPath)) {
  console.error('❌ 错误：找不到 mango-server.js 文件');
  process.exit(1);
}

console.log('🚀 正在启动 MongoDB 数据管理服务...');
console.log(`📍 服务路径: ${mangoServerPath}`);

// 启动 mango-server.js 进程
const mangoProcess = spawn('node', [mangoServerPath], {
  stdio: 'inherit',  // 直接继承主进程的 stdio，这样日志会直接输出
  detached: false    // 不分离进程
});

// 监听进程事件
mangoProcess.on('error', (err) => {
  console.error('❌ 启动失败:', err.message);
  process.exit(1);
});

mangoProcess.on('exit', (code, signal) => {
  if (code !== 0) {
    console.error(`❌ 服务异常退出，代码: ${code}`);
  } else {
    console.log('✅ 服务已关闭');
  }
  process.exit(code || 0);
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n⏹️ 正在关闭服务...');
  mangoProcess.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\n⏹️ 收到终止信号，正在关闭服务...');
  mangoProcess.kill('SIGTERM');
});
