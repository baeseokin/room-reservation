<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import axios from 'axios'
import { useModalStore } from '@/stores/useModalStore'
import { 
  MagnifyingGlassIcon, 
  ArrowPathIcon, 
  UserIcon, 
  BuildingOfficeIcon, 
  PhoneIcon, 
  PencilSquareIcon, 
  KeyIcon, 
  TrashIcon,
  ShieldCheckIcon,
  XMarkIcon,
  ChevronDownIcon
} from '@heroicons/vue/24/outline'

const modal = useModalStore()
const users = ref([])
const loading = ref(false)
const searchQuery = ref('')
const showEditModal = ref(false)
const selectedUser = ref(null)
const departments = ref([])

const form = ref({
  user_name: '',
  email: '',
  phone: '',
  dept_name: '',
  roleIds: []
})

const formatPhone = (val) => {
  if (!val) return ''
  const num = val.replace(/[^0-9]/g, '')
  if (num.length <= 3) return num
  if (num.length <= 7) return `${num.slice(0, 3)}-${num.slice(3)}`
  return `${num.slice(0, 3)}-${num.slice(3, 7)}-${num.slice(7, 11)}`
}

watch(() => form.value.phone, (newVal) => {
  if (newVal) {
    const formatted = formatPhone(newVal)
    if (newVal !== formatted) {
      form.value.phone = formatted
    }
  }
})

const fetchUsers = async () => {
  loading.value = true
  try {
    const res = await axios.get('/api/users')
    users.value = res.data
  } catch (error) {
    console.error('Fetch users error:', error)
  } finally {
    loading.value = false
  }
}

const fetchDepartments = async () => {
  try {
    const res = await axios.get('/api/departments')
    departments.value = res.data
  } catch (error) {
    console.error('Fetch departments error:', error)
  }
}

const filteredUsers = computed(() => {
  if (!searchQuery.value) return users.value
  const query = searchQuery.value.toLowerCase()
  return users.value.filter(u => 
    u.user_name.toLowerCase().includes(query) || 
    u.user_id.toLowerCase().includes(query) ||
    (u.dept_name && u.dept_name.toLowerCase().includes(query))
  )
})

const openEdit = (user) => {
  selectedUser.value = user
  form.value = {
    user_name: user.user_name,
    email: user.email || '',
    phone: user.phone || '',
    dept_name: user.dept_name || '',
    roleIds: user.roles ? (user.roles.includes('관리자') ? [1, 2] : [2]) : [2]
  }
  showEditModal.value = true
}

const handleUpdate = async () => {
  try {
    await axios.put(`/api/users/${selectedUser.value.id}`, form.value)
    modal.showAlert('사용자 정보가 성공적으로 수정되었습니다.')
    showEditModal.value = false
    fetchUsers()
  } catch (error) {
    modal.showAlert('수정 중 오류가 발생했습니다.')
  }
}

const resetPassword = async (user) => {
  if (!await modal.showConfirm(`'${user.user_name}'님의 비밀번호를 'room00!'로 초기화하시겠습니까?`)) return
  try {
    const res = await axios.post(`/api/users/${user.id}/reset-password`)
    modal.showAlert(res.data.message)
  } catch (error) {
    modal.showAlert('비밀번호 초기화 실패')
  }
}

const deleteUser = async (user) => {
  if (!await modal.showConfirm(`'${user.user_name}'님을 강제 탈퇴시키겠습니까? 이 작업은 되돌릴 수 없습니다.`)) return
  try {
    await axios.delete(`/api/users/${user.id}`)
    modal.showAlert('탈퇴 처리가 완료되었습니다.')
    fetchUsers()
  } catch (error) {
    modal.showAlert(error.response?.data?.message || '삭제 실패')
  }
}

const selectRole = (roleId) => {
  form.value.roleIds = [roleId]
}

onMounted(() => {
  fetchUsers()
  fetchDepartments()
})
</script>

