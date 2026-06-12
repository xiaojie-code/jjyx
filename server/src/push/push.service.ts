import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { createHash } from 'crypto';
import { PushDevice } from '../entities/push-device.entity';
import { UserSetting } from '../entities/user-setting.entity';
import {
  RegisterPushDeviceDto,
  UnregisterPushDeviceDto,
} from './dto/register-push-device.dto';
import { PushPayload, PushSendResult } from './push.types';

type TokenCache = {
  token: string;
  expiresAt: number;
};

@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger(PushService.name);
  private readonly tokenCache = new Map<string, TokenCache>();

  constructor(
    @InjectRepository(PushDevice)
    private readonly pushDeviceRepo: Repository<PushDevice>,
    @InjectRepository(UserSetting)
    private readonly settingRepo: Repository<UserSetting>,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    await this.ensureTable();
  }

  async registerDevice(userId: number, dto: RegisterPushDeviceDto) {
    const vendor = this.normalizeVendor(dto.vendor);
    const token = dto.deviceToken.trim();
    let device = await this.pushDeviceRepo.findOne({
      where: { vendor, deviceToken: token },
    });

    if (!device) {
      device = this.pushDeviceRepo.create({
        vendor,
        deviceToken: token,
      });
    }

    device.userId = Number(userId);
    device.platform = dto.platform || 'android';
    device.deviceId = dto.deviceId || null;
    device.manufacturer = dto.manufacturer || null;
    device.model = dto.model || null;
    device.appVersion = dto.appVersion || null;
    device.enabled = dto.enabled ?? true;
    device.lastRegisteredAt = new Date();

    const saved = await this.pushDeviceRepo.save(device);
    return {
      id: saved.id,
      vendor: saved.vendor,
      enabled: saved.enabled,
      lastRegisteredAt: saved.lastRegisteredAt,
    };
  }

  async unregisterDevice(userId: number, dto: UnregisterPushDeviceDto) {
    const query = this.pushDeviceRepo
      .createQueryBuilder()
      .update(PushDevice)
      .set({ enabled: false })
      .where('user_id = :userId', { userId: Number(userId) });

    if (dto.deviceToken?.trim()) {
      query.andWhere('device_token = :token', {
        token: dto.deviceToken.trim(),
      });
    } else if (dto.deviceId?.trim()) {
      query.andWhere('device_id = :deviceId', {
        deviceId: dto.deviceId.trim(),
      });
    }

    if (dto.vendor) {
      query.andWhere('vendor = :vendor', {
        vendor: this.normalizeVendor(dto.vendor),
      });
    }

    const result = await query.execute();
    return { affected: result.affected ?? 0 };
  }

  async getUserPushStatus(userId: number) {
    const devices = await this.pushDeviceRepo.find({
      where: { userId: Number(userId), enabled: true },
      order: { updatedAt: 'DESC' },
    });
    return {
      configuredVendors: this.getConfiguredVendors(),
      activeDevices: devices.map((device) => ({
        id: device.id,
        platform: device.platform,
        vendor: device.vendor,
        deviceId: device.deviceId,
        manufacturer: device.manufacturer,
        model: device.model,
        appVersion: device.appVersion,
        lastRegisteredAt: device.lastRegisteredAt,
      })),
    };
  }

  async sendChatMessageNotification(params: {
    recipientId: number;
    senderName: string;
    messageId: number;
    conversationId: number;
    senderId: number;
    msgType: number;
    content: string;
  }): Promise<PushSendResult[]> {
    return this.sendToUser(Number(params.recipientId), {
      title: params.senderName || '新消息',
      body: this.previewMessage(params.msgType, params.content),
      data: {
        type: 'chat_message',
        messageId: Number(params.messageId),
        conversationId: Number(params.conversationId),
        senderId: Number(params.senderId),
        msgType: Number(params.msgType),
        route: 'chat',
      },
    });
  }

  async sendToUser(
    userId: number,
    payload: PushPayload,
  ): Promise<PushSendResult[]> {
    const settings = await this.settingRepo.findOne({
      where: { userId: Number(userId) },
    });
    if (settings && settings.notificationEnabled === false) {
      return [{ vendor: 'all', ok: false, reason: 'notification disabled' }];
    }

    const devices = await this.pushDeviceRepo.find({
      where: { userId: Number(userId), enabled: true },
    });
    if (devices.length === 0) {
      return [{ vendor: 'none', ok: false, reason: 'no active push device' }];
    }

    const results: PushSendResult[] = [];
    for (const device of devices) {
      try {
        results.push(await this.sendToDevice(device, payload));
      } catch (error) {
        const reason = String(error);
        this.logger.warn(
          `Push failed: user=${userId}, vendor=${device.vendor}, reason=${reason}`,
        );
        results.push({
          vendor: device.vendor,
          deviceId: Number(device.id),
          ok: false,
          reason,
        });
      }
    }
    return results;
  }

  async sendTestPush(userId: number) {
    return this.sendToUser(Number(userId), {
      title: '新消息测试',
      body: '这是一条厂商推送测试消息',
      data: {
        type: 'push_test',
        route: 'chat',
      },
    });
  }

  private async sendToDevice(
    device: PushDevice,
    payload: PushPayload,
  ): Promise<PushSendResult> {
    switch (this.normalizeVendor(device.vendor)) {
      case 'xiaomi':
        return this.sendXiaomi(device, payload);
      case 'huawei':
        return this.sendHuaweiLike('huawei', device, payload);
      case 'honor':
        return this.sendHuaweiLike('honor', device, payload);
      case 'oppo':
        return this.sendOppo(device, payload);
      case 'vivo':
        return this.sendVivo(device, payload);
      case 'meizu':
        return this.sendMeizu(device, payload);
      default:
        return {
          vendor: device.vendor,
          deviceId: Number(device.id),
          ok: false,
          reason: 'unsupported vendor',
        };
    }
  }

  private async sendXiaomi(
    device: PushDevice,
    payload: PushPayload,
  ): Promise<PushSendResult> {
    const secret = this.env('PUSH_XIAOMI_APP_SECRET');
    const packageName =
      this.env('PUSH_XIAOMI_PACKAGE_NAME') ||
      this.env('ANDROID_PACKAGE_NAME') ||
      'com.example.app';
    if (!secret) return this.skip(device, 'PUSH_XIAOMI_APP_SECRET missing');

    const response = await this.postForm(
      this.env('PUSH_XIAOMI_SEND_URL') ||
        'https://api.xmpush.xiaomi.com/v3/message/regid',
      {
        registration_id: device.deviceToken,
        restricted_package_name: packageName,
        title: payload.title,
        description: payload.body,
        payload: JSON.stringify(payload.data ?? {}),
        pass_through: '0',
        notify_type: '-1',
        'extra.notify_foreground': '1',
        'extra.channel_id': 'new_message_alert_v2',
      },
      {
        Authorization: `key=${secret}`,
      },
    );
    return this.httpResult(device, response);
  }

  private async sendHuaweiLike(
    vendor: 'huawei' | 'honor',
    device: PushDevice,
    payload: PushPayload,
  ): Promise<PushSendResult> {
    const prefix = vendor === 'huawei' ? 'PUSH_HUAWEI' : 'PUSH_HONOR';
    const appId = this.env(`${prefix}_APP_ID`) || this.env(`${prefix}_CLIENT_ID`);
    const clientId = this.env(`${prefix}_CLIENT_ID`) || appId;
    const clientSecret = this.env(`${prefix}_CLIENT_SECRET`);
    if (!appId || !clientId || !clientSecret) {
      return this.skip(
        device,
        `${prefix}_APP_ID/${prefix}_CLIENT_ID/${prefix}_CLIENT_SECRET missing`,
      );
    }

    const tokenUrl =
      this.env(`${prefix}_TOKEN_URL`) ||
      (vendor === 'huawei'
        ? 'https://oauth-login.cloud.huawei.com/oauth2/v3/token'
        : 'https://iam.developer.hihonor.com/auth/token');
    const sendUrl =
      this.env(`${prefix}_SEND_URL`) ||
      (vendor === 'huawei'
        ? `https://push-api.cloud.huawei.com/v1/${appId}/messages:send`
        : `https://push-api.cloud.hihonor.com/v1/${appId}/messages:send`);
    const accessToken = await this.getOAuthToken(
      `${vendor}:${clientId}`,
      tokenUrl,
      clientId,
      clientSecret,
    );

    const response = await this.postJson(
      sendUrl,
      {
        validate_only: false,
        message: {
          token: [device.deviceToken],
          notification: {
            title: payload.title,
            body: payload.body,
          },
          data: JSON.stringify(payload.data ?? {}),
          android: {
            notification: {
              foreground_show: true,
              importance: 'HIGH',
              category: 'IM',
              click_action: {
                type: 3,
              },
            },
          },
        },
      },
      {
        Authorization: `Bearer ${accessToken}`,
      },
    );
    return this.httpResult(device, response);
  }

  private async sendOppo(
    device: PushDevice,
    payload: PushPayload,
  ): Promise<PushSendResult> {
    const appKey = this.env('PUSH_OPPO_APP_KEY');
    const masterSecret = this.env('PUSH_OPPO_MASTER_SECRET');
    if (!appKey || !masterSecret) {
      return this.skip(device, 'PUSH_OPPO_APP_KEY/PUSH_OPPO_MASTER_SECRET missing');
    }

    const authToken = await this.getOppoAuthToken(appKey, masterSecret);
    const response = await this.postForm(
      this.env('PUSH_OPPO_SEND_URL') ||
        'https://api.push.oppomobile.com/server/v1/message/notification/unicast',
      {
        auth_token: authToken,
        target_type: '2',
        target_value: device.deviceToken,
        title: payload.title,
        content: payload.body,
        click_action_type: '4',
        click_action_activity: 'com.example.app.MainActivity',
        action_parameters: JSON.stringify(payload.data ?? {}),
      },
    );
    return this.httpResult(device, response);
  }

  private async sendVivo(
    device: PushDevice,
    payload: PushPayload,
  ): Promise<PushSendResult> {
    const appId = this.env('PUSH_VIVO_APP_ID');
    const appKey = this.env('PUSH_VIVO_APP_KEY');
    const appSecret = this.env('PUSH_VIVO_APP_SECRET');
    if (!appId || !appKey || !appSecret) {
      return this.skip(
        device,
        'PUSH_VIVO_APP_ID/PUSH_VIVO_APP_KEY/PUSH_VIVO_APP_SECRET missing',
      );
    }

    const authToken = await this.getVivoAuthToken(appId, appKey, appSecret);
    const response = await this.postJson(
      this.env('PUSH_VIVO_SEND_URL') ||
        'https://api-push.vivo.com.cn/message/send',
      {
        regId: device.deviceToken,
        notifyType: 4,
        title: payload.title,
        content: payload.body,
        skipType: 4,
        skipContent: JSON.stringify(payload.data ?? {}),
        requestId: `${Date.now()}-${device.id}`,
      },
      {
        authToken,
      },
    );
    return this.httpResult(device, response);
  }

  private async sendMeizu(
    device: PushDevice,
    payload: PushPayload,
  ): Promise<PushSendResult> {
    const appId = this.env('PUSH_MEIZU_APP_ID');
    const appSecret = this.env('PUSH_MEIZU_APP_SECRET');
    if (!appId || !appSecret) {
      return this.skip(device, 'PUSH_MEIZU_APP_ID/PUSH_MEIZU_APP_SECRET missing');
    }

    const messageJson = JSON.stringify({
      noticeBarInfo: {
        title: payload.title.slice(0, 32),
        content: payload.body.slice(0, 100),
      },
      noticeExpandInfo: {
        noticeExpandType: 1,
        noticeExpandContent: payload.body.slice(0, 100),
      },
      clickTypeInfo: {
        clickType: 3,
        parameters: JSON.stringify(payload.data ?? {}),
      },
    });
    const sign = this.md5(`appId=${appId}messageJson=${messageJson}pushIds=${device.deviceToken}pushType=0${appSecret}`);
    const response = await this.postForm(
      this.env('PUSH_MEIZU_SEND_URL') ||
        'https://server-api-push.meizu.com/garcia/api/server/message/pushToPushId',
      {
        appId,
        pushType: '0',
        pushIds: device.deviceToken,
        messageJson,
        sign,
      },
    );
    return this.httpResult(device, response);
  }

  private async getOAuthToken(
    cacheKey: string,
    tokenUrl: string,
    clientId: string,
    clientSecret: string,
  ): Promise<string> {
    const cached = this.tokenCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;

    const response = await this.postForm(tokenUrl, {
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    });
    const data = this.parseJson(response.text);
    const token = data?.access_token || data?.accessToken;
    if (!token) throw new Error(`OAuth token missing: ${response.text}`);
    const expiresIn = Number(data?.expires_in || data?.expiresIn || 3600);
    this.tokenCache.set(cacheKey, {
      token,
      expiresAt: Date.now() + Math.max(60, expiresIn - 60) * 1000,
    });
    return token;
  }

  private async getOppoAuthToken(
    appKey: string,
    masterSecret: string,
  ): Promise<string> {
    const cacheKey = `oppo:${appKey}`;
    const cached = this.tokenCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;

    const timestamp = Date.now().toString();
    const sign = this.sha256(`${appKey}${timestamp}${masterSecret}`);
    const response = await this.postForm(
      this.env('PUSH_OPPO_AUTH_URL') ||
        'https://api.push.oppomobile.com/server/v1/auth',
      {
        app_key: appKey,
        timestamp,
        sign,
      },
    );
    const data = this.parseJson(response.text);
    const token = data?.data?.auth_token || data?.auth_token;
    if (!token) throw new Error(`OPPO auth_token missing: ${response.text}`);
    this.tokenCache.set(cacheKey, {
      token,
      expiresAt: Date.now() + 23 * 60 * 60 * 1000,
    });
    return token;
  }

  private async getVivoAuthToken(
    appId: string,
    appKey: string,
    appSecret: string,
  ): Promise<string> {
    const cacheKey = `vivo:${appId}`;
    const cached = this.tokenCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;

    const timestamp = Date.now().toString();
    const sign = this.md5(`${appId}${appKey}${timestamp}${appSecret}`);
    const response = await this.postJson(
      this.env('PUSH_VIVO_AUTH_URL') ||
        'https://api-push.vivo.com.cn/message/auth',
      {
        appId,
        appKey,
        timestamp,
        sign,
      },
    );
    const data = this.parseJson(response.text);
    const token = data?.authToken || data?.data?.authToken;
    if (!token) throw new Error(`vivo authToken missing: ${response.text}`);
    this.tokenCache.set(cacheKey, {
      token,
      expiresAt: Date.now() + 23 * 60 * 60 * 1000,
    });
    return token;
  }

  private async postJson(
    url: string,
    body: Record<string, any>,
    headers: Record<string, string> = {},
  ): Promise<{ ok: boolean; status: number; text: string }> {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
    return {
      ok: response.ok,
      status: response.status,
      text: await response.text(),
    };
  }

  private async postForm(
    url: string,
    body: Record<string, string | number | boolean>,
    headers: Record<string, string> = {},
  ): Promise<{ ok: boolean; status: number; text: string }> {
    const form = new URLSearchParams();
    for (const [key, value] of Object.entries(body)) {
      form.append(key, String(value));
    }
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        ...headers,
      },
      body: form,
      signal: AbortSignal.timeout(10_000),
    });
    return {
      ok: response.ok,
      status: response.status,
      text: await response.text(),
    };
  }

  private httpResult(
    device: PushDevice,
    response: { ok: boolean; status: number; text: string },
  ): PushSendResult {
    return {
      vendor: device.vendor,
      deviceId: Number(device.id),
      ok: response.ok,
      reason: response.ok ? undefined : `${response.status}: ${response.text}`,
    };
  }

  private skip(device: PushDevice, reason: string): PushSendResult {
    this.logger.warn(`Skip ${device.vendor} push: ${reason}`);
    return {
      vendor: device.vendor,
      deviceId: Number(device.id),
      ok: false,
      reason,
    };
  }

  private previewMessage(msgType: number, content: string): string {
    switch (Number(msgType)) {
      case 2:
        return '[语音]';
      case 4:
        return '[图片]';
      case 6:
        return '[撤回了一条消息]';
      default:
        return (content || '你收到了一条新消息').slice(0, 80);
    }
  }

  private getConfiguredVendors() {
    return {
      xiaomi: Boolean(this.env('PUSH_XIAOMI_APP_SECRET')),
      huawei: Boolean(
        (this.env('PUSH_HUAWEI_APP_ID') ||
          this.env('PUSH_HUAWEI_CLIENT_ID')) &&
          this.env('PUSH_HUAWEI_CLIENT_SECRET'),
      ),
      honor: Boolean(
        (this.env('PUSH_HONOR_APP_ID') || this.env('PUSH_HONOR_CLIENT_ID')) &&
          this.env('PUSH_HONOR_CLIENT_SECRET'),
      ),
      oppo: Boolean(
        this.env('PUSH_OPPO_APP_KEY') && this.env('PUSH_OPPO_MASTER_SECRET'),
      ),
      vivo: Boolean(
        this.env('PUSH_VIVO_APP_ID') &&
          this.env('PUSH_VIVO_APP_KEY') &&
          this.env('PUSH_VIVO_APP_SECRET'),
      ),
      meizu: Boolean(
        this.env('PUSH_MEIZU_APP_ID') && this.env('PUSH_MEIZU_APP_SECRET'),
      ),
    };
  }

  private normalizeVendor(vendor: string): string {
    const value = (vendor || 'unknown').trim().toLowerCase();
    if (value === 'redmi') return 'xiaomi';
    if (value === 'oneplus' || value === 'realme') return 'oppo';
    if (value === 'iqoo') return 'vivo';
    return value;
  }

  private env(key: string): string {
    return (this.configService.get<string>(key) || process.env[key] || '').trim();
  }

  private parseJson(text: string): any {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  private sha256(input: string): string {
    return createHash('sha256').update(input).digest('hex');
  }

  private md5(input: string): string {
    return createHash('md5').update(input).digest('hex');
  }

  private async ensureTable() {
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS push_devices (
        id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        platform VARCHAR(20) NOT NULL DEFAULT 'android',
        vendor VARCHAR(32) NOT NULL,
        device_token VARCHAR(512) NOT NULL,
        device_id VARCHAR(128) NULL,
        manufacturer VARCHAR(64) NULL,
        model VARCHAR(128) NULL,
        app_version VARCHAR(32) NULL,
        enabled TINYINT(1) NOT NULL DEFAULT 1,
        last_registered_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_push_devices_vendor_token (vendor, device_token),
        INDEX idx_push_devices_user (user_id),
        INDEX idx_push_devices_user_enabled (user_id, enabled)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    const alters = [
      `ALTER TABLE push_devices ADD COLUMN platform VARCHAR(20) NOT NULL DEFAULT 'android'`,
      `ALTER TABLE push_devices ADD COLUMN vendor VARCHAR(32) NOT NULL DEFAULT 'unknown'`,
      `ALTER TABLE push_devices ADD COLUMN device_token VARCHAR(512) NOT NULL DEFAULT ''`,
      `ALTER TABLE push_devices ADD COLUMN device_id VARCHAR(128) NULL`,
      `ALTER TABLE push_devices ADD COLUMN manufacturer VARCHAR(64) NULL`,
      `ALTER TABLE push_devices ADD COLUMN model VARCHAR(128) NULL`,
      `ALTER TABLE push_devices ADD COLUMN app_version VARCHAR(32) NULL`,
      `ALTER TABLE push_devices ADD COLUMN enabled TINYINT(1) NOT NULL DEFAULT 1`,
      `ALTER TABLE push_devices ADD COLUMN last_registered_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`,
      `ALTER TABLE push_devices ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`,
      `ALTER TABLE push_devices ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`,
    ];
    for (const sql of alters) {
      try {
        await this.dataSource.query(sql);
      } catch (_) {}
    }

    const indexes = [
      `CREATE UNIQUE INDEX uk_push_devices_vendor_token ON push_devices (vendor, device_token)`,
      `CREATE INDEX idx_push_devices_user ON push_devices (user_id)`,
      `CREATE INDEX idx_push_devices_user_enabled ON push_devices (user_id, enabled)`,
    ];
    for (const sql of indexes) {
      try {
        await this.dataSource.query(sql);
      } catch (_) {}
    }
  }
}
