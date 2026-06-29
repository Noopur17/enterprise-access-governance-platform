import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { maskEmployeeId } from '../../common/security/masking';

export interface EmployeeEntitlement {
  systemName: string;
  entitlementKey: string;
  accessLevel: string;
  grantedAt: Date;
}

@Injectable()
export class EntitlementService {
  private readonly logger = new Logger(EntitlementService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getActiveEntitlements(
    employeeId: string,
  ): Promise<EmployeeEntitlement[]> {
    const entitlements = await this.prisma.employeeEntitlement.findMany({
      where: {
        employeeId,
        isActive: true,
      },
      orderBy: {
        grantedAt: 'asc',
      },
      select: {
        systemName: true,
        entitlementKey: true,
        accessLevel: true,
        grantedAt: true,
      },
    });

    this.logger.log(
      `Loaded active entitlements count=${entitlements.length}, employee=${maskEmployeeId(
        employeeId,
      )}`,
    );

    return entitlements;
  }
}