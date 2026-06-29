import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';

@Injectable()
export class DownstreamRateLimiterService {
  private readonly logger = new Logger(DownstreamRateLimiterService.name);
  private readonly maxRequestsPerMinute = 60;

  constructor(private readonly prisma: PrismaService) {}

  async acquire(systemName: string): Promise<boolean> {
    const normalizedSystem = systemName.toUpperCase();
    const windowStart = this.getCurrentMinuteWindow();

    const existing = await this.prisma.downstreamRateLimitWindow.findUnique({
      where: {
        systemName_windowStart: {
          systemName: normalizedSystem,
          windowStart,
        },
      },
    });

    if (!existing) {
      try {
        await this.prisma.downstreamRateLimitWindow.create({
          data: {
            systemName: normalizedSystem,
            windowStart,
            requestCount: 1,
          },
        });

        return true;
      } catch {
        return this.acquire(normalizedSystem);
      }
    }

    if (existing.requestCount >= this.maxRequestsPerMinute) {
      this.logger.warn(
        `Rate limit reached for system=${normalizedSystem}, window=${windowStart.toISOString()}`,
      );
      return false;
    }

    const updated = await this.prisma.downstreamRateLimitWindow.updateMany({
      where: {
        id: existing.id,
        requestCount: {
          lt: this.maxRequestsPerMinute,
        },
      },
      data: {
        requestCount: {
          increment: 1,
        },
      },
    });

    return updated.count === 1;
  }

  getNextWindowStart(): Date {
    const now = new Date();
    now.setSeconds(0, 0);
    now.setMinutes(now.getMinutes() + 1);
    return now;
  }

  private getCurrentMinuteWindow(): Date {
    const now = new Date();
    now.setSeconds(0, 0);
    return now;
  }
}