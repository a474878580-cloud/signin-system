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

// 加载签到记录 - 从飞书多维表格读取
async function loadCheckins() {
  try {
    // 1. 获取飞书 access token
    const tokenResp = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_id: 'cli_a954d4628ef8dcde',
        app_secret: 'iV6jK7bR0LxGpl1AkIryUhMRedVrUznT'
      })
    });
    const tokenData = await tokenResp.json();
    const tenantAccessToken = tokenData.tenant_access_token;
    
    // 2. 读取飞书表格记录
    const url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${'ME8ZbWEXZamiShslX1lcBb5un9c'}/tables/${'tblLDOqsTrjFgH'}/records?page_size=500`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${tenantAccessToken}`
      }
    });
    
    const data = await response.json();
    let checkins = [];
    
    if (data.code === 0 && data.data && data.data.items) {
      checkins = data.data.items.map(item => {
        return {
          name: item.fields['姓名'] || '',
          phone: item.fields['手机号码'] || '',
          seat: item.fields['座位号'] || '',
          time: new Date(item.fields['签到时间']).toISOString()
        };
      });
    }
    
    renderCheckins(checkins);
    updateStats(checkins);
    resolve();
  } catch(error) {
    console.error('加载飞书记录失败', error);
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
    resolve();
  }
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
