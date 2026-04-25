<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import axios from 'axios'
import { useAuthStore } from '@/stores/auth'
import { 
  ChevronLeftIcon, ChevronRightIcon, 
  ChevronDoubleLeftIcon, ChevronDoubleRightIcon,
  CalendarIcon, MagnifyingGlassIcon,
  ViewColumnsIcon, ListBulletIcon,
  ClockIcon, XMarkIcon, SparklesIcon,
  ChevronDownIcon, ChevronRightIcon as ChevronRightIconSmall,
  MapPinIcon
} from '@heroicons/vue/24/outline'

const authStore = useAuthStore()
const rooms = ref([])
const reservations = ref([])
const selectedDate = ref(new Date().toISOString().split('T')[0])
const viewMode = ref('time')
const searchQuery = ref('')
const statusFilter = ref('all')
const expandedFloors = ref([])
const hoveredReservation = ref(null)
const isMorningExpanded = ref(false)
const isNightExpanded = ref(false)
const showBookingModal = ref(false)
const showDetailModal = ref(false)
const showInquiryModal = ref(false)
const detailReservation = ref(null)
const selectedReservation = ref(null)
const inquiryContent = ref('')
const selectedRoom = ref(null)
const isEditing = ref(false)
const inquiries = ref([])
const newInquiryContent = ref('')
const answerContents = ref({})

// Calendar Dropdown Logic
const showCalendar = ref(false)
const calendarDate = ref(new Date())
const calendarPosition = ref({ top: 0, left: 0 })

const toggleCalendar = (event) => {
  const rect = event.currentTarget.getBoundingClientRect()
  calendarPosition.value = {
    top: rect.bottom + window.scrollY,
    left: rect.left + window.scrollX
  }
  showCalendar.value = !showCalendar.value
}

const selectCalendarDate = (date) => {
  selectedDate.value = date.toISOString().split('T')[0]
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
  const lastDay = new Date(year, month + 1, 0)
  
  const days = []
  // Previous month padding
  const startPadding = firstDay.getDay()
  for (let i = startPadding - 1; i >= 0; i--) {
    days.push({ date: new Date(year, month, -i), current: false, day: new Date(year, month, -i).getDate() })
  }
  
  // Current month
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push({ date: new Date(year, month, i), current: true, day: i })
  }
  
  // Next month padding
  const endPadding = 42 - days.length
  for (let i = 1; i <= endPadding; i++) {
    days.push({ date: new Date(year, month + 1, i), current: false, day: i })
  }
  
  return days
})

const pixelsPerSlot = 24
const currentTime = ref(new Date())
setInterval(() => { currentTime.value = new Date() }, 60000)

const nowPosition = computed(() => {
  const d = new Date(selectedDate.value)
  const now = currentTime.value
  if (d.toDateString() !== now.toDateString()) return -1
  
  const startIdx = timeSlots.value.indexOf('00:00')
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  return (nowMinutes / 30) * pixelsPerSlot
})

const timeSlots = computed(() => {
  const slots = []
  for (let h = 0; h < 24; h++) {
    if (!isMorningExpanded.value && h < 7) continue
    if (!isNightExpanded.value && h >= 18) continue
    const hh = h.toString().padStart(2, '0')
    slots.push(`${hh}:00`)
    slots.push(`${hh}:30`)
  }
  return slots
})

const floors = computed(() => {
  const f = [...new Set(rooms.value.map(r => String(r.floor)))]
  return f.sort((a, b) => {
    if (a.includes('B') && !b.includes('B')) return 1
    if (!a.includes('B') && b.includes('B')) return -1
    return b.localeCompare(a)
  })
})

const roomsByFloor = computed(() => {
  const map = {}
  rooms.value.forEach(r => {
    const f = String(r.floor)
    if (!map[f]) map[f] = []
    map[f].push(r)
  })
  return map
})

