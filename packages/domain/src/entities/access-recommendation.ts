export type AccessRecommendationAction = 'KEEP' | 'REMOVE' | 'ADD';

export interface AccessRecommendation {
  systemName: string;
  entitlementKey: string;
  action: AccessRecommendationAction;
  reason: string;
  policyCitation: string;
  confidence: number;
}
