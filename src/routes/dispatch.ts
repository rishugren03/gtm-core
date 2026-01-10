import { Router, Request, Response } from 'express';
import { dispatcher } from '../services/dispatcher.service';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
    try {
        const task = req.body;
        
        if (!task || !task.id || !task.type) {
             res.status(400).json({ error: 'Invalid task payload' });
             return;
        }

        const success = await dispatcher.dispatch(task);
        
        if (success) {
            res.status(200).json({ status: 'dispatched', taskId: task.id });
        } else {
             res.status(502).json({ error: 'Failed to dispatch task' });
        }

    } catch (error) {
        console.error('Error dispatching task:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
