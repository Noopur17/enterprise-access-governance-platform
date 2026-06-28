import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface PolicyChunk {
  sectionId: string;
  policyVersion: string;
  text: string;
  score: number;
}

@Injectable()
export class PolicyIntelligenceService {
  async retrieveRelevantPolicies(input: {
    oldDepartment: string;
    oldCostCenter: string;
    newDepartment: string;
    newCostCenter: string;
  }): Promise<PolicyChunk[]> {
    const policyPath = path.join(
      process.cwd(),
      'data',
      'policies',
      'access-policy.md',
    );

    const policyText = fs.readFileSync(policyPath, 'utf-8');

    const chunks = this.chunkPolicy(policyText);

    const queryTerms = [
      input.oldDepartment,
      input.oldCostCenter,
      input.newDepartment,
      input.newCostCenter,
      'Salesforce',
      'CRM',
      'collaboration',
      'market analysis',
    ];

    return chunks
      .map((chunk) => ({
        ...chunk,
        score: this.scoreChunk(chunk.text, queryTerms),
      }))
      .filter((chunk) => chunk.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }

  private chunkPolicy(policyText: string): PolicyChunk[] {
    const sections = policyText.split(/\n## /).filter(Boolean);

    return sections.map((section) => {
      const normalized = section.startsWith('Section')
        ? `## ${section}`
        : section;

      const sectionMatch = normalized.match(/Section\s+([0-9.]+)/);
      const sectionId = sectionMatch?.[1] ?? 'unknown';

      return {
        sectionId,
        policyVersion: 'v2026.2',
        text: normalized.trim(),
        score: 0,
      };
    });
  }

  private scoreChunk(text: string, queryTerms: string[]): number {
    const lowerText = text.toLowerCase();

    return queryTerms.reduce((score, term) => {
      if (!term) return score;

      const normalizedTerm = term.toLowerCase();

      return lowerText.includes(normalizedTerm)
        ? score + 1
        : score;
    }, 0);
  }
}