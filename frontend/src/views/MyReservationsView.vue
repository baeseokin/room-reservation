<script setup>
// MyReservationsView.vue - Optimized Layout & Custom Calendar
import { ref, onMounted, computed, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import { useAuthStore } from '@/store/auth'
import { 
  CalendarDaysIcon, 
  ClockIcon, 
  MapPinIcon, 
  FunnelIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowPathIcon,
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

// Search filter
const searchQuery = ref('')

// Edit Modal State
const showEditModal = ref(false)
const editingRes = ref(null)

const handleReapply = (res) => {
  if (!res) return
  showEditModal.value = false
  router.push({
    path: '/home/reservations',
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

const editForm = ref({
  title: '',
  reservation_date: '',
  start_time: '',
  end_time: '',
  reason: ''
})

// Custom Calendar Logic
const showCalendar = ref(false)
const calendarTarget = ref('edit') // 'edit', 'filter_start', 'filter_end'
const calendarDate = ref(new Date())
const calendarPosition = ref({ top: 0, left: 0 })

const toggleCalendar = (event, target = 'edit') => {
  const rect = event.currentTarget.getBoundingClientRect()
  calendarPosition.value = {
    top: rect.bottom + window.scrollY,
    left: rect.left + window.scrollX
  }
  
  calendarTarget.value = target
  let initialDateStr = ''
  if (target === 'edit') initialDateStr = editForm.value.reservation_date
  else if (target === 'filter_start') initialDateStr = startDate.value
  else if (target === 'filter_end') initialDateStr = endDate.value

  if (!showCalendar.value && initialDateStr) {
    const d = new Date(initialDateStr + 'T00:00:00')
    if (!isNaN(d.getTime())) {
      calendarDate.value = new Date(d.getFullYear(), d.getMonth(), 1)
    }
  }
  
  showCalendar.value = !showCalendar.value
}

const selectCalendarDate = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const dateStr = `${year}-${month}-${day}`
  
  if (calendarTarget.value === 'edit') editForm.value.reservation_date = dateStr
  
  showCalendar.value = false
}

const moveCalendarMonth = (offset) => {
  const d = new Date(calendarDate.value)
  d.setMonth(d.getMonth() + offset)
  calendarDate.value = d
}

const moveCalendarYear = (offset) => {
  const d = new Date(calendarDate.value)
  d.setFullYear(d.getFullYear() + offset)
  calendarDate.value = d
}

const calendarDays = computed(() => {
  const year = calendarDate.value.getFullYear()
  const month = calendarDate.value.getMonth()
  const firstDay = new Date(year, month, 1)
  const startDate = new Date(firstDay)
  startDate.setDate(1 - firstDay.getDay())
  
  const days = []
  const tempDate = new Date(startDate)
  const lastDay = new Date(year, month + 1, 0)
  const totalDaysNeeded = lastDay.getDate() + firstDay.getDay()
  const rowsNeeded = Math.ceil(totalDaysNeeded / 7)
  const totalCells = rowsNeeded * 7
  
  for (let i = 0; i < totalCells; i++) {
    days.push({
      date: new Date(tempDate),
      current: tempDate.getMonth() === month,
      day: tempDate.getDate()
    })
    tempDate.setDate(tempDate.getDate() + 1)
  }
  return days
})


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
        openEditModal(target)
      }
    }
  } catch (error) {
    console.error('Fetch failed:', error)
  } finally {
    loading.value = false
  }
}


const isSelectedDate = (date) => {
  const dateStr = date.toISOString().split('T')[0]
  if (calendarTarget.value === 'edit') return editForm.value.reservation_date === dateStr
  return false
}

const openEditModal = (res) => {
  editingRes.value = res
  editForm.value = {
    title: res.title || '',
    reservation_date: res.reservation_date,
    start_time: res.start_time,
    end_time: res.end_time,
    reason: res.reason
  }
  showEditModal.value = true
}

const ampmOptions = ['오전', '오후']
const hourOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
const minuteOptions = ['00', '30']

