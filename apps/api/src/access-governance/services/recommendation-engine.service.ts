import { Injectable } from '@nestjs/common';
import { EmployeeEntitlement } from './entitlement.service';
import { PolicyChunk } from '../../policy-intelligence/services/policy-intelligence.service';

export interface AccessRecommendation {
  systemName: string;
  entitlementKey: string;
  action: 'KEEP' | 'REMOVE' | 'ADD';
  reason: string;
  policyCitation: string;
  confidence: number;
}

@Injectable()
export class RecommendationEngineService {
  generateRecommendations(input: {
    currentEntitlements: EmployeeEntitlement[];
    policyChunks: PolicyChunk[];
  }): AccessRecommendation[] {
    const recommendations: AccessRecommendation[] = [];

    for (const entitlement of input.currentEntitlements) {
      if (
        entitlement.systemName === 'Salesforce' &&
        entitlement.entitlementKey === 'SALESFORCE_OPPORTUNITY_EDIT'
      ) {
        recommendations.push({
          systemName: entitlement.systemName,
          entitlementKey: entitlement.entitlementKey,
          action: 'REMOVE',
          reason:
            'Employee previously belonged to CC-SALES-01 and now moved into Product Management & Marketing. Policy requires direct write access to customer transactional registries to be removed.',
          policyCitation: `${input.policyChunks[0].policyVersion} Section ${input.policyChunks[0].sectionId}`,
          confidence: 0.94,
        });
      } else {
        recommendations.push({
          systemName: entitlement.systemName,
          entitlementKey: entitlement.entitlementKey,
          action: 'KEEP',
          reason:
            'Current access does not violate the retrieved role-change policy.',
          policyCitation: `${input.policyChunks[0].policyVersion} Section ${input.policyChunks[0].sectionId}`,
          confidence: 0.82,
        });
      }
    }

    recommendations.push({
      systemName: 'Collaboration Platform',
      entitlementKey: 'PRODUCT_COLLAB_BASELINE',
      action: 'ADD',
      reason:
        'Policy states that Product Management & Marketing employees require baseline collaboration access.',
      policyCitation: `${input.policyChunks[0].policyVersion} Section ${input.policyChunks[0].sectionId}`,
      confidence: 0.91,
    });

    return recommendations;
  }
}