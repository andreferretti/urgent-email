import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { processEmails, EmailServices } from '../api/check-emails';
import { EmailMessage, UrgencyScore } from '../types';

function makeEmail(overrides: Partial<EmailMessage> = {}): EmailMessage {
  return {
    id: `msg-${Math.random().toString(36).slice(2)}`,
    threadId: 'thread-1',
    subject: 'Test email',
    from: 'sender@example.com',
    body: 'Hello world',
    receivedAt: new Date(),
    ...overrides,
  };
}

function makeServices(overrides: Partial<EmailServices> = {}): EmailServices {
  return {
    getEmails: mock.fn(async () => []),
    scoreEmail: mock.fn(async (): Promise<UrgencyScore> => ({
      score: 2,
      reasoning: 'Not urgent',
      summary: 'Test email summary',
      isUrgent: false,
    })),
    sendNotification: mock.fn(async () => true),
    sendErrorAlert: mock.fn(async () => true),
    ...overrides,
  };
}

describe('processEmails', () => {
  it('returns zero counts for empty email list', async () => {
    const services = makeServices();
    const result = await processEmails([], services);

    assert.strictEqual(result.processed, 0);
    assert.strictEqual(result.notifications, 0);
    assert.deepStrictEqual(result.emailDetails, []);
  });

  it('scores and notifies for each email', async () => {
    const emails = [makeEmail({ subject: 'A' }), makeEmail({ subject: 'B' })];
    const scoreFn = mock.fn(async (): Promise<UrgencyScore> => ({
      score: 1,
      reasoning: 'Low',
      summary: 'Low priority email',
      isUrgent: false,
    }));
    const notifyFn = mock.fn(async () => true);
    const services = makeServices({ scoreEmail: scoreFn, sendNotification: notifyFn });

    const result = await processEmails(emails, services);

    assert.strictEqual(result.processed, 2);
    assert.strictEqual(scoreFn.mock.callCount(), 2);
    assert.strictEqual(notifyFn.mock.callCount(), 2);
    assert.strictEqual(result.emailDetails.length, 2);
    assert.strictEqual(result.emailDetails[0].subject, 'A');
    assert.strictEqual(result.emailDetails[1].subject, 'B');
  });

  it('counts only urgent notifications in notifications field', async () => {
    const emails = [
      makeEmail({ subject: 'Urgent' }),
      makeEmail({ subject: 'Normal' }),
      makeEmail({ subject: 'Also urgent' }),
    ];

    let callIndex = 0;
    const scores: UrgencyScore[] = [
      { score: 5, reasoning: 'Critical', summary: 'Critical summary', isUrgent: true },
      { score: 1, reasoning: 'Chill', summary: 'Chill summary', isUrgent: false },
      { score: 4, reasoning: 'Important', summary: 'Important summary', isUrgent: true },
    ];

    const services = makeServices({
      scoreEmail: mock.fn(async () => scores[callIndex++]),
      sendNotification: mock.fn(async () => true),
    });

    const result = await processEmails(emails, services);

    assert.strictEqual(result.notifications, 2);
    assert.strictEqual(result.processed, 3);
    assert.strictEqual(result.emailDetails[0].isUrgent, true);
    assert.strictEqual(result.emailDetails[1].isUrgent, false);
    assert.strictEqual(result.emailDetails[2].isUrgent, true);
  });

  it('handles failed notifications gracefully', async () => {
    const emails = [makeEmail({ subject: 'Fail' })];
    const services = makeServices({
      sendNotification: mock.fn(async () => false),
    });

    const result = await processEmails(emails, services);

    assert.strictEqual(result.processed, 1);
    assert.strictEqual(result.notifications, 0);
    assert.strictEqual(result.emailDetails[0].notificationSent, false);
  });

  it('scores emails in parallel, not sequentially', async () => {
    const emails = Array.from({ length: 5 }, (_, i) =>
      makeEmail({ subject: `Email ${i}` })
    );

    const activeCalls: number[] = [];
    let maxConcurrent = 0;
    let concurrent = 0;

    const services = makeServices({
      scoreEmail: mock.fn(async (): Promise<UrgencyScore> => {
        concurrent++;
        activeCalls.push(concurrent);
        if (concurrent > maxConcurrent) maxConcurrent = concurrent;
        // Simulate async work so parallel calls can overlap
        await new Promise((r) => setTimeout(r, 50));
        concurrent--;
        return { score: 2, reasoning: 'ok', summary: 'ok', isUrgent: false };
      }),
    });

    await processEmails(emails, services);

    assert.ok(
      maxConcurrent > 1,
      `Expected parallel scoring (max concurrent: ${maxConcurrent}), but calls were sequential`
    );
    assert.strictEqual(maxConcurrent, 5, 'All 5 score calls should run concurrently');
  });

  it('sends notifications sequentially, not in parallel', async () => {
    const emails = [makeEmail(), makeEmail(), makeEmail()];
    const services = makeServices();

    let concurrent = 0;
    let maxConcurrent = 0;
    (services.sendNotification as any) = async () => {
      concurrent++;
      if (concurrent > maxConcurrent) maxConcurrent = concurrent;
      await new Promise((r) => setTimeout(r, 20));
      concurrent--;
      return true;
    };

    await processEmails(emails, services);

    assert.strictEqual(
      maxConcurrent,
      1,
      `Notifications should be sequential but saw ${maxConcurrent} concurrent`
    );
  });
});
