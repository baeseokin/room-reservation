<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../store/auth'
import { useRouter } from 'vue-router'
import { ShieldCheckIcon, EyeIcon, EyeSlashIcon } from '@heroicons/vue/24/outline'

const auth = useAuthStore()
const router = useRouter()

const userId = ref('')
const password = ref('')
const showPw = ref(false)
const isLoading = ref(false)
const errorMsg = ref('')

const handleLogin = async () => {
  if (!userId.value || !password.value) {
    errorMsg.value = 'ID와 비밀번호를 모두 입력하세요.'
    return
  }
  isLoading.value = true
  errorMsg.value = ''
  const result = await auth.adminLogin(userId.value, password.value)
  if (result.success) {
    router.push('/admin')
  } else {
    errorMsg.value = result.message || '로그인에 실패했습니다.'
  }
  isLoading.value = false
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 flex items-center justify-center p-6">
    <!-- Background decoration -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div class="absolute top-1/4 -left-32 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl"></div>
      <div class="absolute bottom-1/4 -right-32 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl"></div>
    </div>

    <div class="relative w-full max-w-md">
      <!-- Card -->
      <div class="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-10 shadow-2xl">
        <!-- Logo -->
        <div class="flex justify-center mb-8">
          <div class="bg-white p-3 rounded-2xl shadow-2xl shadow-indigo-600/20">
            <img src="../assets/logo_wonchon.png" alt="Logo" class="h-12 object-contain" />
          </div>
        </div>

        <!-- Title -->
        <div class="text-center mb-8">
          <h1 class="text-3xl font-black text-white tracking-tight">관리자 로그인</h1>
          <p class="text-slate-400 text-sm font-medium mt-2">원천교회 공간 예약시스템</p>
        </div>

        <!-- Error Message -->
        <div v-if="errorMsg" class="bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm font-bold px-4 py-3 rounded-2xl mb-6 text-center">
          {{ errorMsg }}
        </div>

        <!-- Form -->
        <form @submit.prevent="handleLogin" class="space-y-4">
          <div>
            <label class="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">관리자 ID</label>
            <input
              v-model="userId"
              type="text"
              placeholder="관리자 ID 입력"
              autocomplete="username"
              class="w-full bg-white/5 border border-white/10 text-white placeholder:text-slate-600 rounded-2xl px-5 py-4 font-bold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            />
          </div>

          <div>
            <label class="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">비밀번호</label>
            <div class="relative">
              <input
                v-model="password"
                :type="showPw ? 'text' : 'password'"
                placeholder="비밀번호 입력"
                autocomplete="current-password"
                class="w-full bg-white/5 border border-white/10 text-white placeholder:text-slate-600 rounded-2xl px-5 py-4 pr-12 font-bold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
              <button type="button" @click="showPw = !showPw" class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                <EyeSlashIcon v-if="showPw" class="w-5 h-5" />
                <EyeIcon v-else class="w-5 h-5" />
              </button>
            </div>
          </div>

          <button
            type="submit"
            :disabled="isLoading"
            class="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-600/30 transition-all active:scale-[0.98] disabled:opacity-50 mt-2 text-sm uppercase tracking-widest"
          >
            {{ isLoading ? '로그인 중...' : '로그인' }}
          </button>
        </form>

        <div class="mt-8 pt-6 border-t border-white/5 text-center">
          <router-link to="/" class="text-xs text-slate-500 hover:text-slate-300 font-bold transition-colors">
            ← 공개 홈으로 돌아가기
          </router-link>
        </div>
      </div>

      <!-- Default credential hint (dev mode) -->
      <p class="text-center text-[11px] text-slate-600 mt-4 font-bold">기본 계정: admin / admin1234</p>
    </div>
  </div>
</template>
