import { google } from 'googleapis';
import { EmailMessage } from '../types';

export class GmailService {
  private gmail: any;

  constructor() {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      'http://localhost:8080'
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });

    this.gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  }

  async getRecentEmails(maxResults: number = 10): Promise<EmailMessage[]> {
    try {
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        maxResults,
        q: 'is:unread', // Only unread emails
      });

      const messages = response.data.messages || [];
      const emails: EmailMessage[] = [];

      for (const message of messages) {
        const email = await this.getEmailDetails(message.id);
        if (email) emails.push(email);
      }

      return emails;
    } catch (error) {
      console.error('Error fetching emails:', error);
      throw error;
    }
  }

  private async getEmailDetails(messageId: string): Promise<EmailMessage | null> {
    try {
      const response = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full',
      });

      const message = response.data;
      const headers = message.payload.headers;
      
      const subject = headers.find((h: any) => h.name === 'Subject')?.value || 'No Subject';
      const from = headers.find((h: any) => h.name === 'From')?.value || 'Unknown Sender';
      const date = headers.find((h: any) => h.name === 'Date')?.value;

      let body = '';
      if (message.payload.body?.data) {
        body = Buffer.from(message.payload.body.data, 'base64').toString();
      } else if (message.payload.parts) {
        for (const part of message.payload.parts) {
          if (part.mimeType === 'text/plain' && part.body?.data) {
            body = Buffer.from(part.body.data, 'base64').toString();
            break;
          }
        }
      }

      return {
        id: messageId,
        threadId: message.threadId,
        subject,
        from,
        body: body.substring(0, 500), // Truncate for testing
        receivedAt: date ? new Date(date) : new Date(),
      };
    } catch (error) {
      console.error(`Error fetching email ${messageId}:`, error);
      return null;
    }
  }
}