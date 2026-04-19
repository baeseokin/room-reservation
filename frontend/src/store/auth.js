import { defineStore } from 'pinia'
import axios from 'axios'

axios.defaults.baseURL = import.meta.env.VITE_API_URL || '' // Empty for proxy to work
axios.defaults.withCredentials = true

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    initialized: false
  }),
  actions: {
    async simpleLogin(userId) {
      try {
        const res = await axios.post('/api/auth/login', { userId })
        if (res.data.success) {
          this.user = res.data.user
          return true
        }
      } catch (e) {
        console.error('Login failed:', e)
        return false
      }
    },
    async checkSession() {
      try {
        const res = await axios.get('/api/auth/session')
        if (res.data.success) {
          this.user = res.data.user
        }
      } catch (e) {
        this.user = null
      } finally {
        this.initialized = true
      }
    },
    async loginWithKakao(code) {
      try {
        const res = await axios.post('/api/auth/kakao/login', { code })
        if (res.data.success) {
          this.user = res.data.user
          return true
        }
      } catch (e) {
        console.error('Login failed:', e)
        return false
      }
    },
    async logout() {
      await axios.post('/api/auth/logout')
      this.user = null
      window.location.href = '/login'
    }
  }
})
