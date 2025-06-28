import * as dotenv from 'dotenv';
dotenv.config();

import { GmailService } from './lib/gmail';
import * as fs from 'fs';

async function testGmailConnection() {
  try {
    console.log('Testing Gmail connection...');
    
    const gmailService = new GmailService();
    const emails = await gmailService.getRecentEmails(5);
    
    console.log(`Found ${emails.length} unread emails`);
    
    const output = emails.map((email, index) => {
      return `
EMAIL ${index + 1}:
ID: ${email.id}
From: ${email.from}
Subject: ${email.subject}
Received: ${email.receivedAt}
Body Preview: ${email.body}
${'='.repeat(80)}
`;
    }).join('\n');

    fs.writeFileSync('example.txt', `Gmail API Test Results\nTimestamp: ${new Date().toISOString()}\n\n${output}`);
    
    console.log('✅ Gmail connection successful!');
    console.log('📁 Email details written to example.txt');
    
  } catch (error) {
    console.error('❌ Gmail connection failed:', error);
    fs.writeFileSync('example.txt', `Gmail API Test FAILED\nTimestamp: ${new Date().toISOString()}\nError: ${error}\n`);
  }
}

testGmailConnection();