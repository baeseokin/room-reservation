<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'
import { useModalStore } from '@/stores/useModalStore'
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  ArrowPathIcon, 
  ClockIcon,
  MagnifyingGlassIcon,
  CalendarDaysIcon,
  CheckBadgeIcon
} from '@heroicons/vue/24/outline'
import AdminReservationCalendar from '@/components/admin/AdminReservationCalendar.vue'

const route = useRoute()
const modal = useModalStore()
const activeTab = ref('calendar') // 'calendar' (예약 현황) or 'review' (신청 검토)
const allReservations = ref([])
const isLoading = ref(false)
const selectedReservation = ref(null)
const showRejectModal = ref(false)
const rejectReason = ref('')
const selectedIds = ref([])
const isBulkAction = ref(false)
const searchQuery = ref('')
const calendarRef = ref(null)
const highlightedId = ref(null)

const pendingReservations = computed(() => {
  return allReservations.value.filter(r => r.status === 'pending')
})

const filteredPendingReservations = computed(() => {
  let list = pendingReservations.value
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(r => 
      r.title?.toLowerCase().includes(q) || 
      r.room_name?.toLowerCase().includes(q) || 
      r.requester_name?.toLowerCase().includes(q) ||
      r.requester_phone?.includes(q) ||
      r.reason?.toLowerCase().includes(q)
    )
  }
  return list
})

const isAllSelected = computed(() => {
  return filteredPendingReservations.value.length > 0 && 
         selectedIds.value.length === filteredPendingReservations.value.length
})

const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedIds.value = []
  } else {
    selectedIds.value = filteredPendingReservations.value.map(r => r.id)
  }
}

const fetchReservations = async () => {
  isLoading.value = true
  selectedIds.value = []
  try {
    const { data } = await axios.get('/api/reservations', { params: { status: 'all' } })
    allReservations.value = data
  } catch (e) {
    console.error('Fetch reservations error:', e)
  } finally {
    isLoading.value = false
  }
}

const handleCalendarUpdated = () => {
  fetchReservations()
}

const approve = async (id) => {
  if (!await modal.showConfirm('이 예약을 승인하시겠습니까? 신청자에게 카카오톡 알림톡이 발송됩니다.')) return
  isLoading.value = true
  try {
    await axios.patch(`/api/reservations/${id}/approve`)
    modal.showAlert('예약이 승인되었습니다.')
    await fetchReservations()
    if (calendarRef.value) {
      calendarRef.value.fetchData()
    }
  } catch (e) {
    modal.showAlert(e.response?.data?.message || '승인 처리 중 오류가 발생했습니다.')
  } finally {
    isLoading.value = false
  }
}

const bulkApprove = async () => {
  if (selectedIds.value.length === 0) return
  if (!await modal.showConfirm(`선택한 ${selectedIds.value.length}건의 예약을 일괄 승인하시겠습니까? 신청자들에게 알림톡이 발송됩니다.`)) return
  
  isLoading.value = true
  try {
    await axios.patch('/api/reservations/bulk-approve', { ids: selectedIds.value })
    modal.showAlert('일괄 승인되었습니다.')
    await fetchReservations()
    if (calendarRef.value) {
      calendarRef.value.fetchData()
    }
  } catch (e) {
    modal.showAlert('일괄 처리 중 오류가 발생했습니다.')
  } finally {
    isLoading.value = false
  }
}

const openRejectModal = (r = null) => {
  if (r) {
    selectedReservation.value = r
    isBulkAction.value = false
  } else {
    isBulkAction.value = true
  }
  rejectReason.value = ''
  showRejectModal.value = true
}

const confirmReject = async () => {
  if (!rejectReason.value?.trim()) {
    modal.showAlert('거부 사유를 입력해 주세요. (신청자 알림톡 전송)')
    return
  }

  isLoading.value = true
  try {
    if (isBulkAction.value) {
      await axios.patch('/api/reservations/bulk-reject', { 
        ids: selectedIds.value,
        reject_reason: rejectReason.value
      })
      modal.showAlert('선택된 예약이 일괄 거부되었으며 알림톡이 발송되었습니다.')
    } else {
      await axios.patch(`/api/reservations/${selectedReservation.value.id}/reject`, {
        reject_reason: rejectReason.value
      })
      modal.showAlert('예약이 거부되었으며 신청자에게 알림톡이 발송되었습니다.')
    }
    showRejectModal.value = false
    await fetchReservations()
    if (calendarRef.value) {
      calendarRef.value.fetchData()
    }
  } catch (e) {
    modal.showAlert('처리 중 오류가 발생했습니다.')
  } finally {
    isLoading.value = false
  }
}

const fmtDate = (d) => {
  if (!d) return ''
  const date = new Date(d)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()]
  return `${year}-${month}-${day}(${dayOfWeek})`
}

