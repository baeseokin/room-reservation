<template>
  <div class="space-y-4 pb-20">
    <!-- Main Tab Switcher: 예약 현황 vs 신청 검토 -->
    <div class="bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm grid grid-cols-2 gap-1">
      <button
        @click="switchTab('calendar')"
        class="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-black transition-all"
        :class="activeTab === 'calendar'
          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
          : 'text-slate-500 hover:text-slate-800'"
      >
        <CalendarDaysIcon class="w-4 h-4" />
        <span>예약 현황</span>
      </button>

      <button
        @click="switchTab('review')"
        class="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-black transition-all"
        :class="activeTab === 'review'
          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
          : 'text-slate-500 hover:text-slate-800'"
      >
        <ClipboardDocumentCheckIcon class="w-4 h-4" />
        <span>신청 검토</span>
        <span
          v-if="pendingCount > 0"
          class="px-1.5 py-0.5 rounded-full text-[10px] font-black leading-none transition-colors"
          :class="activeTab === 'review' ? 'bg-white text-rose-600' : 'bg-rose-500 text-white animate-pulse'"
        >
          {{ pendingCount }}
        </span>
      </button>
    </div>

    <!-- ==========================================
         TAB 1: 예약 현황 (Mobile Calendar & List View)
    =========================================== -->
    <div v-show="activeTab === 'calendar'" class="animate-in fade-in duration-200">
      <AdminReservationCalendarMobile ref="calendarRef" @updated="handleCalendarUpdated" />
    </div>

    <!-- ==========================================
         TAB 2: 신청 검토 (Pending Reservations Review)
    =========================================== -->
    <div v-show="activeTab === 'review'" class="space-y-4 animate-in fade-in duration-200">
      <!-- Search & Select All Card -->
      <div class="bg-white rounded-[2rem] p-4 border border-slate-100 shadow-sm space-y-3">
        <!-- Search Input -->
        <div class="relative">
          <MagnifyingGlassIcon class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="신청명, 신청자, 공간명 검색..."
            class="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-9 pr-8 py-2.5 text-xs font-bold text-slate-800 placeholder:text-slate-400 outline-none focus:bg-white focus:border-indigo-400"
          />
          <button
            v-if="searchQuery"
            @click="searchQuery = ''"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-black"
          >
            ✕
          </button>
        </div>

        <!-- Select All & Pending Count -->
        <div class="flex items-center justify-between px-1">
          <label
            v-if="filteredReservations.length > 0"
            class="flex items-center gap-2 cursor-pointer select-none"
          >
            <input
              type="checkbox"
              :checked="isAllSelected"
              @change="toggleSelectAll"
              class="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span class="text-xs font-black text-slate-600">전체 선택</span>
          </label>
          <span v-else class="text-xs font-bold text-slate-400">검토 대기 목록</span>

          <div class="flex items-center gap-1.5 text-xs font-bold text-slate-500">
            <span class="w-2 h-2 rounded-full bg-amber-400"></span>
            <span>승인 대기 <strong class="text-indigo-600 font-black">{{ pendingCount }}</strong>건</span>
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="bg-white rounded-[2rem] p-12 text-center border border-slate-100 space-y-3">
        <div class="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p class="text-xs font-black text-slate-400">승인 대기 목록을 불러오는 중...</p>
      </div>

      <!-- Empty State -->
      <div
        v-else-if="filteredReservations.length === 0"
        class="bg-white rounded-[2.5rem] p-12 text-center border border-slate-100 space-y-2 shadow-sm"
      >
        <div class="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center mx-auto mb-2">
          <CheckCircleIcon class="w-7 h-7" />
        </div>
        <p class="text-slate-700 font-black text-sm">검토할 승인 대기 예약이 없습니다.</p>
        <p class="text-slate-400 text-xs font-medium">모든 예약 신청이 처리되었습니다.</p>
      </div>

      <!-- Pending Reservation Cards -->
      <div v-else class="space-y-3">
        <div
          v-for="r in filteredReservations"
          :key="r.id"
          :id="'res-' + r.id"
          class="bg-white rounded-[2rem] p-5 border transition-all shadow-sm space-y-3.5"
          :class="selectedIds.includes(r.id) ? 'border-indigo-400 bg-indigo-50/20 ring-2 ring-indigo-500/10' : 'border-slate-100'"
        >
          <!-- Card Header: Checkbox + Room Badge + Status -->
          <div class="flex items-start justify-between gap-2">
            <label class="flex items-center gap-2.5 cursor-pointer min-w-0">
              <input
                type="checkbox"
                :value="r.id"
                v-model="selectedIds"
                class="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 shrink-0"
              />
              <span class="px-2.5 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-lg uppercase tracking-wider truncate">
                {{ formatFloorLabel(r.floor) }} · {{ r.room_name }}
              </span>
            </label>
            <span
              class="px-2.5 py-0.5 rounded-full text-[10px] font-black shrink-0"
              :class="r.status === 'cancel_requested' ? 'bg-rose-100 text-rose-700' : 'bg-amber-50 text-amber-600'"
            >
              {{ r.status === 'cancel_requested' ? '취소 요청' : '승인 대기' }}
            </span>
          </div>

          <!-- Title & Schedule Info -->
          <div class="space-y-1.5 pl-6">
            <h3 class="text-base font-black text-slate-900 leading-snug">
              {{ r.title || '(신청명 없음)' }}
            </h3>
            <div class="text-xs font-bold text-slate-600 flex items-center gap-2 flex-wrap">
              <span>{{ fmtDate(r.reservation_date) }}</span>
              <span class="text-slate-300">|</span>
              <span class="text-indigo-600 font-black">{{ fmtTime(r.start_time) }} ~ {{ fmtTime(r.end_time) }}</span>
            </div>
            <div class="text-xs font-bold text-slate-500 pt-1">
              <span>신청자: <strong class="text-slate-800">{{ r.requester_name }}</strong></span>
              <a
                v-if="r.requester_phone"
                :href="`tel:${r.requester_phone}`"
                class="ml-1 text-indigo-600 underline"
              >
                ({{ r.requester_phone }})
              </a>
            </div>
            <p v-if="r.reason" class="text-[11px] font-bold text-slate-400 bg-slate-50 rounded-xl px-3 py-2 mt-1">
              사유: {{ r.reason }}
            </p>
            <p v-if="r.reject_reason && r.status === 'cancel_requested'" class="text-[11px] font-bold text-rose-600 bg-rose-50/70 border border-rose-100 rounded-xl px-3 py-2 mt-1">
              취소 사유: {{ r.reject_reason }}
            </p>
          </div>

          <!-- Action Buttons -->
          <div class="flex gap-2 pt-1">
            <button
              @click="approve(r.id)"
              class="flex-1 text-white py-3 rounded-2xl font-black text-xs shadow-sm active:scale-95 transition-all flex items-center justify-center gap-1"
              :class="r.status === 'cancel_requested' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'"
            >
              <CheckCircleIcon class="w-4 h-4" /> {{ r.status === 'cancel_requested' ? '취소 승인' : '승인' }}
            </button>
            <button
              @click="openRejectModal(r)"
              class="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 py-3 rounded-2xl font-black text-xs active:scale-95 transition-all flex items-center justify-center gap-1"
            >
              <XCircleIcon class="w-4 h-4" /> {{ r.status === 'cancel_requested' ? '취소 반려' : '거부' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Floating Bulk Action Bar -->
      <transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="translate-y-8 opacity-0"
        enter-to-class="translate-y-0 opacity-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="translate-y-0 opacity-100"
        leave-to-class="translate-y-8 opacity-0"
      >
        <div
          v-if="selectedIds.length > 0 && activeTab === 'review'"
          class="fixed bottom-20 left-4 right-4 z-[90] bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center justify-between gap-2"
        >
          <div class="flex items-center gap-2">
            <span class="bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-black">
              {{ selectedIds.length }}
            </span>
            <span class="text-xs font-black">건 선택됨</span>
          </div>
          <div class="flex items-center gap-1.5">
            <button
              @click="bulkApprove"
              class="bg-emerald-500 text-white px-3 py-2 rounded-xl text-xs font-black active:scale-95"
            >
              일괄 승인
            </button>
            <button
              @click="openBulkRejectModal"
              class="bg-rose-500 text-white px-3 py-2 rounded-xl text-xs font-black active:scale-95"
            >
              일괄 거부
            </button>
            <button
              @click="selectedIds = []"
              class="w-7 h-7 rounded-lg bg-slate-800 text-slate-400 flex items-center justify-center text-xs font-black"
            >
              ✕
            </button>
          </div>
        </div>
      </transition>
    </div>

    <!-- Reject Reason Bottom Sheet Modal (Individual & Bulk) -->
    <Teleport to="body">
      <div
        v-if="showRejectModal"
        class="fixed inset-0 z-[2200] bg-slate-900/60 backdrop-blur-sm flex flex-col justify-end"
        @click.self="showRejectModal = false"
      >
        <div class="bg-white rounded-t-[2.5rem] p-6 space-y-5 shadow-2xl animate-in slide-in-from-bottom duration-200">
          <div class="flex items-center justify-between">
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
            <button
              @click="showRejectModal = false"
              class="w-9 h-9 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-black"
            >
              ✕
            </button>
          </div>

          <div class="space-y-1.5">
            <label class="text-xs font-black text-rose-600 block">거부 사유 입력 (신청자 알림톡 전송)</label>
            <textarea
              v-model="rejectReason"
              rows="3"
              placeholder="예: 해당 시간에는 교회 예배 및 공식 행사가 예정되어 있습니다."
              class="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs font-bold text-slate-800 placeholder:text-slate-300 outline-none focus:bg-white focus:border-rose-300 resize-none"
            ></textarea>
          </div>

          <div class="flex gap-2">
            <button
              @click="showRejectModal = false"
              class="flex-1 bg-slate-100 text-slate-500 py-3.5 rounded-2xl font-black text-xs"
            >
              취소
            </button>
            <button
              @click="confirmReject"
              class="flex-[2] bg-rose-600 text-white py-3.5 rounded-2xl font-black text-xs shadow-lg shadow-rose-100 active:scale-95 transition-all"
            >
              거부 확정 및 알림톡 발송
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import { useModalStore } from '@/stores/useModalStore'
import AdminReservationCalendarMobile from '@/components/admin/AdminReservationCalendarMobile.vue'
import {
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon,
  CalendarDaysIcon,
  ClipboardDocumentCheckIcon
} from '@heroicons/vue/24/outline'

const route = useRoute()
const router = useRouter()
const modal = useModalStore()

const activeTab = ref(route.query.tab === 'review' ? 'review' : 'calendar')
const calendarRef = ref(null)

const reservations = ref([])
const loading = ref(true)
const searchQuery = ref('')

// Bulk & Reject state
const selectedIds = ref([])
const isBulkAction = ref(false)
const showRejectModal = ref(false)
const selectedReservation = ref(null)
const rejectReason = ref('')

const formatFloorLabel = (f) => {
  const s = String(f || '')
  return s.includes('B') || s.includes('F') ? s : `${s}F`
}

const fmtDate = (d) => (d ? String(d).slice(0, 10) : '')
const fmtTime = (t) => (t ? String(t).slice(0, 5) : '')

const switchTab = (tab) => {
  activeTab.value = tab
  router.replace({ query: { ...route.query, tab } })
  if (tab === 'calendar' && calendarRef.value) {
    calendarRef.value.fetchAll()
  } else if (tab === 'review') {
    fetchReservations()
  }
}

const handleCalendarUpdated = () => {
  fetchReservations()
}

const pendingCount = computed(() =>
  reservations.value.filter((r) => r.status === 'pending' || r.status === 'cancel_requested').length
)

const filteredReservations = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  return reservations.value
    .filter((r) => {
      if (r.status !== 'pending' && r.status !== 'cancel_requested') return false
      if (q) {
        return (
          (r.title && r.title.toLowerCase().includes(q)) ||
          (r.requester_name && r.requester_name.toLowerCase().includes(q)) ||
          (r.room_name && r.room_name.toLowerCase().includes(q)) ||
          (r.requester_phone && r.requester_phone.includes(q)) ||
          (r.reason && r.reason.toLowerCase().includes(q))
        )
      }
      return true
    })
    .sort((a, b) => {
      const dateCmp = fmtDate(a.reservation_date).localeCompare(fmtDate(b.reservation_date))
      if (dateCmp !== 0) return dateCmp
      return fmtTime(a.start_time).localeCompare(fmtTime(b.start_time))
    })
})

