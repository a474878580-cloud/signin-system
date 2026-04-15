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

// 加载签到记录
function loadCheckins() {
  return new Promise((resolve) => {
    // 从 localStorage 读取
    const saved = localStorage.getItem('signin_checkins');
    let checkins = [];
    
    if (saved) {
      try {
        checkins = JSON.parse(saved);
      } catch(e) {
        checkins = [];
      }
    }
    
    renderCheckins(checkins);
    updateStats(checkins);
    resolve();
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
  const todayCount = checkins.filter(c => 
    new Date(c.time).toDateString() === today
  ).length;
  
  todayCountEl.textContent = todayCount;
}
