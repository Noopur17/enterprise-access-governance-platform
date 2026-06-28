import { Injectable } from '@nestjs/common';

export interface PolicyChunk {
  sectionId: string;
  policyVersion: string;
  text: string;
}

@Injectable()
export class PolicyIntelligenceService {
  async retrieveRelevantPolicies(input: {
    oldDepartment: string;
    oldCostCenter: string;
    newDepartment: string;
    newCostCenter: string;
  }): Promise<PolicyChunk[]> {
    return [
      {
        sectionId: '14.4',
        policyVersion: 'v2026.2',
        text:
          'Employees transitioning into Product Management & Marketing require baseline collaboration spaces and standard product telemetry access. If the employee previously held entitlements under cost center CC-SALES-01, all direct write access to customer transactional registries, including Salesforce Opportunity Editing, must be marked for removal within 48 hours.',
      },
    ];
  }
}