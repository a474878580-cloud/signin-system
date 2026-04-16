// Vercel Serverless Function - 获取签到记录从飞书表格

const FEISHU_APP_ID = process.env.FEISHU_APP_ID || 'cli_a954d4628ef8dcde';
const FEISHU_APP_SECRET = process.env.FEISHU_APP_SECRET || 'iV6jK7bR0LxGpl1AkIryUhMRedVrUznT';
const FEISHU_APP_TOKEN = process.env.FEISHU_APP_TOKEN || 'ME8ZbWEXZamiShslX1lcBb5un9c';
const FEISHU_TABLE_ID = process.env.FEISHU_TABLE_ID || 'tblLDOqsTrjFgJHB';

// 获取飞书 access token
async function getFeishuToken() {
  const url = 'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal';
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
}

// 获取所有记录
async function listRecordsFromFeishu(token) {
  const url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${FEISHU_APP_TOKEN}/tables/${FEISHU_TABLE_ID}/records?page_size=500`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  return await response.json();
}

export default async function handler(req, res) {
  // 设置 CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 获取 token
    const token = await getFeishuToken();
    if (!token) {
      return res.status(500).json({ error: '获取飞书 token 失败' });
    }

    // 获取记录
    const result = await listRecordsFromFeishu(token);
    
    if (result.code === 0 && result.data && result.data.items) {
      const checkins = result.data.items.map(item => {
        const fields = item.fields || {};
        return {
          name: fields['姓名'] || '',
          phone: fields['手机号码'] || fields['手机'] || '',
          seat: fields['座位号'] || '',
          time: fields['签到时间'] ? new Date(fields['签到时间']).toISOString() : new Date().toISOString()
        };
      });
      
      return res.status(200).json({ checkins });
    } else {
      console.error('获取记录失败', result);
      return res.status(500).json({ error: '获取记录失败', details: result });
    }

  } catch (error) {
    console.error('服务器错误', error);
    return res.status(500).json({ error: '服务器错误', details: error.message });
  }
}
