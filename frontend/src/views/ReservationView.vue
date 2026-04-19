<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import axios from 'axios'
import { useAuthStore } from '../store/auth'
import { 
  CalendarIcon, 
  ClockIcon, 
  MapPinIcon, 
  ChevronLeftIcon, 
  ChevronRightIcon,
  XMarkIcon,
  ChevronDownIcon
} from '@heroicons/vue/24/outline'

const rooms = ref([])
const selectedDate = ref(new Date().toISOString().split('T')[0])
const reservations = ref([])
const loadingRooms = ref(false)
const expandedFloors = ref(['1', 'B1', 'B3']) // 1F, B1, B3 기본 펼침

const toggleFloor = (floor) => {
  if (expandedFloors.value.includes(floor)) {
    expandedFloors.value = expandedFloors.value.filter(f => f !== floor)
  } else {
    expandedFloors.value.push(floor)
  }
}

const isFloorExpanded = (floor) => expandedFloors.value.includes(floor)
const showBookingModal = ref(false)
const showInquiryModal = ref(false)
const showDetailModal = ref(false) // New
const selectedRoom = ref(null)
const selectedReservation = ref(null)
const detailReservation = ref(null) // New
const inquiries = ref([])
const newInquiryContent = ref('')
const answerContents = ref({})

const form = ref({
  title: '',
  start_time: '09:00',
  end_time: '10:00',
  reason: '',
  is_recurring: false,
  recurrence_count: 1,
  requester_name: '',
  requester_phone: ''
})

const inquiryContent = ref('')

const isMorningExpanded = ref(true)
const isNightExpanded = ref(false)

// All Time intervals (00:00 to 24:00, 30 min) 
const allTimeSlots = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2).toString().padStart(2, '0')
  const min = (i % 2 === 0 ? '00' : '30')
  return `${hour}:${min}`
})

// Filtered slots for display
const timeSlots = computed(() => {
  return allTimeSlots.filter(t => {
    const h = parseInt(t.split(':')[0])
    if (!isMorningExpanded.value && h < 7) return false
    if (!isNightExpanded.value && h >= 18) return false
    return true
  })
})

const floors = ['4', '3', '2', '1', 'B1', 'B2', 'B3']

const fetchData = async () => {
  try {
    const [roomsRes, resvRes] = await Promise.all([
      axios.get('/api/rooms'),
      axios.get(`/api/reservations?date=${selectedDate.value}`)
    ])
    rooms.value = roomsRes.data
    reservations.value = resvRes.data
  } catch (error) {
    console.error('Data fetch failed:', error)
  }
}

// Group rooms by floor
const roomsByFloor = computed(() => {
  const grouped = {}
  floors.forEach(f => {
    grouped[f] = rooms.value.filter(r => String(r.floor) === String(f))
  })
  return grouped
})

const getReservationsForRoom = (roomId) => {
  return reservations.value.filter(r => r.room_id === roomId)
}

// Positioning logic adjusted for collapsed slots
const pixelsPerSlot = 30 
const getXPosition = (timeStr) => {
  const [h, m] = timeStr.split(':').map(Number)
  const totalMin = h * 60 + m
  
  // Calculate relative to visible start
  const morningLimit = 7 * 60
  if (!isMorningExpanded.value) {
    if (totalMin < morningLimit) return -100 // Off left
    return (totalMin - morningLimit) * (pixelsPerSlot / 30)
  }
  return totalMin * (pixelsPerSlot / 30)
}

const getReservationStyle = (res) => {
  let startX = getXPosition(res.start_time)
  let endX = getXPosition(res.end_time)
  
  const visibleWidth = timeSlots.value.length * pixelsPerSlot
  
  // Entirely out of view (left)
  if (endX < 0) return { display: 'none' }
  // Entirely out of view (right)
  if (startX >= visibleWidth) return { display: 'none' }

  // Clamp to visible start/end
  const left = Math.max(0, startX)
  const right = Math.min(visibleWidth, endX)
  const width = right - left

  if (width <= 0) return { display: 'none' }

  return {
    left: `${left}px`,
    width: `${width}px`,
    minWidth: '5px'
  }
}

