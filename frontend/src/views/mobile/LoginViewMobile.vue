<template>
  <div class="min-h-screen bg-white flex flex-col p-8 font-sans overflow-hidden relative">
    <!-- Decor -->
    <div class="absolute -top-24 -right-24 w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-60"></div>
    <div class="absolute top-1/2 -left-24 w-64 h-64 bg-blue-50 rounded-full blur-3xl opacity-60"></div>

    <div class="relative z-10 flex flex-col h-full">
      <div class="mt-12 mb-16 text-center">
        <img src="../../assets/logo_wonchon.png" alt="Logo" class="h-16 mx-auto mb-6 drop-shadow-sm" />
        <h1 class="text-3xl font-black text-slate-900 tracking-tight">공간 예약 시스템</h1>
        <p class="text-slate-400 text-sm font-bold uppercase tracking-widest mt-2">Mobile Portal</p>
      </div>

      <div v-if="errorMsg" class="bg-rose-50 text-rose-500 text-xs font-black p-4 rounded-2xl mb-6 text-center border border-rose-100 animate-in fade-in slide-in-from-top-2">
        {{ errorMsg }}
      </div>

      <form @submit.prevent="handleLogin" class="space-y-4">
        <div class="space-y-1.5">
          <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">아이디</label>
          <input v-model="userId" type="text" placeholder="아이디 입력" 
            class="w-full bg-slate-50 border-none rounded-2xl px-6 py-5 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 transition-all" />
        </div>

        <div class="space-y-1.5">
          <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">비밀번호</label>
          <input v-model="password" type="password" placeholder="비밀번호 입력" 
            class="w-full bg-slate-50 border-none rounded-2xl px-6 py-5 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 transition-all" />
        </div>

        <button :disabled="isLoading" type="submit" 
          class="w-full bg-slate-900 text-white font-black py-5 rounded-2xl shadow-xl shadow-slate-200 active:scale-95 transition-all mt-6 uppercase tracking-widest text-sm">
          {{ isLoading ? '인증 중...' : '로그인' }}
        </button>
      </form>

      <div class="mt-8 flex justify-center gap-6">
        <router-link to="/register" class="text-xs font-black text-indigo-600 uppercase tracking-widest">신규 회원가입</router-link>
      </div>

      <div class="mt-auto pt-12 text-center">
        <p class="text-[10px] text-slate-300 font-bold uppercase tracking-[0.2em]">© Wonchon Church</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../../store/auth'
import { useRouter } from 'vue-router'

const auth = useAuthStore()
const router = useRouter()

const userId = ref('')
const password = ref('')
const isLoading = ref(false)
const errorMsg = ref('')

const handleLogin = async () => {
  if (!userId.value || !password.value) {
    errorMsg.value = '아이디와 비밀번호를 입력하세요.'
    return
  }
  isLoading.value = true
  errorMsg.value = ''
  
  const result = await auth.adminLogin(userId.value, password.value)
  if (result.success) {
    if (auth.user.mustChangePassword) {
      router.push('/m/change-password')
    } else {
      router.push('/m/home')
    }
  } else {
    errorMsg.value = result.message || '로그인 실패'
  }
  isLoading.value = false
}
</script>
