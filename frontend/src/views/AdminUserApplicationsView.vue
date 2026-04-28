<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { 
  UserPlusIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  PhoneIcon,
  BuildingOfficeIcon,
  EnvelopeIcon,
  ClockIcon,
  XMarkIcon,
  ShieldCheckIcon,
  UserIcon,
  ArrowPathIcon
} from '@heroicons/vue/24/outline'

const applications = ref([])
const loading = ref(false)
const showApproveModal = ref(false)
const selectedUser = ref(null)
const selectedRoles = ref(['사용자']) // Default role

const fetchApplications = async () => {
    loading.value = true
    try {
        const res = await axios.get('/api/users')
        applications.value = res.data.filter(u => !u.is_approved)
    } catch (error) {
        console.error('Fetch error:', error)
    } finally {
        loading.value = false
    }
}

const openApproveModal = (user) => {
    selectedUser.value = user
    selectedRoles.value = ['사용자'] // Reset to default
    showApproveModal.value = true
}

const selectRole = (role) => {
  selectedRoles.value = [role]
}

const handleApprove = async () => {
    if (!selectedUser.value) return
    try {
        await axios.patch(`/api/users/${selectedUser.value.id}/approve`, {
            roleNames: selectedRoles.value
        })
        alert(`${selectedUser.value.user_name}님의 가입이 승인되었습니다.`)
        showApproveModal.value = false
        fetchApplications()
    } catch (error) {
        alert(error.response?.data?.message || '승인 처리 중 오류가 발생했습니다.')
    }
}

const rejectUser = async (user) => {
    if (!confirm(`${user.user_name}님의 가입 신청을 거절하시겠습니까?`)) return
    try {
        await axios.delete(`/api/users/${user.id}`)
        fetchApplications()
    } catch (error) {
        alert('거절 처리 중 오류가 발생했습니다.')
    }
}

const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return d.toLocaleString('ko-KR', { 
        year: 'numeric', month: '2-digit', day: '2-digit', 
        hour: '2-digit', minute: '2-digit' 
    })
}

onMounted(fetchApplications)
</script>

