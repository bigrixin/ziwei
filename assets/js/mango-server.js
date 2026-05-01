const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');

const app = express();
// const dns = require("dns")
// dns.setServers(['1.1.1.1','8.8.8.8'])
// const mongoURI = 'mongodb+srv://ydtadmin:Royalohm2028YDT@clusterydt.tiazimf.mongodb.net/?appName=ClusterYDT';
const mongoURI = 'mongodb+srv://ydtadmin:Royalohm2028YDT@clusterydt.tiazimf.mongodb.net/ydt_data?retryWrites=true&w=majority';

app.use(cors());
app.use(express.json());

// 👇 把这里换成你自己的 Atlas 连接字符串
mongoose.connect(mongoURI)
  .then(() => console.log('✅ 已连接 MongoDB Atlas 免费云数据库'))
  .catch(err => console.log('❌ 连接失败', err));

// 数据模型
const DataSchema = new mongoose.Schema({
  name: String,           // 姓名
  time: String,          // 时间
  period: String,        // 时辰（选择）
  gender: String,        // 性别
  description: String,   // 描述
  category: String,      // 类别
  user: String,          // 用户
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// tableName: 'data'  // 指定集合名称为 'data'
//模型名称为 'Data'，默认会自动转换为小写复数形式 datas 作为集合名称
const Data = mongoose.model('Data', DataSchema, 'ydt_data');

// 全局状态：当前使用的 Collection 名称
let currentCollection = 'bazhi2026';

// 辅助函数：获取当前 Collection 的模型
function getCurrentModel() {
  return mongoose.model('Data', DataSchema, currentCollection);
}

// 接口1：获取所有数据
app.get('/api/list', async (req, res) => {
  try {
    const Model = getCurrentModel();
    const list = await Model.find();
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: '获取数据失败', details: err.message });
  }
});

// 接口2：新增数据
app.post('/api/add', async (req, res) => {
  try {
    const Model = getCurrentModel();
    const newData = new Model(req.body);
    await newData.save();
    res.json({ msg: '添加成功', data: newData });
  } catch (err) {
    res.status(500).json({ error: '添加失败', details: err.message });
  }
});

// 接口3：修改数据
app.put('/api/update/:id', async (req, res) => {
  try {
    const Model = getCurrentModel();
    const updated = await Model.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ msg: '修改成功', data: updated });
  } catch (err) {
    res.status(500).json({ error: '修改失败', details: err.message });
  }
});

// 接口4：删除数据
app.delete('/api/delete/:id', async (req, res) => {
  try {
    const Model = getCurrentModel();
    await Model.findByIdAndDelete(req.params.id);
    res.json({ msg: '删除成功' });
  } catch (err) {
    res.status(500).json({ error: '删除失败', details: err.message });
  }
});

// 接口5：健康检查 - 检查 MongoDB 连接状态
app.get('/api/health', async (req, res) => {
  try {
    // 检查 MongoDB 连接状态
    const mongoStatus = mongoose.connection.readyState;
    // 0 = 断开连接, 1 = 已连接, 2 = 正在连接, 3 = 正在断开
    const isConnected = mongoStatus === 1;
    
    const statusMap = {
      0: '断开连接',
      1: '已连接',
      2: '正在连接',
      3: '正在断开'
    };
    
    res.json({
      status: isConnected ? 'connected' : 'disconnected',
      mongoStatus: mongoStatus,
      statusDescription: statusMap[mongoStatus],
      message: isConnected ? 'MongoDB 已连接' : 'MongoDB 未连接',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: '检查状态失败',
      details: err.message
    });
  }
});

// 接口6：重新连接 MongoDB
app.post('/api/reconnect', async (req, res) => {
  try {
    // 如果已断开连接，尝试重新连接
    if (mongoose.connection.readyState === 0 || mongoose.connection.readyState === 3) {
      await mongoose.connect(mongoURI, {
        maxPoolSize: 10
      });
    }
    
    const mongoStatus = mongoose.connection.readyState;
    const isConnected = mongoStatus === 1;
    
    res.json({
      success: isConnected,
      status: isConnected ? 'connected' : 'disconnected',
      message: isConnected ? 'MongoDB 已重新连接' : 'MongoDB 连接失败',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      status: 'error',
      message: 'MongoDB 重新连接失败',
      details: err.message
    });
  }
});

// 接口6.5：导入数据
app.post('/api/import', async (req, res) => {
  try {
    const { data } = req.body;
    
    if (!data || !Array.isArray(data)) {
      return res.status(400).json({
        success: false,
        message: '数据格式错误，必须是数组',
        error: 'Invalid data format'
      });
    }
    
    if (data.length === 0) {
      return res.status(400).json({
        success: false,
        message: '导入的数据不能为空',
        error: 'Empty data array'
      });
    }
    
    const Model = getCurrentModel();
    
    // 清空现有数据
    await Model.deleteMany({});
    console.log('🗑️ 已清空现有数据');
    
    // 插入新数据
    const result = await Model.insertMany(data);
    console.log(`✅ 已导入 ${result.length} 条数据`);
    
    res.json({
      success: true,
      message: `✅ 成功导入 ${result.length} 条数据`,
      count: result.length,
      data: result
    });
  } catch (err) {
    console.error('❌ 导入失败:', err.message);
    res.status(500).json({
      success: false,
      message: '导入失败',
      error: err.message,
      details: err.toString()
    });
  }
});

