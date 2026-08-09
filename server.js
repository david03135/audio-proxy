const express = require('express');
const https = require('https');
const app = express();

app.get('/stream', (req, res) => {
  // הגדרת Header עבור האודיו
  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('Cache-Control', 'no-cache, no-store');

  // פתיחת הזרם מכתובת ה-HTTPS החדשה
  https.get('https://cdn.cybercdn.live/Kol_Barama/Music/icecast.audio', (streamRes) => {
    // העברת ה-Stream ישירות לנגן
    streamRes.pipe(res);
  }).on('error', (err) => {
    console.error('Stream Error:', err);
    res.status(500).send('Error streaming audio');
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Proxy server is running on port ${PORT}`);
});