<script setup>
import { onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../store/auth'
import { useDevice } from '../composables/useDevice'
import LoginInterim from '../components/LoginInterim.vue'

const { isMobile } = useDevice()
const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

onMounted(async () => {
  // Check for session first
  if (!authStore.initialized) {
    await authStore.checkSession()
  }
  if (authStore.user) {
    router.push('/')
  }
  
  // Keep Kakao callback logic just in case, but usually not needed for interim
  const code = route.query.code
  if (code) {
    const success = await authStore.loginWithKakao(code)
    if (success) {
      router.push('/')
    }
  }
})
</script>

<template>
  <LoginInterim />
</template>
