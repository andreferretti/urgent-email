import { EmailMessage, UrgencyScore } from '../types';

export class UrgencyScorer {
  async scoreEmail(email: EmailMessage): Promise<UrgencyScore> {
    try {
      const prompt = `You are an AI assistant helping André to filter their emails (he will get notified on his phone if the email gets marked as urgent). Analyze this email and rate its urgency on a scale of 1-5:

1 = Not urgent (newsletters, social media, casual conversations)
2 = Low urgency (general business inquiries, non-time-sensitive updates)
3 = Medium urgency (meeting requests, project updates with flexible deadlines)
4 = High urgency (time-sensitive requests, important client issues, deadlines within days)
5 = Critical urgency (emergencies, urgent deadlines, critical issues, family emergencies)

CONTEXT: André develops tools for Clearer Thinking including a morality tool, personality test, unique traits test, and more. Any email reporting bugs, access issues, or problems affecting users of these tools should be rated 4+. André wants to know about ALL project-related bugs, not just site-wide outages. Rate 5/5 for critical outages affecting many users.

Rate 4-5 for time-sensitive issues that require immediate attention, including travel disruptions like flight changes or cancellations. Routine notifications should be rated lower unless there's an actual problem.

Automated emails from services André doesn't actively use (account inactivity warnings, subscription reminders, "we miss you" emails, organization deletion notices, etc.) should be rated 1-2. André doesn't care about these unless there's a genuinely critical consequence for a service he actively depends on.

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
              },
              required: ['score', 'reason'],
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
        isUrgent: parsed.score >= 4
      };

    } catch (error) {
      console.error('Error scoring email urgency:', error);
      // Return default safe score on error
      return {
        score: 3,
        reasoning: 'Error occurred during analysis',
        isUrgent: false
      };
    }
  }
}