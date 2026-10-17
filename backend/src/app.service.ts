import { Injectable } from '@nestjs/common';

export interface HealthStatus {
  status: string;
  service: string;
  timestamp: string;
  uptime: number;
}

@Injectable()
export class AppService {
  getHealth(): HealthStatus {
    return {
      status: 'ok',
      service: 'vibelearn-backend',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
    };
  }
}
