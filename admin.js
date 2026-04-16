// OPC 龙虾大会 - 后台管理

// DOM
const totalCountEl = document.getElementById('total-count');
const todayCountEl = document.getElementById('today-count');
const guestCountEl = document.getElementById('guest-count');
const checkinTableBody = document.getElementById('checkin-table-body');
const guestTableBody = document.getElementById('guest-table-body');
const emptyMessage = document.getElementById('empty-message');
const refreshBtn = document.getElementById('refresh-btn');

// 刷新按钮
refreshBtn.addEventListener('click', loadData);

// 页面加载
document.addEventListener('DOMContentLoaded', loadData);

// 加载所有数据
async function loadData() {
  await loadGuests();
  await loadCheckins();
  updateStats();
}

// 加载嘉宾名单
async function loadGuests() {
  try {
    const response = await fetch('data/guests.json?t=' + Date.now());
    const data = await response.json();
    const guests = data.guests || [];
    
    guestCountEl.textContent = guests.length;
    guestTableBody.innerHTML = '';
    
    guests.forEach(guest => {
      const tr = document.createElement('tr');
      tr.className = 'border-b hover:bg-gray-50';
      tr.innerHTML = `
        <td class="py-3 px-2 text-gray-800 font-medium">${guest.name}</td>
        <td class="py-3 px-2 text-gray-600">${guest.seat}</td>
      `;
      guestTableBody.appendChild(tr);
    });
    
  } catch (error) {
    console.error('加载嘉宾失败', error);
  }
}

// 加载签到记录 - 从 Vercel API 获取
// Vercel API 从 GitHub JSON 读取，永远是最新数据
async function loadCheckins() {
  return new Promise(async (resolve) => {
    try {
      // 获取 Vercel API 地址
      const getApiBase = () => {
        if (window.location.host.includes('localhost')) {
          return 'http://localhost:3000';
        }
        return `https://${window.location.host}`;
      };
      const apiBase = getApiBase();
      
      // 从 API 获取最新数据
      const response = await fetch(`${apiBase}/api/get-checkins`);
      let checkins = [];
      
      if (response.ok) {
        const data = await response.json();
        checkins = data.checkins || [];
        console.log('从 API 加载了', checkins.length, '条签到记录');
      } else {
        console.log('API 请求失败，回退到直接读取 JSON');
        // 回退到直接读取
        const base = window.location.pathname.endsWith('/') ? window.location.pathname : window.location.pathname + '/';
        const url = base + 'data/checkins.json?t=' + Date.now();
        const jsonResponse = await fetch(url);
        if (jsonResponse.ok) {
          checkins = await jsonResponse.json();
        }
      }
      
      // 同时合并 localStorage 中未提交的记录
      const saved = localStorage.getItem('signin_checkins');
      if (saved) {
        try {
          const localCheckins = JSON.parse(saved);
          // 合并去重（按手机号去重）
          localCheckins.forEach(local => {
            const exists = checkins.find(c => c.phone === local.phone && c.name === local.name);
            if (!exists) {
              checkins.push(local);
            }
          });
        } catch(e) {
          console.error('解析本地记录失败', e);
        }
      }
      
      renderCheckins(checkins);
      updateStats(checkins);
      resolve(checkins);
    } catch(error) {
      console.error('加载记录失败，使用本地缓存', error);
      // fallback to localStorage
      let checkins = [];
      const saved = localStorage.getItem('signin_checkins');
      if (saved) {
        try {
          checkins = JSON.parse(saved);
        } catch(e) {
          checkins = [];
        }
      }
      renderCheckins(checkins);
      updateStats(checkins);
      resolve(checkins);
    }
  });
}

// 渲染签到表格
function renderCheckins(checkins) {
  checkinTableBody.innerHTML = '';
  
  if (checkins.length === 0) {
    emptyMessage.classList.remove('hidden');
    return;
  }
  
  emptyMessage.classList.add('hidden');
  
  // 按时间倒序排列
  checkins.sort((a, b) => new Date(b.time) - new Date(a.time));
  
  checkins.forEach(checkin => {
    const tr = document.createElement('tr');
    tr.className = 'border-b hover:bg-gray-50';
    
    const time = new Date(checkin.time);
    const formattedTime = time.toLocaleString('zh-CN');
    const phone = checkin.phone || '-';
    
    tr.innerHTML = `
      <td class="py-3 px-2 text-gray-800 font-medium">${checkin.name}</td>
      <td class="py-3 px-2 text-gray-600">${phone}</td>
      <td class="py-3 px-2 text-gray-600">${checkin.seat}</td>
      <td class="py-3 px-2 text-gray-600 text-sm">${formattedTime}</td>
    `;
    
    checkinTableBody.appendChild(tr);
  });
}

// 更新统计
function updateStats(checkins = []) {
  totalCountEl.textContent = checkins.length;
  
  // 今日签到
  const today = new Date().toDateString();
  const todayCount = checkins.filter(c => {
    const checkinDate = new Date(c.time);
    return checkinDate.toDateString() === today;
  }).length;
  
  todayCountEl.textContent = todayCount;
}
