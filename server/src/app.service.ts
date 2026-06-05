import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class AppService {
  constructor(private readonly dataSource: DataSource) {}

  getHello(): string {
    return 'Hello World!';
  }

  async ensureAppVersionsTable() {
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS app_versions (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        platform VARCHAR(20) NOT NULL DEFAULT 'android',
        version_name VARCHAR(50) NOT NULL,
        version_code INT NOT NULL,
        download_url VARCHAR(500) NOT NULL,
        force_update TINYINT NOT NULL DEFAULT 0,
        changelog TEXT NULL,
        file_size BIGINT NULL,
        file_md5 VARCHAR(64) NULL,
        status TINYINT NOT NULL DEFAULT 1 COMMENT '1 enabled, 0 disabled',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_app_versions_platform_status_code (platform, status, version_code)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    // 兼容旧表：补充 file_md5 字段
    try {
      await this.dataSource.query(`ALTER TABLE app_versions ADD COLUMN file_md5 VARCHAR(64) NULL`);
    } catch (_) {}
  }

  async getLatestAppVersion(platform = 'android') {
    await this.ensureAppVersionsTable();
    const rows = await this.dataSource.query(
      `SELECT id, platform, version_name AS versionName, version_code AS versionCode,
              download_url AS downloadUrl, force_update AS forceUpdate,
              changelog, file_size AS fileSize, file_md5 AS fileMd5, created_at AS createdAt
       FROM app_versions
       WHERE platform = ? AND status = 1
       ORDER BY version_code DESC, id DESC
       LIMIT 1`,
      [platform || 'android'],
    );
    const version = rows?.[0] || null;
    if (!version) return null;
    return {
      ...version,
      versionCode: Number(version.versionCode),
      forceUpdate: Number(version.forceUpdate) === 1,
      fileSize: version.fileSize == null ? null : Number(version.fileSize),
      fileMd5: version.fileMd5 || null,
    };
  }
}
