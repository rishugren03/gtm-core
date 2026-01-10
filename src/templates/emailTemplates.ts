export interface EmailTemplateDefinition {
  name: string;
  requiredVariables: string[];
  optionalVariables?: string[];
}

export const emailTemplates: Record<string, EmailTemplateDefinition> = {
  welcome_v1: {
    name: 'welcome_v1',
    requiredVariables: ['user.email', 'product.name', 'links.dashboard', 'links.docs'],
  },
  activation_nudge_v1: {
    name: 'activation_nudge_v1',
    requiredVariables: ['user.email', 'product.name', 'activation_hint'],
  },
  feature_discovery_1: {
    name: 'feature_discovery_1',
    requiredVariables: ['user.email', 'feature.name', 'feature.url'],
  },
  pricing_explainer_v1: {
    name: 'pricing_explainer_v1',
    requiredVariables: ['user.email', 'links.pricing'],
  },
  churn_feedback_v1: {
    name: 'churn_feedback_v1',
    requiredVariables: ['user.email', 'feedback_url'],
  },
};
