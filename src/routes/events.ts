import { Router, Request, Response } from 'express';
import { EventSchema } from '../types/events';
import { storage } from '../services/storage.service';
import { decisionEngine } from '../services/decision.service';

const router = Router();

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = EventSchema.safeParse(req.body);

    if (!parseResult.success) {
      res.status(400).json({ error: 'Invalid event schema', details: parseResult.error.issues });
        return
    }

    const event = parseResult.data;
    
    // 0. Idempotency Check
    if (event.event_id && storage.hasProcessed(event.event_id)) {
        res.status(200).json({ status: 'ignored', reason: 'duplicate', eventId: event.event_id });
        return;
    }

    // 1. Lifecycle Check & State Update
    const isTransitionValid = storage.processEventWithLifecycle(event);
    if (!isTransitionValid) {
        res.status(200).json({ status: 'ignored', reason: 'invalid_transition', eventId: event.event_id });
        return;
    }

    // 2. Store event
    // Note: storage.addEvent no longer updates state, it just stores the raw event object
    await storage.addEvent(event);

    // 3. Process event through decision engine
    await decisionEngine.processEvent(event);

    res.status(200).json({ status: 'received', eventId: parseResult.data.event }); 
  } catch (error) {
    console.error('Error processing event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
