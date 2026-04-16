// Vercel Serverless Function - 获取签到数据

// 在 Vercel 后台配置环境变量 GITHUB_TOKEN
const GITHUB_OWNER = process.env.GITHUB_OWNER || 'a474878580-cloud';
const GITHUB_REPO = process.env.GITHUB_REPO || 'signin-system';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const FILE_PATH = 'data/checkins.json';

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
    // 从 GitHub 获取文件
    const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${FILE_PATH}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      // 文件不存在，返回空数组
      return res.status(200).json({ checkins: [] });
    }

    const data = await response.json();
    const content = Buffer.from(data.content, 'base64').toString();
    const checkins = JSON.parse(content);

    return res.status(200).json({ checkins });

  } catch (error) {
    console.error('获取签到数据失败', error);
    return res.status(500).json({ error: '获取失败', details: error.message });
  }
}
