import * as dotenv from 'dotenv';
dotenv.config();

import { GmailService } from './lib/gmail';
import { UrgencyScorer } from './lib/urgency-scorer';
import { TelegramNotifier } from './lib/telegram-notifier';

async function testFullPipeline() {
  try {
    console.log('🔄 Testing full email pipeline...');
    
    const gmailService = new GmailService();
    const urgencyScorer = new UrgencyScorer();
    const telegramNotifier = new TelegramNotifier();
    
    // Get recent emails
    console.log('\n📧 Fetching recent emails...');
    const emails = await gmailService.getRecentEmails(5);
    console.log(`Found ${emails.length} unread emails`);
    
    if (emails.length === 0) {
      console.log('❌ No unread emails found. Send yourself a test email first!');
      return;
    }
    
    // Process each email
    for (const email of emails) {
      console.log(`\n📬 Processing: "${email.subject}"`);
      
      // Score urgency
      console.log('🤖 Scoring urgency...');
      const urgencyScore = await urgencyScorer.scoreEmail(email);
      console.log(`Score: ${urgencyScore.score}/5 (${urgencyScore.isUrgent ? 'URGENT' : 'not urgent'})`);
      
      // Send notification if urgent
      if (urgencyScore.isUrgent) {
        console.log('📱 Sending Telegram notification...');
        const sent = await telegramNotifier.sendUrgentEmailAlert(email, urgencyScore);
        if (sent) {
          console.log('✅ Notification sent successfully!');
        } else {
          console.log('❌ Failed to send notification');
        }
      } else {
        console.log('ℹ️  Email not urgent, skipping notification');
      }
      
      console.log('─'.repeat(60));
    }
    
    console.log('\n🎉 Pipeline test complete!');
    
  } catch (error) {
    console.error('❌ Pipeline test failed:', error);
  }
}

testFullPipeline();