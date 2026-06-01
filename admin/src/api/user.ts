import request from '@/utils/request'

// 用户列表
export function getUserList(params: {
  page?: number
  pageSize?: number
  keyword?: string
  status?: number
}) {
  return request.get('/users', { params })
}

export function getUserStats() {
  return request.get('/user-stats')
}

// 用户详情
export function getUserDetail(id: number) {
  return request.get(`/users/${id}`)
}

// 编辑用户
export function updateUser(id: number, data: Record<string, any>) {
  return request.put(`/users/${id}`, data)
}

// 启用/封禁
export function updateUserStatus(id: number, status: number) {
  return request.put(`/users/${id}/status`, { status })
}

// 添加货币
export function addUserCurrency(id: number, data: { type: string; amount: number }) {
  return request.post(`/users/${id}/currency`, data)
}

// 用户流水
export function getUserLogs(id: number, params: { sn?: string; page?: number; pageSize?: number }) {
  return request.get(`/users/${id}/logs`, { params })
}

// 用户动态
export function getUserActivities(id: number, params: { type?: string; page?: number; pageSize?: number }) {
  return request.get(`/users/${id}/activities`, { params })
}

// 用户背包
export function getUserBackpack(id: number) {
  return request.get(`/users/${id}/backpack`)
}

export function getPasswordResetRequests(params?: { status?: number }) {
  return request.get('/password-reset/requests', { params })
}

export function resetPasswordByRequest(id: number) {
  return request.post(`/password-reset/${id}/reset`)
}

export function rejectPasswordResetRequest(id: number) {
  return request.post(`/password-reset/${id}/reject`)
}
