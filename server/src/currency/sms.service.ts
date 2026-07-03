import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type SmsGatewayResult = Record<string, any> | null;

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
      throw new BadRequestException(
        `短信接口请求失败(${response.status})：${this.pickGatewayMessage(result, text)}`,
      );
    }

    if (!this.isGatewaySuccess(result, text)) {
      this.logger.warn(`短信接口返回失败：${text}`);
      throw new BadRequestException(
        `短信发送失败：${this.pickGatewayMessage(result, text)}`,
      );
    }

    return {
      mobile,
      realName: String(input.realName || '').trim(),
      gatewayResult: result || text,
    };
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
    if (result) {
      if (typeof result.success !== 'undefined') return !!result.success;
      const keys = ['code', 'status', 'ret', 'respCode', 'error_code', 'errCode', 'return_code', 'returnCode'];
      for (const key of keys) {
        if (typeof result[key] === 'undefined') continue;
        const value = String(result[key]).toLowerCase();
        return ['0', '00000', '200', 'ok', 'success', 'true'].includes(value);
      }
      const message = this.pickGatewayMessage(result, text);
      if (message) return /成功|success|ok/i.test(message);
      return true;
    }

    return !/失败|错误|error|fail/i.test(text);
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
