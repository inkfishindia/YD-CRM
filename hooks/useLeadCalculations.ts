

import { useMemo } from 'react';
import { Lead, SLARule, parseDate, determineLeadHealth } from '../types';

interface LeadCalculations {
  slaStatus: 'Healthy' | 'Warning' | 'Violated';
  slaLabel: string;
  isOverdue: boolean;
  daysInStage: number;
  urgencyLevel: 'critical' | 'warning' | 'okay' | 'scheduled' | 'gray';
  signalColor: string; // Tailwind class for text/border/bg base
}

export const useLeadCalculations = (lead: Lead, slaRules: SLARule[]): LeadCalculations => {
  return useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Calculate Days in Stage
    const stageDate = parseDate(lead.stageChangedDate) || parseDate(lead.date) || today;
    const diffTime = Math.abs(today.getTime() - stageDate.getTime());
    const daysInStage = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // 2. Use Central Logic
    const health = determineLeadHealth(lead, slaRules);

    return {
        slaStatus: health.status as any,
        slaLabel: health.label,
        isOverdue: health.isOverdue,
        daysInStage,
        urgencyLevel: health.urgency as any,
        signalColor: health.color
    };

  }, [lead, slaRules]);
};