const isAllSelected = computed(() => {
  const visibleIds = filteredReservations.value.map((r) => r.id)
  if (visibleIds.length === 0) return false
  return visibleIds.every((id) => selectedIds.value.includes(id))
})

const toggleSelectAll = () => {
  const visibleIds = filteredReservations.value.map((r) => r.id)
  if (isAllSelected.value) {
    selectedIds.value = selectedIds.value.filter((id) => !visibleIds.includes(id))
  } else {
    const newSet = new Set([...selectedIds.value, ...visibleIds])
    selectedIds.value = Array.from(newSet)
  }
}

watch(searchQuery, () => {
  selectedIds.value = []
})

const fetchReservations = async () => {
  loading.value = true
  try {
    const { data } = await axios.get('/api/reservations', { params: { status: 'all' } })
    reservations.value = data || []
    selectedIds.value = []
  } catch (err) {
    console.error('Failed to fetch reservations:', err)
  } finally {
    loading.value = false
  }
}

const approve = async (id) => {
  if (!(await modal.showConfirm('이 예약을 승인하시겠습니까? 신청자에게 카카오톡 알림톡이 발송됩니다.'))) return
  try {
    await axios.patch(`/api/reservations/${id}/approve`)
    modal.showAlert('예약이 승인되었습니다.')
    await fetchReservations()
    if (calendarRef.value) calendarRef.value.fetchAll()
  } catch (err) {
    modal.showAlert(err.response?.data?.message || '승인 처리 중 오류가 발생했습니다.')
  }
}

