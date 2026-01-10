import axios from 'axios';
import { Task } from '../types/events';

class DispatcherService {
  private webhookUrl: string = process.env.N8N_WEBHOOK_URL || "http://localhost:5678/webhook-test/gtm-task";

  async dispatch(task: Task): Promise<boolean> {
    try {
      console.log(`[DispatcherService] Dispatching task ${task.id} to ${this.webhookUrl} ...`);
      // In a real scenario, we would send the task to the webhook.
      // const response = await axios.post(this.webhookUrl, task);
      
      // For this minimal server, we will just simulate a successful dispatch and log it.
      // If the user provides a real URL, we can attempt a real request.
      
      if (this.webhookUrl.includes('mock')) {
          console.log(`[DispatcherService] Simulated dispatch for task:`, JSON.stringify(task, null, 2));
          return true;
      }
      
      const response = await axios.post(this.webhookUrl, task);
      console.log("n8n-response", response.data);
      console.log(`[DispatcherService] Successfully dispatched task ${task.id}`);
      return true;

    } catch (error) {
      console.error(`[DispatcherService] Failed to dispatch task ${task.id}:`, error);
      return false;
    }
  }
}

export const dispatcher = new DispatcherService();
