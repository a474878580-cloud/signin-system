const qrcode = require('qrcode');
const fs = require('fs');

const url = 'https://a474878580-cloud.github.io/signin-system/admin.html';

qrcode.toFile('qrcode-admin.png', url, {
  width: 500,
  margin: 2,
  color: {
    dark: '#000000',
    light: '#ffffff'
  }
}, function (err) {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log('后台二维码已保存为 qrcode-admin.png');
  console.log('URL: ' + url);
});
