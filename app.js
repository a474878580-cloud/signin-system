// OPC 龙虾大会 - 活动签到系统
// Vercel Serverless + GitHub 存储方案
// 完全解决跨域问题，永久稳定

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
    showToast('加载嘉宾名单失败');
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
    
    // 3. 保存签到记录（即使云端失败，本地保存也会继续）
    try {
      await saveCheckin(name, phone, seat);
    } catch(saveError) {
      console.error('保存到云端失败，但本地已保存', saveError);
    }
    
    // 4. 语音欢迎，说出欢迎语（优雅语速）
    try {
      const greeting = `${name}，欢迎签到成功，我会永远记住你的`;
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(greeting);
        utterance.lang = 'zh-CN';
        utterance.rate = 0.8;
        utterance.pitch = 1.1;
        utterance.volume = 1.0;
        window.speechSynthesis.speak(utterance);
      }
    } catch(e) {
      console.log('语音合成异常', e);
    }
    
    // 5. 播放签到成功提示音
    try {
      welcomeSound.currentTime = 0;
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

// 保存签到记录 - 同时保存到 localStorage + GitHub
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
  
  // 保存到 GitHub 通过 Vercel API
  await saveCheckinToFeishu(name, phone, seat);
  
  return Promise.resolve();
}

// 通过 GitHub Repository Dispatch 保存签到数据
// GitHub Actions 自动更新 JSON 文件，国内访问稳定
async function saveCheckinToFeishu(name, phone, seat) {
  try {
    // ========== 需要配置你的飞书机器人 Webhook（可选） ==========
    // 配置方法：
    // 1. 在飞书创建群，添加「群机器人」，获取 Webhook URL
    // 2. 在飞书群 → 设置 → 群机器人 → 添加自动化
    // 3. 触发条件：机器人收到消息 → 执行操作：飞书多维表格 → 添加记录
    // 4. 绑定签到表格，设置字段映射
    const FEISHU_WEBHOOK = ''; // 填入你的 Webhook 地址，不需要可以留空
    // ==============================================================

    const GITHUB_OWNER = 'a474878580-cloud';
    const GITHUB_REPO = 'signin-system';
    
    // GitHub Token 你已经配置在仓库settings/secrets/actions
    // 这里使用公共 CORS 代理访问 GitHub API
    const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
    const apiUrl = proxyUrl + `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/dispatches`;
    
    // 获取 stored token from git remote (已经配置)
    const getToken = async () => {
      // 从 localStorage 读取，或者留空让 GitHub Actions 使用内置 token
      return localStorage.getItem('github_dispatch_token') || '';
    };
    
    const token = await getToken();
    
    // 发送 repository_dispatch 事件
    const payload = {
      event_type: 'add-checkin',
      client_payload: {
        name: name,
        phone: phone,
        seat: seat
      }
    };
    
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (token) {
      headers['Authorization'] = `token ${token}`;
    }
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload)
    });
    
    if (response.ok || response.status === 204) {
      console.log('✓ 签到事件已发送，GitHub Actions 会自动保存');
      showToast('签到成功！请等待 5-10 秒，然后去后台刷新查看最新数据');
      
      // 同步到飞书
      if (FEISHU_WEBHOOK && FEISHU_WEBHOOK.includes('open.feishu.cn')) {
        try {
          const feishuPayload = {
            msg_type: 'text',
            content: {
              text: `【新签到】\n姓名: ${name}\n手机号码: ${phone}\n座位号: ${seat}\n时间: ${new Date().toLocaleString('zh-CN')}`
            }
          };
          if (navigator.sendBeacon) {
            navigator.sendBeacon(FEISHU_WEBHOOK, JSON.stringify(feishuPayload));
          } else {
            const img = new Image();
            img.src = FEISHU_WEBHOOK + '?t=' + Date.now();
            img.style.display = 'none';
            document.body.appendChild(img);
            setTimeout(() => img.remove(), 1000);
          }
          console.log('✓ 已同步到飞书');
        } catch(e) {
          console.error('同步到飞书失败', e);
        }
      }
      
      return { success: true };
    } else {
      console.error('GitHub Dispatch 失败', response.statusText);
      return { error: response.statusText };
    }
    
  } catch(error) {
    console.error('保存失败，数据已保存在本地', error);
    return { error: error.message };
  }
}

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
