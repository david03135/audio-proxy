const express = require('express');
const https = require('https');
const http = require('http');

const app = express();

// רשימת התחנות לפי הסדר המבוקש
const STATIONS = {
  1: { name: 'קול חי', url: 'https://media2.93fm.co.il/live-new' },
  2: { name: 'קול חי מיוזיק', url: 'https://live.kcm.fm/livemusic' },
  3: { name: 'קול ברמה', url: 'https://cdn.cybercdn.live/Kol_Barama/Live_Audio/icecast.audio' },
  4: { name: 'קול פליי', url: 'https://cdn.cybercdn.live/Kol_Barama/Music/icecast.audio' },
  5: { name: 'גלי ישראל', url: 'https://cdn.cybercdn.live/Galei_Israel/Live/icecast.audio' },
  6: { name: 'רשת מורשת', url: 'https://playerservices.streamtheworld.com/api/livestream-redirect/KAN_MORESHET.mp3?dist=rlive' },
  7: { name: 'כאן רשת ב', url: 'https://playerservices.streamtheworld.com/api/livestream-redirect/KAN_BET.mp3?dist=rlive' }
};

// פונקציית עזר להזרמת שמע התומכת בהפניות (Redirects - קוד 301/302)
function streamAudio(targetUrl, res) {
  const client = targetUrl.startsWith('https') ? https : http;

  client.get(targetUrl, (streamRes) => {
    // אם השרת מבצע הפניה (Redirect), עקוב אחרי היעד החדש
    if (streamRes.statusCode >= 300 && streamRes.statusCode < 400 && streamRes.headers.location) {
      return streamAudio(streamRes.headers.location, res);
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-cache, no-store');
    
    streamRes.pipe(res);
  }).on('error', (err) => {
    console.error(`Stream error for ${targetUrl}:`, err.message);
    if (!res.headersSent) {
      res.status(500).send('Error streaming audio');
    }
  });
}

// ניתוב כללי עבור stream1 עד stream7
app.get('/stream:id', (req, res) => {
  const stationId = req.params.id;
  const station = STATIONS[stationId];

  if (!station) {
    return res.status(404).send('תחנה לא נמצאה');
  }

  streamAudio(station.url, res);
});

// תמיכה בנתיב המקורי /stream (מפנה לקול חי כברירת מחדל)
app.get('/stream', (req, res) => {
  streamAudio(STATIONS[1].url, res);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Proxy server is running on port ${PORT}`);
});
