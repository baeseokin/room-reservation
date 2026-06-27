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
        <!-- Title Area -->
        <div class="flex flex-col items-center mb-12 text-center">
          <h1 class="text-4xl font-black text-slate-800 tracking-tight leading-tight">
            원천교회<br/>
            <span class="text-indigo-600">공간 예약 시스템</span>
          </h1>
          <p class="text-slate-400 text-xs font-black uppercase tracking-[0.3em] mt-4">Wonchon Space Reservation System</p>
        </div>

        <!-- Error Message -->
        <div v-if="errorMsg" class="bg-rose-50 border border-rose-100 text-rose-500 text-[0.6875rem] font-black px-4 py-3 rounded-2xl mb-6 text-center uppercase tracking-wider">
          {{ errorMsg }}
        </div>

        <!-- Form -->
        <form @submit.prevent="handleLogin" class="space-y-5">
          <!-- Department Select -->
          <div class="space-y-1.5">
            <label class="block text-[0.75rem] font-black text-slate-400 uppercase tracking-widest ml-1">부서 선택</label>
            <button
              type="button"
              @click="deptModalOpen = true"
              class="w-full bg-slate-50 border border-slate-100 text-slate-900 rounded-2xl px-6 py-4 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer flex justify-between items-center"
            >
              <span :class="{'text-slate-400 font-normal': !selectedDept}">{{ selectedDept || '부서를 선택하세요' }}</span>
              <span class="text-slate-400">⌵</span>
            </button>
          </div>

          <!-- User Select -->
          <div class="space-y-1.5" v-if="selectedDept">
            <label class="block text-[0.75rem] font-black text-slate-400 uppercase tracking-widest ml-1">사용자 선택</label>
            <select
              v-model="selectedUserId"
              class="w-full bg-slate-50 border border-slate-100 text-slate-900 rounded-2xl px-6 py-4 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none cursor-pointer"
            >
              <option v-if="users.length === 0" value="" disabled>등록된 사용자가 없습니다</option>
              <option v-else value="" disabled>이름을 선택하세요</option>
              <option v-for="user in users" :key="user.user_id" :value="user.user_id">
                {{ user.user_name }}({{ user.user_id }})
              </option>
            </select>
          </div>

          <div class="space-y-1.5" v-if="selectedUserId">
            <label class="block text-[0.75rem] font-black text-slate-400 uppercase tracking-widest ml-1">비밀번호</label>
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
            v-if="selectedUserId"
            type="submit"
            :disabled="isLoading"
            class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4.5 rounded-2xl shadow-xl shadow-indigo-200 transition-all active:scale-[0.98] disabled:opacity-50 mt-4 text-xs uppercase tracking-widest h-14"
          >
            {{ isLoading ? '인증 중...' : '로그인' }}
          </button>
        </form>




      </div>

      <!-- 디바이스 유형별 모달을 동적 로딩 -->
      <Suspense v-if="deptModalOpen">
        <component
          :is="isMobile ? DeptPickerMobileAsync : DeptPickerDesktopAsync"
          :departments="departments"
          :favorites="favorites"
          :recent="recent"
          @close="deptModalOpen = false"
          @select="onSelectDept"
          @update:favorites="updateFavorites"
        />
        <template #fallback>
          <div class="fixed inset-0 z-50 bg-black/30 flex items-center justify-center">
            <div class="bg-white rounded-xl shadow p-6 text-sm font-bold text-slate-600">부서 선택 UI 불러오는 중…</div>
          </div>
        </template>
      </Suspense>

      <!-- Footer Info -->
      <div class="mt-10 text-center space-y-2">
        <p class="text-[0.6875rem] text-slate-300 font-bold uppercase tracking-widest">
          © {{ new Date().getFullYear() }} Wonchon Church. All rights reserved.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, defineAsyncComponent, nextTick } from 'vue'
import { useAuthStore } from '../store/auth'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { EyeIcon, EyeSlashIcon, ArrowRightIcon } from '@heroicons/vue/24/outline'

const DeptPickerMobileAsync = defineAsyncComponent(() =>
  import('../components/mobile/DeptPickerMobile.vue')
)
const DeptPickerDesktopAsync = defineAsyncComponent(() =>
  import('../components/DeptPickerDesktop.vue')
)

const auth = useAuthStore()
const router = useRouter()

const departments = ref([])
const users = ref([])

const selectedDept = ref('')
const selectedUserId = ref('')
const password = ref('')
const showPw = ref(false)
const isLoading = ref(false)
const errorMsg = ref('')

const isMobile = computed(() => typeof window !== "undefined" && window.innerWidth < 1024)
const deptModalOpen = ref(false)
const FAVORITE_KEY = "dept_favorites"
const RECENT_KEY = "dept_recent"
const favorites = ref([])
const recent = ref([])

const onSelectDept = async (dept) => {
  selectedDept.value = dept.dept_name
  recent.value = [dept.id, ...recent.value.filter(x => x !== dept.id)].slice(0, 5)
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.value))
  deptModalOpen.value = false
  await nextTick()
  await fetchUsers()
}

function updateFavorites(next) {
  favorites.value = next
  localStorage.setItem(FAVORITE_KEY, JSON.stringify(favorites.value.slice(0, 50)))
}

onMounted(async () => {
  try {
    favorites.value = JSON.parse(localStorage.getItem(FAVORITE_KEY) || "[]")
    recent.value = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]")
  } catch {}

  try {
    const res = await axios.get('/api/users/departments')
    departments.value = res.data.sort((a, b) => a.dept_name.localeCompare(b.dept_name))
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
    errorMsg.value = '사용자를 선택하고 비밀번호를 입력하세요.'
    return
  }
  isLoading.value = true
  errorMsg.value = ''
  
  const result = await auth.login(selectedUserId.value, password.value)
  if (result.success) {
    if (auth.user.mustChangePassword) {
      router.push({ name: 'ChangePassword' })
      return
    }

    if (auth.isAdmin) {
      router.push('/admin')
    } else {
      router.push('/home')
    }
  } else {
    errorMsg.value = result.message || '로그인에 실패했습니다.'
  }
  isLoading.value = false
}
</script>

<style scoped>
.py-4\.5 {
  padding-top: 1.125rem;
  padding-bottom: 1.125rem;
}
</style>
