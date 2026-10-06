const express = require('express');
const https = require('https');
const http = require('http');

const app = express();

// אפשור CORS לחיבור מכל דומיין (כולל InfinityFree ודומיינים מקומיים)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// מיפוי 11 התחנות לפי סדר המספרים המבוקש
const STATIONS = {
  1: { name: 'קול חי', url: 'https://media2.93fm.co.il/live-new' },
  2: { name: 'קול חי מיוזיק', url: 'https://live.kcm.fm/livemusic' },
  3: { name: 'קול ברמה', url: 'https://cdn.cybercdn.live/Kol_Barama/Live_Audio/icecast.audio' },
  4: { name: 'קול פליי', url: 'https://cdn.cybercdn.live/Kol_Barama/Music/icecast.audio' },
  5: { name: 'גלי ישראל', url: 'https://cdn.cybercdn.live/Galei_Israel/Live/icecast.audio' },
  6: { name: 'רשת מורשת', url: 'https://playerservices.streamtheworld.com/api/livestream-redirect/KAN_MORESHET.mp3?dist=rlive' },
  7: { name: 'ערוץ 2000', url: 'https://cdn.cybercdn.live/Radio2000/MP3/icecast.audio' },
  8: { name: 'רשת ב', url: 'https://playerservices.streamtheworld.com/api/livestream-redirect/KAN_BET.mp3?dist=rlive' },
  9: { name: 'גלי צהל', url: 'https://glzwizzlv.bynetcdn.com/glz_mp3' },
  10: { name: 'רשת ג', url: 'https://playerservices.streamtheworld.com/api/livestream-redirect/KAN_GIMMEL.mp3?dist=rlive' },
  11: { name: 'גלגלצ', url: 'https://glzwizzlv.bynetcdn.com/glglz_mp3' }
};

/**
 * פונקציה להזרמת שמע מהמקור ללקוח כולל תמיכה בהפניות (Redirects)
 * וניתוק המקור בעת סגירת החיבור מצד המאזין
 */
function streamAudio(targetUrl, res, redirectDepth = 0) {
  if (redirectDepth > 5) {
    if (!res.headersSent) {
      res.status(502).send('Error: Too many redirects');
    }
    return;
  }

  const client = targetUrl.startsWith('https') ? https : http;

  const upstreamRequest = client.get(targetUrl, (upstreamResponse) => {
    // טיפול בהפניות (קוד 301, 302, 307, 308)
    if (
      upstreamResponse.statusCode >= 300 &&
      upstreamResponse.statusCode < 400 &&
      upstreamResponse.headers.location
    ) {
      const redirectUrl = new URL(upstreamResponse.headers.location, targetUrl).href;
      return streamAudio(redirectUrl, res, redirectDepth + 1);
    }

    // הגדרת כותרות שמע סטנדרטיות
    res.setHeader('Content-Type', upstreamResponse.headers['content-type'] || 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // הזרמת הנתונים ללקוח
    upstreamResponse.pipe(res);
  });

  upstreamRequest.on('error', (err) => {
    console.error(`Stream error for [${targetUrl}]:`, err.message);
    if (!res.headersSent) {
      res.status(500).send('Error streaming audio');
    }
  });

  // ניקוי המשאבים ברגע שהלקוח מתנתק או עובר תחנה
  res.on('close', () => {
    upstreamRequest.destroy();
  });
}

// נתיב ראשי /status לבדיקת בריאות השרת
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    stationsAvailable: Object.keys(STATIONS).map(id => ({
      id,
      name: STATIONS[id].name,
      endpoint: `/stream${id}`
    }))
  });
});

// ניתוב דינמי עבור stream1 עד stream7
app.get('/stream:id', (req, res) => {
  const stationId = req.params.id;
  const station = STATIONS[stationId];

  if (!station) {
    return res.status(404).send('תחנה לא נמצאה במערכת');
  }

  streamAudio(station.url, res);
});

// תמיכה בנתיב /stream הכללי (מפנה לקול חי כברירת מחדל)
app.get('/stream', (req, res) => {
  streamAudio(STATIONS[1].url, res);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Audio proxy server is running on port ${PORT}`);
});
