// OPC 龙虾大会 - 后台管理
// 数据从飞书表格读取

// ========== 配置 ==========
const FEISHU_APP_ID = 'cli_a954d4628ef8dcde';
const FEISHU_APP_SECRET = 'iV6jK7bR0LxGpl1AkIryUhMRedVrUznT';
const FEISHU_APP_TOKEN = 'ME8ZbWEXZamiShslX1lcBb5un9c';
const FEISHU_TABLE_ID = 'tblLDOqsTrjFgJHB';
// ========== 配置结束 ==========

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

// 获取飞书 token
async function getFeishuToken() {
  try {
    const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
    const url = proxyUrl + 'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal';
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_id: FEISHU_APP_ID,
        app_secret: FEISHU_APP_SECRET
      })
    });
    
    const data = await response.json();
    return data.tenant_access_token;
  } catch(e) {
    console.error('获取飞书 token 失败', e);
    return null;
  }
}

// 加载所有数据
async function loadData() {
  refreshBtn.disabled = true;
  refreshBtn.textContent = '加载中...';
  
  await loadGuests();
  await loadCheckins();
  updateStats();
  
  refreshBtn.disabled = false;
  refreshBtn.textContent = '🔄 刷新';
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
  return new Promise(async (resolve) => {
    try {
      const token = await getFeishuToken();
      if (!token) {
        throw new Error('获取飞书 token 失败');
      }
      
      const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
      const url = proxyUrl + `https://open.feishu.cn/open-apis/bitable/v1/apps/${FEISHU_APP_TOKEN}/tables/${FEISHU_TABLE_ID}/records?page_size=500`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      let checkins = [];
      
      if (data.code === 0 && data.data && data.data.items) {
        checkins = data.data.items.map(item => {
          const fields = item.fields || {};
          return {
            name: fields['姓名'] || '',
            phone: fields['手机号码'] || fields['手机'] || '',
            seat: fields['座位号'] || '',
            time: fields['签到时间'] ? new Date(fields['签到时间']).toISOString() : new Date().toISOString()
          };
        });
        console.log('从飞书表格加载了', checkins.length, '条签到记录');
      }
      
      // 合并本地记录
      const saved = localStorage.getItem('signin_checkins');
      if (saved) {
        try {
          const localCheckins = JSON.parse(saved);
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
      console.error('加载飞书记录失败，使用本地缓存', error);
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