const openBooking = (room, time = '09:00') => {
  const auth = useAuthStore()
  selectedRoom.value = room
  form.value.title = '' // Reset title
  form.value.start_time = time
  
  // Auto-fill from user session
  if (auth.user) {
    form.value.requester_name = auth.user.userId // 사용자의 아이디를 넣음
    form.value.requester_phone = auth.user.phone || '010-0000-0000'
  }

  const [h, m] = time.split(':').map(Number)
  let endH = h
  let endM = m + 30
  if (endM >= 60) {
    endH += 1; endM = 0
  }
  form.value.end_time = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`
  showBookingModal.value = true
}

const submitBooking = async () => {
  try {
    await axios.post('/api/reservations', {
      ...form.value,
      room_id: selectedRoom.value.id,
      reservation_date: selectedDate.value
    })
    alert('예약이 완료되었습니다.')
    showBookingModal.value = false
    fetchData()
  } catch (e) {
    alert(e.response?.data?.error || '예약 중 오류가 발생했습니다.')
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
const isSidebarExpanded = ref(true)
const hoveredReservation = ref(null)
const mousePos = ref({ x: 0, y: 0 })
const isSticky = ref(false)
let hideTimeout = null

const handleMouseEnter = (res, event) => {
  if (isSticky.value && hoveredReservation.value?.id === res.id) return
  
  clearTimeout(hideTimeout)
  hoveredReservation.value = res
  if (!isSticky.value) {
    updateMousePos(event)
  }
}

const handleMouseLeave = () => {
  if (isSticky.value) return
  hideTimeout = setTimeout(() => {
    hoveredReservation.value = null
  }, 300)
}

const handleBlockClick = (res, event) => {
  isSticky.value = true
  hoveredReservation.value = res
  // Fix position at click point
  mousePos.value = { x: event.clientX, y: event.clientY }
}

const closeTooltip = () => {
  isSticky.value = false
  hoveredReservation.value = null
}

const updateMousePos = (event) => {
  if (isSticky.value) return
  mousePos.value = { x: event.clientX, y: event.clientY }
}

const keepTooltip = () => {
  clearTimeout(hideTimeout)
}

// Drag Selection Logic
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
  if (isDragging.value) {
    dragEndSlot.value = time
  }
}

const handleMouseUp = () => {
  if (!isDragging.value) return
  
  const room = rooms.value.find(r => r.id === dragRoomId.value)
  if (room && dragStartSlot.value && dragEndSlot.value) {
    // Sort slots to get min/max
    const idx1 = timeSlots.value.indexOf(dragStartSlot.value)
    const idx2 = timeSlots.value.indexOf(dragEndSlot.value)
    const startIdx = Math.min(idx1, idx2)
    const endIdx = Math.max(idx1, idx2)
    
    const startTime = timeSlots.value[startIdx]
    // End time should be the slots *after* the last selected 30min slot
    const lastSlot = timeSlots.value[endIdx]
    const [h, m] = lastSlot.split(':').map(Number)
    let endH = h, endM = m + 30
    if (endM >= 60) { endH += 1; endM = 0 }
    const endTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`

    openBooking(room, startTime)
    form.value.end_time = endTime
  }

  resetDrag()
}

const resetDrag = () => {
  isDragging.value = false
  dragStartSlot.value = null
  dragEndSlot.value = null
  dragRoomId.value = null
}

