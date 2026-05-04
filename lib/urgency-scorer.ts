import { EmailMessage, UrgencyScore } from '../types';

export class UrgencyScorer {
  async scoreEmail(email: EmailMessage): Promise<UrgencyScore> {
    try {
      const prompt = `You are an AI assistant helping André to filter their emails (he will get notified on his phone if the email gets marked as urgent). Analyze this email and rate its urgency on a scale of 1-5 (where 1 is Not urgent and 5 is critical)

CONTEXT: André developed tools for Clearer Thinking including a morality tool, personality test, unique traits test, and more. Any email reporting bugs, access issues, or problems affecting users of these tools should be rated 4+. André wants to know about project-related bugs, not site-wide outages that are not under his responsibility. Rate 5/5 for critical outages affecting many users. However, if the email thread makes it clear that a bug has already been fixed or resolved (e.g., someone confirmed the fix, or the latest message is a thank-you/reaction to a fix), rate it 1-2 — there's nothing left for André to act on.

Rate 4-5 for time-sensitive issues that require immediate attention, including travel disruptions like flight cancellations, significant delays, missed connections. Routine airline/travel notifications should be rated 1-2. This includes gate number announcements, check-in reminders, and similar informational messages.

André is currently in hiring processes as a developer. Rate 4-5 for emails about interview results, offers, rejections, scheduling or rescheduling interviews, take-home assignments, recruiter follow-ups, or invitations to next steps in a hiring process.

Automated emails from services (account inactivity warnings, subscription reminders, "we miss you" emails, organization deletion notices, etc.) should be rated 1-2.

Routine security alerts (e.g., "Security alert for [email]", new sign-in notifications, third-party app access confirmations) should be rated 1-2.

Regular personal emails should still follow the normal 1-5 scale.

EMAIL TO ANALYZE:
From: ${email.from}
Subject: ${email.subject}
Body: ${email.body}`;

      const tools = [
        {
          type: 'function' as const,
          function: {
            name: 'score_email',
            description: 'Submit the urgency score for the analyzed email',
            parameters: {
              type: 'object',
              properties: {
                score: {
                  type: 'number',
                  description: 'Urgency score from 1 (not urgent) to 5 (critical)',
                },
                reason: {
                  type: 'string',
                  description: 'Brief one-line explanation for this score',
                },
                summary: {
                  type: 'string',
                  description: 'Concise 1-2 sentence summary addressed directly to André in the second person (use "you", "your"). Describe what the email is about and what it asks of him, if anything.',
                },
              },
              required: ['score', 'reason', 'summary'],
            },
          },
        },
      ];

      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://example.com',
          'X-OpenRouter-Title': 'Vacation Email',
        },
        body: JSON.stringify({
          model: 'google/gemini-3-flash-preview',
          messages: [{ role: 'user', content: prompt }],
          tools,
          tool_choice: { type: 'function', function: { name: 'score_email' } },
        }),
      });

      if (!res.ok) {
        throw new Error(`OpenRouter API error: ${res.status} ${await res.text()}`);
      }

      const data: any = await res.json();
      const toolCall = data.choices[0].message.tool_calls?.[0];
      if (!toolCall) {
        throw new Error('Model did not return a tool call');
      }

      const parsed = JSON.parse(toolCall.function.arguments);

      if (typeof parsed.score !== 'number' || parsed.score < 1 || parsed.score > 5) {
        throw new Error('Invalid urgency score from AI');
      }

      return {
        score: parsed.score,
        reasoning: parsed.reason || 'No reason provided',
        summary: parsed.summary || '',
        isUrgent: parsed.score >= 4
      };

    } catch (error) {
      console.error('Error scoring email urgency:', error);
      // Return default safe score on error
      return {
        score: 3,
        reasoning: 'Error occurred during analysis',
        summary: '',
        isUrgent: false
      };
    }
  }
}
