import { z } from 'zod';

export const EventSchema = z.object({
  event: z.string(),
  event_id: z.string().uuid().optional(),
  user_id: z.string(),
  product: z.string(),
  timestamp: z.string().datetime().optional().default(() => new Date().toISOString()),
  properties: z.record(z.string(), z.any()).optional().default({}),
});

export type Event = z.infer<typeof EventSchema>;

export enum UserLifecycle {
    ANONYMOUS = 'anonymous',
    SIGNED_UP = 'signed_up',
    ACTIVATED = 'activated'
}

export interface UserState {
  userId: string;
  status: UserLifecycle;
  hasSignedUp: boolean; // Keeping for backward compat or easy checks for now
  hasActivated: boolean;
  tasks: Task[];
}

export interface Task {
  id: string;
  type: string;
  payload: any;
  status: 'pending' | 'dispatched' | 'failed' | 'scheduled' | 'cancelled';
  cancelCondition?: string;
  createdAt: string;
}
