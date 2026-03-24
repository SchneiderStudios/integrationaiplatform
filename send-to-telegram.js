/**
 * netlify/functions/send-to-telegram.js
 *
 * Endpoint: /.netlify/functions/send-to-telegram
 * Method:   POST
 * Body:     { name, email, telegram?, goal?, lang? }
 *
 * Required environment variables (Netlify Dashboard → Site settings → Environment variables):
 *   TELEGRAM_BOT_TOKEN  — Bot token from @BotFather
 *   TELEGRAM_CHAT_ID    — Target chat / channel ID
 *
 * NOTE: Time is set server-side. Never trust or use time from the frontend.
 * NOTE: This function never exposes env variables to the client.
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MAX_LENGTH = {
  name:     120,
  email:    200,
  telegram: 100,
  goal:     1000,
};

// ── helpers ──────────────────────────────────────────────────────────────────

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

function sanitize(value, maxLen) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLen);
}

// ── handler ──────────────────────────────────────────────────────────────────

exports.handler = async function (event) {

  // 1. Method check
  if (event.httpMethod !== 'POST') {
    return json(405, { ok: false, error: 'Method not allowed. Use POST.' });
  }

  // 2. Parse body
  let raw;
  try {
    raw = JSON.parse(event.body);
  } catch {
    return json(400, { ok: false, error: 'Invalid JSON body.' });
  }

  // 3. Sanitize all fields
  const name     = sanitize(raw.name,     MAX_LENGTH.name);
  const email    = sanitize(raw.email,    MAX_LENGTH.email);
  const telegram = sanitize(raw.telegram, MAX_LENGTH.telegram);
  const goal     = sanitize(raw.goal,     MAX_LENGTH.goal);
  const lang     = raw.lang === 'ru' ? 'RU' : 'DE';

  // 4. Validate required fields
  if (!name) {
    return json(400, { ok: false, error: 'Name is required.' });
  }
  if (!email) {
    return json(400, { ok: false, error: 'Email is required.' });
  }
  if (!EMAIL_REGEX.test(email)) {
    return json(400, { ok: false, error: 'Invalid email address.' });
  }

  // 5. Check environment variables
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const CHAT_ID   = process.env.TELEGRAM_CHAT_ID;

  if (!BOT_TOKEN || !CHAT_ID) {
    console.error('[send-to-telegram] Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID');
    return json(500, { ok: false, error: 'Server configuration error.' });
  }

  // 6. Set time server-side (never trust client time)
  const time = new Date().toISOString();

  // 7. Build plain text message (no Markdown, no parse_mode)
  const message = [
    'Neue Kurs-Anmeldung',
    '',
    `Name:     ${name}`,
    `E-Mail:   ${email}`,
    `Telegram: ${telegram || '—'}`,
    `Ziel:     ${goal     || '—'}`,
    `Sprache:  ${lang}`,
    `Zeit:     ${time}`,
  ].join('\n');

  // 8. Send to Telegram Bot API
  const telegramUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

  try {
    const response = await fetch(telegramUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text:    message,
        // parse_mode intentionally omitted — plain text only
      }),
    });

    const result = await response.json();

    if (!result.ok) {
      console.error('[send-to-telegram] Telegram API error:', result.description);
      return json(502, { ok: false, error: 'Failed to deliver notification.' });
    }

    return json(200, { ok: true, message: 'Sent successfully.' });

  } catch (err) {
    console.error('[send-to-telegram] Network error:', err.message);
    return json(502, { ok: false, error: 'Network error while contacting Telegram.' });
  }
};