<template>
  <div class="space-y-6 pb-20">
    <!-- Header -->
    <div class="flex flex-col gap-4">
      <div class="space-y-1">
        <h2 class="text-2xl font-black text-slate-900 tracking-tight">사용자 관리</h2>
        <p class="text-slate-400 text-[11px] font-black uppercase tracking-widest">등록된 회원 정보를 관리합니다.</p>
      </div>

      <div class="flex gap-2">
        <div class="relative flex-1">
          <MagnifyingGlassIcon class="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input v-model="searchQuery" type="text" placeholder="이름, ID, 부서 검색..."
            class="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none shadow-sm transition-all" />
        </div>
        <button @click="fetchUsers" class="p-4 bg-white border border-slate-200 text-slate-500 rounded-2xl active:scale-95 transition-all shadow-sm">
          <ArrowPathIcon class="w-5 h-5" :class="{ 'animate-spin': loading }" />
        </button>
      </div>
    </div>

    <!-- User List -->
    <div v-if="loading" class="flex justify-center py-20">
      <div class="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
    </div>

    <div v-else-if="filteredUsers.length === 0" class="text-center py-20 bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50">
      <UserIcon class="w-16 h-16 text-slate-100 mx-auto mb-4" />
      <p class="text-slate-400 font-black text-sm uppercase tracking-widest">검색 결과가 없습니다</p>
    </div>

    <div v-else class="space-y-4">
      <div v-for="user in filteredUsers" :key="user.id" 
        class="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 space-y-4 relative overflow-hidden group active:scale-[0.99] transition-transform">
        
        <!-- User Info Header -->
        <div class="flex items-center gap-4">
          <div class="w-14 h-14 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center text-xl font-black group-hover:bg-indigo-600 group-hover:text-white transition-colors">
            {{ user.user_name.charAt(0) }}
          </div>
          <div class="flex-1">
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-black text-slate-900 leading-tight">{{ user.user_name }}</h3>
              <div class="flex gap-1">
                <span v-for="role in (user.roles || '').split(',')" :key="role"
                  :class="role === '관리자' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-indigo-50 text-indigo-600 border-indigo-100'"
                  class="px-2 py-0.5 rounded-lg text-[9px] font-black border uppercase tracking-tighter">
                  {{ role }}
                </span>
              </div>
            </div>
            <div class="text-[11px] font-bold text-slate-400 mt-0.5">{{ user.user_id }}</div>
          </div>
        </div>

        <!-- Details Box -->
        <div class="bg-slate-50 p-4 rounded-2xl space-y-2">
           <div class="flex items-center gap-2.5 text-[12px] font-bold text-slate-600">
             <BuildingOfficeIcon class="w-4 h-4 text-slate-300" />
             {{ user.dept_name || '부서 미지정' }}
           </div>
           <div class="flex items-center gap-2.5 text-[12px] font-bold text-slate-600">
             <PhoneIcon class="w-4 h-4 text-slate-300" />
             {{ user.phone || '연락처 없음' }}
           </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex gap-2 pt-2">
          <button @click="openEdit(user)"
            class="flex-1 flex items-center justify-center gap-2 py-4 bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl active:scale-95 transition-all shadow-lg shadow-slate-200">
            <PencilSquareIcon class="w-4 h-4" /> 정보 수정
          </button>
          <div class="flex gap-2">
            <button @click="resetPassword(user)"
              class="w-12 h-12 flex items-center justify-center bg-amber-50 text-amber-600 border border-amber-100 rounded-2xl active:scale-95 transition-all">
              <KeyIcon class="w-5 h-5" />
            </button>
            <button @click="deleteUser(user)"
              class="w-12 h-12 flex items-center justify-center bg-rose-50 text-rose-500 border border-rose-100 rounded-2xl active:scale-95 transition-all">
              <TrashIcon class="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit User Modal -->
    <Teleport to="body">
      <div v-if="showEditModal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-end justify-center z-[100]">
        <div class="bg-white rounded-t-[3rem] w-full max-w-lg p-8 space-y-8 animate-in slide-in-from-bottom duration-300">
          <!-- Modal Header -->
          <div class="flex justify-between items-start">
            <div>
              <h2 class="text-xl font-black text-slate-900">사용자 정보 수정</h2>
              <p class="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">회원 정보를 변경합니다.</p>
            </div>
            <button @click="showEditModal = false" class="p-2 text-slate-300 hover:text-slate-900 transition-colors">
              <XMarkIcon class="w-6 h-6" />
            </button>
          </div>

          <!-- Form Area -->
          <div class="space-y-5">
            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-1.5">
                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">이름</label>
                <input v-model="form.user_name" type="text"
                  class="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all" />
              </div>
              <div class="space-y-1.5">
                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">연락처</label>
                <input v-model="form.phone" type="text"
                  class="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all" />
              </div>
            </div>
            
            <div class="space-y-1.5">
              <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-indigo-500 italic">
                ※ 연락처 오입력 시 알림톡 전송이 불가합니다.
              </label>
            </div>

            <div class="space-y-1.5">
              <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">소속 부서</label>
              <div class="relative">
                <select v-model="form.dept_name" 
                  class="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none appearance-none transition-all">
                  <option value="">부서 미지정</option>
                  <option v-for="dept in departments" :key="dept.id" :value="dept.dept_name">{{ dept.dept_name }}</option>
                </select>
                <div class="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                   <ChevronDownIcon class="w-4 h-4 text-slate-400" />
                </div>
              </div>
            </div>

            <div class="space-y-3">
              <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">권한 설정</label>
              <div class="grid grid-cols-2 gap-3">
                <button @click="selectRole(2)" 
                  :class="[form.roleIds.includes(2) ? 'bg-indigo-600 text-white ring-4 ring-indigo-100' : 'bg-slate-50 border-slate-200 text-slate-400']"
                  class="flex flex-col items-center gap-2 p-5 rounded-[2rem] border transition-all active:scale-95">
                  <UserIcon class="w-6 h-6" />
                  <span class="text-[10px] font-black uppercase tracking-widest">일반 사용자</span>
                </button>
                <button @click="selectRole(1)" 
                  :class="[form.roleIds.includes(1) ? 'bg-rose-500 text-white ring-4 ring-rose-100' : 'bg-slate-50 border-slate-200 text-slate-400']"
                  class="flex flex-col items-center gap-2 p-5 rounded-[2rem] border transition-all active:scale-95">
                  <ShieldCheckIcon class="w-6 h-6" />
                  <span class="text-[10px] font-black uppercase tracking-widest">관리자</span>
                </button>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="flex gap-4 pt-4">
              <button @click="showEditModal = false" 
                class="flex-1 py-5 border border-slate-200 rounded-3xl font-black text-[11px] uppercase tracking-widest text-slate-400 active:bg-slate-50">
                닫기
              </button>
              <button @click="handleUpdate" 
                class="flex-[2] bg-slate-900 text-white py-5 rounded-3xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-slate-200 active:scale-[0.98] transition-transform">
                수정 완료
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
