import { defineStore } from 'pinia'
import axios from 'axios'

axios.defaults.baseURL = import.meta.env.VITE_API_URL || ''
axios.defaults.withCredentials = true

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,       // 로그인한 관리자 정보 (null = 비로그인)
    initialized: false
  }),
  getters: {
    isAdmin: (state) => state.user?.roles?.includes('관리자') ?? false,
  },
  actions: {
    async checkSession() {
      try {
        const res = await axios.get('/api/auth/session')
        this.user = res.data.success ? res.data.user : null
      } catch {
        this.user = null
      } finally {
        this.initialized = true
      }
    },
    async logout() {
      await axios.post('/api/auth/logout')
      this.user = null
      window.location.href = '/'
    }
  }
})
