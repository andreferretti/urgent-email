export interface EmailMessage {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  body: string;
  receivedAt: Date;
}

export interface UrgencyScore {
  score: number;
  reasoning: string;
  isUrgent: boolean;
}