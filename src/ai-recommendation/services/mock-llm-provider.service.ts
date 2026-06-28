import { Injectable } from '@nestjs/common';

@Injectable()
export class MockLlmProviderService {
  async generateStructuredOutput(prompt: string): Promise<unknown> {
    return {
      recommendations: [
        {
          systemName: 'Salesforce',
          entitlementKey: 'SALESFORCE_OPPORTUNITY_EDIT',
          action: 'REMOVE',
          reason:
            'Policy requires employees moving from CC-SALES-01 into Product Management & Marketing to remove direct write access to customer transactional registries.',
          policyCitation: 'v2026.2 Section 14.4',
          confidence: 0.94,
        },
        {
          systemName: 'Market Analytics',
          entitlementKey: 'MARKET_ANALYTICS_READ',
          action: 'KEEP',
          reason:
            'Read-only market analysis access remains appropriate for Product Management & Marketing.',
          policyCitation: 'v2026.2 Section 14.4',
          confidence: 0.86,
        },
        {
          systemName: 'Collaboration Platform',
          entitlementKey: 'PRODUCT_COLLAB_BASELINE',
          action: 'ADD',
          reason:
            'Policy states that Product Management & Marketing employees require baseline collaboration access.',
          policyCitation: 'v2026.2 Section 14.4',
          confidence: 0.91,
        },
      ],
    };
  }
}