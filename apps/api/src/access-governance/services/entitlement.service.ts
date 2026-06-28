import { Injectable } from '@nestjs/common';

export interface EmployeeEntitlement {
  systemName: string;
  entitlementKey: string;
  accessLevel: string;
}

@Injectable()
export class EntitlementService {
  async getActiveEntitlements(employeeId: string): Promise<EmployeeEntitlement[]> {
    return [
      {
        systemName: 'Salesforce',
        entitlementKey: 'SALESFORCE_OPPORTUNITY_EDIT',
        accessLevel: 'WRITE',
      },
      {
        systemName: 'Market Analytics',
        entitlementKey: 'MARKET_ANALYTICS_READ',
        accessLevel: 'READ',
      },
    ];
  }
}