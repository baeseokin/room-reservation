<template>
  <div class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <div class="space-y-1">
      <h2 class="text-2xl font-black text-slate-900 tracking-tight">비밀번호 변경</h2>
      <p class="text-slate-400 text-[11px] font-black uppercase tracking-widest">새로운 비밀번호를 설정해 주세요.</p>
    </div>

    <div class="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/50 space-y-6">
      <div v-if="errorMsg" class="bg-rose-50 text-rose-500 text-[10px] font-black p-3 rounded-2xl text-center border border-rose-100">
        {{ errorMsg }}
      </div>

      <div class="space-y-4">
        <div class="space-y-1.5">
          <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">현재 비밀번호</label>
          <input v-model="form.currentPassword" type="password" placeholder="현재 비밀번호" 
            class="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20" />
        </div>

        <div class="space-y-1.5">
          <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">새 비밀번호</label>
          <input v-model="form.newPassword" type="password" placeholder="새 비밀번호 (4자 이상)" 
            class="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20" />
        </div>

        <div class="space-y-1.5">
          <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">비밀번호 확인</label>
          <input v-model="confirmPassword" type="password" placeholder="새 비밀번호 다시 입력" 
            class="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20" />
        </div>
      </div>

      <button @click="handleSubmit" :disabled="isLoading"
        class="w-full bg-slate-900 text-white font-black py-5 rounded-3xl shadow-xl shadow-slate-200 active:scale-95 transition-all mt-4 uppercase tracking-widest text-xs">
        {{ isLoading ? '변경 중...' : '비밀번호 변경 완료' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { useAuthStore } from '../../store/auth'

const router = useRouter()
const auth = useAuthStore()
const form = ref({ currentPassword: '', newPassword: '' })
const confirmPassword = ref('')
const isLoading = ref(false)
const errorMsg = ref('')

const handleSubmit = async () => {
  if (form.value.newPassword !== confirmPassword.value) {
    errorMsg.value = '새 비밀번호가 일치하지 않습니다.'
    return
  }
  if (form.value.newPassword.length < 4) {
    errorMsg.value = '비밀번호는 4자 이상이어야 합니다.'
    return
  }

  isLoading.value = true
  errorMsg.value = ''
  try {
    const res = await axios.post('/api/auth/change-password', form.value)
    if (res.data.success) {
      alert('비밀번호가 변경되었습니다. 다시 로그인해 주세요.')
      auth.logout()
    }
  } catch (e) {
    errorMsg.value = e.response?.data?.message || '변경 중 오류가 발생했습니다.'
  } finally {
    isLoading.value = false
  }
}
</script>
