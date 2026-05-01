<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import axios from 'axios'
import { 
  UserIcon, 
  MagnifyingGlassIcon, 
  PencilIcon, 
  KeyIcon, 
  TrashIcon, 
  ShieldCheckIcon,
  XMarkIcon,
  ArrowPathIcon,
  BuildingOfficeIcon,
  PhoneIcon
} from '@heroicons/vue/24/outline'

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
    alert('사용자 정보가 성공적으로 수정되었습니다.')
    showEditModal.value = false
    fetchUsers()
  } catch (error) {
    alert('수정 중 오류가 발생했습니다.')
  }
}

const resetPassword = async (user) => {
  if (!confirm(`'${user.user_name}'님의 비밀번호를 'room00!'로 초기화하시겠습니까?`)) return
  try {
    const res = await axios.post(`/api/users/${user.id}/reset-password`)
    alert(res.data.message)
  } catch (error) {
    alert('비밀번호 초기화 실패')
  }
}

const deleteUser = async (user) => {
  if (!confirm(`'${user.user_name}'님을 강제 탈퇴시키겠습니까? 이 작업은 되돌릴 수 없습니다.`)) return
  try {
    await axios.delete(`/api/users/${user.id}`)
    alert('탈퇴 처리가 완료되었습니다.')
    fetchUsers()
  } catch (error) {
    alert(error.response?.data?.message || '삭제 실패')
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
  <div class="p-6 max-w-7xl mx-auto space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-black text-slate-900">사용자 관리</h1>
        <p class="text-slate-500 text-sm font-medium mt-0.5">등록된 사용자 정보를 조회하고 관리합니다.</p>
      </div>
      <div class="flex items-center gap-3">
        <div class="relative">
          <MagnifyingGlassIcon class="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input v-model="searchQuery" type="text" placeholder="이름, ID, 부서 검색..."
            class="pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none w-64 shadow-sm transition-all" />
        </div>
        <button @click="fetchUsers" class="p-3 bg-white border border-slate-200 text-slate-500 rounded-2xl hover:bg-slate-50 transition-all shadow-sm">
          <ArrowPathIcon class="w-5 h-5" :class="{ 'animate-spin': loading }" />
        </button>
      </div>
    </div>

    <!-- User List Table -->
    <div class="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
      <div v-if="loading" class="flex justify-center py-20">
        <div class="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>

      <div v-else-if="filteredUsers.length === 0" class="text-center py-20">
        <UserIcon class="w-16 h-16 text-slate-100 mx-auto mb-4" />
        <p class="text-slate-400 font-black text-sm uppercase tracking-widest">검색 결과가 없습니다</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-slate-50/50 border-b border-slate-100">
              <th class="px-6 py-4 text-[12px] font-black text-slate-400 uppercase tracking-widest">사용자 정보</th>
              <th class="px-6 py-4 text-[12px] font-black text-slate-400 uppercase tracking-widest">부서 / 연락처</th>
              <th class="px-6 py-4 text-[12px] font-black text-slate-400 uppercase tracking-widest text-center">권한</th>
              <th class="px-6 py-4 text-[12px] font-black text-slate-400 uppercase tracking-widest text-right">관리 액션</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 text-sm">
            <tr v-for="user in filteredUsers" :key="user.id" class="hover:bg-slate-50/50 transition-colors group">
              <td class="px-6 py-4">
                <div class="flex items-center gap-4">
                  <div class="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center font-black group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                    {{ user.user_name.charAt(0) }}
                  </div>
                  <div>
                    <div class="font-black text-slate-900">{{ user.user_name }}</div>
                    <div class="text-[11px] font-bold text-slate-400">{{ user.user_id }}</div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4">
                <div class="flex flex-col gap-1">
                  <div class="flex items-center gap-1.5 text-slate-600 font-bold">
                    <BuildingOfficeIcon class="w-3.5 h-3.5 text-slate-400" />
                    {{ user.dept_name || '미지정' }}
                  </div>
                  <div class="flex items-center gap-1.5 text-slate-400 text-xs font-medium">
                    <PhoneIcon class="w-3.5 h-3.5" />
                    {{ user.phone || '연락처 없음' }}
                  </div>
                </div>
              </td>
              <td class="px-6 py-4">
                <div class="flex justify-center gap-1">
                  <span v-for="role in (user.roles || '').split(',')" :key="role"
                    :class="role === '관리자' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-indigo-50 text-indigo-600 border-indigo-100'"
                    class="px-2 py-0.5 rounded-lg text-[12px] font-black border uppercase tracking-tighter">
                    {{ role }}
                  </span>
                </div>
              </td>
              <td class="px-6 py-4 text-right">
                <div class="flex justify-end gap-2">
                  <button @click="openEdit(user)" title="정보 수정"
                    class="p-2.5 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-900 hover:text-white transition-all shadow-sm">
                    <PencilIcon class="w-4 h-4" />
                  </button>
                  <button @click="resetPassword(user)" title="비밀번호 초기화"
                    class="p-2.5 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-500 hover:text-white transition-all border border-amber-100 shadow-sm">
                    <KeyIcon class="w-4 h-4" />
                  </button>
                  <button @click="deleteUser(user)" title="강제 탈퇴"
                    class="p-2.5 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-600 hover:text-white transition-all border border-rose-100 shadow-sm">
                    <TrashIcon class="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Edit User Modal -->
    <Teleport to="body">
      <div v-if="showEditModal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-xl flex items-center justify-center p-4 z-[100]">
        <div class="bg-white rounded-[3rem] shadow-2xl max-w-lg w-full p-10 space-y-8 animate-in fade-in zoom-in duration-300">
          <!-- Modal Header -->
          <div class="flex justify-between items-start">
            <div>
              <h2 class="text-2xl font-black text-slate-900">사용자 정보 수정</h2>
              <p class="text-slate-500 text-sm font-medium mt-0.5">사용자의 기본 정보와 시스템 권한을 변경합니다.</p>
            </div>
            <button @click="showEditModal = false" class="p-2 text-slate-300 hover:text-slate-900 transition-colors">
              <XMarkIcon class="w-6 h-6" />
            </button>
          </div>

          <!-- Form Area -->
          <div class="space-y-6">
            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-2">
                <label class="block text-[12px] font-black text-slate-400 uppercase tracking-widest ml-1">이름</label>
                <input v-model="form.user_name" type="text"
                  class="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3.5 text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" />
              </div>
              <div class="space-y-2">
                <label class="block text-[12px] font-black text-slate-400 uppercase tracking-widest ml-1">연락처</label>
                <input v-model="form.phone" type="text"
                  class="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3.5 text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" />
              </div>
            </div>
            <p class="text-[10px] text-indigo-500 font-bold ml-1 -mt-4 leading-tight">
              ※ 입력한 핸드폰 번호로 카카오 알림톡이 전송되오니 정확한 정보를 입력하여 주십시요.
            </p>

            <div class="space-y-2">
              <label class="block text-[12px] font-black text-slate-400 uppercase tracking-widest ml-1">소속 부서</label>
              <select v-model="form.dept_name" 
                class="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3.5 text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all appearance-none">
                <option value="">부서 미지정</option>
                <option v-for="dept in departments" :key="dept.id" :value="dept.dept_name">{{ dept.dept_name }}</option>
              </select>
            </div>

            <!-- Role Cards (Single select for simplicity as requested before, but multiple allowed in backend. Let's keep cards) -->
            <div class="space-y-3">
              <label class="block text-[12px] font-black text-slate-400 uppercase tracking-widest ml-1">권한 설정</label>
              <div class="grid grid-cols-2 gap-3">
                <button @click="selectRole(2)" 
                  :class="[form.roleIds.includes(2) ? 'ring-2 ring-indigo-600 bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-100']"
                  class="flex flex-col items-center gap-2 p-5 rounded-[2rem] border transition-all active:scale-95">
                  <UserIcon class="w-6 h-6" :class="form.roleIds.includes(2) ? 'text-indigo-600' : 'text-slate-300'" />
                  <span class="text-xs font-black text-slate-900 uppercase">사용자</span>
                </button>
                <button @click="selectRole(1)" 
                  :class="[form.roleIds.includes(1) ? 'ring-2 ring-rose-500 bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-100']"
                  class="flex flex-col items-center gap-2 p-5 rounded-[2rem] border transition-all active:scale-95">
                  <ShieldCheckIcon class="w-6 h-6" :class="form.roleIds.includes(1) ? 'text-rose-500' : 'text-slate-300'" />
                  <span class="text-xs font-black text-slate-900 uppercase">관리자</span>
                </button>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="flex gap-4 pt-4">
              <button @click="showEditModal = false" 
                class="flex-1 py-5 border border-slate-200 rounded-3xl font-black text-xs uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all">
                취소
              </button>
              <button @click="handleUpdate" 
                class="flex-[2] bg-slate-900 text-white py-5 rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-indigo-600 shadow-xl transition-all active:scale-[0.98]">
                정보 업데이트
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
/* Scoped table styles for cleaner integration */
table th {
  white-space: nowrap;
}
</style>
