<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <div class="space-y-1">
        <div class="flex items-center gap-2">
          <h2 class="text-2xl font-black text-slate-900 tracking-tight">나의 예약</h2>
          <span v-if="filteredReservations.length > 0" class="bg-indigo-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">{{ filteredReservations.length }}</span>
        </div>
        <p class="text-slate-400 text-[11px] font-black uppercase tracking-widest">내가 신청한 예약 목록입니다.</p>
      </div>
      <button @click="fetchMyReservations" class="p-3 bg-white border border-slate-200 rounded-2xl shadow-sm text-slate-400 active:rotate-180 transition-all duration-500">
        <ArrowPathIcon class="w-5 h-5" :class="{ 'animate-spin': loading }" />
      </button>
    </div>
    
    <!-- Search Bar -->
    <div class="px-6">
      <div class="relative group">
        <div class="absolute inset-y-0 left-5 flex items-center pointer-events-none">
          <MagnifyingGlassIcon class="w-4 h-4 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
        </div>
        <input v-model="searchQuery" 
               type="text" 
               placeholder="공간명, 신청명 검색..." 
               class="w-full bg-white pl-12 pr-4 py-4 rounded-[1.5rem] border border-slate-200 shadow-sm focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none font-bold text-sm text-slate-700 placeholder:text-slate-300 transition-all" />
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-20">
      <div class="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
    </div>

    <div v-else-if="filteredReservations.length === 0" class="text-center py-20 bg-white rounded-[2.5rem] border border-dashed border-slate-200">
      <div class="text-slate-300 font-bold text-sm uppercase tracking-widest">진행 중인 예약 내역이 없습니다.</div>
    </div>

    <div v-else class="px-6 pb-24 space-y-4">
      <template v-for="group in groupedReservations" :key="group.id">
        <!-- Recurring Group Card -->
        <div v-if="group.isGroup" class="space-y-2">
          <div @click="toggleGroup(group.id)"
               class="bg-white rounded-[2rem] p-6 shadow-sm border border-indigo-100 active:scale-95 transition-all">
            <div class="flex items-start gap-4">
              <div class="w-16 h-16 bg-indigo-50 rounded-2xl flex-shrink-0 flex items-center justify-center overflow-hidden">
                <img v-if="group.image_url" :src="group.image_url" class="w-full h-full object-cover" />
                <span v-else class="text-indigo-400 font-black text-xl">{{ group.floor }}</span>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <h3 class="text-lg font-black text-slate-800 truncate">{{ group.room_name }}</h3>
                  <span class="px-2 py-0.5 bg-indigo-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest">
                    반복 {{ group.items.length }}건
                  </span>
                </div>
                <p class="text-slate-900 font-bold text-sm mb-2 truncate">{{ group.title || '신청명 없음' }}</p>
                <div class="flex flex-wrap gap-2">
                  <div class="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                    <CalendarDaysIcon class="w-3.5 h-3.5 text-indigo-500" />
                    <span class="text-[11px] font-black text-slate-600">
                      {{ formatDateWithDay(group.items[0].reservation_date) }} ~
                    </span>
                  </div>
                  <div class="flex items-center gap-1.5 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100">
                    <ClockIcon class="w-3.5 h-3.5 text-indigo-500" />
                    <span class="text-[11px] font-black text-indigo-600">{{ group.start_time.slice(0,5) }} - {{ group.end_time.slice(0,5) }}</span>
                  </div>
                </div>
              </div>
              <div class="self-center">
                <ChevronDownIcon v-if="!expandedGroups.has(group.id)" class="w-5 h-5 text-slate-300" />
                <ChevronUpIcon v-else class="w-5 h-5 text-indigo-600" />
              </div>
            </div>
          </div>

          <!-- Nested Individual Items -->
          <div v-if="expandedGroups.has(group.id)" class="ml-4 space-y-2 pl-4 border-l-2 border-indigo-50">
            <div v-for="res in group.items" :key="res.id"
                 @click="openDetail(res)"
                 class="bg-slate-50/80 rounded-[1.5rem] p-4 border border-slate-100 active:scale-95 transition-all">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-2 h-2 rounded-full bg-indigo-400"></div>
                  <span class="text-sm font-black text-slate-700">{{ formatDateWithDay(res.reservation_date) }}</span>
                  <span :class="statusMap[getEffectiveStatus(res)]?.class" class="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter">
                    {{ statusMap[getEffectiveStatus(res)]?.label }}
                  </span>
                </div>
                <PencilSquareIcon class="w-4 h-4 text-slate-300" />
              </div>
            </div>
          </div>
        </div>

        <!-- Single Reservation Card -->
        <div v-else @click="openDetail(group)" 
             class="bg-white rounded-[2.5rem] p-6 shadow-sm border border-slate-100 active:scale-95 transition-all">
          <div class="flex items-start gap-4">
            <div class="w-20 h-20 bg-slate-50 rounded-3xl flex-shrink-0 flex items-center justify-center overflow-hidden border border-slate-100">
              <img v-if="group.image_url" :src="group.image_url" class="w-full h-full object-cover" />
              <span v-else class="text-slate-400 font-black text-2xl">{{ group.floor }}</span>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <h3 class="text-lg font-black text-slate-800 truncate">{{ group.room_name }}</h3>
                <span class="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-black">{{ group.floor }}</span>
              </div>
              <p class="text-slate-900 font-bold text-sm mb-3 truncate">{{ group.title || '신청명 없음' }}</p>
              
              <div class="flex flex-wrap gap-2">
                <div class="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-2xl border border-slate-100">
                  <CalendarDaysIcon class="w-4 h-4 text-indigo-500" />
                  <span class="text-[12px] font-black text-slate-600">{{ formatDateWithDay(group.reservation_date) }}</span>
                </div>
                <div class="flex items-center gap-1.5 bg-indigo-50 px-3 py-1.5 rounded-2xl border border-indigo-100">
                  <ClockIcon class="w-4 h-4 text-indigo-500" />
                  <span class="text-[12px] font-black text-indigo-600">{{ group.start_time.slice(0,5) }} - {{ group.end_time.slice(0,5) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
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
                <span :class="statusMap[getEffectiveStatus(editingRes)]?.class" class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter">{{ statusMap[getEffectiveStatus(editingRes)]?.label }}</span>
                <h3 class="text-2xl font-black text-slate-900 pt-3">{{ editingRes?.title || '예약 상세' }}</h3>
              </div>
              <div class="w-14 h-14 bg-indigo-50 rounded-2xl flex flex-col items-center justify-center">
                <span class="text-[10px] font-black text-indigo-400 uppercase">{{ editingRes?.floor }}</span>
                <span class="text-xs font-black text-indigo-600">{{ editingRes?.room_name }}</span>
              </div>
            </div>

            <div class="bg-slate-50 border border-slate-200 p-6 rounded-[2rem] space-y-4">
              <div class="flex items-center justify-between">
                <span class="text-xs font-black text-slate-400 uppercase tracking-widest">사용 목적</span>
                <span class="text-xs font-bold text-slate-700">{{ editingRes?.reason }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-xs font-black text-slate-400 uppercase tracking-widest">일시</span>
                <span class="text-xs font-bold text-slate-900">{{ formatDateWithDay(editingRes?.reservation_date) }} {{ editingRes?.start_time.slice(0, 5) }}~</span>
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
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'
import { useAuthStore } from '../../store/auth'
import { 
  ArrowPathIcon, 
  CalendarDaysIcon, 
  ClockIcon, 
  PencilSquareIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  MagnifyingGlassIcon
} from '@heroicons/vue/24/outline'

import { useModalStore } from '@/stores/useModalStore'

const modal = useModalStore()
const auth = useAuthStore()
const reservations = ref([])
const loading = ref(false)
const showDetail = ref(false)
const editingRes = ref(null)
const searchQuery = ref('')

const expandedGroups = ref(new Set())
const toggleGroup = (groupId) => {
  if (expandedGroups.value.has(groupId)) {
    expandedGroups.value.delete(groupId)
  } else {
    expandedGroups.value.add(groupId)
  }
}

const filteredReservations = computed(() => {
  const now = new Date()
  const currentYMD = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
  const currentHM = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
  
  return reservations.value.filter(res => {
    // Expiration check
    const isExpired = res.reservation_date < currentYMD || (res.reservation_date === currentYMD && res.end_time <= currentHM);
    if (isExpired) return false;

    // Search query check
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase();
      const match = (res.room_name?.toLowerCase().includes(q)) || 
                    (res.title?.toLowerCase().includes(q)) || 
                    (res.reason?.toLowerCase().includes(q)) ||
                    (res.floor?.toLowerCase().includes(q));
      if (!match) return false;
    }

    return true;
  })
})

const groupedReservations = computed(() => {
  const groups = []
  const map = new Map()
  
  filteredReservations.value.forEach(res => {
    if (res.is_recurring) {
      const key = `group_${res.room_id}_${res.title}_${res.start_time}_${res.end_time}`
      if (!map.has(key)) {
        const group = {
          id: key,
          isGroup: true,
          room_name: res.room_name,
          floor: res.floor,
          title: res.title,
          start_time: res.start_time,
          end_time: res.end_time,
          reason: res.reason,
          image_url: res.image_url,
          items: []
        }
        map.set(key, group)
        groups.push(group)
      }
      map.get(key).items.push(res)
    } else {
      groups.push({
        id: `single_${res.id}`,
        isGroup: false,
        ...res
      })
    }
  })
  
  groups.forEach(g => {
    if (g.isGroup) {
      g.items.sort((a, b) => new Date(a.reservation_date) - new Date(b.reservation_date))
    }
  })
  
  return groups
})

const statusMap = {
  pending: { label: '대기중', class: 'bg-amber-50 text-amber-600' },
  approved: { label: '승인됨', class: 'bg-green-50 text-green-600' },
  rejected: { label: '반려됨', class: 'bg-rose-50 text-rose-600' },
  cancelled: { label: '취소됨', class: 'bg-slate-100 text-slate-400' },
  finished: { label: '종료됨', class: 'bg-slate-100 text-slate-400' }
}

const getEffectiveStatus = (res) => {
  if (!res) return ''
  if (res.status === 'approved') {
    const end = new Date(`${res.reservation_date}T${res.end_time}`)
    if (new Date() > end) return 'finished'
  }
  return res.status
}

const fetchMyReservations = async () => {
  loading.value = true
  try {
    const res = await axios.get(`/api/reservations?user_id=${auth.user.id}`)
    reservations.value = res.data
  } catch (e) {}
  finally { loading.value = false }
}

const formatDateWithDay = (dateStr) => {
  if (!dateStr) return ''
  const days = ['일', '월', '화', '수', '목', '금', '토']
  const d = new Date(dateStr + 'T00:00:00')
  return `${dateStr}(${days[d.getDay()]})`
}

onMounted(fetchMyReservations)

const openDetail = (res) => {
  editingRes.value = res
  showDetail.value = true
}

const cancelReservation = async () => {
  if (!await modal.showConfirm('정말 예약을 취소하시겠습니까?')) return
  try {
    await axios.delete(`/api/reservations/${editingRes.value.id}`)
    modal.showAlert('취소되었습니다.')
    showDetail.value = false
    fetchMyReservations()
  } catch (e) {
    modal.showAlert('취소 실패')
  }
}
</script>
