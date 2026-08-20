import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  HttpException,
  Injectable,
} from '@nestjs/common';
import { DataSource } from 'typeorm';

const GAME_UPDATE_MESSAGE =
  '为了获得更稳定、流畅的游戏体验，请先将 APP 更新至最新版本，更新完成后即可继续游戏。';

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
    const rawVersionCode = request.headers['x-app-version-code'];
    const currentCode = Number(rawVersionCode || 0);
    if (minimumCode <= 0 || currentCode >= minimumCode) return true;

    if (rawVersionCode == null || String(rawVersionCode).trim() === '') {
      throw new BadRequestException(GAME_UPDATE_MESSAGE);
    }

    throw new HttpException(GAME_UPDATE_MESSAGE, 426);
  }
}
