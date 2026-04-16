// Vercel Serverless Function - 保存签到数据到 GitHub
// 这样解决了前端跨域问题，token 也不会暴露在前端

// 在 Vercel 后台配置环境变量 GITHUB_TOKEN
const GITHUB_OWNER = process.env.GITHUB_OWNER || 'a474878580-cloud';
const GITHUB_REPO = process.env.GITHUB_REPO || 'signin-system';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const FILE_PATH = 'data/checkins.json';

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

    // 1. 获取现有文件
    const getUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${FILE_PATH}`;
    const getResponse = await fetch(getUrl, {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    let checkins = [];
    let sha = null;

    if (getResponse.ok) {
      const data = await getResponse.json();
      sha = data.sha;
      const content = Buffer.from(data.content, 'base64').toString();
      checkins = JSON.parse(content);
    }

    // 2. 添加新签到
    checkins.push({
      name,
      phone,
      seat,
      time: new Date().toISOString()
    });

    // 3. 提交更新到 GitHub
    const contentStr = JSON.stringify(checkins, null, 2);
    const contentBase64 = Buffer.from(contentStr).toString('base64');

    const putBody = {
      message: `Add checkin: ${name} - ${new Date().toLocaleString('zh-CN')}`,
      content: contentBase64
    };

    if (sha) {
      putBody.sha = sha;
    }

    const putResponse = await fetch(getUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(putBody)
    });

    const result = await putResponse.json();

    if (putResponse.ok) {
      console.log(`签到保存成功: ${name}`);
      return res.status(200).json({ 
        success: true, 
        message: '签到已保存',
        count: checkins.length 
      });
    } else {
      console.error('GitHub 更新失败', result);
      return res.status(500).json({ error: 'GitHub 更新失败', details: result });
    }

  } catch (error) {
    console.error('服务器错误', error);
    return res.status(500).json({ error: '服务器错误', details: error.message });
  }
}
