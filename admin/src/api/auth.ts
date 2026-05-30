import request from '@/utils/request'

export function adminLogin(data: { account: string; password: string }) {
  // 管理端复用用户登录接口，后端会校验 userType
  return request.post('/auth/login', data, { baseURL: '/api' })
}
