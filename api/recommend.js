// Vercel Serverless Function — Groq API Proxy
// API key buraya değil, Vercel Environment Variables'a girilecek

export default async function handler(req, res) {
  // Sadece POST isteği kabul et
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // CORS — GitHub Pages'den istek gelebilmesi için
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt gerekli' });
  }

  // API key Vercel ortam değişkeninden okunuyor — kodda yok!
  const GROQ_API_KEY = process.env.GROQ_API_KEY;

  if (!GROQ_API_KEY) {
    return res.status(500).json({ error: 'Sunucu yapılandırma hatası' });
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'Sen deneyimli bir veteriner beslenme uzmanısın. Sokak hayvanlarının sağlıklı beslenmesi konusunda kapsamlı ve uygulanabilir öneriler veriyorsun. Yanıtların Türkçe, anlaşılır ve pratik olmalı.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1500
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return res.status(response.status).json({ error: err?.error?.message || 'API hatası' });
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content;

    if (!text) {
      return res.status(500).json({ error: 'Yapay zekadan yanıt alınamadı.' });
    }

    return res.status(200).json({ result: text });

  } catch (err) {
    return res.status(500).json({ error: err.message || 'Sunucu hatası' });
  }
}
