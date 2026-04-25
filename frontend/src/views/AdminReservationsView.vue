<script setup>
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'
import { CheckCircleIcon, XCircleIcon, ClockIcon, FunnelIcon, ArrowPathIcon } from '@heroicons/vue/24/outline'

const allReservations = ref([])
const isLoading = ref(false)
const filterStatus = ref('all')
const selectedReservation = ref(null)
const showRejectModal = ref(false)
const rejectReason = ref('')

const statusMap = {
  pending:  { label: '대기중',  color: 'amber', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  approved: { label: '승인됨',  color: 'emerald', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  rejected: { label: '거부됨',  color: 'rose', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  cancelled:{ label: '취소됨', color: 'slate', bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-200' },
}

const filteredReservations = computed(() => {
  if (filterStatus.value === 'all') return allReservations.value
  return allReservations.value.filter(r => r.status === filterStatus.value)
})

const fetchReservations = async () => {
  isLoading.value = true
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

const openRejectModal = (r) => {
  selectedReservation.value = r
  rejectReason.value = ''
  showRejectModal.value = true
}

const confirmReject = async () => {
  await axios.patch(`/api/reservations/${selectedReservation.value.id}/reject`, {
    reject_reason: rejectReason.value
  })
  showRejectModal.value = false
  await fetchReservations()
}

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('ko-KR', { year:'numeric', month:'2-digit', day:'2-digit' }) : ''
const fmtTime = (t) => t?.slice(0, 5)

const counts = computed(() => {
  const all = allReservations.value
  return {
    pending: all.filter(r => r.status === 'pending').length,
    approved: all.filter(r => r.status === 'approved').length,
  }
})

onMounted(fetchReservations)
</script>

<template>
  <div class="p-6 max-w-7xl mx-auto space-y-6">
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

    <!-- Stats Cards -->
    <div class="grid grid-cols-2 gap-4">
      <div class="bg-amber-50 border border-amber-100 rounded-2xl p-5">
        <div class="text-xs font-black text-amber-600 uppercase tracking-widest mb-1">승인 대기</div>
        <div class="text-4xl font-black text-amber-700">{{ counts.pending }}</div>
      </div>
      <div class="bg-emerald-50 border border-emerald-100 rounded-2xl p-5">
        <div class="text-xs font-black text-emerald-600 uppercase tracking-widest mb-1">승인 완료</div>
        <div class="text-4xl font-black text-emerald-700">{{ counts.approved }}</div>
      </div>
    </div>

    <!-- Filter Tabs -->
    <div class="flex items-center gap-2 bg-white border border-slate-100 rounded-2xl p-1.5 w-fit">
      <button v-for="s in ['all','pending','approved','rejected','cancelled']" :key="s"
        @click="filterStatus = s"
        :class="filterStatus === s ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900'"
        class="px-4 py-2 rounded-xl text-xs font-black transition-all uppercase tracking-widest">
        {{ { all:'전체', pending:'대기', approved:'승인', rejected:'거부', cancelled:'취소' }[s] }}
      </button>
    </div>

    <!-- Reservations Table -->
    <div class="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
      <div v-if="isLoading" class="flex justify-center py-16">
        <div class="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>

      <div v-else-if="filteredReservations.length === 0" class="text-center py-16">
        <ClockIcon class="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <p class="text-slate-400 font-black text-sm uppercase tracking-widest">해당 조건의 예약 내역이 없습니다</p>
      </div>

      <div v-else class="divide-y divide-slate-100">
        <div v-for="r in filteredReservations" :key="r.id"
          class="p-5 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center gap-4">

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
            <div v-if="r.reject_reason" class="text-xs text-rose-500 font-bold mt-0.5">
              거부 사유: {{ r.reject_reason }}
            </div>
          </div>

          <!-- Actions (pending only) -->
          <div v-if="r.status === 'pending'" class="flex gap-2 shrink-0">
            <button @click="approve(r.id)"
              class="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-black transition-all active:scale-95">
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

  <!-- Reject Modal -->
  <div v-if="showRejectModal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full space-y-5">
      <div>
        <h3 class="text-lg font-black text-slate-900">예약 거부</h3>
        <p class="text-sm text-slate-500 font-medium mt-1">
          <strong>{{ selectedReservation?.requester_name }}</strong>님의 예약을 거부합니다.<br/>
          거부 사유를 입력하면 신청자에게 알림톡이 발송됩니다.
        </p>
      </div>
      <textarea v-model="rejectReason" rows="3"
        placeholder="거부 사유 입력 (선택)"
        class="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium focus:ring-1 focus:ring-rose-400 focus:border-rose-400 outline-none resize-none">
      </textarea>
      <div class="flex gap-3">
        <button @click="showRejectModal = false" class="flex-1 bg-slate-100 text-slate-700 py-3 rounded-2xl font-black text-sm hover:bg-slate-200 transition-all">취소</button>
        <button @click="confirmReject" class="flex-1 bg-rose-500 text-white py-3 rounded-2xl font-black text-sm hover:bg-rose-600 transition-all active:scale-[0.98]">거부 확정</button>
      </div>
    </div>
  </div>
</template>
