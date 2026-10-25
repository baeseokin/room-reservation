<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <div class="space-y-1">
        <div class="flex items-center gap-2">
          <h2 class="text-2xl font-black text-slate-900 tracking-tight">나의 예약</h2>
          <span v-if="filteredReservations.length > 0" class="bg-indigo-600 text-white text-[0.625rem] font-black px-2 py-0.5 rounded-full">{{ filteredReservations.length }}</span>
        </div>
        <p class="text-slate-400 text-[0.6875rem] font-black uppercase tracking-widest">내가 신청한 예약 목록입니다.</p>
      </div>
      <button @click="fetchMyReservations" class="p-3 bg-white border border-slate-200 rounded-2xl shadow-sm text-slate-400 active:rotate-180 transition-all duration-500">
        <ArrowPathIcon class="w-5 h-5" :class="{ 'animate-spin': loading }" />
      </button>
    </div>
    
    <!-- Search Bar -->
    <div class="px-6">
      <div class="relative group">
        <div class="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <MagnifyingGlassIcon class="w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
        </div>
        <input v-model="searchQuery" 
               type="text" 
               placeholder="공간명, 신청명 검색..." 
               class="w-full bg-slate-50 pl-11 pr-4 py-3 rounded-2xl border border-slate-200 shadow-xs focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none font-bold text-xs text-slate-700 placeholder:text-slate-400 transition-all" />
      </div>
    </div>

    <!-- Filter Bar: Status Buttons + Period Buttons (Admin List View Style) -->
    <div class="px-6 space-y-2.5">
      <!-- Status Filter Buttons Bar -->
      <div class="flex p-1 bg-slate-100 rounded-xl overflow-x-auto scrollbar-none">
        <button v-for="s in [
          { id: 'all', name: '전체' }, 
          { id: 'approved', name: '승인완료' }, 
          { id: 'pending', name: '승인대기' },
          { id: 'cancelled', name: '취소' },
          { id: 'rejected', name: '반려' }
        ]" :key="s.id"
                @click="statusFilter = s.id"
                :class="[
                  statusFilter === s.id 
                    ? 'bg-white text-indigo-600 shadow-sm font-black' 
                    : 'text-slate-500 font-bold hover:text-slate-800'
                ]"
                class="px-3.5 py-1.5 rounded-lg text-xs whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0">
          <span>{{ s.name }}</span>
          <span v-if="statusCounts[s.id] !== undefined" 
                :class="[
                  statusFilter === s.id ? 'bg-indigo-50 text-indigo-600 font-black' : 'bg-slate-200/70 text-slate-500'
                ]"
                class="text-[0.625rem] px-1.5 py-0.2 rounded-full">
            {{ statusCounts[s.id] }}
          </span>
        </button>
      </div>

      <!-- Period Filter Buttons -->
      <div class="flex justify-end">
        <div class="flex p-1 bg-slate-100 rounded-xl overflow-x-auto scrollbar-none">
          <button v-for="period in [
            { id: '3m', name: '~3개월' },
            { id: '6m', name: '~6개월' },
            { id: '1y', name: '~1년' }
          ]" :key="period.id"
                  @click="periodFilter = period.id"
                  :class="[periodFilter === period.id ? 'bg-white text-indigo-600 shadow-sm font-black' : 'text-slate-500 font-bold hover:text-slate-800']"
                  class="px-3 py-1 rounded-lg text-[0.6875rem] whitespace-nowrap transition-all">
            {{ period.name }}
          </button>
        </div>
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
               class="bg-white rounded-2xl p-4 shadow-sm border border-indigo-50 active:scale-95 transition-all">
            <div class="flex items-start gap-3">
              <div class="w-14 h-14 bg-indigo-50 rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden">
                <img v-if="group.image_url" :src="group.image_url" class="w-full h-full object-cover" />
                <span v-else class="text-indigo-400 font-black text-lg">{{ group.floor }}</span>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-start justify-between gap-2 mb-1 min-w-0">
                  <div class="flex items-center gap-1.5 min-w-0">
                    <h3 class="text-base font-black text-slate-800 truncate">{{ group.title || '신청명 없음' }}</h3>
                    <span v-if="group.items.length > 1" class="px-2 py-0.5 bg-indigo-600 text-white rounded-full text-[0.625rem] font-black uppercase tracking-widest shrink-0">
                      총 {{ group.items.length }}건
                    </span>
                  </div>
                  <span v-if="group.items.length === 1" :class="statusMap[getEffectiveStatus(group.items[0])]?.class" class="px-2.5 py-0.5 rounded-full text-[0.625rem] shrink-0 shadow-xs">
                    {{ statusMap[getEffectiveStatus(group.items[0])]?.label }}
                  </span>
                  <span v-else-if="group.items.every(i => i.status === 'cancelled')" class="px-2.5 py-0.5 rounded-full text-[0.625rem] font-black shrink-0 bg-red-50 text-red-600 border border-red-200/80 shadow-xs">
                    전체 취소됨
                  </span>
                  <span v-else-if="group.items.some(i => i.status === 'pending')" class="px-2.5 py-0.5 rounded-full text-[0.625rem] font-black shrink-0 bg-amber-50 text-amber-700 border border-amber-200/80 shadow-xs">
                    대기중 {{ group.items.filter(i => i.status === 'pending').length }}건
                  </span>
                  <span v-else-if="group.items.some(i => i.status === 'rejected')" class="px-2.5 py-0.5 rounded-full text-[0.625rem] font-black shrink-0 bg-rose-50 text-rose-700 border border-rose-200/80 shadow-xs">
                    반려 포함
                  </span>
                  <span v-else-if="group.items.some(i => i.status === 'cancelled')" class="px-2.5 py-0.5 rounded-full text-[0.625rem] font-black shrink-0 bg-red-50 text-red-600 border border-red-200/80 shadow-xs">
                    일부 취소
                  </span>
                  <span v-else class="px-2.5 py-0.5 rounded-full text-[0.625rem] font-black shrink-0 bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-xs">
                    승인됨
                  </span>
                </div>
                <p class="text-slate-500 font-bold text-xs mb-1.5 truncate">{{ group.room_name }}</p>
                <div class="flex flex-wrap gap-1.5">
                  <div class="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                    <CalendarDaysIcon class="w-3.5 h-3.5 text-indigo-500" />
                    <span class="text-[0.6875rem] font-black text-slate-600">
                      {{ formatDateWithDay(group.items[0].reservation_date) }}{{ group.items.length > 1 ? ' ~' : '' }}
                    </span>
                  </div>
                  <div class="flex items-center gap-1.5 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100">
                    <ClockIcon class="w-3.5 h-3.5 text-indigo-500" />
                    <span class="text-[0.6875rem] font-black text-indigo-600">{{ group.start_time.slice(0,5) }} - {{ group.end_time.slice(0,5) }}</span>
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
          <div v-if="expandedGroups.has(group.id)" class="ml-4 space-y-2 pl-3 border-l-2 border-indigo-50">
            <div v-for="res in group.items" :key="res.id"
                 @click="openDetail(res)"
                 class="bg-slate-50/80 rounded-xl p-3 border border-slate-100 active:scale-95 transition-all">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div class="w-1.5 h-1.5 rounded-full bg-indigo-400"></div>
                  <span class="text-xs font-black text-slate-700">{{ formatDateWithDay(res.reservation_date) }}</span>
                  <span :class="statusMap[getEffectiveStatus(res)]?.class" class="px-2 py-0.5 rounded-full text-[0.5625rem] font-black uppercase tracking-tighter">
                    {{ statusMap[getEffectiveStatus(res)]?.label }}
                  </span>
                </div>
                <PencilSquareIcon class="w-3.5 h-3.5 text-slate-300" />
              </div>
            </div>
          </div>
        </div>

        <!-- Single Reservation Card -->
        <div v-else @click="openDetail(group)" 
             class="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 active:scale-95 transition-all">
          <div class="flex items-start gap-3">
            <div class="w-14 h-14 bg-slate-50 rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden border border-slate-100">
              <img v-if="group.image_url" :src="group.image_url" class="w-full h-full object-cover" />
              <span v-else class="text-slate-400 font-black text-lg">{{ group.floor }}</span>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-2 mb-1 min-w-0">
                <div class="flex items-center gap-2 min-w-0">
                  <h3 class="text-base font-black text-slate-800 truncate">{{ group.title || '신청명 없음' }}</h3>
                  <span class="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-lg text-[0.625rem] font-black shrink-0">{{ group.floor }}</span>
                </div>
                <!-- Status Badge -->
                <span :class="statusMap[getEffectiveStatus(group)]?.class" class="px-2.5 py-0.5 rounded-full text-[0.625rem] shrink-0 shadow-xs">
                  {{ statusMap[getEffectiveStatus(group)]?.label }}
                </span>
              </div>
              <p class="text-slate-500 font-bold text-xs mb-1.5 truncate">{{ group.room_name }}</p>
              
              <div class="flex flex-wrap gap-1.5">
                <div class="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                  <CalendarDaysIcon class="w-3.5 h-3.5 text-indigo-500" />
                  <span class="text-[0.6875rem] font-black text-slate-600">{{ formatDateWithDay(group.reservation_date) }}</span>
                </div>
                <div class="flex items-center gap-1.5 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100">
                  <ClockIcon class="w-3.5 h-3.5 text-indigo-500" />
                  <span class="text-[0.6875rem] font-black text-indigo-600">{{ group.start_time.slice(0,5) }} - {{ group.end_time.slice(0,5) }}</span>
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
                <span :class="statusMap[getEffectiveStatus(editingRes)]?.class" class="px-3 py-1 rounded-full text-[0.625rem] font-black uppercase tracking-tighter">{{ statusMap[getEffectiveStatus(editingRes)]?.label }}</span>
                <h3 class="text-2xl font-black text-slate-900 pt-3">{{ editingRes?.title || '예약 상세' }}</h3>
              </div>
              <div class="w-14 h-14 bg-indigo-50 rounded-2xl flex flex-col items-center justify-center">
                <span class="text-[0.625rem] font-black text-indigo-400 uppercase">{{ editingRes?.floor }}</span>
                <span class="text-xs font-black text-indigo-600">{{ editingRes?.room_name }}</span>
              </div>
            </div>

            <div class="bg-slate-50 border border-slate-200 p-6 rounded-[2rem] space-y-4">
              <div class="flex items-center justify-between">
                <span class="text-xs font-black text-slate-400 uppercase tracking-widest">사용 목적</span>
                <span class="text-xs font-bold text-slate-700">{{ editingRes?.reason || '(기재 없음)' }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-xs font-black text-slate-400 uppercase tracking-widest">일시</span>
                <span class="text-xs font-bold text-slate-900">
                  {{ formatDateWithDay(editingRes?.reservation_date) }} {{ editingRes?.start_time ? editingRes.start_time.slice(0, 5) : '' }} ~ {{ editingRes?.end_time ? editingRes.end_time.slice(0, 5) : '' }}
                </span>
              </div>
              <!-- 승인 또는 반려 시간 -->
              <div v-if="editingRes?.status === 'approved' && editingRes?.updated_at" class="flex items-center justify-between pt-3 border-t border-slate-200/60">
                <span class="text-xs font-black text-emerald-600 uppercase tracking-widest">승인 시간</span>
                <span class="text-xs font-black text-emerald-700">{{ formatDateTime(editingRes.updated_at) }}</span>
              </div>
              <div v-else-if="editingRes?.status === 'rejected' && editingRes?.updated_at" class="flex items-center justify-between pt-3 border-t border-slate-200/60">
                <span class="text-xs font-black text-rose-600 uppercase tracking-widest">반려 시간</span>
                <span class="text-xs font-black text-rose-700">{{ formatDateTime(editingRes.updated_at) }}</span>
              </div>
              <div v-else-if="editingRes?.created_at" class="flex items-center justify-between pt-3 border-t border-slate-200/60">
                <span class="text-xs font-black text-slate-400 uppercase tracking-widest">신청 시간</span>
                <span class="text-xs font-bold text-slate-600">{{ formatDateTime(editingRes.created_at) }}</span>
              </div>

              <!-- 변경이력 (처리 시간, 사유 시간 오름차순 표시) -->
              <div v-if="getSortedChangeLogs(editingRes).length > 0" class="pt-3 border-t border-slate-200/60 space-y-2">
                <div class="flex items-center gap-1.5 text-slate-700 font-black text-xs">
                  <ClockIcon class="w-4 h-4 text-indigo-600" />
                  <span class="uppercase tracking-widest">변경이력</span>
                </div>
                <div class="space-y-2">
                  <div 
                    v-for="(log, idx) in getSortedChangeLogs(editingRes)" 
                    :key="log.id || idx"
                    class="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs space-y-1"
                  >
                    <div class="flex items-center justify-between text-[0.6875rem]">
                      <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[0.625rem] font-black border" :class="getActionBadgeClass(log.action_type)">
                        {{ getActionLabel(log.action_type) }}
                      </span>
                      <span class="font-bold text-slate-500">{{ formatDateTime(log.created_at) }}</span>
                    </div>
                    <p class="text-xs font-bold text-slate-800 whitespace-pre-wrap leading-relaxed">
                      {{ log.reason }}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div class="flex gap-3 pt-4">
               <!-- 1. 반려된 경우: "닫기"와 "재 신청" 버튼 -->
               <template v-if="editingRes?.status === 'rejected'">
                 <button @click="showDetail = false" 
                         class="w-1/3 py-5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-xs uppercase tracking-widest rounded-3xl active:scale-95 transition-all">
                   닫기
                 </button>
                 <button @click="handleReapply(editingRes)" 
                         class="flex-1 py-5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest rounded-3xl active:scale-95 transition-all shadow-xl shadow-indigo-200 flex items-center justify-center gap-2">
                   <ArrowPathIcon class="w-4 h-4" />
                   <span>재 신청</span>
                 </button>
               </template>

               <!-- 2. 취소 가능한 상태 (대기중 / 승인됨): "예약 취소"와 "닫기" -->
               <template v-else-if="editingRes?.status !== 'cancelled' && getEffectiveStatus(editingRes) !== 'finished'">
                 <button @click="cancelReservation" 
                         class="flex-1 py-5 bg-rose-50 text-rose-500 font-black text-xs uppercase tracking-widest rounded-3xl active:scale-95 transition-all">
                   예약 취소
                 </button>
                 <button @click="showDetail = false" 
                         class="flex-1 py-5 bg-slate-900 text-white font-black text-xs uppercase tracking-widest rounded-3xl active:scale-95 transition-all">
                   닫기
                 </button>
               </template>

               <!-- 3. 취소됨 / 종료됨: "닫기" -->
               <template v-else>
                 <button @click="showDetail = false" 
                         class="flex-1 py-5 bg-slate-900 text-white font-black text-xs uppercase tracking-widest rounded-3xl active:scale-95 transition-all">
                   닫기
                 </button>
               </template>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import { useAuthStore } from '../../store/auth'
import { 
  ArrowPathIcon, 
  CalendarDaysIcon, 
  ClockIcon, 
  PencilSquareIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  MagnifyingGlassIcon,
  XCircleIcon
} from '@heroicons/vue/24/outline'

import { useModalStore } from '@/stores/useModalStore'

const route = useRoute()
const router = useRouter()
const modal = useModalStore()
const auth = useAuthStore()
const reservations = ref([])
const loading = ref(false)
const showDetail = ref(false)
const editingRes = ref(null)
const searchQuery = ref('')

const handleReapply = (res) => {
  if (!res) return
  showDetail.value = false
  router.push({
    path: '/m/reservations',
    query: {
      reapply: '1',
      room_id: res.room_id,
      date: res.reservation_date,
      start_time: res.start_time ? String(res.start_time).slice(0, 5) : '09:00',
      end_time: res.end_time ? String(res.end_time).slice(0, 5) : '10:00',
      title: res.title || '',
      reason: res.reason || ''
    }
  })
}

const expandedGroups = ref(new Set())
const toggleGroup = (groupId) => {
  if (expandedGroups.value.has(groupId)) {
    expandedGroups.value.delete(groupId)
  } else {
    expandedGroups.value.add(groupId)
  }
}

const statusFilter = ref('all')
const periodFilter = ref('3m') // '3m', '6m', '1y'

const getPeriodStartDate = (period) => {
  const d = new Date()
  if (period === '3m') {
    d.setMonth(d.getMonth() - 3)
  } else if (period === '6m') {
    d.setMonth(d.getMonth() - 6)
  } else if (period === '1y') {
    d.setFullYear(d.getFullYear() - 1)
  }
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const periodFilteredReservations = computed(() => {
  const startDate = getPeriodStartDate(periodFilter.value)
  return reservations.value.filter(res => {
    const isTarget = route.query.id && String(res.id) === String(route.query.id)
    if (!isTarget && res.reservation_date && res.reservation_date < startDate) {
      return false
    }
    return true
  })
})

const statusCounts = computed(() => {
  const counts = { all: 0, approved: 0, pending: 0, cancelled: 0, rejected: 0 }
  periodFilteredReservations.value.forEach(res => {
    counts.all++
    if (counts[res.status] !== undefined) {
      counts[res.status]++
    }
  })
  return counts
})

const filteredReservations = computed(() => {
  return periodFilteredReservations.value.filter(res => {
    const isTarget = route.query.id && String(res.id) === String(route.query.id);

    // Status filter check
    if (statusFilter.value !== 'all' && res.status !== statusFilter.value && !isTarget) {
      return false;
    }

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
  pending: { label: '대기중', class: 'bg-amber-50 text-amber-700 border border-amber-200/80 font-black' },
  approved: { label: '승인됨', class: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-black' },
  rejected: { label: '반려됨', class: 'bg-rose-50 text-rose-700 border border-rose-200/80 font-black' },
  cancelled: { label: '취소됨', class: 'bg-slate-100 text-slate-500 border border-slate-200/80 font-black' },
  finished: { label: '종료됨', class: 'bg-slate-100 text-slate-400 border border-slate-200/80 font-black' }
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
    const res = await axios.get(`/api/reservations?user_id=${auth.user.id}&status=all`)
    reservations.value = res.data

    if (route.query.id) {
      const targetId = Number(route.query.id)
      let target = reservations.value.find(r => r.id === targetId)
      if (!target) {
        try {
          const singleRes = await axios.get(`/api/reservations?id=${targetId}&status=all`)
          if (singleRes.data && singleRes.data.length > 0) {
            target = singleRes.data[0]
            reservations.value.unshift(target)
          }
        } catch (_) {}
      }
      if (target) {
        if (target.is_recurring) {
          const key = `group_${target.room_id}_${target.title}_${target.start_time}_${target.end_time}`
          expandedGroups.value.add(key)
        }
        await nextTick()
        openDetail(target)
      }
    }
  } catch (e) {}
  finally { loading.value = false }
}

const formatDateWithDay = (dateStr) => {
  if (!dateStr) return ''
  const days = ['일', '월', '화', '수', '목', '금', '토']
  const d = new Date(dateStr + 'T00:00:00')
  return `${dateStr}(${days[d.getDay()]})`
}

const formatDateTime = (dt) => {
  if (!dt) return ''
  const d = new Date(dt)
  if (isNaN(d.getTime())) return String(dt).slice(0, 16)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${h}:${min}`
}

const getSortedChangeLogs = (res) => {
  if (!res) return []
  if (res.change_logs && res.change_logs.length > 0) {
    return [...res.change_logs].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  }
  if (res.reject_reason) {
    return [{
      id: 'legacy',
      action_type: res.status,
      reason: res.reject_reason,
      created_at: res.updated_at || res.created_at
    }]
  }
  return []
}

const getActionLabel = (type) => {
  if (!type) return '변경'
  if (type === 'modify' || type.includes('변경')) return '변경'
  if (type === 'reject' || type === 'rejected' || type.includes('반려')) return '반려'
  if (type === 'cancel' || type === 'cancelled' || type.includes('취소')) return '취소'
  return '변경'
}

const getActionBadgeClass = (type) => {
  const label = getActionLabel(type)
  if (label === '반려') return 'bg-rose-100 text-rose-700 border-rose-200'
  if (label === '취소') return 'bg-amber-100 text-amber-700 border-amber-200'
  return 'bg-blue-100 text-blue-700 border-blue-200'
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
