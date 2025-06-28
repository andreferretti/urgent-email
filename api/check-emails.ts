import { VercelRequest, VercelResponse } from '@vercel/node';
import { GmailService } from '../lib/gmail';
import { UrgencyScorer } from '../lib/urgency-scorer';
import { TelegramNotifier } from '../lib/telegram-notifier';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    console.log('🔄 Starting email check...');
    
    const gmailService = new GmailService();
    const urgencyScorer = new UrgencyScorer();
    const telegramNotifier = new TelegramNotifier();
    
    // Get all unread emails and filter by timestamp ourselves (61 minutes to be safe)
    const lastHour = new Date(Date.now() - 61 * 60 * 1000);
    const allEmails = await gmailService.getRecentEmails(42);
    const emails = allEmails.filter(email => email.receivedAt > lastHour);
    console.log(`📧 Found ${emails.length} unread emails since ${lastHour.toISOString()}`);
    
    if (emails.length === 0) {
      return res.status(200).json({ 
        success: true, 
        message: 'No unread emails found',
        processed: 0
      });
    }
    
    let processedCount = 0;
    let notificationsSent = 0;
    
    // Process each email
    for (const email of emails) {
      console.log(`📬 Processing: "${email.subject}"`);
      
      // TODO: Check if already processed using KV storage
      
      // Score urgency
      const urgencyScore = await urgencyScorer.scoreEmail(email);
      console.log(`🤖 Score: ${urgencyScore.score}/5`);
      
      // Send notification if urgent
      if (urgencyScore.isUrgent) {
        console.log('📱 Sending urgent notification...');
        const sent = await telegramNotifier.sendUrgentEmailAlert(email, urgencyScore);
        if (sent) {
          notificationsSent++;
          console.log('✅ Notification sent');
        } else {
          console.log('❌ Notification failed');
        }
      }
      
      // TODO: Mark as processed in KV storage
      
      processedCount++;
    }
    
    console.log(`✅ Processed ${processedCount} emails, sent ${notificationsSent} notifications`);
    
    return res.status(200).json({
      success: true,
      message: 'Email check completed',
      processed: processedCount,
      notifications: notificationsSent
    });
    
  } catch (error) {
    console.error('❌ Email check failed:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}