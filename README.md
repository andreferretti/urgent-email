# Urgent Email

A small AI tool I built for myself: it watches my Gmail inbox and pings me on Telegram only when something actually urgent comes in, so I can ignore email when I'm not working.

## How it works

1. A cron job hits a Vercel serverless endpoint every hour.
2. The endpoint fetches unread emails from Gmail (last ~61 min).
3. Each email is scored 1–5 for urgency by an LLM (Gemini 3.0 Flash via OpenRouter), with a prompt tuned to my specific work context.
4. Urgent emails (score ≥ 4) send me a notification via a Telegram bot; the rest go to a Telegram bot I muted (i.e., archived) just so I have the logs of all emails.

## Stack

- Vercel serverless function (TypeScript)
- Gmail API (OAuth2 refresh token)
- OpenRouter → Gemini 3.0 Flash for scoring
- Two Telegram bots (urgent vs. normal)
- cron-job.org for the hourly trigger

## Layout

- `api/check-emails.ts` — entry point
- `lib/gmail.ts` — Gmail fetch
- `lib/urgency-scorer.ts` — LLM scoring + prompt
- `lib/telegram-notifier.ts` — notification routing
- `test/` — unit tests and local runners

## Setup

Copy `.env.example` to `.env` and fill it in as you go.

### 1. Gmail OAuth (client ID, secret, refresh token)

1. Go to the [Google Cloud Console](https://console.cloud.google.com/), create (or pick) a project, and enable the **Gmail API**.
2. Under **APIs & Services → Credentials**, create an **OAuth client ID** of type *Web application*. Add `https://developers.google.com/oauthplayground` as an authorized redirect URI. Click "create", then copy the client ID and secret into `.env`.
3. In the left-hand menu, go to **OAuth consent screen** -> **Audience** and publish it (if you leave it in Testing, refresh tokens expire after 7 days).
4. Open the [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/) → gear icon → check **Use your own OAuth credentials** and paste in the client ID/secret.
5. In the scope list (step 1), input `https://www.googleapis.com/auth/gmail.readonly` inside the "Input your own scopes" box, click **Authorize APIs**, sign in, then **Exchange authorization code for tokens**. Copy the **refresh token** into `.env`.

### 2. OpenRouter API key

Sign up at [openrouter.ai](https://openrouter.ai/), create a key, and add it as `OPENROUTER_API_KEY`. Top up a few dollars of credit. An alternative is calling the Gemini API directly, but you would have to tweak the project code for that.

### 3. Cron secret

The serverless endpoint is a public URL, so anyone who guesses or stumbles on it could hit it and burn your OpenRouter credits (or just spam your Telegram). To prevent that, the endpoint requires a `?secret=...` query parameter and rejects any request where it doesn't match `CRON_SECRET`. The cron job (and you, when testing) append the secret; nobody else knows it.

You can generate a random one with the following command. Then, put it in `.env`:

```
openssl rand -hex 16
```

### 4. Telegram bots

You need two bots (one "loud" for urgent, one quieter for everything else).

For each bot:

1. Open Telegram, message **@BotFather**, send `/newbot`, and follow the prompts. Copy the token it gives you.
2. Start a chat with your new bot and send it any message.
3. Visit `https://api.telegram.org/bot<TOKEN>/getUpdates` in a browser and find the `chat.id` field in the JSON. That's your chat ID.

Fill in `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` (urgent) and `TELEGRAM_BOT_TOKEN_NORMAL` / `TELEGRAM_CHAT_ID_NORMAL` (normal).

## Running locally

```
npm install
npx tsx test/run.ts    # runs the full pipeline once
```

## Tuning the urgency prompt

The prompt that tells Gemini what counts as urgent lives in `lib/urgency-scorer.ts` (the `prompt` variable near the top). It's tuned to my specific work context — edit it to match yours.
