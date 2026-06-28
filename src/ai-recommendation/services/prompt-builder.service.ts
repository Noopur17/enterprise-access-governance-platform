import { Injectable } from '@nestjs/common';

@Injectable()
export class PromptBuilderService {
  buildRecommendationPrompt(input: {
    roleChange: unknown;
    currentEntitlements: unknown[];
    policyEvidence: unknown[];
  }): string {
    return JSON.stringify(
      {
        task: 'Generate access review recommendations.',
        rules: [
          'Return only structured JSON.',
          'Allowed actions are ADD, REMOVE, KEEP.',
          'Every recommendation must include a policy citation.',
          'Do not execute access changes.',
        ],
        context: input,
      },
      null,
      2,
    );
  }
}