import * as dotenv from 'dotenv';
dotenv.config();

import { TelegramNotifier } from '../lib/telegram-notifier';
import { EmailMessage, UrgencyScore } from '../types';

async function sendFakeUrgent() {
  const notifier = new TelegramNotifier();

  const fakeEmail: EmailMessage = {
    id: 'test-123',
    threadId: 'thread-123',
    subject: 'URGENT: Production database is on fire',
    from: 'ops-alerts@clearerthinking.org',
    body: 'This is a fake test email body.',
    receivedAt: new Date(),
  };

  const urgencyScore: UrgencyScore = {
    score: 5,
    reasoning: 'Production database alert requiring immediate action',
    summary: 'Ops team reports the production database is on fire and needs immediate attention.',
    isUrgent: true,
  };

  console.log('📨 Sending fake urgent email notification...');
  const sent = await notifier.sendEmailNotification(fakeEmail, urgencyScore);
  console.log(sent ? '✅ Sent!' : '❌ Failed');
}

sendFakeUrgent();
