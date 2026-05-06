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

    <template v-else>


      <form @submit.prevent="handleRegister" class="space-y-6 pb-12">
      <div class="space-y-1.5">
        <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">아이디 <span class="text-rose-500">*</span></label>
        <div class="flex gap-2">
          <input v-model="form.userId" type="text" placeholder="ID 입력" required
            class="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20" />
          <button type="button" @click="checkId" 
            class="px-4 bg-slate-900 text-white text-[11px] font-black rounded-xl active:scale-95 transition-all uppercase tracking-widest whitespace-nowrap shrink-0">
            중복확인
          </button>
        </div>
        <p v-if="idChecked && idAvailable" class="text-[11px] text-indigo-600 font-bold mt-1 ml-1">✓ 사용 가능한 아이디입니다.</p>
      </div>

      <div class="space-y-1.5">
        <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">비밀번호 <span class="text-rose-500">*</span></label>
        <input v-model="form.password" type="password" placeholder="비밀번호 입력" required
          class="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20" />
      </div>

      <div class="space-y-1.5">
        <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">비밀번호 확인 <span class="text-rose-500">*</span></label>
        <input v-model="form.passwordConfirm" type="password" placeholder="비밀번호 재입력" required
          class="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20" />
      </div>

      <div class="space-y-1.5">
        <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">이름 <span class="text-rose-500">*</span></label>
        <input v-model="form.userName" type="text" placeholder="성함 입력" required
          class="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20" />
      </div>

      <div class="space-y-1.5">
        <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">휴대폰 번호 <span class="text-rose-500">*</span></label>
        <input v-model="form.phone" type="tel" placeholder="010-0000-0000" required
          class="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20" />
        <p class="text-[10px] text-indigo-500 font-bold ml-1 mt-1 leading-tight">
          ※ 입력한 핸드폰 번호로 카카오 알림톡이 전송되오니 정확한 정보를 입력하여 주십시요.
        </p>
      </div>

      <div class="space-y-1.5">
        <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">소속 부서 <span class="text-rose-500">*</span></label>
        <select v-model="form.deptName" required
          class="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 appearance-none">
          <option value="">부서 선택</option>
          <option v-for="d in depts" :key="d.id" :value="d.dept_name">{{ d.dept_name }}</option>
        </select>
      </div>

      <div class="space-y-1.5">
        <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">이메일 (선택)</label>
        <input v-model="form.email" type="email" placeholder="example@email.com" 
          class="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20" />
      </div>


      <button :disabled="isLoading" type="submit" 
        class="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-indigo-100 active:scale-95 transition-all mt-4 uppercase tracking-widest text-sm">
        {{ isLoading ? '처리 중...' : '회원가입 신청' }}
      </button>

      <div class="text-center">
        <router-link to="/login" class="text-xs font-black text-slate-400 uppercase tracking-widest">이미 계정이 있으신가요? 로그인</router-link>
      </div>
    </form>
  </template>
</div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import axios from 'axios'
import { useRouter } from 'vue-router'
import { useModalStore } from '@/stores/useModalStore'

const router = useRouter()
const modal = useModalStore()
const form = ref({ userId: '', password: '', passwordConfirm: '', userName: '', phone: '', email: '', deptName: '' })
const isLoading = ref(false)
const errorMsg = ref('')
const successMsg = ref('')
const depts = ref([])

const idChecked = ref(false)
const idAvailable = ref(false)

onMounted(async () => {
  try {
    const res = await axios.get('/api/departments')
    depts.value = res.data
  } catch (e) {}
})

const checkId = async () => {
  if (!form.value.userId) {
    modal.showAlert('아이디를 입력해 주세요.')
    return
  }
  
  try {
    const res = await axios.get('/api/auth/check-id', { params: { userId: form.value.userId } })
    if (res.data.success) {
      idAvailable.value = res.data.available
      idChecked.value = true
      if (!idAvailable.value) {
        modal.showAlert('이미 사용 중인 아이디입니다.')
      }
    }
  } catch (error) {
    modal.showAlert('중복 체크 중 오류가 발생했습니다.')
  }
}

watch(() => form.value.userId, () => {
  idChecked.value = false
  idAvailable.value = false
})

// Phone auto-hyphenation
watch(() => form.value.phone, (newVal) => {
  if (!newVal) return
  const digits = newVal.replace(/\D/g, '')
  let formatted = ''
  if (digits.length <= 3) {
    formatted = digits
  } else if (digits.length <= 7) {
    formatted = `${digits.slice(0, 3)}-${digits.slice(3)}`
  } else {
    formatted = `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`
  }
  if (formatted !== newVal) {
    form.value.phone = formatted
  }
})

const handleRegister = async () => {
  if (!form.value.userId || !form.value.password || !form.value.passwordConfirm || !form.value.userName || !form.value.phone || !form.value.deptName) {
    modal.showAlert('필수 항목을 모두 입력해 주세요.')
    return
  }

  if (form.value.password !== form.value.passwordConfirm) {
    modal.showAlert('비밀번호가 일치하지 않습니다.')
    return
  }

  if (!idChecked.value || !idAvailable.value) {
    modal.showAlert('아이디 중복 체크를 완료해 주세요.')
    return
  }

  // Validate phone format (010-0000-0000)
  const phoneRegex = /^010-\d{3,4}-\d{4}$/
  if (!phoneRegex.test(form.value.phone)) {
    modal.showAlert('올바른 휴대폰 번호 형식이 아닙니다.')
    return
  }

  isLoading.value = true
  try {
    const res = await axios.post('/api/auth/register', form.value)
    if (res.data.success) {
      successMsg.value = res.data.message
    }
  } catch (e) {
    modal.showAlert(e.response?.data?.message || '회원가입 중 오류가 발생했습니다.')
  } finally {
    isLoading.value = false
  }
}
</script>
