import express from 'express';
import eventsRouter from './routes/events';
import dispatchRouter from './routes/dispatch';

const app = express();

app.use(express.json());

app.use('/events', eventsRouter);
app.use('/dispatch-task', dispatchRouter);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

export default app;
