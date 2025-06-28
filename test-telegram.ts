import * as dotenv from 'dotenv';
dotenv.config();

import { TelegramNotifier } from './lib/telegram-notifier';
import { EmailMessage, UrgencyScore } from './types';

async function testTelegramNotifications() {
  try {
    console.log('Testing Telegram notifications...');
    
    const telegramNotifier = new TelegramNotifier();
    
    // Test 1: Send basic test message
    console.log('\n1. Sending test message...');
    const testResult = await telegramNotifier.sendTestMessage();
    
    if (!testResult) {
      throw new Error('Test message failed');
    }
    
    // Test 2: Send mock urgent email alert
    console.log('\n2. Sending mock urgent email alert...');
    
    const mockEmail: EmailMessage = {
      id: 'test-email-123',
      threadId: 'test-thread-123',
      subject: 'URGENT: Server Down - Immediate Action Required',
      from: 'alerts@company.com',
      body: 'Our main production server is experiencing critical issues. Customer-facing services are affected. Please investigate immediately and provide status update.',
      receivedAt: new Date()
    };
    
    const mockUrgencyScore: UrgencyScore = {
      score: 5,
      reasoning: 'This email indicates a critical system failure affecting customer services, requiring immediate attention.',
      isUrgent: true
    };
    
    const alertResult = await telegramNotifier.sendUrgentEmailAlert(mockEmail, mockUrgencyScore);
    
    if (!alertResult) {
      throw new Error('Urgent email alert failed');
    }
    
    console.log('\n✅ All Telegram tests passed!');
    console.log('📱 Check your Telegram for the test messages');
    
  } catch (error) {
    console.error('❌ Telegram test failed:', error);
  }
}

testTelegramNotifications();