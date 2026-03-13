const https = require('https');

// Minimal valid 1x1 white JPEG
const imageData = Buffer.from(
  'FFD8FFE000104A464946000101000001000100' +
  '00FFDB00430001010101010101010101010101' +
  '01010101010101010101010101010101010101' +
  '01010101010101010101010101010101010101' +
  '0101010101010101010101010101FFC0000B08' +
  '0001000101011100FFC4001F000001050101010' +
  '1010100000000000000010203040506070809' +
  '0A0BFFC4004B10000002040203040603050603' +
  '0301000000010203041105122131130632' +
  '4107141351226 1A1B132C1D1E108234362F009' +
  '2443536482A2B2C2D2AFFC401601000301' +
  '0100000000000000000000000203FFDA0008' +
  '0101000003F003FBFFD9'.replace(/\s/g, ''),
  'hex'
);

const boundary = 'formBoundary12345678';
const header = Buffer.from(
  '--' + boundary + '\r\n' +
  'Content-Disposition: form-data; name="image"; filename="test.jpg"\r\n' +
  'Content-Type: image/jpeg\r\n\r\n'
);
const footer = Buffer.from('\r\n--' + boundary + '--\r\n');
const body = Buffer.concat([header, imageData, footer]);

const req = https.request({
  hostname: 'grocery-backend-henna.vercel.app',
  path: '/api/ocr/scan',
  method: 'POST',
  headers: {
    'Content-Type': 'multipart/form-data; boundary=' + boundary,
    'Content-Length': body.length
  }
}, (res) => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => {
    console.log('STATUS:', res.statusCode);
    try {
      const parsed = JSON.parse(data);
      console.log('RESPONSE:', JSON.stringify(parsed, null, 2));
      if (parsed.success) {
        console.log('\n✅ Google Vision API is WORKING');
        console.log('Extracted text:', parsed.extractedText || '(blank image - no text detected)');
      } else {
        console.log('\n❌ API error:', parsed.message || parsed.error);
      }
    } catch {
      console.log('RAW BODY:', data);
    }
  });
});
req.on('error', e => console.error('ERROR:', e.message));
req.write(body);
req.end();
