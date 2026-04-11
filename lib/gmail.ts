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

  async getRecentEmails(maxResults: number = 10, sinceTimestamp?: Date): Promise<EmailMessage[]> {
    try {
      let query = 'is:unread';
      
      // Add timestamp filter if provided (Gmail uses YYYY/MM/DD format)
      if (sinceTimestamp) {
        const dateStr = sinceTimestamp.toISOString().split('T')[0].replace(/-/g, '/');
        query += ` after:${dateStr}`;
      }
      
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        maxResults,
        q: query,
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

  async getEmailDetails(messageId: string): Promise<EmailMessage | null> {
    try {
      const response = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full',
      });

      const message = response.data;
      const headers = message.payload.headers;
      
      const subject = headers.find((h: any) => h.name === 'Subject')?.value || 'No Subject';
      let from = headers.find((h: any) => h.name === 'From')?.value || 'Unknown Sender';
      // Remove quotes around sender name
      from = from.replace(/^"([^"]*)" <(.+)>$/, '$1 <$2>');
      const date = headers.find((h: any) => h.name === 'Date')?.value;

      const body = this.extractBody(message.payload);

      return {
        id: messageId,
        threadId: message.threadId,
        subject,
        from,
        body: this.cleanEmailBody(body),
        receivedAt: date ? new Date(date) : new Date(),
      };
    } catch (error) {
      console.error(`Error fetching email ${messageId}:`, error);
      return null;
    }
  }

  private extractBody(payload: any): string {
    // Direct body data (simple emails)
    if (payload.body?.data) {
      return Buffer.from(payload.body.data, 'base64').toString();
    }

    if (!payload.parts) return '';

    // Recursively search for text/plain first, then text/html as fallback
    let plain = '';
    let html = '';

    const search = (parts: any[]) => {
      for (const part of parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          plain = Buffer.from(part.body.data, 'base64').toString();
        } else if (part.mimeType === 'text/html' && part.body?.data && !html) {
          html = Buffer.from(part.body.data, 'base64').toString();
        } else if (part.parts) {
          search(part.parts);
        }
        if (plain) return; // prefer plain text, stop early
      }
    };

    search(payload.parts);
    return plain || html;
  }

  private cleanEmailBody(htmlContent: string): string {
    let content = htmlContent;

    // Remove CSS styles and @media queries
    content = content.replace(/@media[^{]*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g, '');
    content = content.replace(/@font-face[^{]*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g, '');
    content = content.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    
    // Remove script tags
    content = content.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    
    // Remove links but keep link text (remove URLs from href attributes)
    content = content.replace(/<a[^>]*href="[^"]*"[^>]*>(.*?)<\/a>/gi, '$1');
    content = content.replace(/https?:\/\/[^\s)]+/g, ''); // Remove standalone URLs
    
    // Remove HTML tags
    content = content.replace(/<[^>]*>/g, '');
    
    // Decode HTML entities
    content = content
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&rdquo;/g, '"')
      .replace(/&ldquo;/g, '"')
      .replace(/&rsquo;/g, "'")
      .replace(/&lsquo;/g, "'");
    
    // Clean up whitespace but preserve line breaks
    content = content
      .replace(/[ \t]+/g, ' ') // Collapse spaces/tabs but keep newlines
      .replace(/\n\s*\n\s*\n/g, '\n\n') // Max 2 consecutive newlines
      .replace(/^\s+|\s+$/g, '') // Trim start/end
      .trim();
    
    // Final trim to 1000 chars for Gemini
    return content.substring(0, 1000);
  }
}