<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../store/auth'
import { useRouter } from 'vue-router'
import { useModalStore } from '@/stores/useModalStore'

const modal = useModalStore()

const userId = ref('')
const authStore = useAuthStore()
const router = useRouter()
const isLoading = ref(false)

const handleLogin = async () => {
  if (!userId.value) return
  isLoading.value = true
  const success = await authStore.simpleLogin(userId.value)
  if (success) {
    router.push('/')
  } else {
    modal.showAlert('로그인에 실패했습니다.')
  }
  isLoading.value = false
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex items-center justify-center p-6">
    <div class="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-slate-200/60 overflow-hidden border border-slate-100">
      <div class="p-10">
        <div class="text-center mb-10">
          <div class="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-200">
            <span class="text-white text-2xl font-bold">R</span>
          </div>
          <h1 class="text-2xl font-bold text-slate-900 mb-2">공간 예약 시스템</h1>
          <p class="text-slate-500 text-sm">임시 로그인 (개발용)</p>
        </div>

        <form @submit.prevent="handleLogin" class="space-y-6">
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-2">사용자 아이디 (아무꺼나 입력 가능)</label>
            <input 
              v-model="userId"
              type="text" 
              placeholder="예: user123"
              class="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all bg-slate-50"
              required
            />
          </div>

          <button 
            type="submit"
            :disabled="isLoading"
            class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {{ isLoading ? '로그인 중...' : '로그인 하기' }}
          </button>
        </form>

        <div class="mt-8 pt-8 border-t border-slate-100 text-center space-y-4">
          <p class="text-xs text-slate-400 leading-relaxed">
            현재는 카카오 로그인을 대신하여 ID만으로 로그인이 가능합니다.<br/>
            추후 정식 버전에서는 카카오 로그인이 적용됩니다.
          </p>
          <div class="pt-4">
            <router-link to="/admin/login" class="text-xs font-black text-slate-400 hover:text-indigo-600 transition-colors uppercase tracking-widest">
              관리자 로그인으로 이동 →
            </router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
