import request from '@/utils/request'

export function getRechargeOrders(params: {
  status?: string | number
  keyword?: string
  page?: number
  pageSize?: number
}) {
  return request.get('/recharge/orders', { params })
}

export function getRechargeStats() {
  return request.get('/recharge/stats')
}

export function reviewRecharge(id: number, data: { action: 'approve' | 'reject'; remark?: string }) {
  return request.put(`/recharge/${id}/review`, data)
}

export function sendRechargeActivationCode(id: number, data: { code?: string } = {}) {
  return request.post(`/recharge/${id}/send-code`, data)
}

/** 上传收款码图片，返回 { url } */
export function uploadRechargeQrcode(formData: FormData) {
  return request.post('/recharge/qrcode', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

/** 系统配置读写（复用 admin/configs） */
export function getConfigs() {
  return request.get('/configs')
}

export function updateConfig(key: string, value: string) {
  return request.put(`/configs/${key}`, { value })
}
