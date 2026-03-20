import { EmailMessage, UrgencyScore } from '../types';

export class UrgencyScorer {
  async scoreEmail(email: EmailMessage): Promise<UrgencyScore> {
    try {
      const prompt = `
You are an AI assistant helping André to filter their emails (he will get notified on his phone if the email gets marked as urgent). Analyze this email and rate its urgency on a scale of 1-5:

1 = Not urgent (newsletters, social media, casual conversations)
2 = Low urgency (general business inquiries, non-time-sensitive updates)
3 = Medium urgency (meeting requests, project updates with flexible deadlines)
4 = High urgency (time-sensitive requests, important client issues, deadlines within days)
5 = Critical urgency (emergencies, urgent deadlines, critical issues, family emergencies)

CONTEXT: André develops tools for Clearer Thinking including a morality tool, personality test, and more. ONLY rate 5/5 if the email specifically mentions bugs, outages, or issues affecting users of these tools AND requires André to take immediate action. If someone else is handling the issue or just reporting it for André's awareness, rate it lower (2-3) unless André needs to do something urgently.

Rate 4-5 for time-sensitive issues that require immediate attention, including travel disruptions like flight changes or cancellations. Routine notifications should be rated lower unless there's an actual problem.

Regular personal emails should still follow the normal 1-5 scale.

EMAIL TO ANALYZE:
From: ${email.from}
Subject: ${email.subject}
Body: ${email.body}

Respond with ONLY a JSON object in this exact format:
{
  "score": 3,
  "isUrgent": false,
  "reason": "Brief one-line explanation for this score"
}

Set "isUrgent" to true only for scores 4 or 5.
`;

      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://vacation-email.vercel.app',
          'X-OpenRouter-Title': 'Vacation Email',
        },
        body: JSON.stringify({
          model: 'google/gemini-3-flash-preview',
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!res.ok) {
        throw new Error(`OpenRouter API error: ${res.status} ${await res.text()}`);
      }

      const data: any = await res.json();
      const response = data.choices[0].message.content;
      
      // Parse JSON response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Could not parse AI response as JSON');
      }

      const parsed = JSON.parse(jsonMatch[0]) as UrgencyScore;
      
      // Validate response
      if (typeof parsed.score !== 'number' || parsed.score < 1 || parsed.score > 5) {
        throw new Error('Invalid urgency score from AI');
      }

      return {
        score: parsed.score,
        reasoning: (parsed as any).reason || 'No reason provided',
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