<template>
  <div class="p-6 max-w-7xl mx-auto space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-black text-slate-900">가입 신청 관리</h1>
        <p class="text-slate-500 text-sm font-medium mt-0.5">새로운 사용자 등록 신청을 검토하고 권한을 부여하세요.</p>
      </div>
      <button @click="fetchApplications" class="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all">
        <ArrowPathIcon class="w-4 h-4" :class="{ 'animate-spin': loading }" />
        새로고침
      </button>
    </div>

    <!-- Applications Table/List -->
    <div class="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
      <div v-if="loading" class="flex justify-center py-16">
        <div class="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>

      <div v-else-if="applications.length === 0" class="text-center py-16">
        <UserPlusIcon class="w-10 h-10 text-slate-200 mx-auto mb-3" />
        <p class="text-slate-400 font-black text-sm uppercase tracking-widest">대기 중인 가입 신청이 없습니다</p>
      </div>

      <div v-else class="divide-y divide-slate-100">
        <div v-for="user in applications" :key="user.id"
          class="p-5 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center gap-4">
          
          <!-- Profile Badge -->
          <div class="w-12 h-12 bg-slate-100 text-slate-400 rounded-xl flex items-center justify-center text-sm font-black border border-slate-200 shrink-0 uppercase tracking-tighter">
            {{ user.user_name.charAt(0) }}
          </div>

          <!-- Info -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="font-black text-slate-900 text-sm">{{ user.user_name }}</span>
              <span class="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg uppercase tracking-wider">{{ user.user_id }}</span>
            </div>
            <div class="text-xs text-slate-500 font-bold mt-0.5">
              {{ user.dept_name || '부서 미지정' }} · {{ user.phone }}
            </div>
            <div class="text-[10px] text-slate-400 font-bold mt-0.5">
              신청 일시: {{ formatDate(user.created_at) }}
            </div>
          </div>

          <!-- Actions -->
          <div class="flex gap-2 shrink-0">
            <button @click="openApproveModal(user)"
              class="flex items-center gap-1.5 bg-slate-900 hover:bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-black transition-all active:scale-95 shadow-lg shadow-slate-100">
              <CheckCircleIcon class="w-4 h-4" />승인
            </button>
            <button @click="rejectUser(user)"
              class="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-500 border border-rose-200 px-4 py-2 rounded-xl text-xs font-black transition-all active:scale-95">
              <XCircleIcon class="w-4 h-4" />거절
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Approval Modal (Premium Refined Design) -->
    <Teleport to="body">
      <div v-if="showApproveModal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-xl flex items-center justify-center p-4 z-[100]">
        <div class="bg-white rounded-[3rem] shadow-2xl max-w-lg w-full p-10 space-y-8 animate-in fade-in zoom-in duration-300">
          <!-- Modal Header (Matched with Page Header Style) -->
          <div class="flex justify-between items-start">
            <div>
              <h2 class="text-2xl font-black text-slate-900">가입 승인 검토</h2>
              <p class="text-slate-500 text-sm font-medium mt-0.5">사용자에게 적절한 권한을 부여하고 가입을 최종 승인합니다.</p>
            </div>
            <button @click="showApproveModal = false" class="p-2 text-slate-300 hover:text-slate-900 transition-colors">
              <XMarkIcon class="w-6 h-6" />
            </button>
          </div>

          <div v-if="selectedUser" class="space-y-8">
            <!-- User Profile Summary -->
            <div class="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 flex items-center gap-4 shadow-inner">
              <div class="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100">
                <UserIcon class="w-7 h-7 text-indigo-600" />
              </div>
              <div class="min-w-0">
                <div class="text-lg font-black text-slate-900 truncate">{{ selectedUser.user_name }}</div>
                <div class="text-[11px] font-bold text-slate-400 mt-0.5 truncate italic">
                  {{ selectedUser.dept_name || '부서 미지정' }} · {{ selectedUser.phone }}
                </div>
              </div>
            </div>

            <!-- Role Selection Cards -->
            <div class="space-y-4">
              <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">부여할 시스템 권한</label>
              <div class="grid grid-cols-2 gap-4">
                <!-- User Role Card -->
                <button @click="selectRole('사용자')" 
                  :class="[selectedRoles.includes('사용자') ? 'ring-2 ring-indigo-600 bg-indigo-50 border-indigo-200' : 'bg-white border-slate-100 hover:border-indigo-200']"
                  class="relative flex flex-col items-center gap-3 p-6 rounded-[2.5rem] border transition-all text-center group active:scale-95 shadow-sm">
                  <div :class="[selectedRoles.includes('사용자') ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600']"
                    class="w-12 h-12 rounded-2xl flex items-center justify-center transition-colors">
                    <UserIcon class="w-6 h-6" />
                  </div>
                  <div class="space-y-0.5">
                    <div class="text-xs font-black text-slate-900 uppercase tracking-widest">일반 사용자</div>
                    <div class="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Room Reservation</div>
                  </div>
                </button>

                <!-- Admin Role Card -->
                <button @click="selectRole('관리자')" 
                  :class="[selectedRoles.includes('관리자') ? 'ring-2 ring-indigo-600 bg-indigo-50 border-indigo-200' : 'bg-white border-slate-100 hover:border-indigo-200']"
                  class="relative flex flex-col items-center gap-3 p-6 rounded-[2.5rem] border transition-all text-center group active:scale-95 shadow-sm">
                  <div :class="[selectedRoles.includes('관리자') ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600']"
                    class="w-12 h-12 rounded-2xl flex items-center justify-center transition-colors">
                    <ShieldCheckIcon class="w-6 h-6" />
                  </div>
                  <div class="space-y-0.5">
                    <div class="text-xs font-black text-slate-900 uppercase tracking-widest">시스템 관리자</div>
                    <div class="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Full Access</div>
                  </div>
                </button>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="flex gap-4 pt-4">
              <button @click="showApproveModal = false" 
                class="flex-1 py-5 bg-slate-100 border border-slate-200 rounded-3xl font-black text-xs uppercase tracking-widest text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-all">
                취소
              </button>
              <button @click="handleApprove" 
                class="flex-[2] bg-slate-900 text-white py-5 rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-indigo-600 shadow-xl shadow-indigo-100 transition-all active:scale-[0.98]">
                최종 승인 완료
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
/* Scrollbar removal for a cleaner look */
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
