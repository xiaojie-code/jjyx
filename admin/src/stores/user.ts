import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getToken, setToken, removeToken } from '@/utils/auth'

interface UserInfo {
  id: number
  account: string
  nickname: string
  avatar: string
}

export const useUserStore = defineStore('user', () => {
  const token = ref<string | null>(getToken())
  const userInfo = ref<UserInfo | null>(null)

  function login(newToken: string) {
    token.value = newToken
    setToken(newToken)
  }

  function logout() {
    token.value = null
    userInfo.value = null
    removeToken()
  }

  function setUserInfo(info: UserInfo) {
    userInfo.value = info
  }

  return { token, userInfo, login, logout, setUserInfo }
})
