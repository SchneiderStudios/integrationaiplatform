exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  let data;
  try {
    data = JSON.parse(event.body);
  } catch {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid JSON body' })
    };
  }

  const { name, email, telegram = '', goal = '', lang = 'de', time = '' } = data;

  if (!name || name.trim().length < 1) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Name is required' })
    };
  }

  if (!email || !email.includes('@')) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Valid email is required' })
    };
  }

  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const CHAT_ID   = process.env.TELEGRAM_CHAT_ID;

  if (!BOT_TOKEN || !CHAT_ID) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Missing env variables' })
    };
  }

  const message = `
📚 Neue Anmeldung

👤 Name: ${name}
📧 Email: ${email}
✈️ Telegram: ${telegram || '—'}
🎯 Ziel: ${goal || '—'}
🌐 Sprache: ${lang}
🕐 Zeit: ${time || '—'}
`;

  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: message
      })
    });

    const result = await res.json();

    if (!result.ok) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Telegram error' })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true })
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Network error' })
    };
  }
};