const formattedDisplayDate = computed(() => {
  const d = new Date(selectedDate.value)
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}`
})

const filteredReservations = computed(() => {
  return reservations.value.filter(res => {
    const matchesSearch = !searchQuery.value || 
      res.requester_name.includes(searchQuery.value) || 
      (res.title && res.title.includes(searchQuery.value))
    const matchesStatus = statusFilter.value === 'all' || res.status === statusFilter.value
    return matchesSearch && matchesStatus
  })
})

const fetchData = async () => {
  try {
    const [roomsRes, resvRes] = await Promise.all([
      axios.get('/api/rooms'),
      axios.get(`/api/reservations?date=${selectedDate.value}`)
    ])
    rooms.value = roomsRes.data
    reservations.value = resvRes.data
    
    if (expandedFloors.value.length === 0 && roomsRes.data.length > 0) {
      expandedFloors.value = floors.value.slice(0, 3)
    }
  } catch (err) {
    console.error('Failed to fetch data:', err)
  }
}

const toggleFloor = (floor) => {
  const idx = expandedFloors.value.indexOf(floor)
  if (idx > -1) expandedFloors.value.splice(idx, 1)
  else expandedFloors.value.push(floor)
}

const isFloorExpanded = (floor) => expandedFloors.value.includes(floor)

const getReservationsForRoom = (roomId) => {
  return reservations.value.filter(r => r.room_id === roomId)
}

const getReservationStyle = (res) => {
  const idx1 = timeSlots.value.indexOf(res.start_time.slice(0, 5))
  const idx2 = timeSlots.value.indexOf(res.end_time.slice(0, 5))
  
  if (idx1 === -1) return { display: 'none' }
  
  const left = idx1 * pixelsPerSlot
  const width = (idx2 === -1 ? (timeSlots.value.length - idx1) : (idx2 - idx1)) * pixelsPerSlot
  
  return {
    left: `${left}px`,
    width: `${width - 2}px`
  }
}

const form = ref({
  title: '',
  start_time: '09:00',
  end_time: '10:00',
  reason: '',
  is_recurring: false,
  recurring_type: 'weekly',
  recurring_end_date: '',
  requester_name: '',
  requester_phone: ''
})

const editForm = ref({
  title: '',
  reservation_date: '',
  start_time: '',
  end_time: '',
  reason: ''
})

const openBooking = (room, time = '09:00') => {
  selectedRoom.value = room
  form.value = {
    title: '',
    start_time: time,
    end_time: '',
    reason: '',
    is_recurring: false,
    recurring_type: 'weekly',
    recurring_end_date: '',
    requester_name: '',
    requester_phone: ''
  }

  const [h, m] = time.split(':').map(Number)
  let endH = h, endM = m + 30
  if (endM >= 60) { endH += 1; endM = 0 }
  form.value.end_time = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`
  
  const endDate = new Date()
  endDate.setMonth(endDate.getMonth() + 1)
  form.value.recurring_end_date = endDate.toISOString().split('T')[0]
  showBookingModal.value = true
}

const submitBooking = async () => {
  if (!form.value.requester_name?.trim()) return alert('신청자 이름을 입력해주세요.')
  if (!form.value.requester_phone?.trim()) return alert('연락처를 입력해주세요.')
  try {
    await axios.post('/api/reservations', {
      ...form.value,
      room_id: selectedRoom.value.id,
      reservation_date: selectedDate.value
    })
    alert('예약 신청이 완료되었습니다.')
    showBookingModal.value = false
    fetchData()
  } catch (e) {
    alert(e.response?.data?.message || '예약 중 오류가 발생했습니다.')
  }
}

const submitInquiry = async () => {
  await axios.post('/api/reservations/inquiry', {
    reservation_id: selectedReservation.value.id,
    content: inquiryContent.value
  })
  alert('문의가 전송되었습니다.')
  showInquiryModal.value = false
}

const changeDate = (days) => {
  const d = new Date(selectedDate.value)
  d.setDate(d.getDate() + days)
  selectedDate.value = d.toISOString().split('T')[0]
}

watch(selectedDate, fetchData)
const isSticky = ref(false)
const mousePos = ref({ x: 0, y: 0 })
let hideTimeout = null

const handleMouseEnter = (res, event) => {
  if (isSticky.value && hoveredReservation.value?.id === res.id) return
  clearTimeout(hideTimeout)
  hoveredReservation.value = res
  if (!isSticky.value) updateMousePos(event)
}

