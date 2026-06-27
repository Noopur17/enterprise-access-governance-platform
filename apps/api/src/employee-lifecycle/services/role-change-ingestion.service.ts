import { Injectable } from '@nestjs/common';
import { AccessReviewService } from '../../access-governance/services/access-review.service';
import { CreateRoleChangeEventDto } from '../dto/create-role-change-event.dto';

@Injectable()
export class RoleChangeIngestionService {
  constructor(private readonly accessReviewService: AccessReviewService) {}

  async ingestRoleChangeEvent(payload: CreateRoleChangeEventDto) {
    return this.accessReviewService.createFromRoleChangeEvent(payload);
  }
}