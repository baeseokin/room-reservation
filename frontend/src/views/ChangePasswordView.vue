<template>
  <div class="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden font-sans">
    <!-- Subtle background patterns -->
    <div class="absolute top-0 left-0 w-full h-full opacity-40 pointer-events-none">
      <div class="absolute -top-24 -left-24 w-96 h-96 bg-indigo-100 rounded-full blur-3xl"></div>
      <div class="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-100 rounded-full blur-3xl"></div>
    </div>

    <div class="relative w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div class="bg-white rounded-[3rem] p-10 shadow-2xl shadow-slate-200/60 border border-white">
        <div class="flex flex-col items-center mb-8">
          <div class="bg-indigo-50 p-4 rounded-3xl mb-6">
            <LockClosedIcon class="w-10 h-10 text-indigo-600" />
          </div>
          <h1 class="text-2xl font-black text-slate-900 tracking-tight text-center">비밀번호 변경</h1>
          <p class="text-slate-400 text-xs font-black uppercase tracking-widest mt-2 text-center">보안을 위해 비밀번호를 변경해 주세요.</p>
        </div>

        <div v-if="errorMsg" class="bg-rose-50 border border-rose-100 text-rose-500 text-[11px] font-black px-4 py-3 rounded-2xl mb-6 text-center uppercase tracking-wider">
          {{ errorMsg }}
        </div>

        <form @submit.prevent="handleChangePassword" class="space-y-5">
          <div v-if="!isFirstLogin" class="space-y-1.5">
            <label class="block text-[12px] font-black text-slate-400 uppercase tracking-widest ml-1">현재 비밀번호</label>
            <input
              v-model="currentPassword"
              type="password"
              placeholder="현재 비밀번호를 입력하세요"
              class="w-full bg-slate-50 border border-slate-100 text-slate-900 rounded-2xl px-6 py-4 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>

          <div class="space-y-1.5">
            <label class="block text-[12px] font-black text-slate-400 uppercase tracking-widest ml-1">새 비밀번호</label>
            <input
              v-model="newPassword"
              type="password"
              placeholder="새 비밀번호를 입력하세요"
              class="w-full bg-slate-50 border border-slate-100 text-slate-900 rounded-2xl px-6 py-4 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>

          <div class="space-y-1.5">
            <label class="block text-[12px] font-black text-slate-400 uppercase tracking-widest ml-1">새 비밀번호 확인</label>
            <input
              v-model="confirmPassword"
              type="password"
              placeholder="새 비밀번호를 다시 입력하세요"
              class="w-full bg-slate-50 border border-slate-100 text-slate-900 rounded-2xl px-6 py-4 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>

          <button
            type="submit"
            :disabled="isLoading"
            class="w-full bg-slate-900 hover:bg-indigo-600 text-white font-black py-4.5 rounded-2xl shadow-xl shadow-slate-200 transition-all active:scale-[0.98] disabled:opacity-50 mt-4 text-xs uppercase tracking-widest h-14"
          >
            {{ isLoading ? '변경 중...' : '비밀번호 변경 완료' }}
          </button>
        </form>

        <div class="mt-8 text-center">
            <button @click="logout" class="text-xs font-black text-slate-400 hover:text-slate-900 transition-all uppercase tracking-widest">
                로그아웃
            </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAuthStore } from '../store/auth'
import { useRouter } from 'vue-router'
import { LockClosedIcon } from '@heroicons/vue/24/outline'
import axios from 'axios'
import { useModalStore } from '@/stores/useModalStore'

const modal = useModalStore()

const auth = useAuthStore()
const router = useRouter()

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const isLoading = ref(false)
const errorMsg = ref('')

// If mustChangePassword is true, we might assume it's because of a reset
const isFirstLogin = computed(() => auth.user?.mustChangePassword)

const handleChangePassword = async () => {
  if (newPassword.value !== confirmPassword.value) {
    errorMsg.value = '새 비밀번호가 일치하지 않습니다.'
    return
  }
  
  if (newPassword.value.length < 4) {
    errorMsg.value = '비밀번호는 4자 이상이어야 합니다.'
    return
  }

  isLoading.value = true
  errorMsg.value = ''

  try {
    const res = await axios.post('/api/auth/change-password', {
      currentPassword: currentPassword.value,
      newPassword: newPassword.value
    })
    
    if (res.data.success) {
      await modal.showAlert('비밀번호가 성공적으로 변경되었습니다.')
      auth.user.mustChangePassword = false
      if (auth.isAdmin) {
        router.push('/admin')
      } else {
        router.push('/home')
      }
    } else {
      errorMsg.value = res.data.message
    }
  } catch (e) {
    errorMsg.value = e.response?.data?.message || '비밀번호 변경 중 오류가 발생했습니다.'
  } finally {
    isLoading.value = false
  }
}

const logout = () => {
    auth.logout()
}
</script>

<style scoped>
.py-4.5 {
  padding-top: 1.125rem;
  padding-bottom: 1.125rem;
}
</style>