const handleMouseLeave = () => {
  if (isSticky.value) return
  hideTimeout = setTimeout(() => { hoveredReservation.value = null }, 300)
}

const updateMousePos = (event) => {
  if (isSticky.value) return
  mousePos.value = { x: event.clientX, y: event.clientY }
}

const isDragging = ref(false)
const dragStartSlot = ref(null)
const dragEndSlot = ref(null)
const dragRoomId = ref(null)

const handleMouseDown = (room, time) => {
  isDragging.value = true
  dragRoomId.value = room.id
  dragStartSlot.value = time
  dragEndSlot.value = time
}

const handleMouseEnterGrid = (time) => {
  if (isDragging.value) dragEndSlot.value = time
}

const handleMouseUp = () => {
  if (!isDragging.value) return
  const room = rooms.value.find(r => r.id === dragRoomId.value)
  if (room && dragStartSlot.value && dragEndSlot.value) {
    const idx1 = timeSlots.value.indexOf(dragStartSlot.value)
    const idx2 = timeSlots.value.indexOf(dragEndSlot.value)
    const startIdx = Math.min(idx1, idx2)
    const endIdx = Math.max(idx1, idx2)
    const startTime = timeSlots.value[startIdx]
    const lastSlot = timeSlots.value[endIdx]
    const [h, m] = lastSlot.split(':').map(Number)
    let endH = h, endM = m + 30
    if (endM >= 60) { endH += 1; endM = 0 }
    openBooking(room, startTime)
    form.value.end_time = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`
  }
  isDragging.value = false
}

const getSelectionStyle = (roomId) => {
  if (!isDragging.value || dragRoomId.value !== roomId || !dragStartSlot.value || !dragEndSlot.value) return { display: 'none' }
  const idx1 = timeSlots.value.indexOf(dragStartSlot.value)
  const idx2 = timeSlots.value.indexOf(dragEndSlot.value)
  const startIdx = Math.min(idx1, idx2)
  const endIdx = Math.max(idx1, idx2)
  return {
    left: `${startIdx * pixelsPerSlot}px`,
    width: `${(endIdx - startIdx + 1) * pixelsPerSlot}px`,
    backgroundColor: 'rgba(79, 70, 229, 0.2)',
    border: '2px solid rgba(79, 70, 229, 0.5)',
    zIndex: 5
  }
}

const fetchInquiries = async (reservationId) => {
  try {
    const res = await axios.get(`/api/reservations/${reservationId}/inquiries`)
    inquiries.value = res.data
    res.data.forEach(inc => {
      if (!answerContents.value[inc.id]) answerContents.value[inc.id] = inc.answer || ''
    })
  } catch (err) { console.error(err) }
}

const submitInquiryInDetail = async () => {
  if (!newInquiryContent.value.trim()) return
  try {
    await axios.post('/api/reservations/inquiry', {
      reservation_id: detailReservation.value.id,
      content: newInquiryContent.value
    })
    newInquiryContent.value = ''
    fetchInquiries(detailReservation.value.id)
    alert('문의가 등록되었습니다.')
  } catch (err) { alert('문의 등록 실패') }
}

const submitAnswer = async (inquiryId) => {
  const answer = answerContents.value[inquiryId]
  if (!answer?.trim()) return
  try {
    await axios.put(`/api/reservations/inquiry/${inquiryId}`, { answer })
    fetchInquiries(detailReservation.value.id)
    alert('답변이 등록되었습니다.')
  } catch (err) { alert('답변 등록 실패') }
}

const openDetail = (res) => {
  detailReservation.value = res
  isEditing.value = false
  showDetailModal.value = true
  fetchInquiries(res.id)
}

const startEdit = () => {
  editForm.value = {
    title: detailReservation.value.title,
    reservation_date: detailReservation.value.reservation_date,
    start_time: detailReservation.value.start_time?.slice(0,5),
    end_time: detailReservation.value.end_time?.slice(0,5),
    reason: detailReservation.value.reason
  }
  isEditing.value = true
}

const updateReservation = async () => {
  try {
    await axios.put(`/api/reservations/${detailReservation.value.id}`, editForm.value)
    alert('예약이 수정되었습니다.')
    isEditing.value = false
    fetchData()
    detailReservation.value = { ...detailReservation.value, ...editForm.value }
  } catch (err) { alert('수정 실패') }
}

const cancelReservation = async (id) => {
  if (!confirm('정말 이 예약을 취소(삭제)하시겠습니까?')) return
  try {
    await axios.delete(`/api/reservations/${id}`)
    alert('예약이 취소되었습니다.')
    showDetailModal.value = false
    fetchData()
  } catch (err) {
    alert('취소 실패: ' + (err.response?.data?.message || '알 수 없는 오류'))
  }
}

onMounted(() => {
  fetchData()
  window.addEventListener('mouseup', handleMouseUp)
})
</script>

<template>
  <div class="h-[calc(100vh-4rem)] flex flex-col bg-[#F8FAFC] font-sans tracking-tight overflow-hidden">
    <!-- Header: Ultra Condensed & High End -->
    <header class="bg-white/80 backdrop-blur-md border-b border-slate-200/60 px-4 py-2 flex flex-col md:flex-row justify-between items-center shrink-0 z-30 gap-4">
      <!-- Left: Date Picker & Navigation -->
      <div class="flex items-center gap-2">
        <div class="flex items-center bg-white border border-slate-200 rounded-xl shadow-sm p-0.5">
          <button @click="changeDate(-1)" class="p-1.5 hover:bg-slate-50 rounded-lg transition-colors text-slate-400">
            <ChevronLeftIcon class="w-3.5 h-3.5" />
          </button>
          
          <button @click="toggleCalendar" class="px-4 py-1.5 flex items-center gap-2 group hover:bg-slate-50 rounded-lg transition-colors">
            <span class="text-sm font-black text-slate-800 group-hover:text-indigo-600">{{ formattedDisplayDate }}</span>
            <CalendarIcon class="w-3.5 h-3.5 text-slate-300" />
          </button>

          <button @click="changeDate(1)" class="p-1.5 hover:bg-slate-50 rounded-lg transition-colors text-slate-400">
            <ChevronRightIcon class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <!-- Center: Title -->
      <div class="hidden md:flex items-center gap-2.5">
        <div class="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-100">
          <SparklesIcon class="w-4 h-4 text-white" />
        </div>
        <h1 class="text-sm font-black text-slate-900 tracking-tighter uppercase">공간 예약 현황</h1>
      </div>

      <!-- Right: Search & View Toggles -->
      <div class="flex items-center gap-2 w-full md:w-auto">
        <div class="relative flex-1 md:w-48 group">
          <MagnifyingGlassIcon class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
          <input type="text" v-model="searchQuery" placeholder="검색..." 
                 class="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-1.5 pl-9 pr-3 text-xs font-bold text-slate-700 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none" />
        </div>

        <div class="bg-slate-100/80 p-0.5 rounded-xl flex gap-0.5 shadow-inner">
          <button @click="viewMode = 'time'" :class="[viewMode === 'time' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400']" 
                  class="p-1.5 rounded-lg transition-all"><ViewColumnsIcon class="w-4 h-4" /></button>
          <button @click="viewMode = 'list'" :class="[viewMode === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400']" 
                  class="p-1.5 rounded-lg transition-all"><ListBulletIcon class="w-4 h-4" /></button>
        </div>
      </div>
    </header>

    <!-- Sub Header: Legend & Controls -->
    <div class="bg-white border-b border-slate-200/60 px-4 py-1.5 flex justify-between items-center shrink-0 z-20">
      <div class="flex gap-4">
        <div class="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
          <span class="w-2.5 h-2.5 bg-indigo-600 rounded-sm"></span> 승인완료
        </div>
        <div class="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
          <span class="w-2.5 h-2.5 bg-slate-200 rounded-sm"></span> 승인대기
        </div>
        <div class="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
          <span class="w-2.5 h-2.5 bg-white border border-slate-200 rounded-sm"></span> 예약가능
        </div>
      </div>
      
      <div class="flex gap-1">
        <button @click="isMorningExpanded = !isMorningExpanded" :class="[isMorningExpanded ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-400 border border-slate-200']" 
                class="text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-tight transition-all">
          00-07
        </button>
        <button @click="isNightExpanded = !isNightExpanded" :class="[isNightExpanded ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-400 border border-slate-200']" 
                class="text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-tight transition-all">
          18-24
        </button>
      </div>
    </div>

    <!-- Main Content -->
    <main class="flex-1 overflow-auto relative bg-white">
      <!-- Time Grid -->
      <div v-if="viewMode === 'time'" class="inline-flex min-h-full">
        <!-- Room Sidebar -->
        <div class="w-36 bg-white border-r border-slate-200/60 sticky left-0 z-30 shrink-0">
          <div class="h-10 border-b border-slate-200 flex items-center px-4 bg-slate-50/50">
            <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Rooms</span>
          </div>
          <div v-for="floor in floors" :key="floor" class="border-b border-slate-100">
            <button @click="toggleFloor(floor)" class="w-full py-2 px-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
               <span class="text-[10px] font-black text-slate-900">{{ floor.includes('B') ? floor : floor + 'F' }}</span>
               <ChevronDownIcon :class="{'rotate-180': !isFloorExpanded(floor)}" class="w-3 h-3 text-slate-300 transition-transform" />
            </button>
            <div v-show="isFloorExpanded(floor)" class="pb-1">
              <div v-for="room in roomsByFloor[floor]" :key="room.id" class="h-10 px-4 flex items-center group">
                <span class="text-[10px] font-bold text-slate-600 line-clamp-2">{{ room.room_name }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Grid Container -->
        <div class="relative shrink-0 flex flex-col">
          <!-- Time Header -->
          <div class="h-10 bg-white flex border-b border-slate-200 sticky top-0 z-20">
            <div v-for="time in timeSlots" :key="'time-' + time" 
                 :class="[time.endsWith(':00') ? 'border-l border-slate-200' : '']"
                 class="w-[24px] shrink-0 h-full flex items-center justify-center relative">
               <span v-if="time.endsWith(':00')" class="absolute -left-1.5 text-[9px] font-black text-slate-900">
                 {{ time.split(':')[0] }}
               </span>
            </div>
          </div>

          <!-- Body Grid -->
          <div v-for="floor in floors" :key="'grid-floor-' + floor">
            <div class="h-[37px] border-b border-slate-100/50 bg-slate-50/30 flex">
               <div v-for="time in timeSlots" :key="'header-cell-' + floor + '-' + time" 
                    :class="[time.endsWith(':00') ? 'border-l border-slate-100' : '']"
                    class="w-[24px] shrink-0 h-full"></div>
            </div>
            <div v-show="isFloorExpanded(floor)">
              <div v-for="room in roomsByFloor[floor]" :key="'grid-room-' + room.id" class="h-10 relative border-b border-slate-100 group">
                <div class="absolute inset-0 flex">
                   <div v-for="time in timeSlots" :key="'cell-' + room.id + '-' + time" 
                        @mousedown.prevent="handleMouseDown(room, time)"
                        @mouseenter="handleMouseEnterGrid(time)"
                        :class="[time.endsWith(':00') ? 'border-l border-slate-200' : 'border-l border-slate-100/60']"
                        class="w-[24px] h-full hover:bg-slate-50/80 transition-colors cursor-crosshair">
                   </div>
                </div>
                <div class="absolute top-1 bottom-1 rounded-md pointer-events-none transition-all z-10" :style="getSelectionStyle(room.id)"></div>
                <div class="absolute inset-0 pointer-events-none">
                   <div v-for="res in getReservationsForRoom(room.id)" :key="'res-' + res.id"
                        :style="getReservationStyle(res)"
                        @click.stop="openDetail(res)"
                        :class="[res.status === 'approved' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600']"
                        class="absolute top-1 bottom-1 rounded-md px-1.5 pointer-events-auto cursor-pointer flex flex-col justify-center overflow-hidden transition-all hover:scale-[1.03] hover:z-20 border border-black/5">
                      <div class="text-[8px] font-black leading-none truncate mb-0.5">{{ res.title || '신청' }}</div>
                      <div class="text-[8px] font-bold opacity-80 leading-none truncate">{{ res.requester_name }}</div>
                   </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Indicator -->
          <div v-if="nowPosition >= 0" class="absolute top-0 bottom-0 border-l border-red-500 z-40 pointer-events-none" :style="{ left: nowPosition + 'px' }">
            <div class="w-2 h-2 bg-red-500 rounded-full absolute -top-1 -left-1 shadow-lg"></div>
          </div>
        </div>
      </div>

      <!-- List View -->
      <div v-else class="p-6 max-w-6xl mx-auto">
        <div class="flex flex-col md:flex-row gap-4 justify-between items-center mb-8 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
           <div class="flex p-1 bg-slate-100 rounded-xl">
             <button v-for="s in [{ id: 'all', name: '전체' }, { id: 'approved', name: '승인완료' }, { id: 'pending', name: '승인대기' }]" :key="s.id" @click="statusFilter = s.id"
             :class="[statusFilter === s.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500']"
             class="px-5 py-1.5 rounded-lg text-xs font-black transition-all">{{ s.name }}</button>
           </div>
           <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Found <span class="text-indigo-600">{{ filteredReservations.length }}</span> items</div>
        </div>
        <div v-if="filteredReservations.length === 0" class="py-24 text-center border-2 border-dashed border-slate-100 rounded-[3rem]">
           <CalendarIcon class="w-12 h-12 text-slate-200 mx-auto mb-4" />
           <p class="text-sm font-black text-slate-300 uppercase tracking-widest">예약 내역이 없습니다</p>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div v-for="res in filteredReservations" :key="'list-res-' + res.id" @click="openDetail(res)"
               class="bg-white border border-slate-200 rounded-2xl p-5 hover:border-indigo-600 transition-all cursor-pointer group h-full relative">
            <div class="flex justify-between items-start mb-4">
              <div class="flex items-center gap-2">
                <span class="bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter">{{ res.floor }}{{ res.floor.includes('B') ? '' : 'F' }}</span>
                <span class="text-xs font-black text-slate-900 group-hover:text-indigo-600">{{ res.room_name }}</span>
              </div>
              <span :class="[res.status === 'approved' ? 'bg-indigo-600 text-white' : 'bg-amber-100 text-amber-700']" class="px-2 py-0.5 rounded-md text-[8px] font-black uppercase">{{ res.status === 'approved' ? 'Approved' : 'Pending' }}</span>
            </div>
            <h3 class="text-base font-black text-slate-800 mb-2 leading-tight flex-1">{{ res.title || '신청명 없음' }}</h3>
            <div class="pt-4 border-t border-slate-50 flex items-center justify-between">
              <div class="flex items-center gap-1.5">
                <ClockIcon class="w-3.5 h-3.5 text-slate-300" />
                <span class="text-[11px] font-black text-slate-700">{{ res.start_time.slice(0,5) }} — {{ res.end_time.slice(0,5) }}</span>
              </div>
              <span class="text-[10px] font-bold text-slate-400 italic">By {{ res.requester_name }}</span>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Modal: Detail -->
    <Teleport to="body">
      <div v-if="showDetailModal" class="fixed inset-0 z-[2000] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" @click="showDetailModal = false"></div>
        <div class="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl border border-white overflow-hidden animate-in">
          <div class="bg-slate-900 px-10 py-10 text-white relative">
            <button @click="showDetailModal = false" class="absolute top-8 right-8 p-2 hover:bg-white/10 rounded-full transition-colors"><XMarkIcon class="w-6 h-6" /></button>
            <div class="flex items-center gap-3 mb-4">
              <span class="bg-indigo-600 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-lg">{{ detailReservation.floor }}{{ detailReservation.floor.includes('B') ? '' : 'F' }}</span>
              <span class="text-indigo-400 text-sm font-black">{{ detailReservation.room_name }}</span>
            </div>
            <h2 class="text-2xl font-black leading-tight tracking-tighter">{{ detailReservation.title || '공간 예약 상세' }}</h2>
          </div>
          <div class="px-10 py-8 space-y-8">
            <div class="grid grid-cols-2 gap-8">
              <div class="space-y-1">
                <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">신청자</span>
                <p class="text-base font-black text-slate-900">{{ detailReservation.requester_name }}</p>
              </div>
              <div class="space-y-1">
                <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">연락처</span>
                <p class="text-base font-black text-slate-900">{{ detailReservation.requester_phone || '미기재' }}</p>
              </div>
            </div>
            <div class="p-6 bg-slate-50 rounded-2xl flex items-center justify-between border border-slate-100">
               <div class="flex items-center gap-4">
                 <div class="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm"><ClockIcon class="w-5 h-5 text-indigo-600" /></div>
                 <div>
                   <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Time</p>
                   <p class="text-lg font-black text-slate-900 tracking-tighter">{{ detailReservation.start_time.slice(0,5) }} — {{ detailReservation.end_time.slice(0,5) }}</p>
                 </div>
               </div>
               <div :class="detailReservation.status === 'approved' ? 'bg-indigo-600' : 'bg-amber-500'" class="px-4 py-1.5 rounded-xl text-white text-[9px] font-black uppercase tracking-widest">
                 {{ detailReservation.status === 'approved' ? 'Approved' : 'Pending' }}
               </div>
            </div>
            <div class="space-y-2">
              <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Reason / Purpose</span>
              <p class="text-slate-600 font-bold leading-relaxed text-sm italic bg-slate-50/50 p-4 rounded-xl border border-slate-100/50">"{{ detailReservation.reason || '신청 사유가 없습니다.' }}"</p>
            </div>
          </div>
          <div class="px-10 py-6 bg-slate-50 border-t border-slate-100 flex justify-end">
            <button @click="showDetailModal = false" class="px-8 py-3 rounded-xl text-xs font-black text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest">Close Details</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Modal: Calendar -->
    <Teleport to="body">
      <div v-if="showCalendar" class="fixed inset-0 z-[1000]" @click="showCalendar = false"></div>
      <div v-if="showCalendar" :style="{ top: (calendarPosition.top + 8) + 'px', left: calendarPosition.left + 'px' }" class="fixed z-[1001] bg-white rounded-[2rem] shadow-2xl border border-slate-200/60 p-6 w-[320px]">
         <div class="flex justify-between items-center mb-6">
           <div class="flex items-center gap-2">
             <h4 class="text-sm font-black text-slate-900">{{ calendarDate.getFullYear() }}년 {{ calendarDate.getMonth() + 1 }}월</h4>
             <button @click.stop="selectCalendarDate(new Date())" class="text-[8px] font-black bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">TODAY</button>
           </div>
           <div class="flex gap-1">
             <button @click.stop="moveCalendarYear(-1)" class="p-1.5 text-slate-300"><ChevronDoubleLeftIcon class="w-3.5 h-3.5" /></button>
             <button @click.stop="moveCalendarMonth(-1)" class="p-1.5 text-slate-400"><ChevronLeftIcon class="w-4 h-4" /></button>
             <button @click.stop="moveCalendarMonth(1)" class="p-1.5 text-slate-400"><ChevronRightIcon class="w-4 h-4" /></button>
             <button @click.stop="moveCalendarYear(1)" class="p-1.5 text-slate-300"><ChevronDoubleRightIcon class="w-3.5 h-3.5" /></button>
           </div>
         </div>
         <div class="grid grid-cols-7 gap-1 mb-2">
           <div v-for="d in ['일', '월', '화', '수', '목', '금', '토']" :key="d" class="text-[9px] font-black text-slate-300 text-center uppercase tracking-widest">{{ d }}</div>
         </div>
         <div class="grid grid-cols-7 gap-1">
           <button v-for="(d, idx) in calendarDays" :key="idx" @click.stop="selectCalendarDate(d.date)"
                   :class="[d.current ? 'text-slate-700' : 'text-slate-200', selectedDate === d.date.toISOString().split('T')[0] ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-slate-50']"
                   class="aspect-square flex items-center justify-center text-[11px] font-black rounded-lg transition-all">{{ d.day }}</button>
         </div>
      </div>
    </Teleport>

    <!-- Modal: Booking -->
    <Teleport to="body">
      <div v-if="showBookingModal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
        <div class="bg-white rounded-[2.5rem] shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
          <div class="p-10 space-y-8">
            <div class="flex justify-between items-start">
              <div>
                <h2 class="text-2xl font-black text-slate-900">공간 예약 신청</h2>
                <div class="flex items-center gap-2 mt-2">
                   <span class="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg uppercase tracking-widest">{{ selectedRoom.floor.includes('B') ? selectedRoom.floor : selectedRoom.floor + 'F' }}</span>
                   <p class="text-sm font-bold text-slate-400">{{ selectedRoom.room_name }} | {{ selectedDate }}</p>
                </div>
              </div>
              <button @click="showBookingModal = false" class="p-2 bg-slate-50 rounded-2xl text-slate-400 hover:text-slate-900 transition-all"><XMarkIcon class="w-6 h-6" /></button>
            </div>
            <div class="bg-indigo-50/50 p-6 rounded-[2rem] border border-indigo-100">
              <label class="block text-[10px] font-black text-indigo-400 mb-2 uppercase tracking-widest">신청명</label>
              <input type="text" v-model="form.title" placeholder="신청명 입력" class="w-full bg-transparent border-none p-0 font-black text-xl text-slate-900 placeholder:text-slate-300 focus:ring-0" />
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-4">
                <div class="bg-slate-50 p-4 rounded-3xl">
                  <label class="block text-[10px] font-black text-slate-300 mb-2 uppercase tracking-widest">시작 시간</label>
                  <input type="time" v-model="form.start_time" class="w-full bg-transparent border-none p-0 font-black text-xl text-slate-700 focus:ring-0" />
                </div>
                <div class="bg-slate-50 p-4 rounded-3xl">
                  <label class="block text-[10px] font-black text-slate-300 mb-2 uppercase tracking-widest">종료 시간</label>
                  <input type="time" v-model="form.end_time" class="w-full bg-transparent border-none p-0 font-black text-xl text-slate-700 focus:ring-0" />
                </div>
              </div>
              <div class="space-y-4">
                <div class="bg-slate-50 p-4 rounded-3xl">
                  <label class="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">신청자 이름</label>
                  <input type="text" v-model="form.requester_name" placeholder="홍길동" class="w-full bg-transparent border-none p-0 font-black text-xl text-slate-900 placeholder:text-slate-300 focus:ring-0" />
                </div>
                <div class="bg-slate-50 p-4 rounded-3xl">
                  <label class="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">연락처</label>
                  <input type="tel" v-model="form.requester_phone" placeholder="010-0000-0000" class="w-full bg-transparent border-none p-0 font-black text-xl text-slate-900 placeholder:text-slate-300 focus:ring-0" />
                </div>
              </div>
            </div>
            <div class="bg-slate-50 p-6 rounded-3xl">
              <label class="block text-[10px] font-black text-slate-300 mb-2 uppercase tracking-widest">사유</label>
              <textarea v-model="form.reason" class="w-full bg-transparent border-none p-0 font-bold text-slate-700 placeholder:text-slate-300 focus:ring-0 h-24 resize-none" placeholder="사용 목적"></textarea>
            </div>
            <div class="flex gap-4 pt-4">
              <button @click="showBookingModal = false" class="bg-slate-100 text-slate-700 py-5 px-6 rounded-[2rem] font-black uppercase tracking-widest text-xs">취소</button>
              <button @click="submitBooking" class="flex-1 bg-indigo-600 text-white py-5 px-6 rounded-[2rem] font-black uppercase tracking-widest text-sm shadow-2xl active:scale-95 transition-all">🗓 예약 신청하기</button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

main { scrollbar-gutter: stable; }

.animate-in {
  animation: modal-in 0.3s cubic-bezier(0, 0, 0.2, 1);
}

@keyframes modal-in {
  from { opacity: 0; transform: scale(0.95) translateY(10px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
</style>
