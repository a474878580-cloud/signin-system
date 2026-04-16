// OPC 龙虾大会 - 活动签到系统
// 纯前端 JSON 存储，无跨域问题

// 全局变量
let guests = [];

// DOM 元素
const checkinForm = document.getElementById('checkin-form');
const checkinResult = document.getElementById('checkin-result');
const nameInput = document.getElementById('name-input');
const phoneInput = document.getElementById('phone-input');
const checkinBtn = document.getElementById('checkin-btn');
const loading = document.getElementById('loading');
const resultIcon = document.getElementById('result-icon');
const resultTitle = document.getElementById('result-title');
const resultMessage = document.getElementById('result-message');
const seatInfo = document.getElementById('seat-info');
const seatNumber = document.getElementById('seat-number');
const backBtn = document.getElementById('back-btn');
const welcomeSound = document.getElementById('welcome-sound');

// 初始化：加载嘉宾名单
document.addEventListener('DOMContentLoaded', function() {
  loadGuests();
});

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

// 加载嘉宾名单
async function loadGuests() {
  try {
    const base = window.location.pathname.endsWith('/') ? window.location.pathname : window.location.pathname + '/';
    const url = base + 'data/guests.json?t=' + Date.now();
    const response = await fetch(url);
    const data = await response.json();
    guests = data.guests || [];
  } catch (error) {
    console.error('加载嘉宾名单失败', error);
    guests = [];
    showToast('加载嘉宾名单加载失败');
  }
}

// 主签到流程
async function doCheckin() {
  const name = nameInput.value.trim();
  const phone = phoneInput.value.trim();
  
  if (!name) {
    showToast('请输入姓名');
    return;
  }
  if (!phone) {
    showToast('请输入手机号码');
    return;
  }

  loading.classList.remove('hidden');
  checkinBtn.disabled = true;

  try {
    // 1. 查找嘉宾
    const guest = findGuest(name);
    
    // 2. 获取座位
    const seat = guest ? guest.seat : '前排';
    
    // 3. 保存签到记录（即使飞书失败，本地保存也会继续）
    try {
      await saveCheckin(name, phone, seat);
    } catch(saveError) {
      console.error('保存到飞书失败，但本地已保存', saveError);
    }
    
    // 4. 语音欢迎，说出欢迎语（优雅语速）
    try {
      const greeting = `${name}，欢迎签到成功，我会永远记住你的`;
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(greeting);
        utterance.lang = 'zh-CN';
        utterance.rate = 0.8; // 放慢语速更优雅
        utterance.pitch = 1.1; // 稍微升高一点音调更亲切
        utterance.volume = 1.0;
        window.speechSynthesis.speak(utterance);
      }
    } catch(e) {
      console.log('语音合成异常', e);
    }
    
    // 5. 播放签到成功提示音
    try {
      welcomeSound.currentTime = 0;
      // 用户交互后才能播放音频，不await避免卡住
      welcomeSound.play().catch(e => console.log('播放提示音失败', e));
    } catch(e) {
      console.log('播放提示音失败', e);
    }
    
    // 6. 显示结果
    showResult(name, seat, !!guest);

  } catch (error) {
    console.error('签到失败', error);
    showToast('签到失败，请重试');
  } finally {
    loading.classList.add('hidden');
    checkinBtn.disabled = false;
  }
}

// 查找嘉宾（模糊匹配）
function findGuest(name) {
  name = name.trim();
  // 精确匹配
  let found = guests.find(g => g.name.trim() === name);
  if (found) return found;
  // 模糊匹配
  found = guests.find(g => g.name.includes(name) || name.includes(g.name));
  return found || null;
}

// 保存签到记录 - 同时保存到 localStorage + 飞书表格
async function saveCheckin(name, phone, seat) {
  // 读取现有签到
  let checkins = [];
  try {
    const savedLocal = localStorage.getItem('signin_checkins');
    if (savedLocal) {
      const data = JSON.parse(savedLocal);
      checkins = Array.isArray(data) ? data : [];
    }
  } catch(e) {
    checkins = [];
  }
  
  // 添加新签到
  const newCheckin = {
    name: name,
    phone: phone,
    seat: seat,
    time: new Date().toISOString()
  };
  checkins.push(newCheckin);
  
  // 保存到 localStorage
  localStorage.setItem('signin_checkins', JSON.stringify(checkins));
  
  // 保存到飞书多维表格
  await saveCheckinToFeishu(name, phone, seat);
  
  return Promise.resolve();
}

// 保存签到到飞书多维表格
// 最简单可靠的方案：飞书机器人 Webhook + 自动化规则
// 完全绕过跨域问题，永久稳定
async function saveCheckinToFeishu(name, phone, seat) {
  try {
    // ========== 需要你在这里配置你的飞书机器人 Webhook ==========
    // 获取方法：
    // 1. 在飞书创建一个群
    // 2. 添加群机器人 → 获取 Webhook 地址，类似：
    //    https://open.feishu.cn/open-apis/bot/v2/hook/abcdef123456
    // 3. 在飞书群机器人设置添加「自动化」→ 选择「飞书多维表格」
    //    → 当收到消息时，自动添加一条记录到你的签到表格
    const WEBHOOK_URL = ''; // 留空则只保存到本地
    // ==============================================================

    // 如果没有配置 Webhook，直接返回，不影响签到
    if (!WEBHOOK_URL || WEBHOOK_URL.trim() === '') {
      console.log('未配置飞书机器人 Webhook，签到数据仅保存在本地');
      return Promise.resolve({ skipped: true });
    }

    // 使用 no-cors 模式发送，不等待响应
    // 这样不会卡住签到流程
    const payload = {
      msg_type: 'text',
      content: {
        text: `【新签到】\n姓名：${name}\n手机：${phone}\n座位：${seat}\n时间：${new Date().toLocaleString('zh-CN')}`
      }
    };

    // 使用 Image 方式跨域请求，不阻塞
    // 这种方式最可靠，永远不会卡住页面
    const img = new Image();
    const callback = `cb${Date.now()}${Math.floor(Math.random() * 1000)}`;
    img.src = `${WEBHOOK_URL}?callback=${callback}&data=${encodeURIComponent(JSON.stringify(payload))}`;
    img.style.display = 'none';
    document.body.appendChild(img);
    setTimeout(() => {
      document.body.removeChild(img);
    }, 1000);

    console.log('签到信息已发送到飞书');
    return Promise.resolve({ success: true });
    
  } catch(error) {
    console.error('发送到飞书失败，数据已保存在本地', error);
    return Promise.resolve({ error: error.message });
  }
}

// 即使飞书发送失败，本地签到依然正常工作，不会卡住

// 显示签到结果
function showResult(name, seat, isRegistered) {
  checkinForm.classList.add('hidden');
  checkinResult.classList.remove('hidden');

  resultIcon.textContent = '🎉';
  resultTitle.textContent = `欢迎你，${name}！`;
  
  if (isRegistered) {
    resultMessage.textContent = '已成功签到';
  } else {
    resultMessage.textContent = '欢迎参加 OPC 龙虾大会';
  }
  
  seatInfo.classList.remove('hidden');
  seatNumber.textContent = seat;
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
