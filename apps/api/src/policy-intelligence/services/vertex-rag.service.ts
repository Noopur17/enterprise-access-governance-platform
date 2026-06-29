import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { GoogleAuth } from 'google-auth-library';

export interface RetrievedPolicyChunk {
  sectionId: string;
  policyVersion: string;
  text: string;
  sourceUri: string;
  similarityScore: number;
}

type VertexRetrieveContextsResponse = {
  contexts?: {
    contexts?: Array<{
      sourceUri?: string;
      sourceDisplayName?: string;
      text?: string;
      score?: number;
    }>;
  };
};

@Injectable()
export class VertexRagService {
  private readonly logger = new Logger(VertexRagService.name);

  private readonly auth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });

  async retrievePolicyChunks(query: string): Promise<RetrievedPolicyChunk[]> {
    if (process.env.VERTEX_RAG_MOCK_ENABLED === 'true') {
      return this.retrieveMockPolicyChunks();
    }

    const projectId = process.env.GCP_PROJECT_ID;
    const location = process.env.GCP_LOCATION ?? 'us-central1';
    const ragCorpusId = process.env.VERTEX_RAG_CORPUS_ID;

    if (!projectId || !ragCorpusId) {
      throw new ServiceUnavailableException(
        'Vertex RAG is not configured. Required env vars: GCP_PROJECT_ID, VERTEX_RAG_CORPUS_ID.',
      );
    }

    const parent = `projects/${projectId}/locations/${location}`;
    const ragCorpus = `${parent}/ragCorpora/${ragCorpusId}`;
    const endpoint = `https://${location}-aiplatform.googleapis.com/v1beta1/${parent}:retrieveContexts`;

    const client = await this.auth.getClient();

    const response = await client.request<VertexRetrieveContextsResponse>({
      url: endpoint,
      method: 'POST',
      data: {
        query: {
          text: query,
          similarityTopK: 3,
        },
        vertexRagStore: {
          ragResources: [
            {
              ragCorpus,
            },
          ],
        },
      },
    });

    const chunks = response.data.contexts?.contexts ?? [];

    this.logger.log(
      `vertex_rag_retrieval_completed chunks=${chunks.length}, corpus=${ragCorpusId}`,
    );

    return chunks.map((chunk, index) => ({
      sectionId: this.extractSectionId(chunk.text ?? ''),
      policyVersion: this.extractPolicyVersion(chunk.text ?? ''),
      text: chunk.text ?? '',
      sourceUri: chunk.sourceUri ?? chunk.sourceDisplayName ?? 'vertex-rag',
      similarityScore: chunk.score ?? 0,
    })).filter((chunk) => chunk.text.length > 0);
  }

  private retrieveMockPolicyChunks(): RetrievedPolicyChunk[] {
    this.logger.warn(
      'VERTEX_RAG_MOCK_ENABLED=true. Returning local mock Vertex RAG response for demo only.',
    );

    return [
      {
        sectionId: '14.4',
        policyVersion: 'v2026.2',
        sourceUri:
          'gs://lifecyclesync-policy-docs/access-control-policy-v2026-2.pdf',
        similarityScore: 0.96,
        text:
          'TechGlobal Access Control Policy Manual (v2026.2) – Section 14.4. Employees transitioning into the Product Management & Marketing department require baseline access to common collaboration spaces and standard product telemetry. However, if a transitioning employee previously held entitlements under cost center CC-SALES-01 (Global Sales), all direct write access to customer transactional registries, such as Salesforce Opportunity Editing, must be marked for removal within 48 hours of transfer to prevent conflict-of-interest compliance drift. Standard read-only access to corporate market analysis systems may be safely retained without secondary administrative approval.',
      },
    ];
  }

  private extractSectionId(text: string): string {
    const match = text.match(/Section\s+([0-9.]+)/i);
    return match?.[1] ?? 'unknown';
  }

  private extractPolicyVersion(text: string): string {
    const match = text.match(/v20[0-9]{2}\.[0-9]+/i);
    return match?.[0] ?? 'unknown';
  }
}