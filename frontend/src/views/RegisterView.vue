<script setup>
import { ref, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { UserPlusIcon, ChevronLeftIcon, ChevronDownIcon } from '@heroicons/vue/24/outline'

const router = useRouter()
const isLoading = ref(false)
const errorMsg = ref('')

const form = ref({
  userId: '',
  password: '',
  userName: '',
  phone: '',
  email: '',
  deptName: ''
})

const idChecked = ref(false)
const idAvailable = ref(false)
const departments = ref([])

const fetchDepartments = async () => {
  try {
    const res = await axios.get('/api/departments')
    departments.value = res.data
  } catch (err) {
    console.error('Fetch departments error:', err)
  }
}

onMounted(fetchDepartments)

const checkId = async () => {
  if (!form.value.userId) {
    errorMsg.value = '아이디를 입력해 주세요.'
    return
  }
  
  try {
    const res = await axios.get('/api/auth/check-id', { params: { userId: form.value.userId } })
    if (res.data.success) {
      idAvailable.value = res.data.available
      idChecked.value = true
      if (!idAvailable.value) {
        errorMsg.value = '이미 사용 중인 아이디입니다.'
      } else {
        errorMsg.value = ''
      }
    }
  } catch (error) {
    errorMsg.value = '중복 체크 중 오류가 발생했습니다.'
  }
}

watch(() => form.value.userId, () => {
  idChecked.value = false
  idAvailable.value = false
})

// Phone auto-hyphenation and filtering
watch(() => form.value.phone, (newVal) => {
  if (!newVal) return
  // Remove all non-digits
  const digits = newVal.replace(/\D/g, '')
  
  // Format: 010-0000-0000
  let formatted = ''
  if (digits.length <= 3) {
    formatted = digits
  } else if (digits.length <= 7) {
    formatted = `${digits.slice(0, 3)}-${digits.slice(3)}`
  } else {
    formatted = `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`
  }
  
  // Update value only if it changed to avoid infinite loop
  if (formatted !== newVal) {
    form.value.phone = formatted
  }
})

const handleRegister = async () => {
  if (!form.value.userId || !form.value.password || !form.value.userName || !form.value.phone || !form.value.deptName) {
    errorMsg.value = '아이디, 비밀번호, 성함, 연락처, 담당부서는 필수 입력 항목입니다.'
    return
  }

  // Validate phone format (010-0000-0000)
  const phoneRegex = /^010-\d{3,4}-\d{4}$/
  if (!phoneRegex.test(form.value.phone)) {
    errorMsg.value = '올바른 휴대폰 번호 형식이 아닙니다. (예: 010-1234-5678)'
    return
  }

  if (!idChecked.value || !idAvailable.value) {
    errorMsg.value = '아이디 중복 체크를 완료해 주세요.'
    return
  }

  isLoading.value = true
  errorMsg.value = ''
  
  try {
    const res = await axios.post('/api/auth/register', form.value)
    if (res.data.success) {
      alert(res.data.message)
      router.push('/')
    }
  } catch (error) {
    errorMsg.value = error.response?.data?.message || '회원가입 중 오류가 발생했습니다.'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex items-center justify-center p-6">
    <div class="max-w-md w-full">
      <router-link to="/" class="inline-flex items-center gap-2 text-slate-400 hover:text-indigo-600 transition-colors mb-6 text-sm font-bold">
        <ChevronLeftIcon class="w-4 h-4" />
        로그인으로 돌아가기
      </router-link>

      <div class="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/60 overflow-hidden border border-slate-100 p-10">
        <div class="text-center mb-10">
          <div class="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-200">
            <UserPlusIcon class="w-8 h-8 text-white" />
          </div>
          <h1 class="text-2xl font-black text-slate-900 mb-2 tracking-tight">회원가입 신청</h1>
          <p class="text-slate-500 text-sm font-bold">원천교회 공간 예약시스템</p>
        </div>

        <div v-if="errorMsg" class="bg-rose-50 border border-rose-100 text-rose-600 text-xs font-bold px-4 py-3 rounded-xl mb-6 text-center">
          {{ errorMsg }}
        </div>

        <form @submit.prevent="handleRegister" class="space-y-4">
          <div class="space-y-4">
            <div>
              <label class="block text-[12px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">아이디 <span class="text-rose-500">*</span></label>
              <div class="flex gap-2">
                <input v-model="form.userId" type="text" placeholder="아이디 입력" required
                       class="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all" />
                <button type="button" @click="checkId" 
                        class="px-4 bg-slate-900 text-white text-[12px] font-black rounded-xl hover:bg-indigo-600 transition-all uppercase tracking-widest whitespace-nowrap">
                  중복확인
                </button>
              </div>
              <p v-if="idChecked && idAvailable" class="text-[12px] text-indigo-600 font-bold mt-1 ml-1">✓ 사용 가능한 아이디입니다.</p>
            </div>
            <div>
              <label class="block text-[12px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">비밀번호 <span class="text-rose-500">*</span></label>
              <input v-model="form.password" type="password" placeholder="비밀번호 입력" required
                     class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all" />
            </div>
            <div>
              <label class="block text-[12px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">이름 <span class="text-rose-500">*</span></label>
              <input v-model="form.userName" type="text" placeholder="성함 입력" required
                     class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all" />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-[12px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">연락처 <span class="text-rose-500">*</span></label>
                <input v-model="form.phone" type="text" placeholder="010-0000-0000" required
                       class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all" />
                <p class="text-[10px] text-indigo-500 font-bold ml-1 mt-1.5 leading-tight">
                  ※ 입력한 핸드폰 번호로 카카오 알림톡이 전송되오니 정확한 정보를 입력하여 주십시요.
                </p>
              </div>
              <div>
                <label class="block text-[12px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">담당부서 <span class="text-rose-500">*</span></label>
                <div class="relative">
                  <select v-model="form.deptName" required
                          :class="[!form.deptName ? 'text-slate-400' : 'text-slate-900']"
                          class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all appearance-none cursor-pointer">
                    <option value="" disabled selected>부서 선택</option>
                    <option v-for="dept in departments" :key="dept.id" :value="dept.dept_name" class="text-slate-900">{{ dept.dept_name }}</option>
                  </select>
                  <ChevronDownIcon class="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>
            <div>
              <label class="block text-[12px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">이메일</label>
              <input v-model="form.email" type="email" placeholder="example@email.com"
                     class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all" />
            </div>
          </div>

          <button type="submit" :disabled="isLoading"
                  class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-xl shadow-lg shadow-indigo-100 transition-all active:scale-[0.98] disabled:opacity-50 mt-4 text-sm uppercase tracking-widest">
            {{ isLoading ? '신청 중...' : '가입 신청하기' }}
          </button>
        </form>

        <p class="mt-8 text-[11px] text-slate-400 text-center font-bold leading-relaxed">
          회원가입 신청 후 관리자의 승인이 완료되어야 로그인이 가능합니다.<br/>
          승인 결과는 별도로 안내되지 않으니 참고 부탁드립니다.
        </p>
      </div>
    </div>
  </div>
</template>
