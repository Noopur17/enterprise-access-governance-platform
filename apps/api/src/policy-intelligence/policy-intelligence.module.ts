import { Module } from '@nestjs/common';
import { PolicyIntelligenceService } from './services/policy-intelligence.service';
import { VertexRagService } from './services/vertex-rag.service';

@Module({
  providers: [PolicyIntelligenceService, VertexRagService],
  exports: [PolicyIntelligenceService],
})
export class PolicyIntelligenceModule {}