const fmtTime = (t) => {
  if (!t) return ''
  return String(t).slice(0, 5)
}
onMounted(async () => {
  if (route.query.tab === 'calendar') {
    activeTab.value = 'calendar'
  } else if (route.query.tab === 'review') {
    activeTab.value = 'review'
  }
  await fetchReservations()
  if (route.query.id) {
    highlightedId.value = Number(route.query.id)
    if (activeTab.value === 'review') {
      await nextTick()
      document.getElementById('res-' + route.query.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    } else if (activeTab.value === 'calendar') {
      calendarRef.value?.openReservationById(route.query.id)
    }
  }
})
</script>

<template>
  <div class="p-6 max-w-7xl mx-auto space-y-6 pb-28">
    <!-- Page Header & Tab Bar -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-black text-slate-900 tracking-tight">예약 관리</h1>
        <p class="text-slate-500 text-sm font-medium mt-0.5">
          신청된 예약을 검토·승인하거나 캘린더에서 전체 예약 현황을 변경·취소할 수 있습니다.
        </p>
      </div>

      <!-- Main Two Tabs Switcher -->
      <div class="bg-slate-200/80 p-1 rounded-2xl flex items-center gap-1 shadow-inner self-start sm:self-auto">
        <button @click="activeTab = 'calendar'"
                :class="[activeTab === 'calendar' ? 'bg-white text-indigo-600 shadow-sm font-black' : 'text-slate-600 font-bold hover:text-slate-900']"
                class="px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2">
          <CalendarDaysIcon class="w-4 h-4" />
          <span>예약 현황</span>
        </button>

        <button @click="activeTab = 'review'"
                :class="[activeTab === 'review' ? 'bg-white text-indigo-600 shadow-sm font-black' : 'text-slate-600 font-bold hover:text-slate-900']"
                class="px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2">
          <CheckBadgeIcon class="w-4 h-4" />
          <span>신청 검토</span>
          <span v-if="pendingReservations.length > 0" 
                class="px-2 py-0.5 rounded-full text-[0.6875rem] font-black bg-rose-500 text-white shadow-xs animate-pulse">
            {{ pendingReservations.length }}
          </span>
        </button>
      </div>
    </div>

    <!-- TAB 1: 신청 검토 (Pending Applications) -->
    <div v-if="activeTab === 'review'" class="space-y-6 animate-in fade-in duration-200">
      <!-- Search, Summary & Bulk Actions Bar -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <!-- Search Input -->
        <div class="relative flex-1 max-w-md">
          <input v-model="searchQuery" type="text" placeholder="신청명, 공간명, 신청자, 연락처 검색..." 
                 class="w-full bg-white border border-slate-200 rounded-2xl pl-11 pr-4 py-3 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all shadow-sm placeholder:text-slate-400" />
          <MagnifyingGlassIcon class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        </div>

        <!-- Right Side: Bulk Actions & Refresh -->
        <div class="flex items-center gap-3">
          <!-- Bulk Action Bar -->
          <transition enter-active-class="transition duration-200 ease-out" enter-from-class="transform translate-y-2 opacity-0" enter-to-class="transform translate-y-0 opacity-100" leave-active-class="transition duration-150 ease-in" leave-from-class="transform translate-y-0 opacity-100" leave-to-class="transform translate-y-2 opacity-0">
            <div v-if="selectedIds.length > 0" class="flex items-center gap-2 bg-indigo-600 px-3.5 py-1.5 rounded-2xl shadow-lg shadow-indigo-200">
              <span class="text-xs font-black text-white mr-1.5">{{ selectedIds.length }}건 선택</span>
              <button @click="bulkApprove" class="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1 active:scale-95">
                <CheckCircleIcon class="w-3.5 h-3.5" /> 일괄 승인
              </button>
              <button @click="openRejectModal()" class="bg-rose-500 hover:bg-rose-600 text-white px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1 active:scale-95 shadow-sm">
                <XCircleIcon class="w-3.5 h-3.5" /> 일괄 거부
              </button>
            </div>
          </transition>

          <button @click="fetchReservations" class="flex items-center gap-1.5 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-2xl text-xs font-black hover:bg-slate-50 transition-all shadow-sm">
            <ArrowPathIcon class="w-3.5 h-3.5" :class="{ 'animate-spin': isLoading }" />
            새로고침
          </button>
        </div>
      </div>

      <!-- Pending Reservations Table / Card Container -->
      <div class="bg-white rounded-[2rem] border border-slate-200/80 shadow-xl shadow-slate-200/40 overflow-hidden">
        <!-- Select All Header -->
        <div v-if="filteredPendingReservations.length > 0" class="bg-slate-50/70 border-b border-slate-100 px-6 py-3.5 flex items-center justify-between">
          <label class="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" :checked="isAllSelected" @change="toggleSelectAll"
                   class="w-4 h-4 rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
            <span class="text-xs font-black text-slate-600">전체 선택</span>
          </label>
          <span class="text-xs font-black text-slate-400">대기 중인 신청: <strong class="text-indigo-600">{{ filteredPendingReservations.length }}</strong>건</span>
        </div>

        <!-- Loading State -->
        <div v-if="isLoading && allReservations.length === 0" class="flex justify-center py-20">
          <div class="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>

        <!-- Empty State -->
        <div v-else-if="filteredPendingReservations.length === 0" class="text-center py-20 space-y-3">
          <ClockIcon class="w-12 h-12 text-slate-300 mx-auto" />
          <p class="text-slate-500 font-black text-sm">검토 대기 중인 예약 신청이 없습니다.</p>
          <p class="text-slate-400 text-xs font-medium">새로운 예약 신청이 접수되면 이곳에 표시됩니다.</p>
        </div>

        <!-- List Items -->
        <div v-else class="divide-y divide-slate-100">
          <div v-for="r in filteredPendingReservations" :key="r.id"
               :id="'res-' + r.id"
               :class="[highlightedId === r.id ? 'ring-2 ring-indigo-500 bg-indigo-50/50 shadow-md' : '']"
               class="p-5 sm:p-6 hover:bg-indigo-50/20 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group rounded-2xl">
            
            <div class="flex items-start sm:items-center gap-4 flex-1 min-w-0">
              <!-- Checkbox -->
              <div class="shrink-0 pt-0.5 sm:pt-0">
                <input type="checkbox" v-model="selectedIds" :value="r.id"
                       class="w-4 h-4 rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
              </div>

              <!-- Status Badge -->
              <span class="shrink-0 bg-amber-50 text-amber-700 border border-amber-200/80 px-2.5 py-1 rounded-xl text-xs font-black">
                대기중
              </span>

              <!-- Content Info -->
              <div class="space-y-1 flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="font-black text-slate-900 text-sm">{{ r.title || '(신청명 없음)' }}</span>
                  <span class="text-xs font-black text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-lg">
                    {{ r.floor }}{{ String(r.floor).includes('B') ? '' : 'F' }} · {{ r.room_name }}
                  </span>
                </div>

                <div class="text-xs text-slate-600 font-bold flex items-center gap-2 flex-wrap">
                  <span>{{ fmtDate(r.reservation_date) }}</span>
                  <span class="text-slate-300">|</span>
                  <span class="text-indigo-600 font-black">{{ fmtTime(r.start_time) }} ~ {{ fmtTime(r.end_time) }}</span>
                </div>

                <div class="text-xs text-slate-400 font-medium">
                  <span class="font-bold text-slate-600">신청자: {{ r.requester_name }}</span>
                  <span v-if="r.requester_phone" class="ml-1 text-slate-500">({{ r.requester_phone }})</span>
                  <span v-if="r.reason" class="ml-2 text-slate-400">· 사용목적: {{ r.reason }}</span>
                </div>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <button @click="approve(r.id)"
                      class="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-black transition-all shadow-sm active:scale-95">
                <CheckCircleIcon class="w-4 h-4" /> 승인
              </button>
              <button @click="openRejectModal(r)"
                      class="flex items-center gap-1 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 px-4 py-2.5 rounded-xl text-xs font-black transition-all active:scale-95">
                <XCircleIcon class="w-4 h-4" /> 거부
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 2: 예약 현황 (PC Calendar View with Modification & Cancellation) -->
    <div v-show="activeTab === 'calendar'" class="animate-in fade-in duration-200">
      <AdminReservationCalendar ref="calendarRef" @updated="handleCalendarUpdated" />
    </div>

    <!-- Reject Modal (Individual & Bulk) -->
    <Teleport to="body">
      <transition enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0 scale-95" enter-to-class="opacity-100 scale-100" leave-active-class="transition duration-150 ease-in" leave-from-class="opacity-100 scale-100" leave-to-class="opacity-0 scale-95">
        <div v-if="showRejectModal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[3000] p-4">
          <div class="bg-white rounded-[2.5rem] shadow-2xl p-7 max-w-md w-full space-y-5 border border-white">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center">
                <XCircleIcon class="w-6 h-6" />
              </div>
              <div>
                <h3 class="text-base font-black text-slate-900">{{ isBulkAction ? '일괄 거부' : '예약 거부' }}</h3>
                <p v-if="!isBulkAction" class="text-xs text-slate-500 font-bold mt-0.5">
                  <strong>{{ selectedReservation?.requester_name }}</strong>님의 예약을 거부합니다.
                </p>
                <p v-else class="text-xs text-slate-500 font-bold mt-0.5">
                  선택한 <strong>{{ selectedIds.length }}건</strong>의 예약을 일괄 거부합니다.
                </p>
              </div>
            </div>

            <div class="space-y-1.5">
              <label class="text-xs font-black text-rose-600 block">거부 사유 입력 (신청자 알림톡 전송)</label>
              <textarea v-model="rejectReason" rows="3"
                placeholder="예: 해당 시간에는 교회 예배 및 공식 행사가 예정되어 있습니다."
                class="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs font-bold text-slate-800 placeholder:text-slate-300 outline-none focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-300 resize-none transition-all">
              </textarea>
            </div>

            <div class="flex gap-3 pt-2">
              <button @click="showRejectModal = false" class="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-500 py-3 rounded-2xl font-black text-xs transition-all">
                취소
              </button>
              <button @click="confirmReject" class="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-3 rounded-2xl font-black text-xs transition-all shadow-lg shadow-rose-200 active:scale-95">
                거부 확정 및 알림톡 발송
              </button>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>
  </div>
</template>
