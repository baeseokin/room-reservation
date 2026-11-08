<script setup>
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import { useAuthStore } from '../store/auth'
const props = defineProps({ admin: Boolean, mobile: Boolean })
const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const phone = ref(''), code = ref(''), name = ref(''), departmentId = ref(''), password = ref('')
const stage = ref('phone'), challengeId = ref(''), departments = ref([])
const busy = ref(false), error = ref(''), notice = ref(''), demoCode = ref('')
const deadline = ref(0), resendAt = ref(0), now = ref(Date.now()), codeInput = ref(null)
const tick = setInterval(() => { now.value = Date.now() }, 1000)
onBeforeUnmount(() => clearInterval(tick))
const remaining = computed(() => Math.max(0, Math.ceil((deadline.value - now.value) / 1000)))
const resendRemaining = computed(() => Math.max(0, Math.ceil((resendAt.value - now.value) / 1000)))
const countdown = computed(() => `${Math.floor(remaining.value / 60)}:${String(remaining.value % 60).padStart(2, '0')}`)
const normalizedPhone = computed(() => phone.value.replace(/[-\s]/g, ''))
const inputClass = 'w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60'
async function run(action) {
  if (busy.value) return
  busy.value = true; error.value = ''
  try { await action() } catch (e) {
    error.value = e.response?.data?.message || e.message || '요청을 처리하지 못했습니다. 다시 시도해 주세요.'
  } finally { busy.value = false }
}
async function requestCode() {
  await run(async () => {
    if (!/^01[016789]\d{7,8}$/.test(normalizedPhone.value)) throw new Error('올바른 휴대전화번호를 입력해 주세요.')
    const { data } = await axios.post('/api/auth/request', { phone: normalizedPhone.value })
    challengeId.value = data.challengeId; code.value = ''; stage.value = 'code'
    deadline.value = Date.now() + data.expiresInSeconds * 1000
    resendAt.value = Date.now() + data.resendInSeconds * 1000
    now.value = Date.now(); demoCode.value = data.demoCode || ''
    notice.value = '카카오 알림톡으로 받은 인증번호를 입력해 주세요.'
    await nextTick(); codeInput.value?.focus()
  })
}
async function loadDepartments() {
  const { data } = await axios.get('/api/departments')
  departments.value = data
}
async function complete(data) {
  if (data.nextStep) {
    stage.value = data.nextStep; notice.value = ''; demoCode.value = ''
    if (stage.value === 'profile') { name.value = data.name || ''; await loadDepartments() }
    return
  }
  auth.user = data.user
  auth.initialized = true
  const mobile = props.mobile
  if (auth.user.mustChangePassword) return router.replace(mobile ? '/m/change-password' : '/change-password')
  const redirect = route.query.redirect
  // Keep redirects internal and let the route guard enforce permissions.
  if (typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//') && !redirect.includes('\\')) return router.replace(redirect)
  return router.replace(props.admin && auth.isAdmin ? (mobile ? '/m/admin/reservations' : '/admin/reservations') : (mobile ? '/m/home' : '/home'))
}
async function submit() {
  if (stage.value === 'phone') return requestCode()
  return run(async () => {
    if (stage.value === 'code') {
      if (!remaining.value) throw new Error('인증번호가 만료되었습니다. 다시 요청해 주세요.')
      const { data } = await axios.post('/api/auth/verify', { challengeId: challengeId.value, code: code.value })
      await complete(data)
    } else if (stage.value === 'profile') {
      const { data } = await axios.post('/api/auth/complete-profile', { name: name.value, departmentId: departmentId.value })
      await complete(data)
    } else {
      const { data } = await axios.post('/api/auth/admin-password', { password: password.value })
      password.value = ''; await complete(data)
    }
  })
}
function reset() {
  stage.value = 'phone'; code.value = ''; password.value = ''; error.value = ''; notice.value = ''; demoCode.value = ''; challengeId.value = ''
}
</script>

<template>
  <main class="min-h-screen bg-slate-50 flex items-center justify-center px-5 py-10 font-sans">
    <section class="w-full max-w-md rounded-[2rem] bg-white p-7 sm:p-10 shadow-xl shadow-slate-200/60 border border-slate-100">
      <header class="text-center mb-8">
        <p class="font-bold text-slate-500 mb-2">원천교회 공간예약</p>
        <h1 class="text-2xl font-black text-slate-900">{{ stage === 'profile' ? '처음 오셨나요?' : stage === 'password' ? '관리자 비밀번호 확인' : '카카오 알림톡 인증' }}</h1>
        <p class="mt-3 text-sm text-slate-500 leading-relaxed">{{ stage === 'profile' ? '예약에 사용할 이름과 소속부서를 등록해 주세요.' : stage === 'password' ? '휴대전화 인증이 완료되었습니다. 관리자 비밀번호를 입력해 주세요.' : '휴대전화번호로 받은 인증번호로 간편하게 시작하세요.' }}</p>
      </header>
      <p v-if="error" role="alert" class="mb-5 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{{ error }}</p>
      <p v-if="notice" role="status" class="mb-5 rounded-xl bg-indigo-50 p-4 text-sm text-indigo-700">{{ notice }}</p>
      <p v-if="demoCode" class="mb-4 text-sm text-amber-800">개발 모드 인증번호: {{ demoCode }}</p>
      <form @submit.prevent="submit" class="space-y-5">
        <div v-if="stage === 'phone' || stage === 'code'">
          <label for="auth-phone" class="block text-sm font-bold text-slate-700 mb-2">휴대전화번호</label>
          <input id="auth-phone" v-model="phone" type="tel" inputmode="tel" autocomplete="tel-national" placeholder="01012345678" maxlength="13" required :disabled="busy || stage === 'code'" :class="inputClass" />
        </div>
        <div v-if="stage === 'code'">
          <label for="auth-code" class="block text-sm font-bold text-slate-700 mb-2">인증번호</label>
          <input id="auth-code" ref="codeInput" v-model="code" type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" minlength="6" maxlength="6" placeholder="6자리 숫자" required :disabled="busy" :class="inputClass" />
          <div class="mt-3 flex items-center justify-between gap-3 text-sm">
            <span :class="remaining ? 'text-slate-500' : 'text-rose-600'" role="timer">{{ remaining ? `남은 시간 ${countdown}` : '인증시간이 만료되었습니다.' }}</span>
            <button type="button" @click="requestCode" :disabled="busy || resendRemaining > 0" class="font-bold text-indigo-600 disabled:text-slate-400">{{ resendRemaining ? `${resendRemaining}초 후 재요청` : '다시 받기' }}</button>
          </div>
        </div>
        <template v-if="stage === 'profile'">
          <div>
            <label for="auth-name" class="block text-sm font-bold text-slate-700 mb-2">이름</label>
            <input id="auth-name" v-model="name" autocomplete="name" maxlength="100" required :disabled="busy" :class="inputClass" />
          </div>
          <div>
            <label for="auth-department" class="block text-sm font-bold text-slate-700 mb-2">소속부서</label>
            <select id="auth-department" v-model="departmentId" required :disabled="busy" :class="inputClass">
              <option value="" disabled>소속부서를 선택하세요</option>
              <option v-for="dept in departments" :key="dept.id" :value="dept.id">{{ dept.dept_name }}</option>
            </select>
            <button v-if="!departments.length" type="button" @click="run(loadDepartments)" :disabled="busy" class="mt-2 text-sm text-indigo-600">부서 목록 다시 불러오기</button>
          </div>
          <p class="text-xs text-slate-500">이름과 소속부서는 나의 프로필에서 수정할 수 있습니다.</p>
        </template>
        <div v-if="stage === 'password'">
          <label for="auth-password" class="block text-sm font-bold text-slate-700 mb-2">관리자 비밀번호</label>
          <input id="auth-password" v-model="password" type="password" autocomplete="current-password" required :disabled="busy" :class="inputClass" />
        </div>
        <button type="submit" :disabled="busy || (stage === 'code' && !remaining)" class="w-full rounded-2xl bg-[#FEE500] px-4 py-4 font-bold text-[#191919] transition hover:bg-[#f5dc00] disabled:opacity-50">{{ busy ? '처리 중…' : stage === 'phone' ? '인증번호 받기' : stage === 'code' ? '인증하고 계속하기' : stage === 'profile' ? '등록하고 시작하기' : '관리자 로그인' }}</button>
        <button v-if="stage !== 'phone'" type="button" @click="reset" :disabled="busy" class="w-full text-sm text-slate-500 disabled:opacity-50">휴대전화 인증부터 다시 시작</button>
      </form>
      <p class="mt-7 text-center text-xs leading-relaxed text-slate-400">카카오 알림톡으로 휴대전화번호를 인증합니다.</p>
    </section>
  </main>
</template>