// 接口7：启动/检查服务器
app.post('/api/start-server', (req, res) => {
  try {
    const mongoStatus = mongoose.connection.readyState;
    
    const statusMap = {
      0: '断开连接',
      1: '已连接',
      2: '正在连接',
      3: '正在断开'
    };
    
    console.log(`[启动请求] MongoDB 当前状态: ${statusMap[mongoStatus]} (${mongoStatus})`);
    
    // 如果已经连接，直接返回
    if (mongoStatus === 1) {
      console.log('✅ MongoDB 已连接，无需启动');
      return res.json({
        success: true,
        message: '✅ MongoDB 服务器已在运行',
        status: 'already_running',
        mongoStatus: mongoStatus
      });
    }
    
    // 如果正在连接，等待
    if (mongoStatus === 2) {
      console.log('⏳ MongoDB 正在连接中');
      return res.json({
        success: true,
        message: '⏳ MongoDB 服务器正在连接中，请稍候...',
        status: 'connecting',
        mongoStatus: mongoStatus
      });
    }
    
    // 如果已断开，尝试重新连接
    console.log('🔄 尝试重新连接 MongoDB...');
    
    mongoose.connect(mongoURI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 10000
    }).then(() => {
      console.log('✅ MongoDB 已重新连接成功');
      res.json({
        success: true,
        message: '✅ MongoDB 服务器已启动并连接',
        status: 'connected',
        mongoStatus: mongoose.connection.readyState
      });
    }).catch(err => {
      console.error('❌ MongoDB 连接失败:', err.message);
      res.status(500).json({
        success: false,
        message: '❌ MongoDB 连接失败',
        status: 'connection_failed',
        error: err.message,
        mongoStatus: mongoStatus
      });
    });
    
  } catch (err) {
    console.error('❌ 启动失败:', err.message);
    res.status(500).json({
      success: false,
      message: '启动失败',
      error: err.message
    });
  }
});

// 接口8：获取所有 Collections
app.get('/api/collections', async (req, res) => {
  try {
    const db = mongoose.connection.getClient().db(mongoose.connection.name);
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    res.json({
      success: true,
      collections: collectionNames,
      currentCollection: currentCollection,  // 返回真实的当前 collection
      total: collectionNames.length
    });
  } catch (err) {
    console.error('❌ 获取 Collections 失败:', err.message);
    res.status(500).json({
      success: false,
      message: '获取 Collections 失败',
      error: err.message
    });
  }
});

// 接口9：切换 Collection
app.post('/api/switch-collection', async (req, res) => {
  try {
    const { collectionName } = req.body;
    
    if (!collectionName) {
      return res.status(400).json({
        success: false,
        message: '未提供 Collection 名称'
      });
    }
    
    // 验证 collection 是否存在
    const db = mongoose.connection.getClient().db(mongoose.connection.name);
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    if (!collectionNames.includes(collectionName)) {
      return res.status(400).json({
        success: false,
        message: `Collection '${collectionName}' 不存在`,
        availableCollections: collectionNames
      });
    }
    
    // 更新当前使用的 collection
    currentCollection = collectionName;
    console.log(`✅ 已切换到 Collection: ${collectionName}`);
    
    res.json({
      success: true,
      message: `✅ 已切换到 Collection: ${collectionName}`,
      currentCollection: collectionName
    });
  } catch (err) {
    console.error('❌ 切换 Collection 失败:', err.message);
    res.status(500).json({
      success: false,
      message: '切换 Collection 失败',
      error: err.message
    });
  }
});

// 接口：启动新的 mango-server 进程（仅用于调试）
app.post('/api/spawn-server', (req, res) => {
  try {
    const childProcess = spawn('node', [path.join(__dirname, 'start-mango-server.js')], {
      detached: true,
      stdio: 'ignore'
    });
    
    childProcess.unref();
    
    console.log(`✅ 已启动新的 mango-server 进程 (PID: ${childProcess.pid})`);
    res.json({
      success: true,
      message: '✅ 已在后台启动 MongoDB 数据管理服务',
      pid: childProcess.pid,
      note: '新进程将在后台运行，请在 2-3 秒后刷新页面'
    });
  } catch (err) {
    console.error('❌ 启动新进程失败:', err.message);
    res.status(500).json({
      success: false,
      message: '启动新进程失败',
      error: err.message
    });
  }
});

// 全局错误处理
app.use((err, req, res, next) => {
  console.error('❌ 未处理的错误:', err);
  res.status(500).json({
    success: false,
    message: '服务器内部错误',
    error: err.message
  });
});

// 启动服务
const PORT = 3000;
const server = app.listen(PORT, () => {
  console.log('🚀 后端服务已启动：http://localhost:' + PORT);
  console.log('📝 MongoDB URI:', mongoURI.replace(/:[^:]*@/, ':****@'));
  console.log('✅ CORS 已启用');
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('⚠️  收到 SIGTERM 信号，正在关闭服务...');
  server.close(() => {
    console.log('✅ 服务已关闭');
    mongoose.connection.close();
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('⚠️  收到 SIGINT 信号，正在关闭服务...');
  server.close(() => {
    console.log('✅ 服务已关闭');
    mongoose.connection.close();
    process.exit(0);
  });
});

// 捕捉未处理的异常
process.on('uncaughtException', (err) => {
  console.error('❌ 未捕获的异常:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ 未处理的 Promise 拒绝:', reason);
});