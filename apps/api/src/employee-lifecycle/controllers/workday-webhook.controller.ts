import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { RoleChangeIngestionService } from '../services/role-change-ingestion.service';

@Controller('webhooks/workday')
export class WorkdayWebhookController {
  constructor(
    private readonly roleChangeIngestionService: RoleChangeIngestionService,
  ) {}

  @Post('role-change')
  @HttpCode(HttpStatus.ACCEPTED)
  async receiveRoleChangeWebhook(@Body() payload: unknown) {
    return this.roleChangeIngestionService.ingestWorkdayRoleChangeWebhook(
      payload,
    );
  }
}