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
const showDetailModal = ref(false)
const selectedRoom = ref(null)
const selectedReservation = ref(null)
const detailReservation = ref(null)
const isEditing = ref(false)
const editForm = ref({})
const inquiries = ref([])
const newInquiryContent = ref('')
const answerContents = ref({})

const form = ref({
  title: '',
  start_time: '09:00',
  end_time: '10:00',
  reason: '',
  is_recurring: false,
  recurring_type: 'weekly', // daily, weekly, monthly
  recurring_end_date: '',
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
  
  // Reset form
  form.value = {
    title: '',
    start_time: time,
    end_time: '',
    reason: '',
    is_recurring: false,
    recurring_type: 'weekly',
    recurring_end_date: '',
    requester_name: auth.user?.userId || '',
    requester_phone: auth.user?.phone || '010-0000-0000'
  }

  const [h, m] = time.split(':').map(Number)
  let endH = h
  let endM = m + 30
  if (endM >= 60) {
    endH += 1; endM = 0
  }
  form.value.end_time = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`
  
  // Set default recurring end date to 1 month from now
  const endDate = new Date()
  endDate.setMonth(endDate.getMonth() + 1)
  form.value.recurring_end_date = endDate.toISOString().split('T')[0]
  
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
const isSticky = ref(false)
const hoveredRoom = ref(null)
const mousePos = ref({ x: 0, y: 0 })

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

const handleRoomMouseEnter = (room, event) => {
  hoveredRoom.value = room
  updateMousePos(event)
}

const handleRoomMouseLeave = () => {
  hoveredRoom.value = null
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
  isEditing.value = false
  showDetailModal.value = true
  hoveredReservation.value = null
  isSticky.value = false
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
    // Refresh detail with updated data
    detailReservation.value = { ...detailReservation.value, ...editForm.value }
  } catch (err) {
    alert('수정 실패: ' + (err.response?.data?.message || '알 수 없는 오류'))
  }
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
              <div v-for="room in roomsByFloor[floor]" :key="room.id" 
                   @mouseenter="handleRoomMouseEnter(room, $event)"
                   @mousemove="updateMousePos($event)"
                   @mouseleave="handleRoomMouseLeave"
                   class="h-16 border-b border-slate-100 flex items-center justify-center px-4 hover:bg-slate-50 transition-colors whitespace-nowrap overflow-hidden cursor-help">
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
      <!-- Room Info Tooltip -->
      <div v-if="hoveredRoom" 
           :style="{ top: (mousePos.y + 10) + 'px', left: (mousePos.x + 10) + 'px' }"
           class="fixed z-[100] w-72 bg-white rounded-[2.5rem] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.3)] border border-slate-100 overflow-hidden pointer-events-none animate-in fade-in zoom-in duration-200">
        <div v-if="hoveredRoom.image_url" class="w-full aspect-video bg-slate-100">
          <img :src="hoveredRoom.image_url" class="w-full h-full object-cover" />
        </div>
        <div v-else class="w-full aspect-video bg-slate-900 flex flex-col items-center justify-center gap-2">
          <MapPinIcon class="w-8 h-8 text-white/20" />
          <span class="text-[10px] font-black text-white/30 uppercase tracking-widest">No Room Photo</span>
        </div>
        <div class="p-6 space-y-4">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg uppercase tracking-widest">{{ hoveredRoom.floor.includes('B') ? hoveredRoom.floor : hoveredRoom.floor + 'F' }}</span>
              <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">{{ hoveredRoom.dept_name || 'Public' }}</span>
            </div>
            <h3 class="text-xl font-black text-slate-900 leading-tight">{{ hoveredRoom.room_name }}</h3>
          </div>
          <div class="bg-slate-50 p-4 rounded-2xl space-y-2 border border-slate-100">
            <div class="flex justify-between items-center">
              <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Manager</span>
              <span class="text-xs font-black text-slate-800">{{ hoveredRoom.manager_name }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact</span>
              <span class="text-xs font-black text-slate-800">{{ hoveredRoom.manager_contact }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Reservation Info Tooltip -->
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

          <div class="space-y-4 bg-slate-900 p-6 rounded-[2rem] shadow-2xl block">
            <label class="flex items-center gap-4 cursor-pointer">
              <input type="checkbox" v-model="form.is_recurring" class="w-6 h-6 rounded-xl border-none text-indigo-500 focus:ring-0 cursor-pointer" />
              <div class="flex-1">
                <div class="text-xs font-black text-white uppercase tracking-widest">Recurring Reservation (반복 예약)</div>
                <div class="text-[10px] text-slate-500 font-bold">주기적 일정을 한 번에 예약합니다.</div>
              </div>
            </label>



            <div v-if="form.is_recurring" class="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-300">
              <div class="bg-slate-800 p-4 rounded-2xl">
                <label class="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">Frequency (주기)</label>
                <select v-model="form.recurring_type" class="w-full bg-transparent border-none p-0 font-black text-sm text-white focus:ring-0">
                  <option value="daily" class="bg-slate-800">매일 (Daily)</option>
                  <option value="weekly" class="bg-slate-800">매주 (Weekly)</option>
                  <option value="monthly" class="bg-slate-800">매월 (Monthly)</option>
                </select>
              </div>
              <div class="bg-slate-800 p-4 rounded-2xl">
                <label class="block text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">End Date (종료일)</label>
                <input type="date" v-model="form.recurring_end_date" class="w-full bg-transparent border-none p-0 font-black text-sm text-white focus:ring-0" />
              </div>
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
      <div class="bg-white rounded-[2.5rem] shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in duration-300 max-h-[90vh] overflow-y-auto">
        <div class="p-10 space-y-6">
          <!-- Header -->
          <div class="flex justify-between items-start">
            <div class="space-y-1">
              <span :class="isEditing ? 'text-emerald-600 bg-emerald-50' : 'text-indigo-600 bg-indigo-50'" class="text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest">
                {{ isEditing ? '✏️ 예약 수정' : 'Reservation Details' }}
              </span>
              <h2 class="text-2xl font-black text-slate-900 leading-tight pt-2">{{ detailReservation.title || '신청명 없음' }}</h2>
            </div>
            <button @click="showDetailModal = false; isEditing = false" class="p-2 bg-slate-50 rounded-2xl text-slate-400 hover:text-slate-900 transition-all">
              <XMarkIcon class="w-6 h-6" />
            </button>
          </div>

          <!-- Info Grid (always visible) -->
          <div class="grid grid-cols-2 gap-4">
            <div class="bg-slate-50 p-5 rounded-[1.5rem] flex flex-col gap-1">
              <span class="text-[10px] font-black text-slate-300 uppercase tracking-widest">Date & Time</span>
              <div class="text-sm font-black text-slate-800">{{ detailReservation.reservation_date }}</div>
              <div class="text-xs font-bold text-indigo-600">{{ detailReservation.start_time }} - {{ detailReservation.end_time }}</div>
            </div>
            <div class="bg-slate-50 p-5 rounded-[1.5rem] flex flex-col gap-1">
              <span class="text-[10px] font-black text-slate-300 uppercase tracking-widest">Room</span>
              <div class="text-sm font-black text-slate-800">{{ detailReservation.room_name || '정보 없음' }}</div>
              <div class="text-[10px] font-bold text-slate-400 uppercase">{{ detailReservation.floor ? (detailReservation.floor.includes('B') ? detailReservation.floor : detailReservation.floor + 'F') : '' }}</div>
            </div>
          </div>

          <!-- Requester Card -->
          <div class="bg-slate-900 text-white p-5 rounded-[1.5rem] shadow-xl relative overflow-hidden">
            <div class="relative z-10 flex justify-between items-center">
              <div>
                <span class="text-[10px] font-black text-slate-500 uppercase tracking-widest">Requester</span>
                <div class="text-lg font-black mt-1">{{ detailReservation.requester_name }}</div>
                <div class="text-xs font-medium text-slate-400 mt-0.5">{{ detailReservation.requester_phone }}</div>
              </div>
              <div class="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                <ClockIcon class="w-6 h-6 text-white/50" />
              </div>
            </div>
          </div>

          <!-- VIEW MODE -->
          <template v-if="!isEditing">
            <div class="bg-slate-50 p-5 rounded-2xl">
              <span class="text-[10px] font-black text-slate-300 uppercase tracking-widest block mb-2">Reason for use</span>
              <p class="text-sm text-slate-600 font-bold leading-relaxed italic">" {{ detailReservation.reason || '사유 없음' }} "</p>
            </div>

            <!-- Inquiries -->
            <div class="space-y-3 pt-2 border-t border-slate-100">
              <div class="flex items-center justify-between">
                <span class="text-[10px] font-black text-slate-300 uppercase tracking-widest">Inquiries</span>
                <span class="text-[9px] font-black text-indigo-400 bg-indigo-50 px-2 py-1 rounded-lg">{{ inquiries.length }} Messages</span>
              </div>
              <div class="space-y-3 max-h-40 overflow-y-auto">
                <div v-for="inc in inquiries" :key="inc.id" class="space-y-2">
                  <div class="flex items-start gap-2">
                    <div class="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0 text-[10px] font-black text-slate-400">Q</div>
                    <div class="flex-1 bg-slate-50 p-3 rounded-2xl rounded-tl-none">
                      <div class="flex justify-between mb-1">
                        <span class="text-[9px] font-black text-slate-700">{{ inc.inquirer_name }}</span>
                        <span class="text-[8px] text-slate-300">{{ new Date(inc.created_at).toLocaleDateString() }}</span>
                      </div>
                      <p class="text-xs text-slate-600 font-bold">{{ inc.content }}</p>
                    </div>
                  </div>
                  <div v-if="inc.answer" class="flex items-start gap-2 pl-6">
                    <div class="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center shrink-0 text-[10px] font-black text-white">A</div>
                    <div class="flex-1 bg-indigo-50 p-3 rounded-2xl rounded-tl-none border border-indigo-100">
                      <p class="text-xs text-indigo-700 font-black">{{ inc.answer }}</p>
                    </div>
                  </div>
                  <div v-if="!inc.answer && useAuthStore().user?.id === detailReservation.requester_id" class="pl-6 flex gap-2">
                    <input type="text" v-model="answerContents[inc.id]" placeholder="답변 입력..." class="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:ring-0" />
                    <button @click="submitAnswer(inc.id)" class="bg-indigo-600 text-white px-3 py-2 rounded-xl text-[10px] font-black">답변</button>
                  </div>
                </div>
                <div v-if="inquiries.length === 0" class="text-center py-4">
                  <p class="text-[10px] text-slate-300 font-black uppercase tracking-widest">No inquiries yet.</p>
                </div>
              </div>
              <div v-if="useAuthStore().user?.id !== detailReservation.requester_id" class="flex gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-100 focus-within:border-indigo-200 transition-colors">
                <input type="text" v-model="newInquiryContent" placeholder="예약자에게 문의할 내용..." class="flex-1 bg-transparent border-none px-3 py-2 text-xs font-bold text-slate-700 focus:ring-0 placeholder:text-slate-300" />
                <button @click="submitInquiryInDetail" class="bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black active:scale-95 transition-transform">전송</button>
              </div>
            </div>

            <!-- Footer: view mode -->
            <div class="flex flex-col gap-3">
              <div class="flex gap-3">
                <button @click="showDetailModal = false" class="flex-1 bg-slate-100 text-slate-900 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition-all">닫기</button>
                <button v-if="useAuthStore().user?.id === detailReservation.requester_id"
                        @click="startEdit"
                        class="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-100 active:scale-95 transition-all">
                  ✏️ 수정하기
                </button>
                <button v-else
                        @click="selectedReservation = detailReservation; showInquiryModal = true; showDetailModal = false"
                        class="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-100 active:scale-95 transition-all">
                  문의하기
                </button>
              </div>
              <button v-if="useAuthStore().user?.id === detailReservation.requester_id || useAuthStore().user?.roles?.includes('관리자')"
                      @click="cancelReservation(detailReservation.id)"
                      class="w-full bg-rose-50 text-rose-500 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-rose-100 transition-all border border-rose-100">
                🗑️ 예약 취소(삭제)
              </button>
            </div>
          </template>

          <!-- EDIT MODE -->
          <template v-else>
            <div class="space-y-4 animate-in slide-in-from-bottom-2 duration-200">
              <div class="bg-slate-50 p-5 rounded-2xl">
                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">신청명 (Title)</label>
                <input v-model="editForm.title" type="text" class="w-full bg-transparent border-none p-0 font-black text-slate-800 focus:ring-0 text-sm placeholder:text-slate-300" placeholder="신청명 입력" />
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div class="bg-slate-50 p-5 rounded-2xl">
                  <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">날짜</label>
                  <input v-model="editForm.reservation_date" type="date" class="w-full bg-transparent border-none p-0 font-black text-slate-800 focus:ring-0 text-sm" />
                </div>
                <div class="bg-slate-50 p-5 rounded-2xl">
                  <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">시간</label>
                  <div class="flex items-center gap-1">
                    <input v-model="editForm.start_time" type="time" class="bg-transparent border-none p-0 font-black text-slate-800 focus:ring-0 text-xs flex-1" />
                    <span class="text-slate-300 font-bold text-sm">~</span>
                    <input v-model="editForm.end_time" type="time" class="bg-transparent border-none p-0 font-black text-slate-800 focus:ring-0 text-xs flex-1" />
                  </div>
                </div>
              </div>
              <div class="bg-slate-50 p-5 rounded-2xl">
                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">사용 목적 (Reason)</label>
                <textarea v-model="editForm.reason" rows="3" class="w-full bg-transparent border-none p-0 font-bold text-slate-700 focus:ring-0 resize-none text-sm placeholder:text-slate-300" placeholder="사용 목적 입력"></textarea>
              </div>
            </div>
            <div class="flex gap-3 pt-2">
              <button @click="isEditing = false" class="flex-1 bg-slate-100 text-slate-700 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition-all">← 취소</button>
              <button @click="updateReservation" class="flex-1 bg-emerald-500 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-emerald-100 active:scale-95 transition-all">💾 저장하기</button>
            </div>
          </template>

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
