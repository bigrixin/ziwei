const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const si = require('systeminformation');
const CryptoJS = require('crypto-js');

// ====================== 配置 ======================
const SECRET_KEY = 'QIMEN_2025_UNIQUE_KEY';
const userDataPath = app.getPath('userData');
const licensePath = path.join(userDataPath, 'license.dat');
const userPath = path.join(userDataPath, 'user.json');
const historyPath = path.join(userDataPath, 'history.json');

if (!fs.existsSync(historyPath)) fs.writeFileSync(historyPath, '[]');

let win;

// ====================== 工具：加密 / 解密 ======================
function encrypt(text) {
  return CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
}
function decrypt(text) {
  try {
    return CryptoJS.AES.decrypt(text, SECRET_KEY).toString(CryptoJS.enc.Utf8);
  } catch (e) {
    return '';
  }
}

// ====================== 获取电脑唯一硬件码 ======================
async function getMachineCode() {
  const cpu = await si.cpu();
  const disk = await si.diskLayout();
  const baseboard = await si.baseboard();
  const code = `${cpu.manufacturer}${cpu.model}${disk[0]?.serialNumber}${baseboard.serial}`;
  return encrypt(code).substring(0, 32).toUpperCase();
}

// ====================== 验证激活码 ======================
function verifyKey(machineCode, inputKey) {
  const validKey = encrypt(machineCode + SECRET_KEY).substring(0, 24).toUpperCase();
  return inputKey === validKey;
}

// ====================== 窗口 ======================
function createWindow() {
  win = new BrowserWindow({
    width: 1600, height: 1000, minWidth: 1200, minHeight: 800,
    title: "奇门遁甲AI至尊版 · 一机一码",
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: { nodeIntegration: false, contextIsolation: true }
  });
  win.removeMenu();
  win.loadFile(path.join(__dirname, '/dist/index.html'));
}

// ====================== 接口 ======================

// 获取机器码
ipcMain.handle('get-machine-code', async () => {
  return await getMachineCode();
});

// 验证激活
ipcMain.handle('active-license', async (e, inputKey) => {
  const machineCode = await getMachineCode();
  const ok = verifyKey(machineCode, inputKey);
  if (ok) {
    fs.writeFileSync(licensePath, encrypt(JSON.stringify({
      machineCode,
      key: inputKey,
      active: true
    })));
  }
  return ok;
});

// 检查授权
ipcMain.handle('check-license', async () => {
  if (!fs.existsSync(licensePath)) return false;
  try {
    const data = JSON.parse(decrypt(fs.readFileSync(licensePath, 'utf8')));
    const currentMachine = await getMachineCode();
    return data.active && data.machineCode === currentMachine;
  } catch (e) {
    return false;
  }
});

// 基础功能
ipcMain.handle('print', async () => win.webContents.print({ printBackground: true }));
ipcMain.handle('user-save', (e, u) => fs.writeFileSync(userPath, JSON.stringify(u)));
ipcMain.handle('user-get', () => fs.existsSync(userPath) ? JSON.parse(fs.readFileSync(userPath)) : null);
ipcMain.handle('history-add', (e, item) => {
  const list = JSON.parse(fs.readFileSync(historyPath));
  list.unshift(item);
  fs.writeFileSync(historyPath, JSON.stringify(list.slice(0, 99)));
});

// AI 解卦
ipcMain.handle('ai-online-jiegua', async (e, data) => {
  try {
    const res = await axios.post('https://api.deepseek.com/chat/completions', {
      model: "deepseek-chat",
      messages: [
        { role: "system", content: "你是专业奇门遁甲大师，简洁、专业、准确解卦。" },
        { role: "user", content: `
局式：${data.panTitle}
干支：${data.ganZhi}
阴阳遁：${data.dun}${data.ju}局
宫位：${data.gongName}
九星：${data.jiuXing}
八门：${data.baMen}
八神：${data.baShen}
格局：${data.geJu}
吉凶：${data.jiXiong}
请详细解卦。` }
      ]
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer sk-xxxxxxxxxxxxxxxxxxxxxxxx'
      }
    });
    return res.data.choices[0].message.content;
  } catch (err) {
    return 'AI连接失败，请检查网络或使用本地解卦。';
  }
});

// ====================== 启动 ======================
app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());