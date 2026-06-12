import { PushDevice } from '../entities/push-device.entity';

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string | number | boolean | null | undefined>;
}

export interface PushSendResult {
  vendor: string;
  deviceId?: number;
  ok: boolean;
  reason?: string;
}

export interface PushProvider {
  vendor: string;
  send(device: PushDevice, payload: PushPayload): Promise<PushSendResult>;
}
