<template>
  <div class="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden font-sans">
    <!-- Subtle background patterns -->
    <div class="absolute top-0 left-0 w-full h-full opacity-40 pointer-events-none">
      <div class="absolute -top-24 -left-24 w-96 h-96 bg-indigo-100 rounded-full blur-3xl"></div>
      <div class="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-100 rounded-full blur-3xl"></div>
    </div>

    <div class="relative w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
      <!-- Card -->
      <div class="bg-white rounded-[3rem] p-10 shadow-2xl shadow-slate-200/60 border border-white">
        <!-- Logo Area -->
        <div class="flex flex-col items-center mb-10">
          <div class="bg-white p-4 rounded-3xl mb-6 shadow-inner">
            <img src="../assets/logo_wonchon.png" alt="Wonchon Church Logo" class="h-14 object-contain" />
          </div>
          <h1 class="text-2xl font-black text-slate-900 tracking-tight italic">공간 예약 시스템</h1>
          <p class="text-slate-400 text-xs font-black uppercase tracking-[0.2em] mt-1.5">Wonchon Space Management</p>
        </div>

        <!-- Error Message -->
        <div v-if="errorMsg" class="bg-rose-50 border border-rose-100 text-rose-500 text-[11px] font-black px-4 py-3 rounded-2xl mb-6 text-center uppercase tracking-wider">
          {{ errorMsg }}
        </div>

        <!-- Form -->
        <form @submit.prevent="handleLogin" class="space-y-5">
          <div class="space-y-1.5">
            <label class="block text-[12px] font-black text-slate-400 uppercase tracking-widest ml-1">아이디</label>
            <input
              v-model="userId"
              type="text"
              placeholder="아이디를 입력하세요"
              autocomplete="username"
              class="w-full bg-slate-50 border border-slate-100 text-slate-900 placeholder:text-slate-300 rounded-2xl px-6 py-4 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>

          <div class="space-y-1.5">
            <label class="block text-[12px] font-black text-slate-400 uppercase tracking-widest ml-1">비밀번호</label>
            <div class="relative">
              <input
                v-model="password"
                :type="showPw ? 'text' : 'password'"
                placeholder="비밀번호를 입력하세요"
                autocomplete="current-password"
                class="w-full bg-slate-50 border border-slate-100 text-slate-900 placeholder:text-slate-300 rounded-2xl px-6 py-4 pr-14 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
              <button type="button" @click="showPw = !showPw" class="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors">
                <EyeSlashIcon v-if="showPw" class="w-5 h-5" />
                <EyeIcon v-else class="w-5 h-5" />
              </button>
            </div>
          </div>

          <button
            type="submit"
            :disabled="isLoading"
            class="w-full bg-slate-900 hover:bg-indigo-600 text-white font-black py-4.5 rounded-2xl shadow-xl shadow-slate-200 transition-all active:scale-[0.98] disabled:opacity-50 mt-4 text-xs uppercase tracking-widest h-14"
          >
            {{ isLoading ? '인증 중...' : '로그인' }}
          </button>
        </form>

        <!-- Divider -->
        <div class="relative my-8">
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t border-slate-100"></div>
          </div>
          <div class="relative flex justify-center text-[12px]">
            <span class="px-3 bg-white text-slate-300 font-black uppercase tracking-widest">or</span>
          </div>
        </div>

        <!-- Secondary Actions -->
        <div class="flex flex-col gap-4 items-center">
          <router-link to="/register" class="group flex items-center gap-2 text-xs font-black text-indigo-600 hover:text-indigo-700 transition-all uppercase tracking-widest">
            <span>신규 회원가입 신청</span>
            <ArrowRightIcon class="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </router-link>
        </div>
      </div>

      <!-- Footer Info -->
      <div class="mt-10 text-center">
        <p class="text-[12px] text-slate-400 font-bold uppercase tracking-widest">
          © {{ new Date().getFullYear() }} Wonchon Presbyterian Church. All rights reserved.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../store/auth'
import { useRouter } from 'vue-router'
import { EyeIcon, EyeSlashIcon, ArrowRightIcon } from '@heroicons/vue/24/outline'

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
  
  // adminLogin is still the generic login action in store
  const result = await auth.adminLogin(userId.value, password.value)
  if (result.success) {
    // Redirect based on role
    if (auth.isAdmin) {
      router.push('/admin')
    } else {
      router.push('/home') // Or wherever general users should go
    }
  } else {
    errorMsg.value = result.message || '아이디 또는 비밀번호가 일치하지 않습니다.'
  }
  isLoading.value = false
}
</script>

<style scoped>
.py-4.5 {
  padding-top: 1.125rem;
  padding-bottom: 1.125rem;
}
</style>
