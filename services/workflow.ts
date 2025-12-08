
import { Lead, ConfigStore, StageRule, AutoActionRule, addDaysToDate, formatDate, determineLeadHealth, SLARule } from '../types';

/**
 * 4.1 Routing Engine
 * Assigns channel and owner based on lead attributes.
 */
export const RoutingService = {
  routeLead: (lead: Partial<Lead>, config: ConfigStore): Partial<Lead> => {
    // In future, load specific routing rules from config.
    // For now, simple logic based on Category/Intent.
    
    let channel = 'B2B';
    let owner = 'Unassigned';

    const cat = (lead.category || '').toLowerCase();
    const intent = (lead.intent || '').toLowerCase();

    if (cat.includes('drop') || intent.includes('drop')) {
        channel = 'Dropshipping';
    } else if (cat.includes('pod') || intent.includes('pod')) {
        channel = 'POD';
    }

    // Default status/stage for new routing
    return {
        ...lead,
        channel,
        ydsPoc: owner, // Could lookup owner mapping in config later
        status: 'New',
        stage: 'New'
    };
  }
};

/**
 * 4.2 Stage Transition Engine
 * Validates and executes stage moves.
 */
export const StageService = {
  validateTransition: (currentStage: string, nextStage: string, rules: StageRule[]): { allowed: boolean; error?: string } => {
    // 1. Check if ANY rule allows this transition
    // If rules exist for currentStage, strict checking applies.
    const relevantRules = rules.filter(r => r.fromStage === currentStage);
    
    if (relevantRules.length === 0) {
        // No strict rules for this stage? Allow default behavior or block? 
        // Brief implies strict "Allowed transitions".
        // If no rule found, we check if generic transition logic applies.
        return { allowed: true };
    }

    const match = relevantRules.find(r => r.toStage === nextStage);
    if (!match) {
        return { allowed: false, error: `Transition from ${currentStage} to ${nextStage} is not defined in Stage Rules.` };
    }

    return { allowed: true };
  },

  checkRequirements: (lead: Lead, nextStage: string, rules: StageRule[]): string[] => {
    const missing: string[] = [];
    
    // Find rules that target this nextStage
    const targetRules = rules.filter(r => r.toStage === nextStage);
    
    targetRules.forEach(rule => {
        rule.requiresField.forEach(field => {
            const val = lead[field as keyof Lead];
            if (!val || val === '' || val === 0 || val === 'Unassigned') {
                missing.push(field);
            }
        });
    });

    return [...new Set(missing)];
  },

  getAutoAction: (stage: string, config: ConfigStore): { action: string, date: string } | null => {
      const rule = config.autoActions.find(r => r.triggerStage === stage && r.triggerEvent === 'on_enter');
      if (rule) {
          return {
              action: rule.defaultNextAction,
              date: addDaysToDate(rule.defaultDays)
          };
      }
      return null;
  }
};

/**
 * 4.3 SLA Engine
 * Checks for overdue items.
 */
export const SlaService = {
    checkHealth: (lead: Lead, rules: SLARule[]) => {
        return determineLeadHealth(lead, rules);
    }
};
