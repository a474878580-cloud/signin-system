// OPC 龙虾大会 - 活动签到系统 - 核心逻辑

// 数据存储
let data = {
  users: {},
  version: 1
};

// 当前日期
const today = new Date();
const todayStr = formatDate(today);

// DOM 元素
const todayDateEl = document.getElementById('today-date');
const checkinStatusEl = document.getElementById('checkin-status');
const checkinBtn = document.getElementById('checkin-btn');
const calendarEl = document.getElementById('calendar');
const totalDaysEl = document.getElementById('total-days');
const currentStreakEl = document.getElementById('current-streak');
const maxStreakEl = document.getElementById('max-streak');
const leaderboardEl = document.getElementById('leaderboard');
const checkinSoundEl = document.getElementById('checkin-sound');
const nameModalEl = document.getElementById('name-modal');
const nameInputEl = document.getElementById('name-input');
const nameSubmitEl = document.getElementById('name-submit');
const toggleListBtn = document.getElementById('toggle-list');
const checkinListEl = document.getElementById('checkin-list');
const checkinTableBodyEl = document.getElementById('checkin-table-body');

// 当前用户名
let currentUsername = localStorage.getItem('signin_username');

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
    animation: fade-in 0.3s ease-out forwards;
  }
  .hidden {
    display: none !important;
  }
