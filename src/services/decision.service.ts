import { Event, Task } from '../types/events';
import { storage } from './storage.service';
import { dispatcher } from './dispatcher.service';
import { v4 as uuidv4 } from 'uuid';
import campaignsConfig from '../config/campaigns.json';
import { emailTemplates } from '../templates/emailTemplates';
import { templateVariablesService } from './templateVariables.service';
import { scheduler } from './inmemory.scheduler';

type CampaignRules = typeof campaignsConfig;

class DecisionService {
    
  private parseDelay(delay: string): number {
      const value = parseInt(delay.replace(/\D/g, ''), 10);
      if (delay.endsWith('h')) {
          return value * 60 * 60 * 1000;
      }
      return 0;
  }

  async processEvent(event: Event): Promise<void> {
    
    // 1. Check for Cancellations
    // "When an event occurs: Check if it matches cancel_if for any scheduled tasks"
    const userState = storage.getUserState(event.user_id);
    userState.tasks.forEach(task => {
        if (task.status === 'scheduled' && task.cancelCondition === event.event) {
            scheduler.cancel(task.id);
            task.status = 'cancelled';
            console.log(JSON.stringify({
                type: 'campaign_cancelled',
                template: (task.payload as any).template,
                user_id: event.user_id,
                reason: event.event
            }));
        }
    });

    const eventName = event.event as keyof CampaignRules;
    const rule = (campaignsConfig as any)[eventName];

    if (rule) {
        let taskPayload: any = {};
        
        // --- Email Template Logic ---
        if (rule.task === 'send_email') {
            const templateName = rule.template;
            const templateDef = emailTemplates[templateName];

            if (!templateDef) {
                console.error(JSON.stringify({
                    type: 'error',
                    message: 'Template not found',
                    template: templateName,
                    campaign: eventName
                }));
                return;
            }

            // 1. Resolve Variables
            const variables = templateVariablesService.resolveVariables(event, rule);

            // 2. Validate Required Variables
            const missingVars = templateDef.requiredVariables.filter(
                varPath => templateVariablesService.getVariableValue(variables, varPath) === undefined
            );

            if (missingVars.length > 0) {
                 console.error(JSON.stringify({
                    type: 'error',
                    message: 'Missing required variables',
                    template: templateName,
                    missing: missingVars,
                    variables  
                }));
                return;
            }

            // 3. Construct Frozen Payload
            taskPayload = {
                task: 'send_email',
                template: templateName,
                to: variables.user.email,
                variables: variables,
                context: {
                    event: eventName,
                    user_id: event.user_id,
                    product: variables.product?.name || 'gtm-core'
                }
            };
            
            // Log Validation Success
            console.log(JSON.stringify({
                type: 'email_dispatch',
                template: templateName,
                user_id: event.user_id,
                status: 'validated'
            }));

        } else {
            // --- Fallback for generic/other tasks ---
            taskPayload = {
                ...rule,
                userId: event.user_id,
            };
            delete taskPayload.task; 
        }

        // --- Scheduling / Dispatch Logic ---
        
        const delayStr = (rule as any).delay;
        const cancelIf = (rule as any).cancel_if;

        // Prevent Duplicate Delayed Campaigns
        if (delayStr) {
            const existing = storage.getUserState(event.user_id).tasks.find(t => 
                t.status === 'scheduled' && 
                (t.payload as any).template === rule.template
            );
            if (existing) {
                console.log(JSON.stringify({
                    type: 'campaign_duplicate_prevented',
                    template: rule.template,
                    user_id: event.user_id
                }));
                return;
            }
        }

        const task: Task = {
            id: uuidv4(),
            type: rule.task,
            payload: taskPayload,
            status: delayStr ? 'scheduled' : 'pending',
            createdAt: new Date().toISOString(),
            cancelCondition: cancelIf
        };

        storage.addTask(event.user_id, task);

        if (delayStr) {
            const delayMs = this.parseDelay(delayStr);
            const runAt = Date.now() + delayMs;

            console.log(JSON.stringify({
                type: 'campaign_scheduled',
                template: rule.template,
                user_id: event.user_id,
                run_at: new Date(runAt).toISOString()
            }));

            scheduler.schedule(task.id, runAt, () => {
                const currentState = storage.getUserState(event.user_id);
                const currentTask = currentState.tasks.find(t => t.id === task.id);

                if (currentTask && currentTask.status === 'scheduled') {
                    // Re-check logic if needed, but assuming cancellation handles invalidation.
                    
                    dispatcher.dispatch(currentTask);
                    currentTask.status = 'dispatched';

                    console.log(JSON.stringify({
                        type: 'campaign_executed',
                        template: rule.template,
                        user_id: event.user_id
                    }));
                }
            });

        } else {
            // Immediate
            dispatcher.dispatch(task); 
            // Should status be updated to dispatched?
            // The original code left it as pending, but let's update it to allow tracking?
            // "TaskStatus = Current activity"
            // If I change it, I might break unseen things, but typically 'dispatched' is correct.
            // I'll leave it as pending to minimize change to existing flow unless specifically asked, 
            // BUT for delayed tasks I update to 'dispatched' so I should probably be consistent.
            // However, sticking to "Business logic unchanged except where delay is required" -> minimal churn.
            // I'll keep immediate tasks behavior same (status pending).
            
            // Audit Log
            console.log(JSON.stringify({
                event: event.event,
                decision: rule.task,
                campaign: rule.params?.campaign_id || eventName,
                rule_template: rule.template,
                user_id: event.user_id,
                taskId: task.id
            }));
        }

    } else {
        console.log(JSON.stringify({
            event: event.event,
            decision: 'none',
            user_id: event.user_id
        }));
    }
  }
}

export const decisionEngine = new DecisionService();