const getAmPm = (time) => {
  if (!time) return '오전'
  const [h] = time.split(':').map(Number)
  return h >= 12 ? '오후' : '오전'
}
const getHour12 = (time) => {
  if (!time) return 9
  let [h] = time.split(':').map(Number)
  h = h % 12
  return h === 0 ? 12 : h
}
const getMinute = (time) => {
  if (!time) return '00'
  return time.split(':')[1] || '00'
}

const updateTime = (target, type, val, current) => {
  if (!current) current = '09:00'
  let [h, m] = current.split(':').map(val => isNaN(parseInt(val)) ? 0 : parseInt(val))
  let ampm = h >= 12 ? '오후' : '오전'
  let h12 = h % 12
  if (h12 === 0) h12 = 12
  
  if (type === 'ampm') ampm = val
  if (type === 'hour') h12 = Number(val)
  if (type === 'minute') m = Number(val)
  
  let newH = h12 % 12
  if (ampm === '오후') newH += 12
  
  const timeStr = `${newH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
  if (target === 'start') editForm.value.start_time = timeStr
  else editForm.value.end_time = timeStr
}

const allTimeSlots = computed(() => {
  const slots = []
  for (let h = 0; h < 24; h++) {
    const hh = h.toString().padStart(2, '0')
    slots.push(`${hh}:00`)
    slots.push(`${hh}:30`)
  }
  return slots
})

const updateReservation = async () => {
  if (editForm.value.start_time >= editForm.value.end_time) {
    modal.showAlert('종료 시간은 시작 시간보다 늦어야 합니다.')
    return
  }

  try {
    await axios.put(`/api/reservations/${editingRes.value.id}`, editForm.value)
    modal.showAlert('예약이 수정되었습니다.')
    showEditModal.value = false
    fetchMyReservations()
  } catch (error) {
    modal.showAlert(error.response?.data?.message || '수정 중 오류가 발생했습니다.')
  }
}

const cancelReservation = async (id) => {
  if (await modal.showConfirm('정말 예약을 취소하시겠습니까?')) {
    try {
      await axios.delete(`/api/reservations/${id}`)
      modal.showAlert('예약이 취소되었습니다.')
      showEditModal.value = false
      fetchMyReservations()
    } catch (error) {
      modal.showAlert('취소 중 오류가 발생했습니다.')
    }
  }
}

const statusMap = {
  pending: { label: '대기중', class: 'bg-amber-50 text-amber-600' },
  approved: { label: '승인됨', class: 'bg-green-50 text-green-600' },
  rejected: { label: '반려됨', class: 'bg-rose-50 text-rose-600' },
  cancelled: { label: '취소됨', class: 'bg-red-50 text-red-500' },
  finished: { label: '종료됨', class: 'bg-slate-100 text-slate-400' }
}

const getEffectiveStatus = (res) => {
  if (res.status === 'approved') {
    const end = new Date(`${res.reservation_date}T${res.end_time}`)
    if (new Date() > end) return 'finished'
  }
  return res.status
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
  });
});

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
          status: res.status,
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
  
  // Sort items within group by date
  groups.forEach(g => {
    if (g.isGroup) {
      g.items.sort((a, b) => new Date(a.reservation_date) - new Date(b.reservation_date))
    }
  })
  
  return groups
})
</script>

<template>
  <div class="p-8 max-w-6xl mx-auto space-y-6 min-h-screen font-sans">
    <!-- Header Section -->
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div class="space-y-1">
        <h1 class="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
          <CalendarDaysIcon class="w-8 h-8 text-indigo-600" />
          <span>나의 예약 현황</span>
          <span v-if="filteredReservations.length > 0" class="bg-indigo-600 text-white text-[0.8125rem] font-black px-2.5 py-0.5 rounded-full leading-none">
            {{ filteredReservations.length }}
          </span>
        </h1>
        <p class="text-slate-400 font-bold uppercase tracking-widest text-xs">관리 및 예약 공간</p>
      </div>

      <button @click="fetchMyReservations" class="flex items-center gap-1.5 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-black hover:bg-slate-50 transition-all shadow-sm active:scale-95">
        <ArrowPathIcon class="w-3.5 h-3.5" :class="{ 'animate-spin': loading }" />
        새로고침
      </button>
    </div>

    <!-- Filter & Controls Bar (Admin List View Style) -->
    <div class="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
      <!-- Left: Status Filter Buttons -->
      <div class="flex p-1 bg-slate-100 rounded-xl overflow-x-auto shrink-0">
        <button v-for="s in [
          { id: 'all', name: '전체' }, 
          { id: 'approved', name: '승인완료' }, 
          { id: 'pending', name: '승인대기' },
          { id: 'cancelled', name: '취소' },
          { id: 'rejected', name: '반려' }
        ]" :key="s.id" 
                @click="statusFilter = s.id"
                :class="[statusFilter === s.id ? 'bg-white text-indigo-600 shadow-sm font-black' : 'text-slate-500 font-bold hover:text-slate-800']"
                class="px-4 py-1.5 rounded-lg text-xs transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer">
          <span>{{ s.name }}</span>
          <span v-if="statusCounts[s.id] !== undefined" 
                :class="[statusFilter === s.id ? 'bg-indigo-50 text-indigo-600 font-black' : 'bg-slate-200/70 text-slate-500 font-bold']"
                class="text-[0.6875rem] px-1.5 py-0.2 rounded-full">
            {{ statusCounts[s.id] }}
          </span>
        </button>
      </div>

      <!-- Right: Period Filter Buttons & Search -->
      <div class="flex flex-wrap items-center gap-3 justify-end">
        <!-- Period Filter -->
        <div class="flex p-1 bg-slate-100 rounded-xl overflow-x-auto shrink-0">
          <button v-for="period in [
            { id: '3m', name: '~3개월' },
            { id: '6m', name: '~6개월' },
            { id: '1y', name: '~1년' }
          ]" :key="period.id"
                  @click="periodFilter = period.id"
                  :class="[periodFilter === period.id ? 'bg-white text-indigo-600 shadow-sm font-black' : 'text-slate-500 font-bold hover:text-slate-800']"
                  class="px-3.5 py-1.5 rounded-lg text-xs transition-all whitespace-nowrap cursor-pointer">
            {{ period.name }}
          </button>
        </div>

        <!-- Search Bar -->
        <div class="relative w-full sm:w-64">
          <MagnifyingGlassIcon class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" v-model="searchQuery" placeholder="공간명, 신청명 검색..." 
                 class="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs font-bold text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-slate-400" />
        </div>
      </div>
    </div>

    <!-- Table Section -->
    <div class="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl overflow-hidden">
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="bg-slate-50 border-b border-slate-100">
            <th class="px-8 py-6 text-[0.75rem] font-black text-slate-400 uppercase tracking-widest">공간 / 층</th>
            <th class="px-8 py-6 text-[0.75rem] font-black text-slate-400 uppercase tracking-widest">날짜 / 시간</th>
            <th class="px-8 py-6 text-[0.75rem] font-black text-slate-400 uppercase tracking-widest">신청명</th>
            <th class="px-8 py-6 text-[0.75rem] font-black text-slate-400 uppercase tracking-widest">상태</th>
            <th class="px-8 py-6 text-[0.75rem] font-black text-slate-400 uppercase tracking-widest text-center">관리</th>
          </tr>
        </thead>
        <tbody>
          <template v-if="loading">
            <tr v-for="i in 3" :key="'loader-'+i" class="animate-pulse">
              <td colspan="5" class="px-8 py-6 bg-slate-50/50"></td>
            </tr>
          </template>
          <!-- Empty State -->
          <tr v-if="!loading && groupedReservations.length === 0">
            <td colspan="5" class="py-20 text-center border-t border-slate-100">
              <CalendarDaysIcon class="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p class="text-sm font-black text-slate-400">조건에 부합하는 예약 내역이 없습니다.</p>
            </td>
          </tr>
          <template v-for="group in groupedReservations" :key="group.id">
            <!-- Group Header Row (For Recurring) -->
            <tr v-if="group.isGroup" 
                @click="toggleGroup(group.id)"
                class="group bg-indigo-50/20 hover:bg-indigo-50/40 transition-colors cursor-pointer border-b border-slate-50">
              <td class="px-8 py-6">
                <div class="flex items-center gap-4">
                  <div class="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-xs font-black text-indigo-600">
                    {{ group.floor }}
                  </div>
                  <div class="flex flex-col">
                    <span class="font-bold text-slate-800">{{ group.room_name }}</span>
                    <span class="text-[0.5625rem] font-black text-indigo-400 uppercase tracking-widest">반복 예약</span>
                  </div>
                </div>
              </td>
              <td class="px-8 py-6">
                 <div class="font-bold text-indigo-600 flex items-center gap-2">
                   {{ formatDateWithDay(group.items[0].reservation_date) }} ~ 
                   <span class="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full font-black">총 {{ group.items.length }}건</span>
                 </div>
                 <div class="text-[0.75rem] font-black text-indigo-400 mt-1 uppercase">{{ group.start_time.slice(0,5) }} - {{ group.end_time.slice(0,5) }}</div>
              </td>
              <td class="px-8 py-6">
                <div class="font-black text-slate-900 leading-tight">{{ group.title || '신청명 없음' }}</div>
                <div class="text-[0.75rem] text-slate-400 font-bold mt-1 max-w-[200px] truncate italic">{{ group.reason }}</div>
              </td>
              <td class="px-8 py-6">
                <span v-if="group.items.every(i => i.status === 'cancelled')" class="px-3 py-1 bg-red-50 text-red-500 rounded-full text-[0.75rem] font-black uppercase tracking-tighter">
                  전체 취소됨
                </span>
                <span v-else-if="group.items.some(i => i.status === 'cancelled')" class="px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-[0.75rem] font-black uppercase tracking-tighter">
                  일부 취소 ({{ group.items.filter(i => i.status !== 'cancelled').length }}/{{ group.items.length }})
                </span>
                <span v-else class="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[0.75rem] font-black uppercase tracking-tighter">
                  반복 진행중
                </span>
              </td>
              <td class="px-8 py-6 text-center">
                <div class="flex items-center justify-center gap-2">
                   <span class="text-[0.625rem] font-black text-slate-400 uppercase">{{ expandedGroups.has(group.id) ? '닫기' : '상세보기' }}</span>
                   <ChevronDownIcon v-if="!expandedGroups.has(group.id)" class="w-4 h-4 text-slate-400" />
                   <ChevronUpIcon v-else class="w-4 h-4 text-indigo-600" />
                </div>
              </td>
            </tr>

            <!-- Sub Items (When expanded) -->
            <tr v-if="group.isGroup && expandedGroups.has(group.id)" 
                v-for="res in group.items" :key="res.id"
                @click.stop="openEditModal(res)"
                class="group bg-white hover:bg-slate-50 transition-colors cursor-pointer border-b border-slate-50/50">
              <td class="px-8 py-4 pl-20 relative">
                <div class="absolute left-10 top-1/2 -translate-y-1/2 w-4 h-[1px] bg-slate-200"></div>
                <div class="text-[0.6875rem] font-bold text-slate-400">일자별 상세</div>
              </td>
              <td class="px-8 py-4">
                 <div class="text-sm font-bold text-slate-700">{{ formatDateWithDay(res.reservation_date) }}</div>
              </td>
              <td class="px-8 py-4">
                <div class="text-xs font-medium text-slate-500">{{ res.start_time.slice(0,5) }} - {{ res.end_time.slice(0,5) }}</div>
              </td>
              <td class="px-8 py-4">
                <span :class="statusMap[getEffectiveStatus(res)]?.class" class="px-2 py-0.5 rounded-full text-[0.625rem] font-black uppercase tracking-tighter">
                  {{ statusMap[getEffectiveStatus(res)]?.label }}
                </span>
              </td>
              <td class="px-8 py-4 text-center">
                 <button class="p-1.5 bg-slate-50 hover:bg-slate-900 rounded-lg transition-all text-slate-300 hover:text-white">
                    <PencilSquareIcon class="w-4 h-4" />
                 </button>
              </td>
            </tr>

            <!-- Single Reservation Row -->
            <tr v-if="!group.isGroup" 
                @click="openEditModal(group)"
                class="group hover:bg-indigo-50/30 transition-colors cursor-pointer border-b border-slate-100">
              <td class="px-8 py-6">
                <div class="flex items-center gap-4">
                  <div class="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-xs font-black text-slate-500 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                    {{ group.floor }}
                  </div>
                  <span class="font-bold text-slate-800">{{ group.room_name }}</span>
                </div>
              </td>
              <td class="px-8 py-6">
                 <div class="font-bold text-slate-800">{{ formatDateWithDay(group.reservation_date) }}</div>
                 <div class="text-[0.75rem] font-black text-indigo-400 mt-1 uppercase">{{ group.start_time.slice(0,5) }} - {{ group.end_time.slice(0,5) }}</div>
              </td>
              <td class="px-8 py-6">
                <div class="font-black text-slate-900 leading-tight">{{ group.title || '신청명 없음' }}</div>
                <div class="text-[0.75rem] text-slate-400 font-bold mt-1 max-w-[200px] truncate italic">{{ group.reason }}</div>
              </td>
              <td class="px-8 py-6">
                <span :class="statusMap[getEffectiveStatus(group)]?.class || 'bg-slate-50 text-slate-500'" class="px-3 py-1 rounded-full text-[0.75rem] font-black uppercase tracking-tighter">
                  {{ statusMap[getEffectiveStatus(group)]?.label || getEffectiveStatus(group) }}
                </span>
              </td>
              <td class="px-8 py-6 text-center">
                 <button class="p-2 bg-slate-50 hover:bg-slate-900 rounded-xl transition-all text-slate-300 hover:text-white">
                    <PencilSquareIcon class="w-5 h-5" />
                 </button>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <!-- Edit/Detail Modal -->
    <div v-if="showEditModal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div class="bg-white rounded-[3rem] shadow-2xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in duration-300 max-h-[90vh] overflow-y-auto">
        <div class="p-10 space-y-8 text-left">
          <div class="flex justify-between items-start">
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <span class="text-[0.75rem] font-black text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full uppercase tracking-widest">예약 상세 정보</span>
                <span v-if="editingRes" :class="statusMap[getEffectiveStatus(editingRes)]?.class" class="px-3 py-1 rounded-full text-[0.75rem] font-black uppercase tracking-tighter">
                  {{ statusMap[getEffectiveStatus(editingRes)]?.label }}
                </span>
              </div>
              <h2 class="text-2xl font-black text-slate-900 pt-2">{{ editForm.title || editingRes?.room_name }}</h2>
            </div>
            <button @click="showEditModal = false" class="p-2 bg-slate-50 rounded-2xl text-slate-400 hover:text-slate-900 transition-all">
              <XMarkIcon class="w-6 h-6" />
            </button>
          </div>

          <!-- Edit Form -->
          <div class="space-y-4">
            <!-- Date Row -->
            <div class="bg-slate-50 p-4 rounded-3xl relative">
              <label class="block text-[0.75rem] font-black text-slate-400 mb-[5px] uppercase tracking-widest">날짜</label>
              <div class="flex items-center justify-between">
                <span class="font-black text-slate-700">{{ formatDateWithDay(editForm.reservation_date) }}</span>
                <CalendarDaysIcon class="w-4 h-4 text-slate-200" />
              </div>
            </div>

            <!-- Time Row (Start & End) -->
            <div class="grid grid-cols-2 gap-4">
              <!-- Start Time -->
              <div class="bg-slate-50 p-3 rounded-2xl">
                <label class="block text-[0.75rem] font-black text-slate-400 mb-1.5 uppercase tracking-widest text-center">시작 시간</label>
                <div class="flex items-center gap-1">
                  <select :value="getAmPm(editForm.start_time)" disabled 
                          class="flex-1 min-w-0 bg-white border-none rounded-lg py-1.5 px-1 font-black text-[0.75rem] text-slate-400 appearance-none text-center shadow-sm">
                    <option v-for="opt in ampmOptions" :key="opt" :value="opt">{{ opt }}</option>
                  </select>
                  <select :value="getHour12(editForm.start_time)" disabled 
                          class="flex-1 min-w-0 bg-white border-none rounded-lg py-1.5 px-1 font-black text-[0.75rem] text-slate-400 appearance-none text-center shadow-sm">
                    <option v-for="h in hourOptions" :key="h" :value="h">{{ h }}시</option>
                  </select>
                  <select :value="getMinute(editForm.start_time)" disabled 
                          class="flex-1 min-w-0 bg-white border-none rounded-lg py-1.5 px-1 font-black text-[0.75rem] text-slate-400 appearance-none text-center shadow-sm">
                    <option v-for="m in minuteOptions" :key="m" :value="m">{{ m }}분</option>
                  </select>
                </div>
              </div>

              <!-- End Time -->
              <div class="bg-slate-50 p-3 rounded-2xl">
                <label class="block text-[0.75rem] font-black text-slate-400 mb-1.5 uppercase tracking-widest text-center">종료 시간</label>
                <div class="flex items-center gap-1">
                  <select :value="getAmPm(editForm.end_time)" disabled 
                          class="flex-1 min-w-0 bg-white border-none rounded-lg py-1.5 px-1 font-black text-[0.75rem] text-slate-400 appearance-none text-center shadow-sm">
                    <option v-for="opt in ampmOptions" :key="opt" :value="opt">{{ opt }}</option>
                  </select>
                  <select :value="getHour12(editForm.end_time)" disabled 
                          class="flex-1 min-w-0 bg-white border-none rounded-lg py-1.5 px-1 font-black text-[0.75rem] text-slate-400 appearance-none text-center shadow-sm">
                    <option v-for="h in hourOptions" :key="h" :value="h">{{ h }}시</option>
                  </select>
                  <select :value="getMinute(editForm.end_time)" disabled 
                          class="flex-1 min-w-0 bg-white border-none rounded-lg py-1.5 px-1 font-black text-[0.75rem] text-slate-400 appearance-none text-center shadow-sm">
                    <option v-for="m in minuteOptions" :key="m" :value="m">{{ m }}분</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
          
          <div class="bg-slate-50 p-6 rounded-[2rem]">
            <label class="block text-[0.75rem] font-black text-slate-400 mb-[5px] uppercase tracking-widest">사용 목적</label>
            <textarea v-model="editForm.reason" readonly class="w-full bg-transparent border-none p-0 font-bold text-slate-700 h-20 resize-none focus:ring-0 font-sans cursor-default" placeholder="목적을 입력하세요"></textarea>
          </div>

          <!-- 승인 / 반려 / 신청 시간 안내 -->
          <div v-if="editingRes?.status === 'approved' && editingRes?.updated_at" class="bg-emerald-50/70 border border-emerald-200/60 p-4 rounded-2xl flex items-center justify-between">
            <span class="text-xs font-black text-emerald-700">승인 시간</span>
            <span class="text-xs font-black text-emerald-800">{{ formatDateTime(editingRes.updated_at) }}</span>
          </div>
          <div v-else-if="editingRes?.status === 'rejected' && editingRes?.updated_at" class="bg-rose-50/70 border border-rose-200/60 p-4 rounded-2xl flex items-center justify-between">
            <span class="text-xs font-black text-rose-700">반려 시간</span>
            <span class="text-xs font-black text-rose-800">{{ formatDateTime(editingRes.updated_at) }}</span>
          </div>
          <div v-else-if="editingRes?.created_at" class="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl flex items-center justify-between">
            <span class="text-xs font-black text-slate-500">신청 시간</span>
            <span class="text-xs font-bold text-slate-700">{{ formatDateTime(editingRes.created_at) }}</span>
          </div>

          <!-- 변경이력 (처리 시간, 사유 시간 오름차순 표시) -->
          <div v-if="getSortedChangeLogs(editingRes).length > 0" class="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
            <div class="flex items-center gap-1.5 text-slate-700 font-black text-xs">
              <ClockIcon class="w-4 h-4 text-indigo-600" />
              <span>변경이력</span>
            </div>
            <div class="space-y-2">
              <div 
                v-for="(log, idx) in getSortedChangeLogs(editingRes)" 
                :key="log.id || idx"
                class="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs space-y-1"
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


          <!-- Actions -->
          <div class="flex gap-4 pt-4 border-t border-slate-100">
             <!-- 1. 반려된 경우: "닫기"와 "재 신청" 버튼 -->
             <template v-if="editingRes?.status === 'rejected'">
               <button @click="showEditModal = false" class="w-1/3 py-5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black uppercase tracking-widest text-xs rounded-[2rem] active:scale-95 transition-all">
                 닫기
               </button>
               <button @click="handleReapply(editingRes)" class="flex-1 py-5 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-xs rounded-[2rem] shadow-xl shadow-indigo-200 active:scale-95 transition-all flex items-center justify-center gap-2">
                 <ArrowPathIcon class="w-4 h-4" />
                 <span>재 신청</span>
               </button>
             </template>

             <!-- 2. 취소 가능한 상태 (대기중 / 승인됨): "예약 취소"와 "닫기" -->
             <template v-else-if="editingRes?.status !== 'cancelled' && getEffectiveStatus(editingRes) !== 'finished'">
               <button @click="cancelReservation(editingRes.id)" 
                       class="flex-1 py-5 bg-rose-50 text-rose-500 font-black uppercase tracking-widest text-xs rounded-[2rem] hover:bg-rose-100 transition-all active:scale-95">
                 예약 취소 / 삭제
               </button>
               <button @click="showEditModal = false" class="flex-1 bg-slate-900 text-white py-5 font-black uppercase tracking-widest text-xs rounded-[2rem] shadow-xl active:scale-95 transition-all">
                 닫기
               </button>
             </template>

             <!-- 3. 취소됨 / 종료됨: "닫기" -->
             <template v-else>
               <button @click="showEditModal = false" class="flex-1 bg-slate-900 text-white py-5 font-black uppercase tracking-widest text-xs rounded-[2rem] shadow-xl active:scale-95 transition-all">
                 닫기
               </button>
             </template>
          </div>
        </div>
      </div>
    </div>

    <!-- Custom Calendar Dropdown (Global in this view) -->
    <Teleport to="body">
      <div v-if="showCalendar" 
           :style="{ top: calendarPosition.top + 'px', left: calendarPosition.left + 'px' }"
           class="fixed z-[9999] mt-2 bg-white rounded-3xl shadow-2xl border border-slate-100 p-5 w-[280px] animate-in fade-in slide-in-from-top-2 duration-200">
        <div class="flex items-center justify-between mb-4">
          <div class="flex gap-1">
            <button @click="moveCalendarYear(-1)" class="p-1 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-900 transition-all"><ChevronDoubleLeftIcon class="w-3.5 h-3.5" /></button>
            <button @click="moveCalendarMonth(-1)" class="p-1 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-900 transition-all"><ChevronLeftIcon class="w-3.5 h-3.5" /></button>
          </div>
          <span class="text-[0.6875rem] font-black text-slate-900 uppercase tracking-widest">
            {{ calendarDate.getFullYear() }}. {{ (calendarDate.getMonth() + 1).toString().padStart(2, '0') }}
          </span>
          <div class="flex gap-1">
            <button @click="moveCalendarMonth(1)" class="p-1 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-900 transition-all"><ChevronRightIcon class="w-3.5 h-3.5" /></button>
            <button @click="moveCalendarYear(1)" class="p-1 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-900 transition-all"><ChevronDoubleRightIcon class="w-3.5 h-3.5" /></button>
          </div>
        </div>
        <div class="grid grid-cols-7 gap-1 mb-2">
          <span v-for="d in ['일','월','화','수','목','금','토']" :key="d" class="text-[0.75rem] font-black text-slate-300 text-center uppercase">{{ d }}</span>
        </div>
        <div class="grid grid-cols-7 gap-1">
          <button v-for="(day, idx) in calendarDays" :key="idx"
                  @click="selectCalendarDate(day.date)"
                  :class="[
                    day.current ? 'text-slate-700 hover:bg-indigo-50 hover:text-indigo-600' : 'text-slate-200',
                    isSelectedDate(day.date) ? 'bg-indigo-600 !text-white shadow-lg shadow-indigo-100' : ''
                  ]"
                  class="aspect-square flex items-center justify-center text-[0.75rem] font-black rounded-lg transition-all">
            {{ day.day }}
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
/* Optional styling */
input[type="date"]::-webkit-calendar-picker-indicator {
  cursor: pointer;
  filter: invert(0.2);
}
</style>
