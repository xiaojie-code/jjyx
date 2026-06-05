import request from '@/utils/request'

export interface AppVersionForm {
  platform: string
  versionName: string
  versionCode: number
  downloadUrl: string
  forceUpdate: boolean
  changelog?: string
  fileSize?: number | null
  fileMd5?: string
  status: number
}

export function getAppVersions() {
  return request.get('/app-versions')
}

export function createAppVersion(data: AppVersionForm) {
  return request.post('/app-versions', data)
}

export function updateAppVersion(id: number, data: AppVersionForm) {
  return request.put(`/app-versions/${id}`, data)
}

export function deleteAppVersion(id: number) {
  return request.delete(`/app-versions/${id}`)
}
