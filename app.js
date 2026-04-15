// OPC 龙虾大会 - 活动签到系统
// 飞书多维表格集成

// 飞书配置
const FEISHU_APP_ID = 'cli_a954d4628ef8dcde';
const FEISHU_APP_SECRET = 'iV6jK7bR0LxGpl1AkIryUhMRedVrUznT';
const BITABLE_APP_TOKEN = 'ME8ZbWEXZamiShslX1lcBb5un9c';
const BITABLE_TABLE_ID = 'tblLDOqsTrjFgJHB';

// DOM 元素
const checkinForm = document.getElementById('checkin-form');
const checkinResult = document.getElementById('checkin-result');
const nameInput = document.getElementById('name-input');
const checkinBtn = document.getElementById('checkin-btn');
const loading = document.getElementById('loading');
const resultIcon = document.getElementById('result-icon');
const resultTitle = document.getElementById('result-title');
const resultMessage = document.getElementById('result-message');
const seatInfo = document.getElementById('seat-info');
const seatNumber = document.getElementById('seat-number');
const backBtn = document.getElementById('back-btn');
const welcomeSound = document.getElementById('welcome-sound');

// 返回重新签到
backBtn.addEventListener('click', function() {
  checkinForm.classList.remove('hidden');
  checkinResult.classList.add('hidden');
  nameInput.value = '';
});

// 回车签到
nameInput.addEventListener('keypress', function(e) {
  if (e.key === 'Enter') {
    doCheckin();
  }
});

// 点击签到
checkinBtn.addEventListener('click', doCheckin);

// 主签到流程
async function doCheckin() {
  const name = nameInput.value.trim();
  if (!name) {
    showToast('请输入姓名');
    return;
  }

  loading.classList.remove('hidden');
  checkinBtn.disabled = true;

  try {
    // 1. 获取飞书 access token
    const token = await getAccessToken();
    
    // 2. 查询飞书表格中是否有这个名字
    const records = await searchByName(token, name);
    
    // 3. 找到匹配的记录
    let matchedRecord = null;
    if (records && records.items && records.items.length > 0) {
      // 模糊匹配
      matchedRecord = records.items.find(item => {
        const recordName = (item.fields['姓名'] || '').trim();
        return recordName.includes(name) || name.includes(recordName);
      });
    }

    // 4. 签到写入飞书表格
    await createCheckinRecord(token, name, matchedRecord ? matchedRecord.fields['座位号'] : '前排');

    // 5. 播放欢迎声音
    try {
      welcomeSound.currentTime = 0;
      welcomeSound.play().catch(e => console.log('播放声音失败'));
    } catch(e) {}

    // 6. 显示结果
    showResult(name, matchedRecord);

  } catch (error) {
    console.error('签到失败', error);
    showToast('签到失败，请重试');
  } finally {
    loading.classList.add('hidden');
    checkinBtn.disabled = false;
  }
}

// 获取飞书 access token
async function getAccessToken() {
  const response = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app_id: FEISHU_APP_ID,
      app_secret: FEISHU_APP_SECRET
    })
  });
  const data = await response.json();
  if (data.code !== 0) {
    throw new Error('获取token失败: ' + data.msg);
  }
  return data.tenant_access_token;
}

// 按姓名搜索飞书表格
async function searchByName(token, name) {
  // 使用飞书列表查询，然后前端过滤
  const url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${BITABLE_APP_TOKEN}/tables/${BITABLE_TABLE_ID}/records?page_size=100`;
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return await response.json();
}

// 创建签到记录
async function createCheckinRecord(token, name, seat) {
  const now = Date.now();
  const url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${BITABLE_APP_TOKEN}/tables/${BITABLE_TABLE_ID}/records`;
  
  const fields = {
    '姓名': name,
    '座位号': seat || '前排',
    '签到时间': now,
    '已签到': true
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ fields })
  });

  return await response.json();
}

// 显示签到结果
function showResult(name, record) {
  checkinForm.classList.add('hidden');
  checkinResult.classList.remove('hidden');

  if (record) {
    // 找到座位
    resultIcon.textContent = '🎉';
    resultTitle.textContent = `欢迎你，${name}！`;
    resultMessage.textContent = '已成功签到';
    seatInfo.classList.remove('hidden');
    seatNumber.textContent = record.fields['座位号'] || '前排';
  } else {
    // 没有找到，嘉宾
    resultIcon.textContent = '👋';
    resultTitle.textContent = `欢迎你，${name}！`;
    resultMessage.textContent = '欢迎参加 OPC 龙虾大会';
    seatInfo.classList.remove('hidden');
    seatNumber.textContent = '前排就座';
  }
}

// 显示 Toast 提示
function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black bg-opacity-80 text-white px-6 py-3 rounded-xl shadow-2xl z-50 animate-fade-in-out';
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.5s';
    setTimeout(() => toast.remove(), 500);
  }, 2000);
}

// 添加动画样式
const style = document.createElement('style');
style.textContent = `
  @keyframes fade-in-out {
    0% { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
    100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  }
  @keyframes fade-in {
    0% { opacity: 0; transform: translateY(10px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  .animate-fade-in-out {
    animation: fade-in-out 0.3s ease-out forwards;
  }
  .animate-fade-in {
    animation: fade-in 0.5s ease-out forwards;
  }
  .hidden {
    display: none !important;
  }
`;
document.head.appendChild(style);
