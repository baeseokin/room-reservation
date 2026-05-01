<template>
  <div class="min-h-screen bg-white flex flex-col p-8 font-sans relative">
    <div class="mb-10 pt-8">
      <h1 class="text-3xl font-black text-slate-900 tracking-tight">회원가입</h1>
      <p class="text-slate-400 text-sm font-bold mt-1">공간 예약 시스템에 오신 것을 환영합니다.</p>
    </div>

    <div v-if="successMsg" class="bg-green-50 text-green-600 p-6 rounded-3xl text-center border border-green-100 mb-8">
      <p class="font-black text-sm">{{ successMsg }}</p>
      <button @click="$router.push('/login')" class="mt-4 text-xs font-black uppercase tracking-widest bg-green-600 text-white px-6 py-3 rounded-xl">로그인하러 가기</button>
    </div>

    <form v-else @submit.prevent="handleRegister" class="space-y-6 pb-12">
      <div class="space-y-1.5">
        <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">아이디</label>
        <input v-model="form.userId" type="text" placeholder="ID 입력" 
          class="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20" />
      </div>

      <div class="space-y-1.5">
        <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">비밀번호</label>
        <input v-model="form.password" type="password" placeholder="비밀번호 입력" 
          class="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20" />
      </div>

      <div class="space-y-1.5">
        <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">이름</label>
        <input v-model="form.userName" type="text" placeholder="성함 입력" 
          class="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20" />
      </div>

      <div class="space-y-1.5">
        <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">휴대폰 번호</label>
        <input v-model="form.phone" type="tel" placeholder="010-0000-0000" 
          class="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20" />
      </div>

      <div class="space-y-1.5">
        <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">소속 부서</label>
        <select v-model="form.deptName" class="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 appearance-none">
          <option value="">부서 선택 (선택)</option>
          <option v-for="d in depts" :key="d.id" :value="d.dept_name">{{ d.dept_name }}</option>
        </select>
      </div>

      <div v-if="errorMsg" class="text-rose-500 text-xs font-black text-center">{{ errorMsg }}</div>

      <button :disabled="isLoading" type="submit" 
        class="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-indigo-100 active:scale-95 transition-all mt-4 uppercase tracking-widest text-sm">
        {{ isLoading ? '처리 중...' : '회원가입 신청' }}
      </button>

      <div class="text-center">
        <router-link to="/login" class="text-xs font-black text-slate-400 uppercase tracking-widest">이미 계정이 있으신가요? 로그인</router-link>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const form = ref({ userId: '', password: '', userName: '', phone: '', email: '', deptName: '' })
const isLoading = ref(false)
const errorMsg = ref('')
const successMsg = ref('')
const depts = ref([])

onMounted(async () => {
  try {
    const res = await axios.get('/api/departments')
    depts.value = res.data
  } catch (e) {}
})

const handleRegister = async () => {
  if (!form.value.userId || !form.value.password || !form.value.userName || !form.value.phone) {
    errorMsg.value = '필수 항목을 모두 입력해 주세요.'
    return
  }
  isLoading.value = true
  errorMsg.value = ''
  try {
    const res = await axios.post('/api/auth/register', form.value)
    if (res.data.success) {
      successMsg.value = res.data.message
    }
  } catch (e) {
    errorMsg.value = e.response?.data?.message || '회원가입 중 오류가 발생했습니다.'
  } finally {
    isLoading.value = false
  }
}
</script>
