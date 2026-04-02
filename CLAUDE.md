# vacation-email-monitor

AI-powered email monitoring tool that checks Gmail for new emails, scores their urgency using OpenRouter LLM, and sends Telegram notifications for important ones.

## Architecture

- **Vercel serverless function** at `api/check-emails.ts` — entry point, called on a schedule
- `lib/gmail.ts` — fetches unread emails via Gmail API (OAuth2 with refresh token)
- `lib/urgency-scorer.ts` — scores email urgency 1-5 via OpenRouter, tailored to Andre's work at Clearer Thinking
- `lib/telegram-notifier.ts` — sends notifications via Telegram bot (urgent emails get special treatment)

## Deployment

- **Production URL:** https://vacation-email.vercel.app/api/check-emails?secret=9a5b3042cb72ca1ac0ea7f1efa565e72
- Deployed on Vercel
- Query param `?hours=N` controls lookback window (default: ~61 minutes)
- **Cron:** runs every hour via https://console.cron-job.org/jobs (61-min lookback ensures no gaps)

## Google OAuth

- **Redirect URI:** `http://localhost:8080`
- **Scope:** `gmail.readonly`
- OAuth consent screen must be set to "Published" (not Testing) or refresh tokens expire after 7 days

## Env Vars

All secrets are in `.env` (and mirrored in Vercel dashboard):

- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REFRESH_TOKEN` — Gmail OAuth2
- `OPENROUTER_API_KEY` — OpenRouter API for LLM urgency scoring (model: google/gemini-3-flash-preview)
- `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` — urgent notifications bot
- `TELEGRAM_BOT_TOKEN_NORMAL` / `TELEGRAM_CHAT_ID_NORMAL` — non-urgent notifications bot

## Testing

All test files live in `test/`:

- `test/check-emails.test.ts` — unit tests (mocked, no env vars needed): `npx tsx --test test/check-emails.test.ts`
- `test/run.ts` — runs the full pipeline locally (fetches Gmail, scores, notifies): `npx tsx test/run.ts [hours]`
- `test/urgency.ts` — scores a single email N times to check consistency: `npx tsx test/urgency.ts <messageId> [runs]`
- `test/telegram.ts` — sends a fake notification to verify Telegram setup: `npx tsx test/telegram.ts`
