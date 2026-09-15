import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type SmsGatewayResult = Record<string, any> | null;

export type SmsGatewayReceipt = {
  httpStatus: number;
  code: string | null;
  status: string | null;
  message: string | null;
  requestId: string | null;
};

export class SmsGatewayException extends BadRequestException {
  constructor(message: string, public readonly receipt?: SmsGatewayReceipt) {
    super(message);
  }
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private readonly configService: ConfigService) {}

  async sendActivationCode(input: {
    mobile: string;
    code: string;
    realName?: string;
  }) {
    const mobile = String(input.mobile || '').trim();
    const code = String(input.code || '').trim();

    if (!/^1[3-9]\d{9}$/.test(mobile)) {
      throw new BadRequestException('手机号格式不正确，需为11位且以13-19开头');
    }
    if (!code) {
      throw new BadRequestException('激活码不能为空');
    }

    const apiUrl = this.env(
      'SMS_API_URL',
      'https://gyytz.market.alicloudapi.com/sms/smsSend',
    );
    const appCode = this.env('SMS_APPCODE');
    const templateId = this.env(
      'SMS_TEMPLATE_ID',
      '6f81fbc375f844c9b3084ff65257fe3a',
    );
    const smsSignId =
      this.env('SMS_SIGN_ID', '8660ad50672642b297296cc7851781c4') ||
      this.env('SMS_SMS_SIGN_ID');
    const templateParamKey = this.env('SMS_TEMPLATE_PARAM_KEY', 'yzmCode');

    if (!appCode) throw new BadRequestException('短信 AppCode 未配置');
    if (!templateId) throw new BadRequestException('短信 templateId 未配置');
    if (!smsSignId) throw new BadRequestException('短信 smsSignId 未配置');

    const url = new URL(apiUrl);
    url.searchParams.set('mobile', mobile);
    url.searchParams.set('templateId', templateId);
    url.searchParams.set('smsSignId', smsSignId);
    url.searchParams.set('param', `**${templateParamKey}**:${code}`);

    let response: Response;
    let text = '';
    try {
      response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          Authorization: this.formatAppCode(appCode),
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        },
      });
      text = await response.text();
    } catch (error) {
      this.logger.error(`短信接口请求异常：${String(error)}`);
      throw new BadRequestException('短信接口请求失败，请检查网络或接口配置');
    }

    const result = this.parseJson(text);
    if (!response.ok) {
      this.logger.warn(`短信接口HTTP失败：${response.status} ${text}`);
      throw new SmsGatewayException(
        `短信接口请求失败(${response.status})：${this.pickGatewayMessage(result, text)}`,
        this.makeReceipt(response.status, result, text),
      );
    }

    if (!this.isGatewaySuccess(result, text)) {
      this.logger.warn(`短信接口返回失败：${text}`);
      throw new SmsGatewayException(
        `短信发送失败：${this.pickGatewayMessage(result, text)}`,
        this.makeReceipt(response.status, result, text),
      );
    }

    return {
      mobile,
      realName: String(input.realName || '').trim(),
      gatewayReceipt: this.makeReceipt(response.status, result, text),
    };
  }

  /** 发送密码重置临时密码。使用独立模板，避免和激活码短信混用。 */
  async sendPasswordReset(input: {
    mobile: string;
    password: string;
  }) {
    const mobile = String(input.mobile || '').trim();
    const password = String(input.password || '').trim();

    if (!/^1[3-9]\d{9}$/.test(mobile)) {
      throw new BadRequestException('手机号格式不正确，需为11位且以13-19开头');
    }
    if (!password) {
      throw new BadRequestException('临时密码不能为空');
    }

    const apiUrl = this.env(
      'SMS_API_URL',
      'https://gyytz.market.alicloudapi.com/sms/smsSend',
    );
    const appCode = this.env('SMS_APPCODE');
    const templateId = this.env('SMS_PASSWORD_RESET_TEMPLATE_ID');
    const smsSignId =
      this.env('SMS_PASSWORD_RESET_SIGN_ID') ||
      this.env('SMS_SIGN_ID', '8660ad50672642b297296cc7851781c4');
    const templateParamKey = this.env(
      'SMS_PASSWORD_RESET_PARAM_KEY',
      'newPassword',
    );

    if (!appCode) throw new BadRequestException('短信 AppCode 未配置');
    if (!templateId) {
      throw new BadRequestException('密码重置短信模板未配置');
    }
    if (!smsSignId) throw new BadRequestException('短信 smsSignId 未配置');

    const url = new URL(apiUrl);
    url.searchParams.set('mobile', mobile);
    url.searchParams.set('templateId', templateId);
    url.searchParams.set('smsSignId', smsSignId);
    url.searchParams.set('param', `**${templateParamKey}**:${password}`);

    let response: Response;
    let text = '';
    try {
      response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          Authorization: this.formatAppCode(appCode),
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        },
      });
      text = await response.text();
    } catch (error) {
      this.logger.error(`密码重置短信接口请求异常：${String(error)}`);
      throw new BadRequestException('短信接口请求失败，请检查网络或接口配置');
    }

    const result = this.parseJson(text);
    if (!response.ok || !this.isGatewaySuccess(result, text)) {
      this.logger.warn(`密码重置短信发送失败：${response.status} ${text}`);
      throw new SmsGatewayException(
        `短信发送失败：${this.pickGatewayMessage(result, text)}`,
        this.makeReceipt(response.status, result, text),
      );
    }

    return { mobile, gatewayReceipt: this.makeReceipt(response.status, result, text) };
  }

  private env(key: string, fallback = '') {
    return (this.configService.get<string>(key) || process.env[key] || fallback).trim();
  }

  private formatAppCode(appCode: string) {
    return appCode.toUpperCase().startsWith('APPCODE ')
      ? appCode
      : `APPCODE ${appCode}`;
  }

  private parseJson(text: string): SmsGatewayResult {
    try {
      return JSON.parse(text);
    } catch (_) {
      return null;
    }
  }

  private isGatewaySuccess(result: SmsGatewayResult, text: string) {
    // The marketplace endpoint returns HTTP 200 for business errors too.
    // An unknown response must never be treated as success.
    if (result) {
      if (typeof result.success !== 'undefined') {
        return this.parseSuccessFlag(result.success);
      }
      const keys = [
        'code', 'status', 'ret', 'respCode', 'error_code', 'errCode',
        'return_code', 'returnCode',
      ];
      for (const key of keys) {
        if (typeof result[key] === 'undefined' || result[key] === null) continue;
        return this.isSuccessValue(result[key]);
      }
      return false;
    }

    const normalized = String(text || '').trim().toLowerCase();
    return ['ok', 'success', 'succeed', '发送成功', '提交成功', '操作成功'].includes(normalized);
  }

  private parseSuccessFlag(value: unknown) {
    if (typeof value === 'boolean') return value;
    return this.isSuccessValue(value);
  }

  private isSuccessValue(value: unknown) {
    const normalized = String(value).trim().toLowerCase();
    return ['0', '0000', '00000', '200', 'ok', 'success', 'succeed', 'true'].includes(normalized);
  }

  private makeReceipt(
    httpStatus: number,
    result: SmsGatewayResult,
    text: string,
  ): SmsGatewayReceipt {
    const source = result || {};
    const first = (...keys: string[]) => {
      for (const key of keys) {
        if (source[key] !== undefined && source[key] !== null && source[key] !== '') {
          return String(source[key]).slice(0, 120);
        }
      }
      return null;
    };
    return {
      httpStatus: Number(httpStatus) || 0,
      code: first('code', 'respCode', 'error_code', 'errCode', 'return_code', 'returnCode'),
      status: first('status', 'ret', 'success'),
      message: this.pickGatewayMessage(result, text).slice(0, 200) || null,
      requestId: first('requestId', 'request_id', 'bizId', 'taskId', 'dataId'),
    };
  }

  private pickGatewayMessage(result: SmsGatewayResult, text: string) {
    if (result) {
      for (const key of ['message', 'msg', 'reason', 'error', 'desc']) {
        if (result[key]) return String(result[key]);
      }
    }
    return text ? text.slice(0, 200) : '未知错误';
  }
}
