import { VercelRequest, VercelResponse } from '@vercel/node';
import { GmailService } from '../lib/gmail';
import { UrgencyScorer } from '../lib/urgency-scorer';
import { TelegramNotifier } from '../lib/telegram-notifier';
import { EmailMessage, UrgencyScore } from '../types';

export interface EmailServices {
  getEmails: (maxResults: number) => Promise<EmailMessage[]>;
  scoreEmail: (email: EmailMessage) => Promise<UrgencyScore>;
  sendNotification: (email: EmailMessage, score: UrgencyScore) => Promise<boolean>;
  sendErrorAlert: (message: string) => Promise<boolean>;
}

export async function processEmails(emails: EmailMessage[], services: EmailServices) {
  // Score all emails in parallel
  const scoredEmails = await Promise.all(
    emails.map(async (email) => {
      console.log(`📬 Scoring: "${email.subject}"`);
      const urgencyScore = await services.scoreEmail(email);
      console.log(`🤖 "${email.subject}" → ${urgencyScore.score}/5`);
      return { email, urgencyScore };
    })
  );

  let notificationsSent = 0;
  const emailDetails: { subject: string; score: number; isUrgent: boolean; notificationSent: boolean }[] = [];

  // Send notifications sequentially (avoid Telegram rate limits)
  for (const { email, urgencyScore } of scoredEmails) {
    console.log(`📱 Sending ${urgencyScore.isUrgent ? 'urgent' : 'normal'} notification...`);
    const sent = await services.sendNotification(email, urgencyScore);
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

    emailDetails.push({
      subject: email.subject,
      score: urgencyScore.score,
      isUrgent: urgencyScore.isUrgent,
      notificationSent
    });
  }

  return {
    processed: scoredEmails.length,
    notifications: notificationsSent,
    emailDetails
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const secret = req.query.secret as string;
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const gmailService = new GmailService();
  const urgencyScorer = new UrgencyScorer();
  const telegramNotifier = new TelegramNotifier();

  const services: EmailServices = {
    getEmails: (n) => gmailService.getRecentEmails(n),
    scoreEmail: (e) => urgencyScorer.scoreEmail(e),
    sendNotification: (e, s) => telegramNotifier.sendEmailNotification(e, s),
    sendErrorAlert: (m) => telegramNotifier.sendErrorAlert(m),
  };

  try {
    console.log('🔄 Starting email check');

    // Get hours from query parameter (default: 61 minutes for production)
    const hours = req.query.hours ? parseFloat(req.query.hours as string) : 61/60;
    const timeAgo = new Date(Date.now() - hours * 60 * 60 * 1000);
    const allEmails = await services.getEmails(42);
    const emails = allEmails.filter(email =>
      email.receivedAt > timeAgo &&
      !/@mail\.andreferretti\.com\b/i.test(email.from)
    );
    console.log(`📧 Found ${emails.length} unread emails since ${timeAgo.toISOString()} (${hours} hours ago)`);

    if (emails.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No unread emails found!',
        processed: 0
      });
    }

    const result = await processEmails(emails, services);

    console.log(`✅ Processed ${result.processed} emails, sent ${result.notifications} notifications`);

    return res.status(200).json({
      success: true,
      message: 'Email check completed',
      ...result
    });

  } catch (error) {
    console.error('❌ Email check failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    try {
      await services.sendErrorAlert(errorMessage);
    } catch (notifyError) {
      console.error('❌ Failed to send error notification:', notifyError);
    }
    return res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
}