import { Telegraf } from 'telegraf';
import { EmailMessage, UrgencyScore } from '../types';

export class TelegramNotifier {
  private urgentBot: Telegraf;
  private normalBot: Telegraf;
  private urgentChatId: string;
  private normalChatId: string;

  constructor() {
    this.urgentBot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!);
    this.normalBot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN_NORMAL!);
    this.urgentChatId = process.env.TELEGRAM_CHAT_ID!;
    this.normalChatId = process.env.TELEGRAM_CHAT_ID_NORMAL!;
  }

  async sendEmailNotification(email: EmailMessage, urgencyScore: UrgencyScore): Promise<boolean> {
    try {
      if (urgencyScore.isUrgent) {
        return await this.sendUrgentAlert(email, urgencyScore);
      } else {
        return await this.sendNormalAlert(email, urgencyScore);
      }
    } catch (error) {
      console.error('❌ Failed to send email notification:', error);
      return false;
    }
  }

  private async sendUrgentAlert(email: EmailMessage, urgencyScore: UrgencyScore): Promise<boolean> {
    try {
      const message = this.formatUrgentAlert(email, urgencyScore);
      
      await this.urgentBot.telegram.sendMessage(this.urgentChatId, message, {
        parse_mode: 'HTML',
        link_preview_options: { is_disabled: true }
      });

      console.log(`✅ Urgent alert sent for email: ${email.subject}`);
      return true;

    } catch (error) {
      console.error('❌ Failed to send urgent alert:', error);
      return false;
    }
  }

  private async sendNormalAlert(email: EmailMessage, urgencyScore: UrgencyScore): Promise<boolean> {
    try {
      const message = this.formatNormalAlert(email, urgencyScore);
      
      await this.normalBot.telegram.sendMessage(this.normalChatId, message, {
        parse_mode: 'HTML',
        link_preview_options: { is_disabled: true }
      });

      console.log(`✅ Normal alert sent for email: ${email.subject}`);
      return true;

    } catch (error) {
      console.error('❌ Failed to send normal alert:', error);
      return false;
    }
  }

  async sendErrorAlert(errorMessage: string): Promise<boolean> {
    try {
      const message = `
🔴 <b>Email Monitor Error</b>

${this.escapeHtml(errorMessage)}

<i>${new Date().toLocaleString()}</i>
`;
      await this.urgentBot.telegram.sendMessage(this.urgentChatId, message, {
        parse_mode: 'HTML'
      });
      return true;
    } catch (err) {
      console.error('❌ Failed to send error alert:', err);
      return false;
    }
  }

  async sendTestMessage(): Promise<boolean> {
    try {
      const testMessage = `
🤖 <b>Vacation Email Monitor Test</b>

✅ Telegram notifications are working!
📧 Your urgent emails will be sent here.

<i>Test sent at: ${new Date().toLocaleString()}</i>
`;

      await this.urgentBot.telegram.sendMessage(this.urgentChatId, testMessage, {
        parse_mode: 'HTML'
      });

      console.log('✅ Test message sent successfully');
      return true;

    } catch (error) {
      console.error('❌ Failed to send test message:', error);
      return false;
    }
  }

  private formatUrgentAlert(email: EmailMessage, urgencyScore: UrgencyScore): string {
    const urgencyEmoji = this.getUrgencyEmoji(urgencyScore.score);
    
    return `
${urgencyEmoji} <b>URGENT</b> (${urgencyScore.score}/5)

<b>From:</b> ${this.escapeHtml(email.from)}

<b>Subject:</b> ${this.escapeHtml(email.subject)}

<b>Summary:</b> ${this.escapeHtml(urgencyScore.summary)}

<b>Reason:</b> ${this.escapeHtml(urgencyScore.reasoning)}
`;
  }

  private formatNormalAlert(email: EmailMessage, urgencyScore: UrgencyScore): string {
    const urgencyEmoji = this.getUrgencyEmoji(urgencyScore.score);
    
    return `
${urgencyEmoji} <b>EMAIL</b> (${urgencyScore.score}/5)

<b>From:</b> ${this.escapeHtml(email.from)}

<b>Subject:</b> ${this.escapeHtml(email.subject)}

<b>Summary:</b> ${this.escapeHtml(urgencyScore.summary)}

<b>Reason:</b> ${this.escapeHtml(urgencyScore.reasoning)}
`;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  private getUrgencyEmoji(score: number): string {
    switch (score) {
      case 5: return '🚨';
      case 4: return '⚠️';
      case 3: return '📋';
      case 2: return '📧';
      case 1: return '💌';
      default: return '📧';
    }
  }

}