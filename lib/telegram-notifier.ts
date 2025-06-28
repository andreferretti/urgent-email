import { Telegraf } from 'telegraf';
import { EmailMessage, UrgencyScore } from '../types';

export class TelegramNotifier {
  private bot: Telegraf;
  private chatId: string;

  constructor() {
    this.bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!);
    this.chatId = process.env.TELEGRAM_CHAT_ID!;
  }

  async sendUrgentEmailAlert(email: EmailMessage, urgencyScore: UrgencyScore): Promise<boolean> {
    try {
      const message = this.formatEmailAlert(email, urgencyScore);
      
      await this.bot.telegram.sendMessage(this.chatId, message, {
        parse_mode: 'HTML',
        link_preview_options: { is_disabled: true }
      });

      console.log(`✅ Telegram alert sent for email: ${email.subject}`);
      return true;

    } catch (error) {
      console.error('❌ Failed to send Telegram alert:', error);
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

      await this.bot.telegram.sendMessage(this.chatId, testMessage, {
        parse_mode: 'HTML'
      });

      console.log('✅ Test message sent successfully');
      return true;

    } catch (error) {
      console.error('❌ Failed to send test message:', error);
      return false;
    }
  }

  private formatEmailAlert(email: EmailMessage, urgencyScore: UrgencyScore): string {
    const urgencyEmoji = this.getUrgencyEmoji(urgencyScore.score);
    
    return `
${urgencyEmoji} <b>URGENT EMAIL</b> (${urgencyScore.score}/5)

<b>From:</b> ${this.escapeHtml(email.from)}
<b>Subject:</b> ${this.escapeHtml(email.subject)}

${this.escapeHtml(email.body)}
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

  private getUrgencyLevel(score: number): string {
    switch (score) {
      case 5: return 'CRITICAL';
      case 4: return 'HIGH';
      case 3: return 'MEDIUM';
      case 2: return 'LOW';
      case 1: return 'MINIMAL';
      default: return 'UNKNOWN';
    }
  }
}