const getSelectionStyle = (roomId) => {
  if (!isDragging.value || dragRoomId.value !== roomId || !dragStartSlot.value || !dragEndSlot.value) return { display: 'none' }
  
  const idx1 = timeSlots.value.indexOf(dragStartSlot.value)
  const idx2 = timeSlots.value.indexOf(dragEndSlot.value)
  const startIdx = Math.min(idx1, idx2)
  const endIdx = Math.max(idx1, idx2)
  
  const left = startIdx * pixelsPerSlot
  const width = (endIdx - startIdx + 1) * pixelsPerSlot
  
  return {
    left: `${left}px`,
    width: `${width}px`,
    backgroundColor: 'rgba(79, 70, 229, 0.2)',
    border: '2px solid rgba(79, 70, 229, 0.5)',
    zIndex: 5
  }
}

const fetchInquiries = async (reservationId) => {
  try {
    const res = await axios.get(`/api/reservations/${reservationId}/inquiries`)
    inquiries.value = res.data
    // Initialize answerContents for each inquiry
    res.data.forEach(inc => {
      if (!answerContents.value[inc.id]) {
        answerContents.value[inc.id] = inc.answer || ''
      }
    })
  } catch (err) {
    console.error('Failed to fetch inquiries:', err)
  }
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
  } catch (err) {
    alert('문의 등록 실패')
  }
}

const submitAnswer = async (inquiryId) => {
  const answer = answerContents.value[inquiryId]
  if (!answer?.trim()) return
  try {
    await axios.put(`/api/reservations/inquiry/${inquiryId}`, { answer })
    fetchInquiries(detailReservation.value.id)
    alert('답변이 등록되었습니다.')
  } catch (err) {
    alert('답변 등록 실패')
  }
}

const openDetail = (res) => {
  detailReservation.value = res
  showDetailModal.value = true
  hoveredReservation.value = null
  isSticky.value = false
  fetchInquiries(res.id) // Fetch inquiries
}

onMounted(() => {
  fetchData()
  window.addEventListener('mouseup', handleMouseUp)
})
</script>

