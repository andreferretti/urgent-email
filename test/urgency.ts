import * as dotenv from 'dotenv';
dotenv.config();

import { GmailService } from '../lib/gmail';
import { UrgencyScorer } from '../lib/urgency-scorer';

async function main() {
  const messageId = process.argv[2];
  const runs = parseInt(process.argv[3] || '3');

  if (!messageId) {
    console.error('Usage: npx tsx test/urgency.ts <messageId> [runs]');
    process.exit(1);
  }

  const gmail = new GmailService();
  const email = await gmail.getEmailDetails(messageId);

  if (!email) {
    console.error('Could not fetch email');
    process.exit(1);
  }

  console.log(`Subject: ${email.subject}`);
  console.log(`From: ${email.from}`);
  console.log(`Body (${email.body.length} chars): ${email.body.substring(0, 100)}...`);
  console.log(`---`);

  const scorer = new UrgencyScorer();
  const results = [];

  for (let i = 0; i < runs; i++) {
    const result = await scorer.scoreEmail(email);
    results.push(result);
    console.log(`Run ${i + 1}: score=${result.score} urgent=${result.isUrgent} reason="${result.reasoning}"`);
  }

  const urgentCount = results.filter(r => r.isUrgent).length;
  console.log(`\n${urgentCount}/${runs} flagged as urgent (score >= 4)`);
}

main();