const bulkApprove = async () => {
  if (!selectedIds.value.length) return
  if (!(await modal.showConfirm(`선택한 ${selectedIds.value.length}건의 예약을 일괄 승인하시겠습니까? 신청자들에게 알림톡이 발송됩니다.`))) return
  try {
    await axios.patch('/api/reservations/bulk-approve', {
      ids: selectedIds.value
    })
    modal.showAlert('일괄 승인되었습니다.')
    await fetchReservations()
    if (calendarRef.value) calendarRef.value.fetchAll()
  } catch (err) {
    modal.showAlert(err.response?.data?.message || '일괄 승인에 실패했습니다.')
  }
}

const openRejectModal = (reservation) => {
  isBulkAction.value = false
  selectedReservation.value = reservation
  rejectReason.value = ''
  showRejectModal.value = true
}

const openBulkRejectModal = () => {
  if (!selectedIds.value.length) return
  isBulkAction.value = true
  selectedReservation.value = null
  rejectReason.value = ''
  showRejectModal.value = true
}

const confirmReject = async () => {
  if (!rejectReason.value.trim()) {
    modal.showAlert('거부 사유를 입력해 주세요. (신청자 알림톡 전송)')
    return
  }
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
    if (calendarRef.value) calendarRef.value.fetchAll()
  } catch (err) {
    modal.showAlert(err.response?.data?.message || '거부 처리 중 오류가 발생했습니다.')
  }
}

onMounted(async () => {
  await fetchReservations()
  if (route.query.id && calendarRef.value) {
    activeTab.value = 'calendar'
    calendarRef.value.openReservationById(Number(route.query.id))
  }
})
</script>
