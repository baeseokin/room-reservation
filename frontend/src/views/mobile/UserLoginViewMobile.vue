<template>
  <div class="min-h-screen bg-white flex flex-col p-8 font-sans overflow-hidden relative">
    <!-- Decor Blobs -->
    <div class="absolute -top-24 -right-24 w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-60"></div>
    <div class="absolute top-1/2 -left-24 w-64 h-64 bg-blue-50 rounded-full blur-3xl opacity-60"></div>

    <div class="relative z-10 flex flex-col h-full">
      <!-- Header -->
      <div class="mt-8 mb-12 text-center relative">
        <div class="relative inline-block mb-2">
          <img src="../../assets/login_bg.png" alt="Wonchon Church" class="w-48 mx-auto opacity-70 mix-blend-multiply" />
          <div class="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent"></div>
        </div>
        
        <div class="space-y-0.5 relative -mt-10">
          <h1 class="text-3xl font-black text-slate-800 tracking-tighter leading-tight">원천교회</h1>
          <h2 class="text-3xl font-black text-indigo-600 tracking-tighter leading-tight">공간예약 시스템</h2>
          <p class="text-[0.5625rem] font-black text-slate-400 uppercase tracking-[0.25em] pt-3">Wonchon Space Reservation System</p>
        </div>
      </div>

      <!-- Error Message -->
      <div v-if="errorMsg" class="bg-rose-50 text-rose-500 text-xs font-black p-4 rounded-2xl mb-6 text-center border border-rose-100 animate-in fade-in slide-in-from-top-2">
        {{ errorMsg }}
      </div>

      <!-- Form -->
      <form @submit.prevent="handleLogin" class="space-y-4">
        <div class="space-y-1.5">
          <label class="text-[0.6875rem] font-black text-slate-400 uppercase tracking-widest ml-1">부서 선택</label>
          <select v-model="selectedDept" @change="fetchUsers"
            class="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-5 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 transition-all appearance-none cursor-pointer">
            <option value="" disabled>부서를 선택하세요</option>
            <option v-for="dept in departments" :key="dept.id" :value="dept.dept_name">
              {{ dept.dept_name }}
            </option>
          </select>
        </div>

        <div class="space-y-1.5" v-if="selectedDept">
          <label class="text-[0.6875rem] font-black text-slate-400 uppercase tracking-widest ml-1">사용자 선택</label>
          <select v-model="selectedUserId"
            class="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-5 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 transition-all appearance-none cursor-pointer">
            <option value="" disabled>이름을 선택하세요</option>
            <option v-for="user in users" :key="user.user_id" :value="user.user_id">
              {{ user.user_name }}({{ user.user_id }})
            </option>
          </select>
        </div>

        <div class="space-y-1.5" v-if="selectedUserId">
          <label class="text-[0.6875rem] font-black text-slate-400 uppercase tracking-widest ml-1">비밀번호</label>
          <input v-model="password" type="password" placeholder="비밀번호 입력" 
            class="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-5 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 transition-all" />
        </div>

        <button v-if="selectedUserId" :disabled="isLoading" type="submit" 
          class="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-indigo-200 active:scale-95 transition-all mt-6 uppercase tracking-widest text-sm">
          {{ isLoading ? '인증 중...' : '로그인' }}
        </button>
      </form>



      <div class="mt-auto pt-12 text-center">
        <p class="text-[0.625rem] text-slate-300 font-bold uppercase tracking-[0.2em]">© Wonchon Church</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../../store/auth'
import { useRouter } from 'vue-router'
import axios from 'axios'

const auth = useAuthStore()
const router = useRouter()

const departments = ref([])
const users = ref([])

const selectedDept = ref('')
const selectedUserId = ref('')
const password = ref('')
const isLoading = ref(false)
const errorMsg = ref('')

onMounted(async () => {
  try {
    const res = await axios.get('/api/users/departments')
    departments.value = res.data
  } catch (err) {
    console.error('Failed to load departments', err)
  }
})

const fetchUsers = async () => {
  if (!selectedDept.value) return
  users.value = []
  selectedUserId.value = ''
  try {
    const res = await axios.get('/api/auth/users-by-dept', { params: { deptName: selectedDept.value } })
    if (res.data.success) {
      users.value = res.data.users
    }
  } catch (err) {
    console.error('Failed to load users', err)
  }
}

const handleLogin = async () => {
  if (!selectedUserId.value || !password.value) {
    errorMsg.value = '사용자와 비밀번호를 모두 입력하세요.'
    return
  }
  isLoading.value = true
  errorMsg.value = ''
  
  const result = await auth.login(selectedUserId.value, password.value)
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

<style scoped>
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes slideInFromTop {
  from { transform: translateY(-0.5rem); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
.animate-in {
  animation-duration: 300ms;
  animation-fill-mode: both;
}
.fade-in { animation-name: fadeIn; }
.slide-in-from-top-2 { animation-name: slideInFromTop; }
</style>
