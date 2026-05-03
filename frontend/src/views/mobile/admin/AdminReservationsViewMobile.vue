<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <div class="space-y-1">
        <h2 class="text-2xl font-black text-slate-900 tracking-tight">예약 승인 관리</h2>
        <p class="text-slate-400 text-[11px] font-black uppercase tracking-widest">예약 신청건을 검토합니다.</p>
      </div>
    </div>

    <!-- Filter Tabs -->
    <div class="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      <button v-for="s in ['all', 'pending', 'approved', 'rejected']" :key="s"
        @click="filterStatus = s"
        :class="[filterStatus === s ? 'bg-slate-900 text-white' : 'bg-white text-slate-400 border-slate-100']"
        class="px-5 py-2.5 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition-all shrink-0">
        {{ { all:'전체', pending:'대기', approved:'승인', rejected:'거부' }[s] }}
      </button>
    </div>

    <div v-if="loading" class="flex justify-center py-20">
      <div class="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
    </div>

    <div v-else class="space-y-4">
      <div v-for="res in filteredReservations" :key="res.id" 
        class="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 space-y-4">
        <div class="flex justify-between items-start">
          <div class="flex flex-col">
            <span :class="statusMap[res.status]?.class" class="w-fit px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-tighter mb-2 border">
              {{ statusMap[res.status]?.label }}
            </span>
            <h3 class="text-base font-black text-slate-900 leading-tight">{{ res.title || '신청 제목 없음' }}</h3>
          </div>
          <div class="text-right">
            <div class="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{{ res.room_name }}</div>
            <div class="text-[10px] font-bold text-slate-300 uppercase">{{ res.floor }}</div>
          </div>
        </div>

        <div class="bg-slate-50 p-4 rounded-2xl space-y-2">
           <div class="flex items-center gap-2 text-xs font-bold text-slate-600">
             <UserIcon class="w-3.5 h-3.5 text-slate-300" /> {{ res.requester_name }} ({{ res.requester_phone }})
           </div>
           <div class="flex items-center gap-2 text-xs font-bold text-slate-600">
             <CalendarDaysIcon class="w-3.5 h-3.5 text-slate-300" /> {{ res.reservation_date }}
           </div>
           <div class="flex items-center gap-2 text-xs font-bold text-indigo-600">
             <ClockIcon class="w-3.5 h-3.5 text-indigo-300" /> {{ res.start_time.slice(0, 5) }} - {{ res.end_time.slice(0, 5) }}
           </div>
        </div>

        <div v-if="res.status === 'pending'" class="flex gap-3 pt-2">
           <button @click="reject(res)" class="flex-1 py-4 bg-rose-50 text-rose-500 font-black text-[10px] uppercase tracking-widest rounded-2xl active:scale-95 transition-all">거부</button>
           <button @click="approve(res)" class="flex-1 py-4 bg-emerald-500 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-lg shadow-emerald-100 active:scale-95 transition-all">승인</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'
import { UserIcon, CalendarDaysIcon, ClockIcon } from '@heroicons/vue/24/outline'
import { useModalStore } from '@/stores/useModalStore'

const modal = useModalStore()

const allReservations = ref([])
const loading = ref(false)
const filterStatus = ref('pending')

const statusMap = {
  pending: { label: '대기중', class: 'bg-amber-50 text-amber-600 border-amber-100' },
  approved: { label: '승인됨', class: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
  rejected: { label: '반려됨', class: 'bg-rose-50 text-rose-600 border-rose-100' },
  cancelled: { label: '취소됨', class: 'bg-slate-50 text-slate-400 border-slate-100' }
}

const fetchReservations = async () => {
  loading.value = true
  try {
    const res = await axios.get('/api/reservations', { params: { status: 'all' } })
    allReservations.value = res.data
  } catch (e) {}
  finally { loading.value = false }
}

const filteredReservations = computed(() => {
  if (filterStatus.value === 'all') return allReservations.value
  return allReservations.value.filter(r => r.status === filterStatus.value)
})

onMounted(fetchReservations)

const approve = async (res) => {
  if (!await modal.showConfirm('승인하시겠습니까? 신청자에게 알림톡이 발송됩니다.')) return
  try {
    await axios.patch(`/api/reservations/${res.id}/approve`)
    modal.showAlert('승인되었습니다.')
    fetchReservations()
  } catch (e) {
    modal.showAlert(e.response?.data?.message || '처리 중 오류가 발생했습니다.')
  }
}

const reject = async (res) => {
  const reason = await modal.showPrompt('거부 사유를 입력하세요 (선택)', '예: 해당 시간에는 교회 행사가 예정되어 있습니다.')
  if (reason === null) return // User cancelled
  
  try {
    await axios.patch(`/api/reservations/${res.id}/reject`, { reject_reason: reason })
    modal.showAlert('반려 처리되었습니다.')
    fetchReservations()
  } catch (e) {
    modal.showAlert('반려 처리 중 오류가 발생했습니다.')
  }
}
</script>
