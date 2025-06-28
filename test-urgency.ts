import * as dotenv from 'dotenv';
dotenv.config();

import { GmailService } from './lib/gmail';
import { UrgencyScorer } from './lib/urgency-scorer';
import * as fs from 'fs';

async function testUrgencyScoring() {
  try {
    console.log('Testing urgency scoring...');
    
    const gmailService = new GmailService();
    const urgencyScorer = new UrgencyScorer();
    
    const emails = await gmailService.getRecentEmails(3);
    console.log(`Found ${emails.length} emails to score`);
    
    const results = [];
    
    for (const email of emails) {
      console.log(`\nScoring email: "${email.subject}"`);
      const urgencyScore = await urgencyScorer.scoreEmail(email);
      
      results.push({
        email,
        urgencyScore
      });
      
      console.log(`Score: ${urgencyScore.score}/5 (${urgencyScore.isUrgent ? 'URGENT' : 'not urgent'})`);
      console.log(`Reasoning: ${urgencyScore.reasoning}`);
    }
    
    // Write detailed results
    const output = results.map((result, index) => {
      return `
EMAIL ${index + 1}:
Subject: ${result.email.subject}
From: ${result.email.from}
Body: ${result.email.body}

URGENCY ANALYSIS:
Score: ${result.urgencyScore.score}/5
Is Urgent: ${result.urgencyScore.isUrgent ? 'YES' : 'NO'}
Reasoning: ${result.urgencyScore.reasoning}

${'='.repeat(80)}
`;
    }).join('\n');

    fs.writeFileSync('urgency-test.txt', `Urgency Scoring Test Results\nTimestamp: ${new Date().toISOString()}\n${output}`);
    
    console.log('\n✅ Urgency scoring test complete!');
    console.log('📁 Results written to urgency-test.txt');
    
  } catch (error) {
    console.error('❌ Urgency scoring test failed:', error);
    fs.writeFileSync('urgency-test.txt', `Urgency Test FAILED\nTimestamp: ${new Date().toISOString()}\nError: ${error}\n`);
  }
}

testUrgencyScoring();