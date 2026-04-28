<script setup>
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'
import { CheckCircleIcon, XCircleIcon, ClockIcon, FunnelIcon, ArrowPathIcon } from '@heroicons/vue/24/outline'

const allReservations = ref([])
const isLoading = ref(false)
const filterStatus = ref('pending')
const selectedReservation = ref(null)
const showRejectModal = ref(false)
const rejectReason = ref('')
const selectedIds = ref([])
const isBulkAction = ref(false)

const statusMap = {
  pending:  { label: '대기중',  color: 'amber', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  approved: { label: '승인됨',  color: 'emerald', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  rejected: { label: '거부됨',  color: 'rose', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  cancelled:{ label: '취소됨', color: 'slate', bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-200' },
}

const filteredReservations = computed(() => {
  const list = filterStatus.value === 'all' ? allReservations.value : allReservations.value.filter(r => r.status === filterStatus.value)
  return list
})

const isAllSelected = computed(() => {
  const pendingOnes = filteredReservations.value.filter(r => r.status === 'pending')
  return pendingOnes.length > 0 && selectedIds.value.length === pendingOnes.length
})

const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedIds.value = []
  } else {
    selectedIds.value = filteredReservations.value.filter(r => r.status === 'pending').map(r => r.id)
  }
}

const fetchReservations = async () => {
  isLoading.value = true
  selectedIds.value = []
  try {
    const { data } = await axios.get('/api/reservations', { params: { status: 'all' } })
    allReservations.value = data
  } catch (e) {
    console.error(e)
  } finally {
    isLoading.value = false
  }
}

const approve = async (id) => {
  if (!confirm('이 예약을 승인하시겠습니까? 신청자에게 알림톡이 발송됩니다.')) return
  await axios.patch(`/api/reservations/${id}/approve`)
  await fetchReservations()
}

const bulkApprove = async () => {
  if (selectedIds.value.length === 0) return
  if (!confirm(`선택한 ${selectedIds.value.length}건의 예약을 일괄 승인하시겠습니까?`)) return
  
  isLoading.value = true
  try {
    await axios.patch('/api/reservations/bulk-approve', { ids: selectedIds.value })
    alert('일괄 승인되었습니다.')
    await fetchReservations()
  } catch (e) {
    alert('일괄 처리 중 오류가 발생했습니다.')
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
  isLoading.value = true
  try {
    if (isBulkAction.value) {
      await axios.patch('/api/reservations/bulk-reject', { 
        ids: selectedIds.value,
        reject_reason: rejectReason.value
      })
      alert('일괄 거부되었습니다.')
    } else {
      await axios.patch(`/api/reservations/${selectedReservation.value.id}/reject`, {
        reject_reason: rejectReason.value
      })
    }
    showRejectModal.value = false
    await fetchReservations()
  } catch (e) {
    alert('처리 중 오류가 발생했습니다.')
  } finally {
    isLoading.value = false
  }
}

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('ko-KR', { year:'numeric', month:'2-digit', day:'2-digit' }) : ''
const fmtTime = (t) => t?.slice(0, 5)

onMounted(fetchReservations)
</script>

<template>
  <div class="p-6 max-w-7xl mx-auto space-y-6 pb-32">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-black text-slate-900">예약 관리</h1>
        <p class="text-slate-500 text-sm font-medium mt-0.5">예약 신청을 검토하고 승인 또는 거부하세요.</p>
      </div>
      <button @click="fetchReservations" class="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all">
        <ArrowPathIcon class="w-4 h-4" :class="{ 'animate-spin': isLoading }" />
        새로고침
      </button>
    </div>

    <!-- Filter Tabs & Bulk Actions -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div class="flex items-center gap-2 bg-white border border-slate-100 rounded-2xl p-1.5 w-fit shadow-sm">
        <button v-for="s in ['all','pending','approved','rejected','cancelled']" :key="s"
          @click="filterStatus = s"
          :class="filterStatus === s ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:text-slate-900'"
          class="px-4 py-2 rounded-xl text-[11px] font-black transition-all uppercase tracking-widest">
          {{ { all:'전체', pending:'대기', approved:'승인', rejected:'거부', cancelled:'취소' }[s] }}
        </button>
      </div>

      <!-- Bulk Action Bar (Animated) -->
      <transition enter-active-class="transition duration-300 ease-out" enter-from-class="transform translate-y-4 opacity-0" enter-to-class="transform translate-y-0 opacity-100" leave-active-class="transition duration-200 ease-in" leave-from-class="transform translate-y-0 opacity-100" leave-to-class="transform translate-y-4 opacity-0">
        <div v-if="selectedIds.length > 0" class="flex items-center gap-3 bg-indigo-600 p-2 pl-4 rounded-2xl shadow-xl shadow-indigo-100">
          <span class="text-xs font-black text-white mr-2">{{ selectedIds.length }}건 선택됨</span>
          <button @click="bulkApprove" class="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5">
            <CheckCircleIcon class="w-4 h-4" /> 일괄 승인
          </button>
          <button @click="openRejectModal()" class="bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5">
            <XCircleIcon class="w-4 h-4" /> 일괄 거부
          </button>
        </div>
      </transition>
    </div>

    <!-- Reservations Table -->
    <div class="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
      <!-- Select All Header (Visible only in Pending) -->
      <div v-if="filterStatus === 'pending' && filteredReservations.length > 0" class="bg-slate-50/50 border-b border-slate-100 px-5 py-3 flex items-center gap-3">
        <input type="checkbox" :checked="isAllSelected" @change="toggleSelectAll"
               class="w-5 h-5 rounded-lg border-slate-200 text-indigo-600 focus:ring-indigo-500 transition-all cursor-pointer" />
        <span class="text-xs font-black text-slate-500 uppercase tracking-widest">전체 선택</span>
      </div>

      <div v-if="isLoading && allReservations.length === 0" class="flex justify-center py-16">
        <div class="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>

      <div v-else-if="filteredReservations.length === 0" class="text-center py-16">
        <ClockIcon class="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <p class="text-slate-400 font-black text-sm uppercase tracking-widest">해당 조건의 예약 내역이 없습니다</p>
      </div>

      <div v-else class="divide-y divide-slate-100">
        <div v-for="r in filteredReservations" :key="r.id"
          class="p-5 hover:bg-slate-50 transition-colors flex items-start sm:items-center gap-4 relative group">
          
          <!-- Checkbox (Pending Only) -->
          <div v-if="r.status === 'pending'" class="shrink-0 pt-1 sm:pt-0">
            <input type="checkbox" v-model="selectedIds" :value="r.id"
                   class="w-5 h-5 rounded-lg border-slate-200 text-indigo-600 focus:ring-indigo-500 transition-all cursor-pointer" />
          </div>
          <div v-else class="w-5 shrink-0 hidden sm:block"></div>

          <!-- Status badge -->
          <div :class="[statusMap[r.status]?.bg, statusMap[r.status]?.text, statusMap[r.status]?.border]"
            class="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black border w-24 justify-center">
            {{ statusMap[r.status]?.label || r.status }}
          </div>

          <!-- Info -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="font-black text-slate-900 text-sm">{{ r.title || '(제목 없음)' }}</span>
              <span class="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">{{ r.room_name }}</span>
            </div>
            <div class="text-xs text-slate-500 font-bold mt-0.5">
              {{ fmtDate(r.reservation_date) }} · {{ fmtTime(r.start_time) }} ~ {{ fmtTime(r.end_time) }}
            </div>
            <div class="text-xs text-slate-400 font-bold mt-0.5">
              신청자: {{ r.requester_name }} / {{ r.requester_phone }}
              <span v-if="r.reason" class="ml-2 text-slate-300">| {{ r.reason }}</span>
            </div>
          </div>

          <!-- Individual Actions (Visible on Hover/Always on Mobile) -->
          <div v-if="r.status === 'pending'" class="flex gap-2 shrink-0">
            <button @click="approve(r.id)"
              class="hidden md:flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-black transition-all active:scale-95 shadow-lg shadow-emerald-100">
              <CheckCircleIcon class="w-4 h-4" />승인
            </button>
            <button @click="openRejectModal(r)"
              class="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-500 border border-rose-200 px-4 py-2 rounded-xl text-xs font-black transition-all active:scale-95">
              <XCircleIcon class="w-4 h-4" />거부
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Reject Modal (Shared for Individual & Bulk) -->
  <transition enter-active-class="transition duration-300 ease-out" enter-from-class="opacity-0 scale-95" enter-to-class="opacity-100 scale-100" leave-active-class="transition duration-200 ease-in" leave-from-class="opacity-100 scale-100" leave-to-class="opacity-0 scale-95">
    <div v-if="showRejectModal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-[2.5rem] shadow-2xl p-8 max-w-md w-full space-y-6 border border-white">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center">
            <XCircleIcon class="w-6 h-6" />
          </div>
          <div>
            <h3 class="text-lg font-black text-slate-900">{{ isBulkAction ? '일괄 거부' : '예약 거부' }}</h3>
            <p v-if="!isBulkAction" class="text-xs text-slate-500 font-bold mt-0.5">
              <strong>{{ selectedReservation?.requester_name }}</strong>님의 예약을 거부합니다.
            </p>
            <p v-else class="text-xs text-slate-500 font-bold mt-0.5">
              선택한 <strong>{{ selectedIds.length }}건</strong>의 예약을 일괄 거부합니다.
            </p>
          </div>
        </div>

        <div class="space-y-2">
          <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">거부 사유 입력 (선택)</label>
          <textarea v-model="rejectReason" rows="3"
            placeholder="예: 해당 시간에는 교회 행사가 예정되어 있습니다."
            class="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-rose-500/10 focus:border-rose-300 outline-none resize-none transition-all">
          </textarea>
        </div>

        <div class="flex gap-3">
          <button @click="showRejectModal = false" class="flex-1 bg-slate-100 text-slate-400 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all">취소</button>
          <button @click="confirmReject" class="flex-1 bg-rose-500 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-rose-600 transition-all shadow-xl shadow-rose-100 active:scale-95">거부 확정</button>
        </div>
      </div>
    </div>
  </transition>
</template>
