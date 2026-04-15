const qrcode = require('qrcode');
const fs = require('fs');

const url = 'https://a474878580-cloud.github.io/signin-system/';

qrcode.toFile('qrcode.png', url, {
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
  console.log('二维码已保存为 qrcode.png');
  console.log('URL: ' + url);
});
