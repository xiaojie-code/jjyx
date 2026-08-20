import {
  CanActivate,
  ExecutionContext,
  HttpException,
  Injectable,
} from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class GameVersionGuard implements CanActivate {
  constructor(private readonly dataSource: DataSource) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const platform = String(request.headers['x-app-platform'] || 'android')
      .trim()
      .toLowerCase();
    if (platform !== 'android') return true;

    const rows = await this.dataSource.query(
      `SELECT version_name AS versionName, version_code AS versionCode
       FROM app_versions
       WHERE platform = 'android' AND status = 1 AND force_update = 1
       ORDER BY version_code DESC, id DESC
       LIMIT 1`,
    );
    const requiredVersion = rows?.[0];
    if (!requiredVersion) return true;

    const minimumCode = Number(requiredVersion.versionCode || 0);
    const currentCode = Number(request.headers['x-app-version-code'] || 0);
    if (minimumCode <= 0 || currentCode >= minimumCode) return true;

    throw new HttpException(
      `当前版本过低，请更新至${requiredVersion.versionName || '最新版本'}后进入游戏`,
      426,
    );
  }
}
