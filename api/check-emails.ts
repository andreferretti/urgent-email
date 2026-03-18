import { VercelRequest, VercelResponse } from '@vercel/node';
import { GmailService } from '../lib/gmail';
import { UrgencyScorer } from '../lib/urgency-scorer';
import { TelegramNotifier } from '../lib/telegram-notifier';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const secret = req.query.secret as string;
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    console.log('Auth failed - CRON_SECRET env var exists:', !!process.env.CRON_SECRET);
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('🔄 Starting email check');

    const gmailService = new GmailService();
    const urgencyScorer = new UrgencyScorer();
    const telegramNotifier = new TelegramNotifier();
    
    // Get hours from query parameter (default: 61 minutes for production)
    const hours = req.query.hours ? parseFloat(req.query.hours as string) : 61/60;
    const timeAgo = new Date(Date.now() - hours * 60 * 60 * 1000);
    const allEmails = await gmailService.getRecentEmails(42);
    const emails = allEmails.filter(email => email.receivedAt > timeAgo);
    console.log(`📧 Found ${emails.length} unread emails since ${timeAgo.toISOString()} (${hours} hours ago)`);
    
    if (emails.length === 0) {
      return res.status(200).json({ 
        success: true, 
        message: 'No unread emails found!',
        processed: 0
      });
    }
    
    let processedCount = 0;
    let notificationsSent = 0;
    const emailDetails = [];
    
    // Process each email
    for (const email of emails) {
      console.log(`📬 Processing: "${email.subject}"`);
      
      // TODO: Check if already processed using KV storage
      
      // Score urgency
      const urgencyScore = await urgencyScorer.scoreEmail(email);
      console.log(`🤖 Score: ${urgencyScore.score}/5`);
      
      // Send notification (urgent or normal)
      console.log(`📱 Sending ${urgencyScore.isUrgent ? 'urgent' : 'normal'} notification...`);
      const sent = await telegramNotifier.sendEmailNotification(email, urgencyScore);
      let notificationSent = false;
      if (sent) {
        if (urgencyScore.isUrgent) {
          notificationsSent++;
        }
        notificationSent = true;
        console.log('✅ Notification sent');
      } else {
        console.log('❌ Notification failed');
      }
      
      // TODO: Mark as processed in KV storage
      
      emailDetails.push({
        subject: email.subject,
        score: urgencyScore.score,
        isUrgent: urgencyScore.isUrgent,
        notificationSent
      });
      
      processedCount++;
    }
    
    console.log(`✅ Processed ${processedCount} emails, sent ${notificationsSent} notifications`);
    
    return res.status(200).json({
      success: true,
      message: 'Email check completed',
      processed: processedCount,
      notifications: notificationsSent,
      emailDetails
    });
    
  } catch (error) {
    console.error('❌ Email check failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    try {
      const telegramNotifier = new TelegramNotifier();
      await telegramNotifier.sendErrorAlert(errorMessage);
    } catch (notifyError) {
      console.error('❌ Failed to send error notification:', notifyError);
    }
    return res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
}