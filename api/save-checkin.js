// Vercel Serverless Function - 保存签到到飞书多维表格
// 前端调用 API，后端直接写入飞书表格，解决跨域问题

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

// 添加记录到飞书表格
async function addRecordToFeishu(token, name, phone, seat) {
  const url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${FEISHU_APP_TOKEN}/tables/${FEISHU_TABLE_ID}/records`;
  
  const fields = {
    '姓名': name,
    '手机号码': phone,
    '座位号': seat,
    '签到时间': Date.now(),
    '已签到': true
  };
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ fields })
  });
  
  return await response.json();
}

export default async function handler(req, res) {
  // 设置 CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, phone, seat } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ error: '缺少必填字段' });
    }

    // 获取 token
    const token = await getFeishuToken();
    if (!token) {
      return res.status(500).json({ error: '获取飞书 token 失败' });
    }

    // 添加记录
    const result = await addRecordToFeishu(token, name, phone, seat);
    
    if (result.code === 0) {
      console.log(`签到保存成功: ${name} (${phone})`);
      return res.status(200).json({ 
        success: true, 
        message: '签到已保存到飞书表格',
        record_id: result.data?.record?.id
      });
    } else {
      console.error('飞书保存失败', result);
      return res.status(500).json({ error: '保存失败', details: result });
    }

  } catch (error) {
    console.error('服务器错误', error);
    return res.status(500).json({ error: '服务器错误', details: error.message });
  }
}
