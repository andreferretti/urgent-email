import { GoogleGenerativeAI } from '@google/generative-ai';
import { EmailMessage, UrgencyScore } from '../types';

export class UrgencyScorer {
  private genAI: GoogleGenerativeAI;

  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  }

  async scoreEmail(email: EmailMessage): Promise<UrgencyScore> {
    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

      const prompt = `
You are an AI assistant helping André (who is on vacation) to filter their emails. Analyze this email and rate its urgency on a scale of 1-5:

1 = Not urgent (newsletters, social media, casual conversations)
2 = Low urgency (general business inquiries, non-time-sensitive updates)  
3 = Medium urgency (meeting requests, project updates with flexible deadlines)
4 = High urgency (time-sensitive requests, important client issues, deadlines within days)
5 = Critical urgency (emergencies, urgent deadlines, critical system issues, family emergencies)

CONTEXT: André develops tools for Clearer Thinking including a morality tool, personality test, and more. ONLY rate 5/5 if the email specifically mentions bugs, outages, or issues affecting users of these tools. His boss is Spencer Greenberg, so watch out if Spencer points out a bug or urgent issue. Regular personal emails should still follow the normal 1-5 scale.

EMAIL TO ANALYZE:
From: ${email.from}
Subject: ${email.subject}
Body: ${email.body}

Respond with ONLY a JSON object in this exact format:
{
  "score": 3,
  "isUrgent": false
}

Set "isUrgent" to true only for scores 4 or 5.
`;

      const result = await model.generateContent(prompt);
      const response = result.response.text();
      
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
        reasoning: '',
        isUrgent: parsed.score >= 4
      };

    } catch (error) {
      console.error('Error scoring email urgency:', error);
      // Return default safe score on error
      return {
        score: 3,
        reasoning: '',
        isUrgent: false
      };
    }
  }
}