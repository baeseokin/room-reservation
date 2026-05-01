<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <div class="space-y-1">
        <h2 class="text-2xl font-black text-slate-900 tracking-tight">나의 예약</h2>
        <p class="text-slate-400 text-[11px] font-black uppercase tracking-widest">내가 신청한 예약 목록입니다.</p>
      </div>
      <button @click="fetchMyReservations" class="p-3 bg-white border border-slate-100 rounded-2xl shadow-sm text-slate-400 active:rotate-180 transition-all duration-500">
        <ArrowPathIcon class="w-5 h-5" :class="{ 'animate-spin': loading }" />
      </button>
    </div>

    <div v-if="loading" class="flex justify-center py-20">
      <div class="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
    </div>

    <div v-else-if="reservations.length === 0" class="text-center py-20 bg-white rounded-[2.5rem] border border-dashed border-slate-200">
      <div class="text-slate-300 font-bold text-sm uppercase tracking-widest">예약 내역이 없습니다.</div>
    </div>

    <div v-else class="space-y-4">
      <div v-for="res in reservations" :key="res.id" 
        @click="openDetail(res)"
        class="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 space-y-4 active:scale-[0.98] transition-all">
        <div class="flex justify-between items-start">
          <span :class="statusMap[res.status]?.class || 'bg-slate-50 text-slate-500'" class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter">
            {{ statusMap[res.status]?.label || res.status }}
          </span>
          <div class="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">{{ res.floor }} / {{ res.room_name }}</div>
        </div>
        
        <div>
          <h3 class="text-lg font-black text-slate-900 leading-tight">{{ res.title || '신청 명칭 없음' }}</h3>
          <p class="text-xs font-bold text-slate-400 mt-1 italic">{{ res.reason }}</p>
        </div>

        <div class="flex items-center gap-6 pt-2 border-t border-slate-50">
           <div class="flex items-center gap-2">
             <CalendarDaysIcon class="w-4 h-4 text-slate-300" />
             <span class="text-xs font-bold text-slate-600">{{ res.reservation_date }}</span>
           </div>
           <div class="flex items-center gap-2">
             <ClockIcon class="w-4 h-4 text-slate-300" />
             <span class="text-xs font-bold text-slate-900">{{ res.start_time.slice(0, 5) }} - {{ res.end_time.slice(0, 5) }}</span>
           </div>
        </div>
      </div>
    </div>

    <!-- Detail Bottom Sheet -->
    <Teleport to="body">
      <div v-if="showDetail" class="fixed inset-0 z-[100] flex flex-col justify-end">
        <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" @click="showDetail = false"></div>
        <div class="relative bg-white rounded-t-[3rem] p-8 pb-12 animate-in slide-in-from-bottom-full duration-300">
          <div class="w-12 h-1.5 bg-slate-100 rounded-full mx-auto mb-8"></div>
          
          <div class="space-y-8">
            <div class="flex justify-between items-start">
              <div>
                <span :class="statusMap[editingRes?.status]?.class" class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter">{{ statusMap[editingRes?.status]?.label }}</span>
                <h3 class="text-2xl font-black text-slate-900 pt-3">{{ editingRes?.title || '예약 상세' }}</h3>
              </div>
              <div class="w-14 h-14 bg-indigo-50 rounded-2xl flex flex-col items-center justify-center">
                <span class="text-[10px] font-black text-indigo-400 uppercase">{{ editingRes?.floor }}</span>
                <span class="text-xs font-black text-indigo-600">{{ editingRes?.room_name }}</span>
              </div>
            </div>

            <div class="bg-slate-50 p-6 rounded-[2rem] space-y-4">
              <div class="flex items-center justify-between">
                <span class="text-xs font-black text-slate-400 uppercase tracking-widest">사용 목적</span>
                <span class="text-xs font-bold text-slate-700">{{ editingRes?.reason }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-xs font-black text-slate-400 uppercase tracking-widest">일시</span>
                <span class="text-xs font-bold text-slate-900">{{ editingRes?.reservation_date }} {{ editingRes?.start_time.slice(0, 5) }}~</span>
              </div>
            </div>

            <div class="flex gap-4 pt-4">
               <button @click="cancelReservation" class="flex-1 py-5 bg-rose-50 text-rose-500 font-black text-xs uppercase tracking-widest rounded-3xl active:scale-95 transition-all">예약 취소</button>
               <button @click="showDetail = false" class="flex-1 py-5 bg-slate-900 text-white font-black text-xs uppercase tracking-widest rounded-3xl active:scale-95 transition-all">닫기</button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { useAuthStore } from '../../store/auth'
import { ArrowPathIcon, CalendarDaysIcon, ClockIcon } from '@heroicons/vue/24/outline'

const auth = useAuthStore()
const reservations = ref([])
const loading = ref(false)
const showDetail = ref(false)
const editingRes = ref(null)

const statusMap = {
  pending: { label: '대기중', class: 'bg-amber-50 text-amber-600' },
  approved: { label: '승인됨', class: 'bg-green-50 text-green-600' },
  rejected: { label: '반려됨', class: 'bg-rose-50 text-rose-600' },
  cancelled: { label: '취소됨', class: 'bg-slate-100 text-slate-400' }
}

const fetchMyReservations = async () => {
  loading.value = true
  try {
    const res = await axios.get(`/api/reservations?user_id=${auth.user.id}`)
    reservations.value = res.data
  } catch (e) {}
  finally { loading.value = false }
}

onMounted(fetchMyReservations)

const openDetail = (res) => {
  editingRes.value = res
  showDetail.value = true
}

const cancelReservation = async () => {
  if (!confirm('정말 예약을 취소하시겠습니까?')) return
  try {
    await axios.delete(`/api/reservations/${editingRes.value.id}`)
    alert('취소되었습니다.')
    showDetail.value = false
    fetchMyReservations()
  } catch (e) {
    alert('취소 실패')
  }
}
</script>
