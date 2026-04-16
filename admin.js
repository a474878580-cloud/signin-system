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
  // 同步本地未提交的签到到 GitHub
  await syncLocalToGitHub();
  updateStats();
}

// 同步本地 localStorage 中未提交的签到到 GitHub
async function syncLocalToGitHub() {
  try {
    // 读取本地签到
    let localCheckins = [];
    const saved = localStorage.getItem('signin_checkins');
    if (saved) {
      localCheckins = JSON.parse(saved);
    }
    
    if (localCheckins.length === 0) {
      return;
    }
    
    console.log('发现', localCheckins.length, '条本地签到，正在同步到 GitHub...');
    
    // 使用 GitHub API 合并签到
    // 这里我们通过 repository_dispatch 触发 GitHub Actions
    const GITHUB_OWNER = 'a474878580-cloud';
    const GITHUB_REPO = 'signin-system';
    
    // 使用图片请求方式，不卡住页面
    const img = new Image();
    const data = encodeURIComponent(JSON.stringify({
      event_type: 'sync-checkins',
      client_payload: {
        checkins: localCheckins
      }
    }));
    
    img.src = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/dispatches?data=${data}&t=${Date.now()}`;
    img.style.display = 'none';
    document.body.appendChild(img);
    
    setTimeout(() => {
      document.body.removeChild(img);
      // 清空本地，因为已经提交
      localStorage.removeItem('signin_checkins');
      console.log('✓ 本地签到已同步到 GitHub');
      showToast('本地签到已同步，刷新查看最新数据');
    }, 1000);
    
  } catch(error) {
    console.error('同步本地签到失败', error);
  }
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

// 加载签到记录 - 直接从 GitHub Pages 读取 JSON
// GitHub Pages 国内访问稳定，永远是最新数据
async function loadCheckins() {
  return new Promise(async (resolve) => {
    try {
      // 直接读取 data/checkins.json 文件
      // 添加时间戳绕过缓存，确保拿到最新数据
      const base = window.location.pathname.endsWith('/') ? window.location.pathname : window.location.pathname + '/';
      const url = base + 'data/checkins.json?t=' + Date.now();
      
      const response = await fetch(url);
      let checkins = [];
      
      if (response.ok) {
        checkins = await response.json();
        console.log('从 data/checkins.json 加载了', checkins.length, '条签到记录');
      } else {
        console.log('data/checkins.json 不存在或加载失败，使用本地缓存');
        checkins = [];
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