`;
document.head.appendChild(style);

// 初始化
if (currentUsername) {
  nameModalEl.classList.add('hidden');
  init();
} else {
  nameModalEl.classList.remove('hidden');
}

// 提交昵称
nameSubmitEl.addEventListener('click', function() {
  const name = nameInputEl.value.trim();
  if (!name) {
    showToast('请输入昵称');
    return;
  }
  currentUsername = name;
  localStorage.setItem('signin_username', name);
  nameModalEl.classList.add('hidden');
  init();
});

// 回车提交
nameInputEl.addEventListener('keypress', function(e) {
  if (e.key === 'Enter') {
    nameSubmitEl.click();
  }
});

// 切换名单显示
toggleListBtn.addEventListener('click', function() {
  checkinListEl.classList.toggle('hidden');
  if (!checkinListEl.classList.contains('hidden')) {
    renderCheckinList();
  }
});

// 初始化
function init() {
  loadData();
  renderToday();
  renderCalendar();
  renderStats();
  renderLeaderboard();
  checkAlreadyCheckin();
  if (!checkinListEl.classList.contains('hidden')) {
    renderCheckinList();
  }
}

// 格式化日期 YYYY-MM-DD
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 加载数据
function loadData() {
  const saved = localStorage.getItem('signin_data');
  if (saved) {
    data = JSON.parse(saved);
  }
}

// 保存数据
function saveData() {
  localStorage.setItem('signin_data', JSON.stringify(data));
}

// 检查今天是否已经签到
function checkAlreadyCheckin() {
  if (!data.users[currentUsername]) {
    data.users[currentUsername] = {
      checkins: [],
      totalDays: 0,
      currentStreak: 0,
      maxStreak: 0
    };
  }

  const user = data.users[currentUsername];
  const hasChecked = user.checkins.includes(todayStr);

  if (hasChecked) {
    checkinStatusEl.textContent = '✅ 今日已签到';
    checkinBtn.disabled = true;
    checkinBtn.classList.add('opacity-50');
  } else {
    checkinStatusEl.textContent = '📝 今日未签到';
    checkinBtn.disabled = false;
    checkinBtn.classList.remove('opacity-50');
  }
}

// 签到
checkinBtn.addEventListener('click', function() {
  if (!data.users[currentUsername].checkins.includes(todayStr)) {
    data.users[currentUsername].checkins.push(todayStr);
    updateUserStats(currentUsername);
    saveData();
    
    // 播放签到成功声音
    try {
      checkinSoundEl.currentTime = 0;
      checkinSoundEl.play().catch(e => console.log('播放声音失败'));
    } catch(e) {}
    
    checkAlreadyCheckin();
    renderCalendar();
    renderStats();
    renderLeaderboard();
    
    // 刷新签到名单
    if (!checkinListEl.classList.contains('hidden')) {
      renderCheckinList();
    }
    
    // 好看的弹窗提示
    showToast('🎉 签到成功！连续签到 ' + data.users[currentUsername].currentStreak + ' 天');
  }
});

// 更新用户统计
function updateUserStats(username) {
  const user = data.users[username];
  user.totalDays = user.checkins.length;

  // 计算连续签到
  let currentStreak = 0;
  let checkDate = new Date(today);
  while (true) {
    const dateStr = formatDate(checkDate);
    if (user.checkins.includes(dateStr)) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  // 计算最大连续
  let maxStreak = 0;
  if (user.checkins.length > 0) {
    let sortedDates = user.checkins.map(d => new Date(d)).sort((a, b) => b - a);
    let tempStreak = 1;
    
    for (let i = 0; i < sortedDates.length - 1; i++) {
      let expected = new Date(sortedDates[i]);
      expected.setDate(expected.getDate() - 1);
      if (formatDate(expected) === formatDate(sortedDates[i + 1])) {
        tempStreak++;
        maxStreak = Math.max(maxStreak, tempStreak);
      } else {
        tempStreak = 1;
      }
    }
    maxStreak = Math.max(maxStreak, tempStreak);
  }

  user.currentStreak = currentStreak;
  user.maxStreak = Math.max(maxStreak, currentStreak);
}

// 渲染今日信息
function renderToday() {
  const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
  todayDateEl.textContent = today.toLocaleDateString('zh-CN', options);
}

// 渲染签到日历
function renderCalendar() {
  const year = today.getFullYear();
  const month = today.getMonth();

  // 星期标题
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
  calendarEl.innerHTML = '';

  weekDays.forEach(day => {
    const div = document.createElement('div');
    div.className = 'text-xs font-semibold text-gray-500 py-2 text-center';
    div.textContent = day;
    calendarEl.appendChild(div);
  });

  // 计算本月第一天是星期几
  const firstDay = new Date(year, month, 1);
  const firstDayWeekday = firstDay.getDay();

  // 填充前面的空格
  for (let i = 0; i < firstDayWeekday; i++) {
    const div = document.createElement('div');
    div.className = 'h-10 sm:h-8 bg-gray-50 rounded';
    calendarEl.appendChild(div);
  }

  // 填充日期
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const user = data.users[currentUsername] || { checkins: [] };

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = formatDate(new Date(year, month, day));
    const isChecked = user.checkins.includes(dateStr);
    const isToday = dateStr === todayStr;

    const div = document.createElement('div');
    div.className = [
      'h-10 sm:h-8 rounded flex items-center justify-center text-sm',
      isChecked ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400',
      isToday ? 'ring-2 ring-blue-500' : ''
    ].filter(Boolean).join(' ');
    div.textContent = day;
    calendarEl.appendChild(div);
  }
}

// 渲染统计
function renderStats() {
  const user = data.users[currentUsername] || {
    totalDays: 0,
    currentStreak: 0,
    maxStreak: 0
  };

  totalDaysEl.textContent = user.totalDays;
  currentStreakEl.textContent = user.currentStreak;
  maxStreakEl.textContent = user.maxStreak;
}

// 渲染排行榜
function renderLeaderboard() {
  // 按总签到天数排序
  const users = Object.entries(data.users)
    .sort((a, b) => b[1].totalDays - a[1].totalDays)
    .slice(0, 10);

  leaderboardEl.innerHTML = '';

  if (users.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'text-center text-gray-500 py-8';
    empty.textContent = '还没有人签到，快来成为第一个吧！';
    leaderboardEl.appendChild(empty);
    return;
  }

  users.forEach(([username, stats], index) => {
    const row = document.createElement('div');
    row.className = 'flex items-center justify-between p-3 rounded-lg ' + (index === 0 ? 'bg-yellow-50' : index === 1 ? 'bg-gray-50' : index === 2 ? 'bg-gray-50' : 'bg-white');

    const left = document.createElement('div');
    left.className = 'flex items-center gap-3';

    const rank = document.createElement('div');
    rank.className = 'w-8 h-8 flex items-center justify-center rounded-full font-bold ' + (
      index === 0 ? 'bg-yellow-400 text-white' :
      index === 1 ? 'bg-gray-300 text-gray-700' :
      index === 2 ? 'bg-amber-600 text-white' :
      'bg-gray-100 text-gray-600'
    );
    rank.textContent = index + 1;

    const name = document.createElement('div');
    name.className = 'font-medium text-gray-800';
    name.textContent = username;

    left.appendChild(rank);
    left.appendChild(name);

    const right = document.createElement('div');
    right.className = 'text-sm text-gray-500';
    right.textContent = `${stats.totalDays} 天`;

    row.appendChild(left);
    row.appendChild(right);
    leaderboardEl.appendChild(row);
  });
}

// 渲染签到名单表格（后台查看）
function renderCheckinList() {
  const users = Object.entries(data.users)
    .sort((a, b) => b[1].totalDays - a[1].totalDays);

  checkinTableBodyEl.innerHTML = '';

  if (users.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 3;
    td.className = 'text-center py-4 text-gray-500';
    td.textContent = '还没有人签到';
    tr.appendChild(td);
    checkinTableBodyEl.appendChild(tr);
    return;
  }

  users.forEach(([username, stats]) => {
    const tr = document.createElement('tr');
    tr.className = 'border-b hover:bg-gray-50';

    const nameTd = document.createElement('td');
    nameTd.className = 'py-2 px-2 text-left font-medium text-gray-800';
    nameTd.textContent = username;

    const totalTd = document.createElement('td');
    totalTd.className = 'py-2 px-2 text-right text-gray-600';
    totalTd.textContent = stats.totalDays;

    const streakTd = document.createElement('td');
    streakTd.className = 'py-2 px-2 text-right text-gray-600';
    streakTd.textContent = stats.currentStreak;

    tr.appendChild(nameTd);
    tr.appendChild(totalTd);
    tr.appendChild(streakTd);
    checkinTableBodyEl.appendChild(tr);
  });
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
