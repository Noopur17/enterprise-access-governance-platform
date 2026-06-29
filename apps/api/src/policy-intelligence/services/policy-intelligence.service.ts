import { Injectable, Logger } from '@nestjs/common';
import {
  RetrievedPolicyChunk,
  VertexRagService,
} from './vertex-rag.service';

export type PolicyChunk = RetrievedPolicyChunk;

@Injectable()
export class PolicyIntelligenceService {
  private readonly logger = new Logger(PolicyIntelligenceService.name);

  constructor(private readonly vertexRagService: VertexRagService) {}

  async retrieveRelevantPolicies(input: {
    oldDepartment: string;
    oldCostCenter: string;
    newDepartment: string;
    newCostCenter: string;
    currentEntitlements?: Array<{
      systemName: string;
      entitlementKey: string;
      accessLevel: string;
    }>;
  }): Promise<PolicyChunk[]> {
    const query = this.buildPolicyRetrievalQuery(input);

    const chunks = await this.vertexRagService.retrievePolicyChunks(query);

    this.logger.log(
      `policy_retrieval_completed provider=vertex_rag chunks=${chunks.length}`,
    );

    return chunks;
  }

  private buildPolicyRetrievalQuery(input: {
    oldDepartment: string;
    oldCostCenter: string;
    newDepartment: string;
    newCostCenter: string;
    currentEntitlements?: Array<{
      systemName: string;
      entitlementKey: string;
      accessLevel: string;
    }>;
  }): string {
    const entitlementSummary =
      input.currentEntitlements
        ?.map(
          (item) =>
            `${item.systemName}:${item.entitlementKey}:${item.accessLevel}`,
        )
        .join(', ') ?? 'No active entitlements supplied.';

    return [
      'Find access control policy requirements for an employee role transfer.',
      `Old department: ${input.oldDepartment}.`,
      `Old cost center: ${input.oldCostCenter}.`,
      `New department: ${input.newDepartment}.`,
      `New cost center: ${input.newCostCenter}.`,
      `Current active entitlements: ${entitlementSummary}.`,
      'Return policies that explain which entitlements should be removed, kept, or added.',
    ].join(' ');
  }
}