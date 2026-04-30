<script setup>
import { ref, onMounted, watch } from 'vue'
import axios from 'axios'
import { useAuthStore } from '../store/auth'
import { 
  UserCircleIcon, 
  EnvelopeIcon, 
  PhoneIcon, 
  BuildingLibraryIcon,
  IdentificationIcon,
  CheckBadgeIcon,
  ArrowPathIcon,
  BuildingOfficeIcon,
  ChevronDownIcon
} from '@heroicons/vue/24/outline'

const auth = useAuthStore()
const loading = ref(false)
const saving = ref(false)
const departments = ref([])
const profile = ref({
  user_name: '',
  email: '',
  phone: '',
  user_id: '',
  dept_name: ''
})

const formatPhone = (val) => {
  if (!val) return ''
  const num = val.replace(/[^0-9]/g, '')
  if (num.length <= 3) return num
  if (num.length <= 7) return `${num.slice(0, 3)}-${num.slice(3)}`
  return `${num.slice(0, 3)}-${num.slice(3, 7)}-${num.slice(7, 11)}`
}

watch(() => profile.value.phone, (newVal) => {
  if (newVal) {
    const formatted = formatPhone(newVal)
    if (newVal !== formatted) {
      profile.value.phone = formatted
    }
  }
})

const fetchProfile = async () => {
  loading.value = true
  try {
    const res = await axios.get('/api/users/me')
    profile.value = res.data
  } catch (err) {
    console.error('Failed to fetch profile:', err)
  } finally {
    loading.value = false
  }
}

const fetchDepartments = async () => {
  try {
    const res = await axios.get('/api/departments')
    departments.value = res.data
  } catch (err) {
    console.error('Fetch departments error:', err)
  }
}

const updateProfile = async () => {
  saving.value = true
  try {
    await axios.put('/api/users/me', {
      user_name: profile.value.user_name,
      email: profile.value.email,
      phone: profile.value.phone,
      dept_name: profile.value.dept_name
    })
    
    // Sync with auth store
    await auth.checkSession()
    
    alert('프로필이 성공적으로 업데이트되었습니다.')
    fetchProfile()
  } catch (err) {
    alert('업데이트 중 오류가 발생했습니다.')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  fetchProfile()
  fetchDepartments()
})
</script>

