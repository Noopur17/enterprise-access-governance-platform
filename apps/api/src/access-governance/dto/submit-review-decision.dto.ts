import { IsEmail, IsIn, IsOptional, IsString } from 'class-validator';

export class SubmitReviewDecisionDto {
  @IsIn(['APPROVE', 'REJECT'])
  decision!: 'APPROVE' | 'REJECT';

  @IsEmail()
  reviewerEmail!: string;

  @IsOptional()
  @IsString()
  comments?: string;
}