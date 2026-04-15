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
    
    // 3. 保存签到记录
    await saveCheckin(name, phone, seat);
    
    // 4. 播放欢迎声音
    try {
      welcomeSound.currentTime = 0;
      welcomeSound.play().catch(e => console.log('播放声音失败'));
    } catch(e) {}
    
    // 5. 显示结果
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

// 保存签到记录
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
  checkins.push({
    name: name,
    phone: phone,
    seat: seat,
    time: new Date().toISOString()
  });
  
  // 保存到 localStorage
  localStorage.setItem('signin_checkins', JSON.stringify(checkins));
  
  return Promise.resolve();
}

// 显示签到结果
function showResult(name, seat, isRegistered) {
  checkinForm.classList.add('hidden');
  checkinResult.classList.remove('hidden');

  resultIcon.textContent = '🎉';
  resultTitle.textContent = `欢迎你，${name}！`;
  
  if (isRegistered) {
    resultMessage.textContent = '已成功签到，enjoy the lobster!';
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