<template>
  <div class="h-screen flex flex-col bg-slate-50 font-sans tracking-tight">
    <!-- Header -->
    <header class="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row justify-between items-center shrink-0 z-30">
      <div class="flex items-center gap-4">
        <div class="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center shadow-2xl">
          <CalendarIcon class="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 class="text-xl font-black text-slate-900 leading-none">공간 예약 현황</h1>
          <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Room Reservation System</p>
        </div>
      </div>

      <div class="flex items-center gap-2 bg-slate-50 border border-slate-200 p-1 rounded-2xl">
        <button @click="changeDate(-1)" class="p-2 hover:bg-white rounded-xl transition-all"><ChevronLeftIcon class="w-5 h-5" /></button>
        <input type="date" v-model="selectedDate" class="bg-transparent border-none focus:ring-0 font-black text-slate-700 text-center" />
        <button @click="changeDate(1)" class="p-2 hover:bg-white rounded-xl transition-all"><ChevronRightIcon class="w-5 h-5" /></button>
      </div>
    </header>

    <!-- Sub Header: Legend & Time Toggles -->
    <div class="bg-white border-b border-slate-100 px-6 py-2 flex justify-between items-center shrink-0 z-20">
      <div class="flex gap-4">
        <div class="flex items-center gap-1.5 text-[10px] font-black text-slate-400">
          <span class="w-3 h-3 bg-slate-900 rounded-full"></span> 예약됨
        </div>
        <div class="flex items-center gap-1.5 text-[10px] font-black text-slate-400">
          <span class="w-3 h-3 bg-slate-50 border border-slate-200 rounded-full"></span> 예약 가능
        </div>
      </div>
      
      <div class="flex gap-2">
        <button @click="isMorningExpanded = !isMorningExpanded" :class="[isMorningExpanded ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400']" class="text-[10px] font-black px-4 py-1.5 rounded-xl transition-all shadow-sm">
          {{ isMorningExpanded ? '새벽 접기' : '새벽 펼치기 (00-07)' }}
        </button>
        <button @click="isNightExpanded = !isNightExpanded" :class="[isNightExpanded ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400']" class="text-[10px] font-black px-4 py-1.5 rounded-xl transition-all shadow-sm">
          {{ isNightExpanded ? '야간 접기' : '야간 펼치기 (18-24)' }}
        </button>
      </div>
    </div>

    <!-- Content Area -->
    <main class="flex-1 overflow-auto bg-white relative">
      <div class="inline-flex min-h-full">
        <!-- Room Sidebar (Fixed Width) -->
        <div class="w-44 bg-white border-r border-slate-200 sticky left-0 z-30 shrink-0 shadow-[4px_0_24px_-10px_rgba(0,0,0,0.05)]">
          <div class="h-12 border-b border-slate-200 flex items-center justify-center bg-slate-50">
            <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Room List</span>
          </div>

          <div v-for="floor in floors" :key="floor" class="overflow-hidden">
            <!-- Floor Toggle Header -->
            <button @click="toggleFloor(floor)" 
                    class="w-full h-8 bg-slate-50 flex items-center justify-center gap-2 border-b border-slate-100 hover:bg-slate-100 transition-colors group">
               <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">{{ floor.includes('B') ? floor : floor + 'F' }}</span>
               <component :is="isFloorExpanded(floor) ? ChevronDownIcon : ChevronRightIcon" class="w-2.5 h-2.5 text-slate-300 group-hover:text-indigo-600 transition-colors" />
            </button>
            
            <!-- Rooms List (Collapsible) -->
            <div v-show="isFloorExpanded(floor)">
              <div v-for="room in roomsByFloor[floor]" :key="room.id" class="h-16 border-b border-slate-100 flex items-center justify-center px-4 hover:bg-slate-50 transition-colors whitespace-nowrap overflow-hidden">
                <span class="text-sm font-bold text-slate-800 leading-tight text-center">{{ room.room_name }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Timetable Grid -->
        <div class="relative shrink-0 flex flex-col">
          <!-- Time Header (Sticky Top) -->
          <div class="h-12 bg-white flex border-b border-slate-300 sticky top-0 z-20">
            <template v-for="(time, idx) in timeSlots" :key="'header-' + time">
              <!-- Show HH format only for :00 slots -->
              <div v-if="time.endsWith(':00')" class="w-[60px] flex items-center justify-center shrink-0 border-r border-slate-200">
                 <span class="text-[10px] font-black text-slate-900 leading-none">{{ time.split(':')[0] }}</span>
              </div>
              <!-- For :30 slots start -->
              <div v-else-if="idx === 0" class="w-[30px] border-r border-slate-200 flex items-center justify-center shrink-0 bg-slate-50">
                <span class="text-[9px] font-bold text-slate-500">{{ time }}</span>
              </div>
            </template>
          </div>

          <!-- Body Rows (Grouped by Floor) -->
          <div v-for="floor in floors" :key="'body-floor-' + floor">
            <!-- Floor Indicator row in grid (matches sidebar header height) -->
            <div class="h-8 bg-slate-50/50 border-b border-slate-100 relative">
               <div class="absolute inset-0 flex" :style="{ width: timeSlots.length * 30 + 'px' }">
                 <div v-for="time in timeSlots" :key="'grid-h-' + time" class="w-[30px] border-r border-slate-100 h-full"></div>
               </div>
            </div>

            <!-- Collapsible Room Rows -->
            <div v-show="isFloorExpanded(floor)">
              <div v-for="room in roomsByFloor[floor]" :key="'body-room-' + room.id" class="h-16 relative border-b border-slate-100 group">
                <!-- Background Interaction Grid -->
                <div class="absolute inset-0 flex" :style="{ width: timeSlots.length * 30 + 'px' }">
                   <div v-for="time in timeSlots" :key="'cell-' + room.id + '-' + time" 
                        @mousedown.prevent="handleMouseDown(room, time)"
                        @mouseenter="handleMouseEnterGrid(time)"
                        :class="[time.endsWith(':00') ? 'border-slate-200' : 'border-slate-100']"
                        class="w-[30px] border-r h-full hover:bg-slate-50 transition-colors cursor-pointer select-none">
                   </div>
                </div>

                <!-- Selection Overlay -->
                <div class="absolute top-1 bottom-1 rounded-md pointer-events-none transition-all duration-75 z-10"
                     :style="getSelectionStyle(room.id)">
                </div>

                <!-- Reservations Blocks Overlay -->
                <div class="absolute inset-0 pointer-events-none" :style="{ width: timeSlots.length * 30 + 'px' }">
                   <div v-for="res in getReservationsForRoom(room.id)" :key="'res-' + res.id"
                        :style="getReservationStyle(res)"
                        @mouseenter="handleMouseEnter(res, $event)"
                        @mousemove="updateMousePos($event)"
                        @mouseleave="handleMouseLeave"
                        @click.stop="handleBlockClick(res, $event)"
                        class="absolute top-2 bottom-2 rounded-lg bg-slate-900 border border-slate-700 shadow-lg p-2 pointer-events-auto cursor-pointer flex flex-col justify-center overflow-hidden transition-all hover:bg-slate-800">
                      <div class="text-[9px] font-black text-indigo-400 leading-none truncate mb-1">
                        {{ res.title || 'No Title' }}
                      </div>
                      <div class="text-[10px] text-white font-bold leading-tight line-clamp-1 italic">
                        {{ res.requester_name }}
                      </div>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Floating Tooltip/Popover -->
    <Teleport to="body">
      <div v-if="hoveredReservation" 
           @mouseenter="keepTooltip"
           @mouseleave="handleMouseLeave"
           :style="{ top: (mousePos.y + 10) + 'px', left: (mousePos.x + 10) + 'px' }"
           class="fixed z-[100] w-64 bg-white rounded-3xl shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] border border-slate-100 p-6 pointer-events-auto animate-in fade-in zoom-in duration-200">
        <div class="space-y-4">
          <div class="flex justify-between items-start">
            <span class="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg uppercase tracking-widest">Reservation Info</span>
            <div class="flex items-center gap-2">
              <span class="text-[10px] font-black text-slate-400">{{ hoveredReservation.start_time }} - {{ hoveredReservation.end_time }}</span>
              <button v-if="isSticky" @click="closeTooltip" class="p-1 hover:bg-slate-100 rounded-lg transition-colors">
                <XMarkIcon class="w-3 h-3 text-slate-400" />
              </button>
            </div>
          </div>
          
          <div>
            <h3 class="text-base font-black text-slate-800 leading-tight">{{ hoveredReservation.requester_name }}</h3>
            <p class="text-[11px] text-slate-400 font-bold mt-1 line-clamp-2 italic">" {{ hoveredReservation.reason }} "</p>
          </div>

          <div class="grid grid-cols-2 gap-2 pt-2">
            <button @click="openDetail(hoveredReservation)" class="bg-slate-50 text-slate-600 text-[10px] font-black py-2.5 rounded-xl hover:bg-slate-100 transition-colors">상세 조회</button>
            <button @click="selectedReservation = hoveredReservation; showInquiryModal = true; hoveredReservation = null" class="bg-slate-900 text-white text-[10px] font-black py-2.5 rounded-xl shadow-lg active:scale-95 transition-transform">문의 하기</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Legend (Footer-ish) -->
    <footer class="bg-white border-t border-slate-200 px-6 py-2 flex items-center justify-center gap-6 shrink-0">
       <div class="flex items-center gap-2 text-[10px] font-black text-slate-400">
         <div class="w-3 h-3 bg-slate-900 rounded-full"></div> 예약됨 (양보 문의 가능)
       </div>
       <div class="flex items-center gap-2 text-[10px] font-black text-slate-400">
         <div class="w-3 h-3 bg-slate-50 border border-slate-200 rounded-full"></div> 예약 가능 (클릭)
       </div>
    </footer>

    <!-- Booking Modal (Polished) -->
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
            <button @click="showBookingModal = false" class="p-2 bg-slate-50 rounded-2xl text-slate-400 hover:text-slate-900 transition-all">
              <XMarkIcon class="w-6 h-6" />
            </button>
          </div>

          <div class="bg-indigo-50/50 p-6 rounded-[2rem] border border-indigo-100">
            <label class="block text-[10px] font-black text-indigo-400 mb-2 uppercase tracking-widest">Reservation Title</label>
            <input type="text" v-model="form.title" placeholder="신청명 입력 (예: 주일 예배, 부서 회의)" class="w-full bg-transparent border-none p-0 font-black text-xl text-slate-900 placeholder:text-slate-300 focus:ring-0" />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-4">
              <div class="bg-slate-50 p-4 rounded-3xl">
                <label class="block text-[10px] font-black text-slate-300 mb-2 uppercase tracking-widest">Start Time</label>
                <input type="time" v-model="form.start_time" class="w-full bg-transparent border-none p-0 font-black text-xl text-slate-700 focus:ring-0" />
              </div>
              <div class="bg-slate-50 p-4 rounded-3xl">
                <label class="block text-[10px] font-black text-slate-300 mb-2 uppercase tracking-widest">End Time</label>
                <input type="time" v-model="form.end_time" class="w-full bg-transparent border-none p-0 font-black text-xl text-slate-700 focus:ring-0" />
              </div>
            </div>
            <div class="space-y-4">
              <div class="bg-slate-100 p-4 rounded-3xl opacity-60">
                <label class="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">Assignee</label>
                <input type="text" v-model="form.requester_name" readonly class="w-full bg-transparent border-none p-0 font-black text-slate-600 focus:ring-0 cursor-not-allowed" />
              </div>
              <div class="bg-slate-100 p-4 rounded-3xl opacity-60">
                <label class="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">Contact</label>
                <input type="text" v-model="form.requester_phone" readonly class="w-full bg-transparent border-none p-0 font-black text-slate-600 focus:ring-0 cursor-not-allowed" />
              </div>
            </div>
          </div>

          <div class="bg-slate-50 p-6 rounded-3xl">
            <label class="block text-[10px] font-black text-slate-300 mb-2 uppercase tracking-widest">Reason</label>
            <textarea v-model="form.reason" class="w-full bg-transparent border-none p-0 font-bold text-slate-700 placeholder:text-slate-300 focus:ring-0 h-24 resize-none" placeholder="사용 목적을 입력하세요."></textarea>
          </div>

          <div class="flex items-center gap-4 bg-slate-900 p-6 rounded-[2rem] shadow-2xl">
            <input type="checkbox" v-model="form.is_recurring" class="w-6 h-6 rounded-xl border-none text-indigo-500 focus:ring-0 cursor-pointer" />
            <div class="flex-1">
              <div class="text-xs font-black text-white uppercase tracking-widest">Weekly Recurrence</div>
              <div class="text-[10px] text-slate-500 font-bold">매주 동일 시간에 반복 예약 생성</div>
            </div>
            <div v-if="form.is_recurring" class="flex items-center gap-2">
               <input type="number" v-model="form.recurrence_count" class="w-12 bg-slate-800 border-none rounded-xl text-center font-black text-white p-2" />
               <span class="text-[10px] font-black text-slate-500 uppercase">Weeks</span>
            </div>
          </div>

          <div class="flex gap-4 pt-4">
            <button @click="submitBooking" class="flex-1 bg-indigo-600 text-white py-5 px-6 rounded-[2rem] font-black uppercase tracking-widest text-sm shadow-2xl shadow-indigo-200 active:scale-95 transition-all">Submit Reservation</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Inquiry Modal -->
    <div v-if="showInquiryModal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div class="bg-white rounded-[3rem] shadow-2xl max-w-sm w-full p-10 space-y-6 text-center">
        <h2 class="text-2xl font-black text-slate-900">사용 문의</h2>
        <p class="text-xs text-slate-400 font-bold leading-relaxed px-4">기존 예약자에게 시간 조정 가능성을 문의합니다. 알림톡이 즉시 전송됩니다.</p>
        <textarea v-model="inquiryContent" class="w-full bg-slate-50 border-none rounded-2xl p-6 h-32 font-bold text-slate-700 placeholder:text-slate-300 focus:ring-0" placeholder="문의 내용을 입력하세요."></textarea>
        <div class="flex gap-4">
          <button @click="showInquiryModal = false" class="flex-1 py-4 font-black text-slate-300 uppercase tracking-widest text-xs">Cancel</button>
          <button @click="submitInquiry" class="flex-1 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all">Send Message</button>
        </div>
      </div>
    </div>

    <!-- Reservation Detail Modal -->
    <div v-if="showDetailModal && detailReservation" class="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
      <div class="bg-white rounded-[2.5rem] shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in duration-300">
        <div class="p-10 space-y-8">
          <!-- Header -->
          <div class="flex justify-between items-start">
            <div class="space-y-1">
              <span class="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full uppercase tracking-widest">Reservation Details</span>
              <h2 class="text-2xl font-black text-slate-900 leading-tight pt-2">{{ detailReservation.title || '신청명 없음' }}</h2>
            </div>
            <button @click="showDetailModal = false" class="p-2 bg-slate-50 rounded-2xl text-slate-400 hover:text-slate-900 transition-all">
              <XMarkIcon class="w-6 h-6" />
            </button>
          </div>

          <!-- Info Grid -->
          <div class="grid grid-cols-2 gap-4">
            <div class="bg-slate-50 p-6 rounded-[2rem] flex flex-col gap-1">
              <span class="text-[10px] font-black text-slate-300 uppercase tracking-widest">Date & Time</span>
              <div class="text-sm font-black text-slate-800">{{ detailReservation.reservation_date }}</div>
              <div class="text-xs font-bold text-indigo-600">{{ detailReservation.start_time }} - {{ detailReservation.end_time }}</div>
            </div>
            <div class="bg-slate-50 p-6 rounded-[2rem] flex flex-col gap-1">
              <span class="text-[10px] font-black text-slate-300 uppercase tracking-widest">Room</span>
              <div class="text-sm font-black text-slate-800">{{ detailReservation.room_name || '정보 없음' }}</div>
              <div class="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{{ detailReservation.floor ? (detailReservation.floor.includes('B') ? detailReservation.floor : detailReservation.floor + 'F') : '' }}</div>
            </div>
          </div>

          <!-- Requester Card -->
          <div class="bg-slate-900 text-white p-6 rounded-[2rem] shadow-xl relative overflow-hidden group">
            <div class="relative z-10 flex justify-between items-center">
              <div>
                <span class="text-[10px] font-black text-slate-500 uppercase tracking-widest">Requester Info</span>
                <div class="text-lg font-black mt-1">{{ detailReservation.requester_name }}</div>
                <div class="text-xs font-medium text-slate-400 mt-0.5">{{ detailReservation.requester_phone }}</div>
              </div>
              <div class="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                <ClockIcon class="w-6 h-6 text-white/50" />
              </div>
            </div>
            <div class="absolute -right-4 -bottom-4 w-32 h-32 bg-white/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
          </div>

          <!-- Reason Section -->
          <div class="space-y-3">
             <span class="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">Reason for use</span>
             <div class="bg-slate-50 p-6 rounded-[2rem] text-sm text-slate-600 font-bold leading-relaxed italic">
                " {{ detailReservation.reason }} "
             </div>
          </div>

          <!-- Inquiries & Answers Section -->
          <div class="space-y-4 pt-4 border-t border-slate-100">
            <div class="flex items-center justify-between px-1">
              <span class="text-[10px] font-black text-slate-300 uppercase tracking-widest">Inquiries & Communication</span>
              <span class="text-[9px] font-black text-indigo-400 bg-indigo-50 px-2 py-1 rounded-lg">{{ inquiries.length }} Messages</span>
            </div>

            <!-- Inquiry List -->
            <div class="space-y-4 max-h-64 overflow-y-auto pr-2">
              <div v-for="inc in inquiries" :key="inc.id" class="space-y-2">
                <!-- Question -->
                <div class="flex items-start gap-3">
                  <div class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                    <span class="text-[10px] font-black text-slate-400">?</span>
                  </div>
                  <div class="flex-1 bg-slate-50 p-4 rounded-2xl rounded-tl-none">
                    <div class="flex justify-between items-center mb-1">
                      <span class="text-[9px] font-black text-slate-800">{{ inc.inquirer_name }}</span>
                      <span class="text-[8px] font-bold text-slate-300">{{ new Date(inc.created_at).toLocaleString() }}</span>
                    </div>
                    <p class="text-xs text-slate-600 font-bold leading-relaxed">{{ inc.content }}</p>
                  </div>
                </div>

                <!-- Answer (If exists) -->
                <div v-if="inc.answer" class="flex items-start gap-3 pl-8">
                  <div class="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
                    <span class="text-[10px] font-black text-white">A</span>
                  </div>
                  <div class="flex-1 bg-indigo-50 p-4 rounded-2xl rounded-tl-none border border-indigo-100">
                    <div class="flex justify-between items-center mb-1">
                      <span class="text-[9px] font-black text-indigo-600">예약자 답변</span>
                    </div>
                    <p class="text-xs text-indigo-700 font-black leading-relaxed">{{ inc.answer }}</p>
                  </div>
                </div>

                <!-- Answer Input (For Owner) -->
                <div v-if="!inc.answer && useAuthStore().user?.id === detailReservation.requester_id" class="pl-8 flex gap-2">
                   <input type="text" v-model="answerContents[inc.id]" placeholder="답변을 입력하세요..." 
                          class="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold focus:ring-0" />
                   <button @click="submitAnswer(inc.id)" class="bg-indigo-600 text-white px-4 py-2 rounded-xl text-[10px] font-black shadow-lg shadow-indigo-100">답변</button>
                </div>
              </div>

              <!-- No Inquiries message -->
              <div v-if="inquiries.length === 0" class="text-center py-8">
                <p class="text-[10px] text-slate-300 font-black uppercase tracking-widest">No inquiries yet.</p>
              </div>
            </div>

            <!-- New Inquiry Input (For others) -->
            <div v-if="useAuthStore().user?.id !== detailReservation.requester_id" class="pt-2">
              <div class="flex gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-100 focus-within:border-indigo-200 transition-colors">
                <input type="text" v-model="newInquiryContent" placeholder="예약자에게 문의할 내용을 입력하세요..." 
                       class="flex-1 bg-transparent border-none px-3 py-2 text-xs font-bold text-slate-700 focus:ring-0 placeholder:text-slate-300" />
                <button @click="submitInquiryInDetail" class="bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black shadow-lg shadow-slate-200 active:scale-95 transition-transform">전송</button>
              </div>
            </div>
          </div>

          <!-- Footer Actions -->
          <div class="flex gap-4 pt-2">
            <button @click="showDetailModal = false" class="flex-1 bg-slate-100 text-slate-900 py-5 rounded-[2rem] font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition-all">Close</button>
            <button @click="selectedReservation = detailReservation; showInquiryModal = true; showDetailModal = false" class="flex-1 bg-indigo-600 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-100 active:scale-95 transition-all">Inquiry (문의하기)</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Common Scrollbar Styling */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 10px;
}
::-webkit-scrollbar-thumb:hover {
  background: #cbd5e1;
}

main {
  scrollbar-gutter: stable;
}

input[type="date"]::-webkit-calendar-picker-indicator {
  cursor: pointer;
  filter: invert(0.2);
}
</style>
