import { Event } from '../types/events';

interface GlobalConfig {
  product: {
    name: string;
    url: string;
  };
  links: {
    dashboard: string;
    pricing: string;
    docs: string;
  };
}

// In a real app, these might come from process.env or a config file
const GLOBAL_CONFIG: GlobalConfig = {
  product: {
    name: 'GTM Core Product',
    url: 'http://localhost:3000'
  },
  links: {
    dashboard: 'http://localhost:3000/dashboard',
    pricing: 'http://localhost:3000/pricing',
    docs: 'http://localhost:3000/docs'
  }
};

export class TemplateVariablesService {
  
  resolveVariables(event: Event, ruleContext: any): Record<string, any> {
    // 1. Base Defaults
    const variables: any = {
      product: { ...GLOBAL_CONFIG.product },
      links: { ...GLOBAL_CONFIG.links },
      user: {
        id: event.user_id,
        // Try to get email from properties, fallback to constructs for this demo
        email: event.properties?.email || `user_${event.user_id}@example.com`
      },
      // Feature definition come from rule context in config (e.g. feature_discovery_1)
      feature: {
          name: ruleContext.feature || 'Unknown Feature',
          url: ruleContext.feature_url || `${GLOBAL_CONFIG.product.url}/features/${ruleContext.feature || 'unknown'}`
      },
      // Activation hint comes from rule context
      activation_hint: ruleContext.activation_hint || 'Get started by creating your first project!',
      // Feedback URL
      feedback_url: ruleContext.feedback_url || `${GLOBAL_CONFIG.product.url}/feedback`
    };

    // 2. Merge Event Properties (Allow override)
    if (event.properties) {
        // We merge carefully to allow deep overrides? Or simple shallow?
        // Simple shallow mixin for top level keys, or specific binding.
        // For safe "assemblage", let's blindly merge properties into 'user' or root?
        // User request says "Merge user data, product data, and event properties".
        
        // Let's allow specific overrides for variable placeholders
        // e.g. if event has { "feature_name": "Pro" }
        
        // Flattening for verification? The Registry expects 'feature.name'.
        // My object above has { feature: { name: ... } }.
        // This validates against 'feature.name'.
        
        // We also mix in arbitrary properties from event to root for flexibility
        Object.assign(variables, event.properties);
    }
    
    // 3. Merge Rule Context (Campaign config params)
    // The rule object from campaigns.json might have extra params
    if (ruleContext.params) {
        Object.assign(variables, ruleContext.params);
    }

    // 4. Clean undefined/null
    return this.cleanVariables(variables);
  }

  // Returns flattened keys for validation check? 
  // No, the validation usually checks "path.to.key" existence in the object.
  // We will need a helper to check existence of deep keys.

  getVariableValue(variables: any, path: string): any {
      return path.split('.').reduce((obj, key) => (obj && obj[key] !== 'undefined') ? obj[key] : undefined, variables);
  }

  private cleanVariables(obj: any): any {
    Object.keys(obj).forEach(key => {
      if (obj[key] && typeof obj[key] === 'object') {
        this.cleanVariables(obj[key]);
      } else if (obj[key] === undefined || obj[key] === null) {
        delete obj[key];
      }
    });
    return obj;
  }
}

export const templateVariablesService = new TemplateVariablesService();