<template>
  <div class="p-8 max-w-4xl mx-auto space-y-12 min-h-screen font-sans">
    <!-- Profile Header -->
    <div class="flex flex-col md:flex-row items-center gap-10 bg-white p-12 rounded-[3.5rem] shadow-2xl border border-slate-50 relative overflow-hidden group">
      <div class="absolute -right-20 -top-20 w-64 h-64 bg-indigo-50 rounded-full blur-3xl group-hover:bg-indigo-100 transition-colors duration-1000"></div>
      
      <div class="relative z-10 w-32 h-32 rounded-[2.5rem] bg-slate-900 flex items-center justify-center text-4xl font-black text-white shadow-2xl shadow-indigo-200">
        {{ profile.user_name?.charAt(0) }}
      </div>
      
      <div class="relative z-10 text-center md:text-left space-y-3">
        <h1 class="text-4xl font-black text-slate-900 tracking-tight">마이 프로필</h1>
        <p class="text-slate-400 font-bold uppercase tracking-widest text-xs">개인 정보 및 설정 관리</p>
        <div class="flex flex-wrap gap-2 justify-center md:justify-start pt-2">
          <span class="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[12px] font-black uppercase tracking-widest">{{ profile.dept_name || '부서 미지정' }}</span>
          <span class="px-3 py-1 bg-slate-100 text-slate-400 rounded-full text-[12px] font-black uppercase tracking-widest">{{ profile.user_id }}</span>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="grid md:grid-cols-3 gap-8">
      <!-- Sidebar Info (Non-editable) -->
      <div class="space-y-6">
        <div class="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-xl space-y-6">
          <div class="flex items-center gap-3">
            <IdentificationIcon class="w-6 h-6 text-indigo-400" />
            <span class="text-[12px] font-black uppercase tracking-widest text-slate-500">계정 아이디</span>
          </div>
          <p class="text-xl font-black">{{ profile.user_id }}</p>
          <div class="pt-4 border-t border-slate-800">
             <p class="text-[12px] text-slate-500 font-bold leading-relaxed">계정 아이디는 수정할 수 없습니다. 변경이 필요한 경우 관리자에게 문의하세요.</p>
          </div>
        </div>
      </div>

      <!-- Edit Form -->
      <div class="md:col-span-2 space-y-8">
        <div class="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl space-y-8">
          <div class="space-y-6">
            <!-- Name -->
            <div class="space-y-2 group">
              <label class="block text-[12px] font-black text-slate-300 uppercase tracking-widest ml-1">이름</label>
              <div class="flex items-center gap-4 bg-slate-50 p-6 rounded-3xl group-focus-within:bg-white border-2 border-transparent group-focus-within:border-indigo-100 transition-all">
                <UserCircleIcon class="w-6 h-6 text-slate-300" />
                <input type="text" v-model="profile.user_name" class="w-full bg-transparent border-none p-0 font-black text-slate-800 focus:ring-0" placeholder="성함을 입력하세요" />
              </div>
            </div>

            <!-- Department Combo Box -->
            <div class="space-y-2 group">
              <label class="block text-[12px] font-black text-slate-300 uppercase tracking-widest ml-1">소속 부서</label>
              <div class="relative">
                <div class="flex items-center gap-4 bg-slate-50 p-6 rounded-3xl group-focus-within:bg-white border-2 border-transparent group-focus-within:border-indigo-100 transition-all">
                  <BuildingOfficeIcon class="w-6 h-6 text-slate-300" />
                  <select v-model="profile.dept_name" class="w-full bg-transparent border-none p-0 font-black text-slate-800 focus:ring-0 appearance-none cursor-pointer">
                    <option value="">부서 미지정</option>
                    <option v-for="dept in departments" :key="dept.id" :value="dept.dept_name">{{ dept.dept_name }}</option>
                  </select>
                  <ChevronDownIcon class="w-5 h-5 text-slate-300 pointer-events-none" />
                </div>
              </div>
            </div>

            <!-- Email -->
            <div class="space-y-2 group">
              <label class="block text-[12px] font-black text-slate-300 uppercase tracking-widest ml-1">이메일 주소</label>
              <div class="flex items-center gap-4 bg-slate-50 p-6 rounded-3xl group-focus-within:bg-white border-2 border-transparent group-focus-within:border-indigo-100 transition-all">
                <EnvelopeIcon class="w-6 h-6 text-slate-300" />
                <input type="email" v-model="profile.email" class="w-full bg-transparent border-none p-0 font-black text-slate-800 focus:ring-0 font-sans" placeholder="example@church.com" />
              </div>
            </div>

            <!-- Phone -->
            <div class="space-y-2 group">
              <label class="block text-[12px] font-black text-slate-300 uppercase tracking-widest ml-1">연락처</label>
              <div class="flex items-center gap-4 bg-slate-50 p-6 rounded-3xl group-focus-within:bg-white border-2 border-transparent group-focus-within:border-indigo-100 transition-all">
                <PhoneIcon class="w-6 h-6 text-slate-300" />
                <input type="text" v-model="profile.phone" class="w-full bg-transparent border-none p-0 font-black text-slate-800 focus:ring-0 font-sans" placeholder="010-0000-0000" />
              </div>
              <p class="text-[12px] text-indigo-500 font-bold ml-1 mt-1 leading-relaxed">
                ※ 입력한 핸드폰 번호로 카카오 알림톡이 전송되오니 정확한 정보를 입력하여 주십시요.
              </p>
            </div>
          </div>

          <button 
            @click="updateProfile"
            :disabled="saving"
            class="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-2xl shadow-indigo-100 flex items-center justify-center gap-3 hover:bg-slate-800 active:scale-95 transition-all disabled:opacity-50"
          >
            <ArrowPathIcon v-if="saving" class="w-5 h-5 animate-spin" />
            <CheckBadgeIcon v-else class="w-5 h-5" />
            {{ saving ? '저장 중...' : '프로필 저장' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.font-sans {
  font-family: 'Inter', 'Outfit', sans-serif;
}
</style>
