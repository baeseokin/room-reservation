<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import axios from 'axios'
import { 
  ChevronLeftIcon, ChevronRightIcon, 
  ChevronDoubleLeftIcon, ChevronDoubleRightIcon,
  CalendarIcon, MagnifyingGlassIcon,
  ListBulletIcon, ClockIcon, XMarkIcon,
  ChevronDownIcon, MapPinIcon, UsersIcon,
  ArrowPathIcon, CheckCircleIcon, XCircleIcon,
  PencilSquareIcon, ShieldExclamationIcon, ChatBubbleBottomCenterTextIcon,
  ExclamationCircleIcon
} from '@heroicons/vue/24/outline'
import { getHoliday } from '@/utils/holidays'
import { useModalStore } from '@/stores/useModalStore'

const emit = defineEmits(['updated'])
const modal = useModalStore()

const formatDate = (date) => {
  if (!date) return ''
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
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

const rooms = ref([])
const reservations = ref([])
const selectedDate = ref(formatDate(new Date()))
const viewMode = ref('calendar') // 'calendar' or 'list'
const calendarSubMode = ref('month') // 'month', 'week', 'day'
const searchQuery = ref('')
const statusFilter = ref('all')
const expandedFloors = ref([])
const isLoading = ref(false)

// Modals
const showDetailModal = ref(false)
const detailReservation = ref(null)
const isEditing = ref(false)
const showCancelConfirmModal = ref(false)
const cancelReason = ref('')
const cancelScope = ref('single') // 'single' or 'all'
const isCancelling = ref(false)
const isUpdating = ref(false)

// Edit Form
const editForm = ref({
  room_id: null,
  title: '',
  reservation_date: '',
  start_time: '09:00',
  end_time: '10:00',
  reason: '',
  admin_reason: ''
})

// Quick Calendar Dropdown Popover
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
  selectedDate.value = formatDate(date)
  showCalendar.value = false
}

const selectCalendarDateMonthView = (date) => {
  selectedDate.value = formatDate(date)
  calendarSubMode.value = 'day'
}

const selectWeekDateCell = (date) => {
  selectedDate.value = date
  calendarSubMode.value = 'day'
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

const changeDate = (days) => {
  const d = new Date(selectedDate.value + 'T00:00:00')
  if (calendarSubMode.value === 'month') {
    d.setMonth(d.getMonth() + days)
  } else if (calendarSubMode.value === 'week') {
    d.setDate(d.getDate() + (days * 7))
  } else {
    d.setDate(d.getDate() + days)
  }
  selectedDate.value = formatDate(d)
}

// Calendar Days generation
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

watch(selectedDate, (newVal) => {
  const d = new Date(newVal + 'T00:00:00')
  if (d.getFullYear() !== calendarDate.value.getFullYear() || d.getMonth() !== calendarDate.value.getMonth()) {
    calendarDate.value = new Date(d.getFullYear(), d.getMonth(), 1)
  }
})

const currentTime = ref(new Date())
setInterval(() => { currentTime.value = new Date() }, 60000)

const floors = computed(() => {
  const f = [...new Set(rooms.value.map(r => String(r.floor)))]
  const order = ['3', '1', 'B1', 'B2', 'B3']
  return f.sort((a, b) => {
    const idxA = order.indexOf(a)
    const idxB = order.indexOf(b)
    if (idxA !== -1 && idxB !== -1) return idxA - idxB
    if (idxA !== -1) return -1
    if (idxB !== -1) return 1
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

const isFloorExpanded = (floor) => expandedFloors.value.includes(floor)
const toggleFloor = (floor) => {
  const idx = expandedFloors.value.indexOf(floor)
  if (idx > -1) expandedFloors.value.splice(idx, 1)
  else expandedFloors.value.push(floor)
}

const formattedDisplayDate = computed(() => {
  const d = new Date(selectedDate.value)
  const weekDays = ['일', '월', '화', '수', '목', '금', '토']
  if (calendarSubMode.value === 'month') {
    return `${d.getFullYear()}. ${d.getMonth() + 1}`
  } else if (calendarSubMode.value === 'week') {
    const start = new Date(d)
    start.setDate(d.getDate() - d.getDay())
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    return `${start.getMonth() + 1}.${start.getDate()} (${weekDays[start.getDay()]}) - ${end.getMonth() + 1}.${end.getDate()} (${weekDays[end.getDay()]})`
  }
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()} (${weekDays[d.getDay()]})`
})

const weekDates = computed(() => {
  const d = new Date(selectedDate.value + 'T00:00:00')
  const start = new Date(d)
  start.setDate(d.getDate() - d.getDay())
  const dates = []
  for (let i = 0; i < 7; i++) {
    const day = new Date(start)
    day.setDate(start.getDate() + i)
    dates.push(formatDate(day))
  }
  return dates
})

const dayTimeSlots = computed(() => {
  const slots = []
  for (let h = 9; h <= 23; h++) {
    slots.push(`${h.toString().padStart(2, '0')}:00`)
  }
  slots.push('24:00')
  return slots
})

const timeOptions = computed(() => {
  const slots = []
  for (let h = 7; h <= 23; h++) {
    const hh = String(h).padStart(2, '0')
    slots.push(`${hh}:00`)
    slots.push(`${hh}:30`)
  }
  slots.push('24:00')
  return slots
})

// Fetch Data
const fetchData = async () => {
  isLoading.value = true
  try {
    let url = `/api/reservations?status=all`
    const d = new Date(selectedDate.value + 'T00:00:00')
    
    if (calendarSubMode.value === 'month') {
      const start = new Date(d.getFullYear(), d.getMonth(), 1)
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0)
      url += `&start_date=${formatDate(start)}&end_date=${formatDate(end)}`
    } else if (calendarSubMode.value === 'week') {
      const start = new Date(d)
      start.setDate(d.getDate() - d.getDay())
      const end = new Date(start)
      end.setDate(start.getDate() + 6)
      url += `&start_date=${formatDate(start)}&end_date=${formatDate(end)}`
    } else {
      url += `&date=${selectedDate.value}`
    }

    const [roomsRes, resvRes] = await Promise.all([
      axios.get('/api/rooms'),
      axios.get(url)
    ])
    rooms.value = roomsRes.data
    reservations.value = resvRes.data
    
    if (expandedFloors.value.length === 0 && roomsRes.data.length > 0) {
      expandedFloors.value = floors.value.filter(f => f !== '3')
    }
  } catch (err) {
    console.error('Failed to fetch calendar data:', err)
  } finally {
    isLoading.value = false
  }
}

watch([selectedDate, calendarSubMode, viewMode], fetchData)

const getReservationsForDate = (date) => {
  return reservations.value
    .filter(r => r.reservation_date === date && r.status !== 'cancelled' && r.status !== 'rejected')
    .sort((a, b) => a.start_time.localeCompare(b.start_time))
}

const getReservationsForRoomAndDate = (roomId, date) => {
  return reservations.value
    .filter(r => r.room_id === roomId && r.reservation_date === date && r.status !== 'cancelled' && r.status !== 'rejected')
    .sort((a, b) => a.start_time.localeCompare(b.start_time))
}

const getBlockedForRoomAndDate = (room, date) => {
  if (!room || !room.blocked_times) return []
  const d = new Date(date + 'T00:00:00')
  const dow = d.getDay()
  const dom = d.getDate()
  const nth = Math.ceil(dom / 7)
  
  return room.blocked_times.filter(bt => {
    if (bt.recurring_type === 'daily') return true
    if (bt.recurring_type === 'monthly_date') return bt.day_of_month == dom
    if (bt.recurring_type === 'monthly_nth') return bt.nth_week == nth && bt.day_of_week == dow
    return bt.day_of_week == dow
  })
}

const getBlockedStyle = (bt) => {
  const [startH, startM] = bt.start_time.split(':').map(Number)
  const [endH, endM] = bt.end_time.split(':').map(Number)
  const startDecimal = startH + startM / 60
  const endDecimal = endH + endM / 60
  const displayStart = 9
  const slotWidth = 80
  
  const left = (Math.max(displayStart, startDecimal) - displayStart) * slotWidth
  const width = (Math.min(24, endDecimal) - Math.max(displayStart, startDecimal)) * slotWidth
  
  if (width <= 0) return { display: 'none' }
  return {
    left: `${left}px`,
    width: `${width - 2}px`
  }
}

const getDayReservationStyle = (res) => {
  const [startH, startM] = res.start_time.split(':').map(Number)
  const [endH, endM] = res.end_time.split(':').map(Number)
  
  const startDecimal = startH + startM / 60
  const endDecimal = endH + endM / 60
  const displayStart = 9
  const displayEnd = 24
  const slotWidth = 80
  
  const left = (Math.max(displayStart, startDecimal) - displayStart) * slotWidth
  const width = (Math.min(displayEnd, endDecimal) - Math.max(displayStart, startDecimal)) * slotWidth
  
  if (width <= 0) return { display: 'none' }
  return {
    left: `${left}px`,
    width: `${width - 2}px`
  }
}

const isEnded = (res) => {
  const today = formatDate(new Date())
  if (res.reservation_date < today) return true
  if (res.reservation_date === today) {
    const [h, m] = res.end_time.split(':').map(Number)
    const nowH = currentTime.value.getHours()
    const nowM = currentTime.value.getMinutes()
    return (h < nowH) || (h === nowH && m <= nowM)
  }
  return false
}

// List View filtered items
const filteredItems = computed(() => {
  return reservations.value.filter(res => {
    if (statusFilter.value !== 'all' && res.status !== statusFilter.value) return false
    if (!searchQuery.value) return true
    const q = searchQuery.value.toLowerCase()
    return (
      res.title?.toLowerCase().includes(q) ||
      res.requester_name?.toLowerCase().includes(q) ||
      res.room_name?.toLowerCase().includes(q)
    )
  })
})

// Open Detail Modal
const openDetail = (res) => {
  detailReservation.value = { ...res }
  isEditing.value = false
  editForm.value = {
    room_id: res.room_id,
    title: res.title || '',
    reservation_date: formatDate(res.reservation_date),
    start_time: res.start_time.slice(0, 5),
    end_time: res.end_time.slice(0, 5),
    reason: res.reason || '',
    admin_reason: ''
  }
  showDetailModal.value = true
}

// Start Time Change Handler: automatically set end_time to +1 hour
const handleStartTimeChange = () => {
  if (!editForm.value.start_time) return
  const [hStr, mStr] = editForm.value.start_time.split(':')
  const h = parseInt(hStr, 10)
  const m = parseInt(mStr, 10)
  const nextH = Math.min(24, h + 1)
  const nextM = nextH === 24 ? 0 : m
  editForm.value.end_time = `${String(nextH).padStart(2, '0')}:${String(nextM).padStart(2, '0')}`
}

// Room reservations for the edited date & room
const roomReservations = ref([])
const isLoadingRoomReservations = ref(false)

const fetchRoomReservations = async () => {
  if (!editForm.value.room_id || !editForm.value.reservation_date) {
    roomReservations.value = []
    return
  }
  isLoadingRoomReservations.value = true
  try {
    const res = await axios.get('/api/reservations', {
      params: {
        date: editForm.value.reservation_date,
        room_id: editForm.value.room_id,
        status: 'all'
      }
    })
    roomReservations.value = res.data || []
  } catch (err) {
    console.error('Failed to fetch room reservations:', err)
  } finally {
    isLoadingRoomReservations.value = false
  }
}

watch(
  [() => editForm.value.room_id, () => editForm.value.reservation_date, isEditing],
  ([newRoom, newDate, editing]) => {
    if (editing && newRoom && newDate) {
      fetchRoomReservations()
    }
  }
)

const currentEditRoom = computed(() => {
  return rooms.value.find(r => r.id === editForm.value.room_id)
})

const existingRoomReservations = computed(() => {
  return roomReservations.value
    .filter(r => r.id !== detailReservation.value?.id && r.status !== 'cancelled')
    .sort((a, b) => a.start_time.localeCompare(b.start_time))
})

const existingBlockedTimes = computed(() => {
  if (!currentEditRoom.value || !editForm.value.reservation_date) return []
  return getBlockedForRoomAndDate(currentEditRoom.value, editForm.value.reservation_date)
})

const checkOverlap = (startA, endA, startB, endB) => {
  const sA = (startA || '').slice(0, 5)
  const eA = (endA || '').slice(0, 5)
  const sB = (startB || '').slice(0, 5)
  const eB = (endB || '').slice(0, 5)
  return sA < eB && eA > sB
}

const isReservationConflict = (r) => {
  if (r.status === 'cancelled' || r.status === 'rejected') return false
  if (!editForm.value.start_time || !editForm.value.end_time) return false
  return checkOverlap(r.start_time, r.end_time, editForm.value.start_time, editForm.value.end_time)
}

const isBlockedConflict = (bt) => {
  if (!editForm.value.start_time || !editForm.value.end_time) return false
  return checkOverlap(bt.start_time, bt.end_time, editForm.value.start_time, editForm.value.end_time)
}

const conflictingReservations = computed(() => {
  return existingRoomReservations.value.filter(r => isReservationConflict(r))
})

const conflictingBlockedTimes = computed(() => {
  return existingBlockedTimes.value.filter(bt => isBlockedConflict(bt))
})

const hasConflict = computed(() => {
  return conflictingReservations.value.length > 0 || conflictingBlockedTimes.value.length > 0
})

// Start Edit Mode
const startEdit = () => {
  editForm.value = {
    room_id: detailReservation.value.room_id,
    title: detailReservation.value.title || '',
    reservation_date: formatDate(detailReservation.value.reservation_date),
    start_time: detailReservation.value.start_time.slice(0, 5),
    end_time: detailReservation.value.end_time.slice(0, 5),
    reason: detailReservation.value.reason || '',
    admin_reason: ''
  }
  isEditing.value = true
  fetchRoomReservations()
}

// Save Edit & Send AlimTalk
const updateReservation = async () => {
  if (!editForm.value.title?.trim()) {
    modal.showAlert('신청명을 입력해 주세요.')
    return
  }
  if (editForm.value.start_time >= editForm.value.end_time) {
    modal.showAlert('종료 시간은 시작 시간보다 늦어야 합니다.')
    return
  }
  if (hasConflict.value) {
    modal.showAlert('선택한 시간에 이미 중복된 예약 또는 사용 불가 일정이 있습니다. 시간을 다시 확인해 주세요.')
    return
  }
  if (!editForm.value.admin_reason?.trim()) {
    modal.showAlert('신청자에게 알림톡으로 전송될 [변경 사유]를 반드시 입력해 주세요.')
    return
  }

  isUpdating.value = true
  try {
    await axios.put(`/api/reservations/${detailReservation.value.id}`, {
      room_id: editForm.value.room_id,
      title: editForm.value.title,
      reservation_date: editForm.value.reservation_date,
      start_time: editForm.value.start_time,
      end_time: editForm.value.end_time,
      reason: editForm.value.reason,
      admin_reason: editForm.value.admin_reason
    })

    modal.showAlert('예약이 성공적으로 변경되었으며, 신청자에게 카카오톡 알림톡이 발송되었습니다.')
    showDetailModal.value = false
    isEditing.value = false
    await fetchData()
    emit('updated')
  } catch (err) {
    console.error('Update reservation error:', err)
    modal.showAlert(err.response?.data?.message || '예약 변경 중 오류가 발생했습니다.')
  } finally {
    isUpdating.value = false
  }
}

// Open Cancel Dialog
const openCancelModal = () => {
  cancelReason.value = ''
  cancelScope.value = 'single'
  showCancelConfirmModal.value = true
}

// Confirm Cancel & Send AlimTalk
const confirmCancelReservation = async () => {
  if (!cancelReason.value?.trim()) {
    modal.showAlert('신청자에게 알림톡으로 전송될 [취소 사유]를 반드시 입력해 주세요.')
    return
  }

  isCancelling.value = true
  try {
    const res = await axios.patch(`/api/reservations/${detailReservation.value.id}/cancel`, {
      cancel_reason: cancelReason.value,
      cancel_scope: cancelScope.value
    })

    const count = res.data?.count || 1
    const successMsg = cancelScope.value === 'all' && count > 1
      ? `반복 예약 총 ${count}건이 성공적으로 취소되었으며, 신청자에게 카카오톡 알림톡이 발송되었습니다.`
      : '예약이 성공적으로 취소되었으며, 신청자에게 카카오톡 알림톡이 발송되었습니다.'
    modal.showAlert(successMsg)
    showCancelConfirmModal.value = false
    showDetailModal.value = false
    await fetchData()
    emit('updated')
  } catch (err) {
    console.error('Cancel reservation error:', err)
    modal.showAlert(err.response?.data?.message || '예약 취소 처리 중 오류가 발생했습니다.')
  } finally {
    isCancelling.value = false
  }
}

// Approve directly from Detail Modal
const approveFromDetail = async () => {
  if (!await modal.showConfirm('이 예약을 승인하시겠습니까? 신청자에게 알림톡이 발송됩니다.')) return
  try {
    await axios.patch(`/api/reservations/${detailReservation.value.id}/approve`)
    modal.showAlert('예약이 승인되었습니다.')
    showDetailModal.value = false
    await fetchData()
    emit('updated')
  } catch (err) {
    modal.showAlert(err.response?.data?.message || '승인 처리 중 오류가 발생했습니다.')
  }
}

const openReservationById = async (id) => {
  if (!id) return
  await nextTick()
  const found = reservations.value.find(r => String(r.id) === String(id))
  if (found) {
    selectedDate.value = formatDate(found.reservation_date)
    openReservationDetail(found)
  } else {
    try {
      const { data } = await axios.get('/api/reservations', { params: { status: 'all' } })
      const res = data.find(r => String(r.id) === String(id))
      if (res) {
        selectedDate.value = formatDate(res.reservation_date)
        await fetchData()
        openReservationDetail(res)
      }
    } catch (e) {
      console.error('Failed to open reservation by id:', e)
    }
  }
}

onMounted(fetchData)
defineExpose({ fetchData, openReservationById })
</script>

<template>
  <div class="flex flex-col bg-slate-50/50 rounded-3xl border border-slate-200/80 overflow-hidden shadow-xl shadow-slate-200/40">
    <!-- Header: Mode switch, SubMode, Date Picker -->
    <header class="bg-white border-b border-slate-200/70 px-3.5 sm:px-4 lg:px-6 py-2.5 sm:py-3.5 flex flex-nowrap justify-between items-center gap-2 sm:gap-4 overflow-x-auto scrollbar-none z-20">
      <!-- Left Controls -->
      <div class="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-nowrap">
        <!-- View Mode (Calendar/List) -->
        <div class="bg-slate-100 p-1 rounded-2xl flex gap-1 shadow-inner shrink-0">
          <button @click="viewMode = 'calendar'" 
                  :class="[viewMode === 'calendar' ? 'bg-white text-indigo-600 shadow-sm font-black' : 'text-slate-400 font-bold hover:text-slate-700']" 
                  class="px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl transition-all flex items-center gap-1 sm:gap-1.5 text-xs whitespace-nowrap">
            <CalendarIcon class="w-4 h-4 shrink-0" />
            <span>캘린더</span>
          </button>
          <button @click="viewMode = 'list'" 
                  :class="[viewMode === 'list' ? 'bg-white text-indigo-600 shadow-sm font-black' : 'text-slate-400 font-bold hover:text-slate-700']" 
                  class="px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl transition-all flex items-center gap-1 sm:gap-1.5 text-xs whitespace-nowrap">
            <ListBulletIcon class="w-4 h-4 shrink-0" />
            <span>목록형</span>
          </button>
        </div>

        <!-- Month, Week, Day Toggles (Calendar mode) -->
        <div v-if="viewMode === 'calendar'" class="bg-slate-100 p-1 rounded-2xl flex gap-0.5 sm:gap-1 shadow-inner shrink-0">
          <button v-for="m in ['month', 'week', 'day']" :key="m" @click="calendarSubMode = m"
                  :class="[calendarSubMode === m ? 'bg-white text-indigo-600 shadow-sm font-black' : 'text-slate-500 font-bold hover:text-slate-800']"
                  class="px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl transition-all text-xs uppercase tracking-tight whitespace-nowrap">
            {{ m === 'month' ? '월' : m === 'week' ? '주' : '일' }}
          </button>
        </div>

        <!-- Date Navigator -->
        <div class="flex items-center bg-white border border-slate-200 rounded-2xl shadow-sm p-0.5 shrink-0">
          <button @click="changeDate(-1)" class="p-1.5 sm:p-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-400 hover:text-slate-700 shrink-0">
            <ChevronLeftIcon class="w-4 h-4" />
          </button>
          
          <button @click="toggleCalendar" class="px-2.5 sm:px-3.5 py-1 sm:py-1.5 flex items-center gap-1.5 sm:gap-2 group hover:bg-slate-50 rounded-xl transition-colors whitespace-nowrap">
            <span class="text-xs sm:text-sm font-black text-slate-900 group-hover:text-indigo-600">{{ formattedDisplayDate }}</span>
            <span v-if="calendarSubMode === 'day' && getHoliday(selectedDate)" class="px-2 py-0.5 bg-rose-100 text-rose-600 rounded-md text-[0.6875rem] font-black uppercase whitespace-nowrap">
              {{ getHoliday(selectedDate) }}
            </span>
            <CalendarIcon class="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors shrink-0" />
          </button>

          <button @click="changeDate(1)" class="p-1.5 sm:p-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-400 hover:text-slate-700 shrink-0">
            <ChevronRightIcon class="w-4 h-4" />
          </button>
        </div>

        <button @click="selectedDate = formatDate(new Date())" 
                class="px-2.5 sm:px-3.5 py-1.5 sm:py-2 bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white text-xs font-black rounded-2xl transition-all shadow-sm active:scale-95 uppercase whitespace-nowrap shrink-0">
          Today
        </button>
      </div>

      <!-- Right Controls: Legend & Refresh -->
      <div class="flex items-center gap-2.5 sm:gap-4 shrink-0">
        <div class="flex items-center gap-2 sm:gap-3 text-xs font-bold text-slate-500 whitespace-nowrap shrink-0">
          <div class="flex items-center gap-1 sm:gap-1.5 shrink-0 whitespace-nowrap">
            <span class="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-indigo-600 rounded-md shadow-sm shrink-0"></span>
            <span class="whitespace-nowrap">승인완료</span>
          </div>
          <div class="flex items-center gap-1 sm:gap-1.5 shrink-0 whitespace-nowrap">
            <span class="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-amber-500 rounded-md shadow-sm shrink-0"></span>
            <span class="whitespace-nowrap">승인대기</span>
          </div>
          <div class="flex items-center gap-1 sm:gap-1.5 shrink-0 whitespace-nowrap">
            <span class="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-slate-300 rounded-md shadow-sm shrink-0"></span>
            <span class="whitespace-nowrap">종료됨</span>
          </div>
        </div>

        <button @click="fetchData" class="p-1.5 sm:p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors shrink-0" title="새로고침">
          <ArrowPathIcon class="w-4 h-4" :class="{ 'animate-spin': isLoading }" />
        </button>
      </div>
    </header>

    <!-- Main Content Area -->
    <main class="flex-1 overflow-auto relative bg-white min-h-[620px]">
      <!-- Calendar View -->
      <div v-if="viewMode === 'calendar'" class="h-full flex flex-col">
        <!-- Month View -->
        <div v-if="calendarSubMode === 'month'" class="flex-1 overflow-auto px-6 py-5">
          <!-- Weekday Header -->
          <div class="sticky top-0 z-30 bg-white pb-2">
            <div class="grid grid-cols-7 gap-px bg-slate-200 border border-slate-200 rounded-t-2xl shadow-sm overflow-hidden">
              <div v-for="(d, i) in ['일', '월', '화', '수', '목', '금', '토']" :key="d" 
                   :class="[
                     i === 0 ? 'text-rose-600' : 
                     i === 6 ? 'text-blue-600' : 
                     'text-slate-800'
                   ]"
                   class="bg-indigo-50/60 py-3 text-center text-xs font-black uppercase tracking-widest border-b border-indigo-100">
                {{ d }}
              </div>
            </div>
          </div>

          <!-- Month Days Grid -->
          <div class="grid grid-cols-7 gap-px bg-slate-200 border-x border-b border-slate-200 rounded-b-2xl shadow-sm overflow-hidden">
            <div v-for="(d, idx) in calendarDays" :key="idx" 
                 @click="selectCalendarDateMonthView(d.date)"
                 :class="[
                   d.current ? 'bg-white' : 'bg-slate-50/60', 
                   selectedDate === formatDate(d.date) ? 'ring-2 ring-inset ring-indigo-500 z-10' : '',
                   'cursor-pointer hover:bg-indigo-50/30'
                 ]"
                 class="min-h-[130px] p-2.5 transition-colors group">
              <div class="flex justify-between items-start mb-1.5">
                <div class="flex items-center gap-1.5">
                  <span :class="[
                          d.current ? 'text-slate-900' : 'text-slate-300', 
                          d.date.getDay() === 0 || getHoliday(formatDate(d.date)) ? (d.current ? 'text-rose-500' : 'text-rose-300') : 
                          d.date.getDay() === 6 ? (d.current ? 'text-blue-500' : 'text-blue-300') : ''
                        ]" 
                        class="text-xs font-black">{{ d.day }}</span>
                  <span v-if="getHoliday(formatDate(d.date))" 
                        :class="d.current ? 'text-rose-500' : 'text-rose-300'"
                        class="text-[0.625rem] font-bold truncate max-w-[70px]">{{ getHoliday(formatDate(d.date)) }}</span>
                </div>
              </div>
              <div class="space-y-1">
                <div v-for="res in getReservationsForDate(formatDate(d.date)).slice(0, 4)" :key="res.id"
                     @click.stop="openDetail(res)"
                     :class="[
                       isEnded(res) ? 'bg-slate-200 text-slate-700 shadow-sm border border-slate-300' : 
                       res.status === 'pending' ? 'bg-amber-500 text-white shadow-md' : 'bg-indigo-600 text-white shadow-md'
                     ]"
                     class="text-[0.6875rem] font-bold px-1.5 py-0.5 rounded-lg truncate cursor-pointer hover:opacity-85 transition-all">
                  <span v-if="res.status === 'pending'" class="text-[0.5625rem] bg-white/30 px-1 py-0.2 rounded mr-1">대기</span>
                  {{ res.start_time.slice(0,5) }} [{{ res.room_name?.split(' ')[0] }}] {{ res.title || '예약' }}
                </div>
                <div v-if="getReservationsForDate(formatDate(d.date)).length > 4" class="text-[0.625rem] font-black text-slate-400 pl-1 mt-0.5">
                  + {{ getReservationsForDate(formatDate(d.date)).length - 4 }}개
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Week View -->
        <div v-else-if="calendarSubMode === 'week'" class="flex-1 overflow-hidden px-6 py-5">
          <div class="h-full border border-slate-200 rounded-3xl overflow-auto shadow-sm bg-white relative">
            <div class="inline-flex flex-col min-w-full">
              <!-- Sticky Header Row -->
              <div class="flex sticky top-0 z-[60]">
                <!-- Corner Header -->
                <div class="w-44 sticky left-0 z-[70] bg-indigo-50 border-r border-b border-indigo-200 flex items-center justify-center px-4 h-12">
                  <span class="text-xs font-black text-slate-800 uppercase tracking-widest">공간 목록</span>
                </div>
                <!-- Week Dates Header -->
                <div class="flex-1 flex bg-indigo-50/60 border-b border-indigo-200 h-12">
                  <div v-for="(date, idx) in weekDates" :key="date" 
                       class="flex-1 min-w-[140px] border-r border-slate-200 flex items-center justify-center gap-2">
                    <div class="flex items-center gap-1.5">
                      <span :class="[idx === 0 || getHoliday(date) ? 'text-rose-500' : idx === 6 ? 'text-blue-500' : 'text-slate-600']" 
                            class="text-xs font-black uppercase">{{ ['일', '월', '화', '수', '목', '금', '토'][idx] }}</span>
                      <span :class="[date === formatDate(new Date()) ? 'text-indigo-600 underline decoration-2' : idx === 0 || getHoliday(date) ? 'text-rose-500' : idx === 6 ? 'text-blue-500' : 'text-slate-900']" 
                            class="text-sm font-black">{{ date.split('-')[2] }}</span>
                    </div>
                    <span v-if="getHoliday(date)" class="text-[0.625rem] font-bold text-rose-500 truncate max-w-[60px]">{{ getHoliday(date) }}</span>
                  </div>
                </div>
              </div>

              <!-- Content Rows by Floor -->
              <template v-for="floor in floors" :key="'week-floor-' + floor">
                <!-- Floor Sticky Header Row -->
                <div class="flex sticky top-12 z-[50]">
                  <div class="w-44 sticky left-0 z-[55] bg-slate-900 border-r border-b border-slate-800 h-10 px-4 flex items-center justify-between shadow-md">
                    <span class="text-xs font-black text-white uppercase tracking-widest">{{ floor.includes('B') ? floor : floor + 'F' }}</span>
                    <button @click="toggleFloor(floor)" class="p-1 hover:bg-white/10 rounded transition-colors">
                      <ChevronDownIcon :class="{'rotate-180': !isFloorExpanded(floor)}" class="w-3.5 h-3.5 text-slate-400 transition-transform" />
                    </button>
                  </div>
                  <div class="flex-1 flex bg-slate-50 border-b border-slate-200 h-10">
                    <div v-for="date in weekDates" :key="'floor-pad-' + date" class="flex-1 min-w-[140px] border-r border-slate-200"></div>
                  </div>
                </div>

                <!-- Room Rows -->
                <template v-if="isFloorExpanded(floor)">
                  <div v-for="room in roomsByFloor[floor]" :key="'week-room-row-' + room.id" class="flex border-b border-slate-100 group">
                    <!-- Sticky Room Sidebar -->
                    <div class="w-44 sticky left-0 z-30 bg-slate-50 border-r border-slate-200 group-hover:bg-indigo-50/50 transition-colors h-36 px-4 flex items-center justify-center text-center">
                      <span class="text-xs font-black text-slate-800 line-clamp-2">{{ room.room_name }}</span>
                    </div>
                    <!-- Cells Grid -->
                    <div class="flex-1 flex">
                      <div v-for="date in weekDates" :key="'cell-' + room.id + '-' + date" 
                           @click="selectWeekDateCell(date)"
                           class="flex-1 min-w-[140px] border-r border-slate-200 p-2 space-y-1 overflow-hidden transition-colors hover:bg-slate-50/60 cursor-pointer">
                        <!-- Blocked Times -->
                        <div v-for="bt in getBlockedForRoomAndDate(room, date)" :key="'bt-' + bt.id"
                             class="text-[0.625rem] font-black px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-dashed border-rose-300 truncate">
                          [예약불가] {{ bt.start_time.slice(0,5) }}~{{ bt.end_time.slice(0,5) }}
                        </div>

                        <!-- Reservations -->
                        <div v-for="res in getReservationsForRoomAndDate(room.id, date).slice(0, 4)" :key="res.id"
                             @click.stop="openDetail(res)"
                             :class="[
                               isEnded(res) ? 'bg-slate-200 text-slate-700 border border-slate-300 shadow-sm' : 
                               res.status === 'pending' ? 'bg-amber-500 text-white shadow-md' : 'bg-indigo-600 text-white shadow-md'
                             ]"
                             class="text-[0.6875rem] font-bold px-1.5 py-1 rounded-lg truncate transition-all hover:scale-[1.01]">
                          <span v-if="res.status === 'pending'" class="mr-1 text-[0.5625rem] font-bold bg-white/30 px-1 py-0.2 rounded">대기</span>
                          ({{ res.start_time.slice(0,5) }}) {{ res.title || '예약' }}
                        </div>
                        <div v-if="getReservationsForRoomAndDate(room.id, date).length + getBlockedForRoomAndDate(room, date).length > 4" class="text-[0.625rem] font-black text-slate-400 px-1">
                          + {{ getReservationsForRoomAndDate(room.id, date).length + getBlockedForRoomAndDate(room, date).length - 4 }}개
                        </div>
                      </div>
                    </div>
                  </div>
                </template>
              </template>
            </div>
          </div>
        </div>

        <!-- Day View -->
        <div v-else-if="calendarSubMode === 'day'" class="flex-1 overflow-hidden px-6 py-5">
          <div class="h-full border border-slate-200 rounded-3xl overflow-auto shadow-sm bg-white relative">
            <div class="inline-flex flex-col min-w-full">
              <!-- Sticky Header Row -->
              <div class="flex sticky top-0 z-[60]">
                <!-- Corner Header -->
                <div class="w-44 sticky left-0 z-[70] bg-indigo-50 border-r border-b border-indigo-200 flex items-center justify-center px-4 h-12">
                  <span class="text-xs font-black text-slate-800 uppercase tracking-widest">공간 목록</span>
                </div>
                <!-- Time Slots Header -->
                <div class="flex-1 flex bg-indigo-50/60 border-b border-indigo-200 h-12">
                  <div v-for="time in dayTimeSlots" :key="'day-time-' + time" 
                       class="w-[80px] shrink-0 h-full flex items-center justify-center border-r border-slate-200">
                     <span class="text-xs font-black text-slate-700">{{ time }}</span>
                  </div>
                </div>
              </div>

              <!-- Content Rows by Floor -->
              <template v-for="floor in floors" :key="'day-floor-' + floor">
                <!-- Floor Sticky Header Row -->
                <div class="flex sticky top-12 z-[50]">
                  <div class="w-44 sticky left-0 z-[55] bg-slate-900 border-r border-b border-slate-800 h-10 px-4 flex items-center justify-between shadow-md">
                    <span class="text-xs font-black text-white uppercase tracking-widest">{{ floor.includes('B') ? floor : floor + 'F' }}</span>
                    <button @click="toggleFloor(floor)" class="p-1 hover:bg-white/10 rounded transition-colors">
                      <ChevronDownIcon :class="{'rotate-180': !isFloorExpanded(floor)}" class="w-3.5 h-3.5 text-slate-400 transition-transform" />
                    </button>
                  </div>
                  <div class="flex-1 flex bg-slate-50 border-b border-slate-200 h-10">
                    <div v-for="time in dayTimeSlots" :key="'day-floor-pad-' + time" class="w-[80px] shrink-0 border-r border-slate-200"></div>
                  </div>
                </div>

                <!-- Room Rows -->
                <template v-if="isFloorExpanded(floor)">
                  <div v-for="room in roomsByFloor[floor]" :key="'day-room-row-' + room.id" class="flex border-b border-slate-100 relative group">
                    <!-- Sticky Room Sidebar -->
                    <div class="w-44 sticky left-0 z-30 bg-slate-50 border-r border-slate-200 group-hover:bg-indigo-50/50 transition-colors h-36 px-4 flex items-center justify-center text-center">
                      <span class="text-xs font-black text-slate-800 line-clamp-2">{{ room.room_name }}</span>
                    </div>
                    <!-- Timeline Grid Area -->
                    <div class="flex-1 relative h-36">
                      <div class="absolute inset-0 flex">
                        <div v-for="time in dayTimeSlots" :key="'cell-' + room.id + '-' + time" 
                             class="w-[80px] shrink-0 h-full border-r border-slate-100 relative">
                        </div>
                      </div>

                      <!-- Blocked Areas -->
                      <div class="absolute inset-0 pointer-events-none">
                        <div v-for="bt in getBlockedForRoomAndDate(room, selectedDate)" :key="'day-bt-' + bt.id"
                             :style="getBlockedStyle(bt)"
                             class="absolute top-2 bottom-2 bg-rose-100/90 border border-rose-300 z-10 flex items-center justify-center overflow-hidden rounded-xl stripe-bg">
                          <span class="text-[0.625rem] font-black text-rose-800 uppercase tracking-tighter whitespace-nowrap rotate-[-10deg]">
                            {{ bt.reason || '예약 불가' }}
                          </span>
                        </div>
                      </div>

                      <!-- Reservations Stack -->
                      <div class="absolute inset-0 pointer-events-none">
                        <template v-for="(res, rIdx) in getReservationsForRoomAndDate(room.id, selectedDate).slice(0, 4)" :key="res.id">
                          <div @click.stop="openDetail(res)"
                               :style="{ ...getDayReservationStyle(res), top: (8 + rIdx * 30) + 'px' }"
                               :class="[
                                 isEnded(res) ? 'bg-slate-200 text-slate-700 border border-slate-300 shadow-sm' : 
                                 res.status === 'pending' ? 'bg-amber-500 text-white shadow-md' : 'bg-indigo-600 text-white shadow-md'
                               ]"
                               class="absolute h-7 rounded-lg flex items-center px-2.5 text-xs font-bold truncate z-20 pointer-events-auto cursor-pointer hover:scale-[1.02] transition-transform">
                            <span v-if="res.status === 'pending'" class="mr-1 text-[0.5625rem] font-bold bg-white/30 px-1.5 py-0.2 rounded-full">대기</span>
                            {{ res.title || '예약' }}
                          </div>
                        </template>
                      </div>
                    </div>
                  </div>
                </template>
              </template>
            </div>
          </div>
        </div>
      </div>

      <!-- List View -->
      <div v-else class="p-6 max-w-6xl mx-auto space-y-6">
        <div class="flex flex-col md:flex-row gap-4 justify-between items-center bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div class="flex p-1 bg-slate-100 rounded-xl overflow-x-auto">
            <button v-for="s in [
              { id: 'all', name: '전체' }, 
              { id: 'approved', name: '승인완료' }, 
              { id: 'pending', name: '승인대기' },
              { id: 'cancelled', name: '취소' },
              { id: 'rejected', name: '반려' }
            ]" :key="s.id" 
                    @click="statusFilter = s.id"
                    :class="[statusFilter === s.id ? 'bg-white text-indigo-600 shadow-sm font-black' : 'text-slate-500 font-bold']"
                    class="px-4 py-1.5 rounded-lg text-xs transition-all whitespace-nowrap">
              {{ s.name }}
            </button>
          </div>
          <!-- Search -->
          <div class="relative w-full md:w-72">
            <MagnifyingGlassIcon class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" v-model="searchQuery" placeholder="신청명, 공간명, 신청자 검색..." 
                   class="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs font-bold text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20" />
          </div>
        </div>

        <div v-if="filteredItems.length === 0" class="py-20 text-center border-2 border-dashed border-slate-200 rounded-3xl">
          <CalendarIcon class="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p class="text-sm font-black text-slate-400">조건에 부합하는 예약 내역이 없습니다.</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div v-for="res in filteredItems" :key="'list-res-' + res.id" @click="openDetail(res)"
               :class="[
                 isEnded(res) ? 'bg-slate-50 border-slate-200 opacity-60' : 'bg-white border-slate-200 hover:border-indigo-500 hover:shadow-md'
               ]"
               class="border rounded-2xl p-5 transition-all cursor-pointer group flex flex-col justify-between">
            <div>
              <div class="flex justify-between items-start mb-2">
                <span class="bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-lg text-xs font-black">
                  {{ res.floor }}{{ String(res.floor).includes('B') ? '' : 'F' }} · {{ res.room_name }}
                </span>
                <span :class="[
                        res.status === 'approved' ? 'bg-indigo-600 text-white' : 
                        res.status === 'pending' ? 'bg-amber-500 text-white' : 
                        res.status === 'cancelled' ? 'bg-slate-400 text-white' : 
                        res.status === 'rejected' ? 'bg-rose-500 text-white' : 'bg-slate-200 text-slate-700'
                      ]" 
                      class="px-2 py-0.5 rounded-md text-[0.6875rem] font-black">
                  {{ 
                    res.status === 'approved' ? '승인' : 
                    res.status === 'pending' ? '대기' : 
                    res.status === 'cancelled' ? '취소' : 
                    res.status === 'rejected' ? '반려' : res.status 
                  }}
                </span>
              </div>
              <h3 class="text-sm font-black text-slate-900 mt-2 mb-1 group-hover:text-indigo-600 transition-colors">
                {{ res.title || '(신청명 없음)' }}
              </h3>
              <p class="text-xs font-bold text-slate-500">
                {{ res.reservation_date }} · {{ res.start_time?.slice(0,5) }} ~ {{ res.end_time?.slice(0,5) }}
              </p>
            </div>
            <div class="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-xs text-slate-400 font-bold">
              <span>신청자: {{ res.requester_name }}</span>
              <span v-if="res.requester_phone">{{ res.requester_phone }}</span>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Quick Date Calendar Popover -->
    <Teleport to="body">
      <div v-if="showCalendar" class="fixed inset-0 z-[1000]" @click="showCalendar = false"></div>
      <div v-if="showCalendar" :style="{ top: (calendarPosition.top + 8) + 'px', left: calendarPosition.left + 'px' }" 
           class="fixed z-[1001] bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 w-[320px] animate-in fade-in duration-150">
         <div class="flex justify-between items-center mb-4">
           <div class="flex items-center gap-2">
             <h4 class="text-sm font-black text-slate-900">{{ calendarDate.getFullYear() }}년 {{ calendarDate.getMonth() + 1 }}월</h4>
             <button @click.stop="selectCalendarDate(new Date())" class="text-[0.6875rem] font-black bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">TODAY</button>
           </div>
           <div class="flex gap-1">
             <button @click.stop="moveCalendarYear(-1)" class="p-1.5 text-slate-400 hover:text-slate-800"><ChevronDoubleLeftIcon class="w-3.5 h-3.5" /></button>
             <button @click.stop="moveCalendarMonth(-1)" class="p-1.5 text-slate-400 hover:text-slate-800"><ChevronLeftIcon class="w-4 h-4" /></button>
             <button @click.stop="moveCalendarMonth(1)" class="p-1.5 text-slate-400 hover:text-slate-800"><ChevronRightIcon class="w-4 h-4" /></button>
             <button @click.stop="moveCalendarYear(1)" class="p-1.5 text-slate-400 hover:text-slate-800"><ChevronDoubleRightIcon class="w-3.5 h-3.5" /></button>
           </div>
         </div>
         <div class="grid grid-cols-7 gap-1 mb-2">
           <div v-for="d in ['일', '월', '화', '수', '목', '금', '토']" :key="d" class="text-[0.6875rem] font-black text-slate-300 text-center uppercase">{{ d }}</div>
         </div>
         <div class="grid grid-cols-7 gap-1">
           <button v-for="(d, idx) in calendarDays" :key="idx" @click.stop="selectCalendarDate(d.date)"
                   :class="[d.current ? 'text-slate-700' : 'text-slate-300', selectedDate === formatDate(d.date) ? 'bg-indigo-600 text-white font-black shadow-md' : 'hover:bg-slate-50 font-bold']"
                   class="aspect-square flex items-center justify-center text-xs rounded-xl transition-all">{{ d.day }}</button>
         </div>
      </div>
    </Teleport>

    <!-- Modal: Detail / Edit / Cancel with Kakao AlimTalk -->
    <Teleport to="body">
      <div v-if="showDetailModal" class="fixed inset-0 z-[2000] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" @click="showDetailModal = false"></div>
        <div class="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl border border-white overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
          
          <!-- Modal Top Header -->
          <div class="bg-slate-900 px-8 py-7 text-white relative">
            <button @click="showDetailModal = false" class="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full transition-colors">
              <XMarkIcon class="w-6 h-6 text-slate-400 hover:text-white" />
            </button>
            
            <div class="flex items-center gap-2.5 mb-2">
              <span class="bg-indigo-600 px-2.5 py-0.5 rounded-lg text-xs font-black uppercase tracking-wider">
                {{ detailReservation?.floor }}{{ String(detailReservation?.floor).includes('B') ? '' : 'F' }}
              </span>
              <span class="text-indigo-300 text-sm font-black">{{ detailReservation?.room_name }}</span>
              <span :class="[
                      detailReservation?.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 
                      detailReservation?.status === 'pending' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 
                      'bg-slate-700 text-slate-300 border-slate-600'
                    ]" 
                    class="px-2.5 py-0.5 rounded-full text-xs font-black border ml-auto mr-8">
                {{ detailReservation?.status === 'approved' ? '승인완료' : detailReservation?.status === 'pending' ? '승인대기' : detailReservation?.status === 'cancelled' ? '취소됨' : detailReservation?.status }}
              </span>
            </div>

            <div v-if="isEditing">
              <input type="text" v-model="editForm.title" 
                     placeholder="신청명을 입력하세요"
                     class="w-full bg-white/10 border-b border-white/20 focus:border-indigo-400 focus:outline-none text-xl font-black text-white p-2 rounded-xl mt-1 placeholder:text-white/40" />
            </div>
            <h2 v-else class="text-xl font-black tracking-tight text-white mt-1">
              {{ detailReservation?.title || '(제목 없음)' }}
            </h2>
          </div>

          <!-- Modal Body -->
          <div class="px-8 py-6 space-y-6 overflow-y-auto max-h-[75vh]">
            <!-- Normal View Mode -->
            <template v-if="!isEditing">
              <!-- Date & Time Info Box -->
              <div class="p-5 bg-slate-50 rounded-2xl border border-slate-100 grid grid-cols-2 gap-4">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-xs">
                    <CalendarIcon class="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <span class="text-[0.6875rem] font-black text-slate-400 uppercase tracking-widest block">예약 날짜</span>
                    <span class="text-sm font-black text-slate-900">{{ detailReservation?.reservation_date }}</span>
                  </div>
                </div>

                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-xs">
                    <ClockIcon class="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <span class="text-[0.6875rem] font-black text-slate-400 uppercase tracking-widest block">예약 시간</span>
                    <span class="text-sm font-black text-slate-900">{{ detailReservation?.start_time?.slice(0,5) }} ~ {{ detailReservation?.end_time?.slice(0,5) }}</span>
                  </div>
                </div>
              </div>

              <!-- Requester Info -->
              <div class="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <div class="text-[0.6875rem] font-black text-slate-400 uppercase tracking-widest">신청자 정보</div>
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <span class="text-xs text-slate-400 block font-bold">성명</span>
                    <span class="text-sm font-black text-slate-900">{{ detailReservation?.requester_name }}</span>
                  </div>
                  <div>
                    <span class="text-xs text-slate-400 block font-bold">연락처</span>
                    <span class="text-sm font-black text-slate-900">{{ detailReservation?.requester_phone || '미기재' }}</span>
                  </div>
                </div>
              </div>

              <!-- Reason / Purpose -->
              <div class="space-y-1.5">
                <span class="text-[0.6875rem] font-black text-slate-400 uppercase tracking-widest">사용 목적 / 상세 내용</span>
                <div class="text-xs font-bold text-slate-700 bg-slate-50 p-4 rounded-2xl border border-slate-100 whitespace-pre-wrap leading-relaxed">
                  {{ detailReservation?.reason || '상세 사유가 없습니다.' }}
                </div>
              </div>

              <!-- 변경이력 (처리 시간, 사유 시간 오름차순 표시) -->
              <div v-if="getSortedChangeLogs(detailReservation).length > 0" class="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                <span class="text-xs font-black text-slate-700 flex items-center gap-1.5">
                  <ClockIcon class="w-4 h-4 text-indigo-600" />
                  변경이력
                </span>
                <div class="space-y-2">
                  <div 
                    v-for="(log, idx) in getSortedChangeLogs(detailReservation)" 
                    :key="log.id || idx"
                    class="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs space-y-1"
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
            </template>

            <!-- Edit Mode -->
            <template v-else>
              <div class="space-y-4">
                <!-- Room Selector -->
                <div>
                  <label class="text-xs font-black text-slate-500 uppercase tracking-wider block mb-1">공간 선택</label>
                  <select v-model="editForm.room_id" class="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-sm font-black text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20">
                    <option v-for="rm in rooms" :key="rm.id" :value="rm.id">
                      [{{ rm.floor }}{{ String(rm.floor).includes('B') ? '' : 'F' }}] {{ rm.room_name }} (정원 {{ rm.capacity }}명)
                    </option>
                  </select>
                </div>

                <!-- Date & Times -->
                <div class="grid grid-cols-3 gap-3">
                  <div>
                    <label class="text-xs font-black text-slate-500 uppercase tracking-wider block mb-1">예약일</label>
                    <input type="date" v-model="editForm.reservation_date" class="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 text-xs font-black text-slate-800 outline-none" />
                  </div>
                  <div>
                    <label class="text-xs font-black text-slate-500 uppercase tracking-wider block mb-1">시작 시간</label>
                    <select v-model="editForm.start_time" @change="handleStartTimeChange" class="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 text-xs font-black text-slate-800 outline-none">
                      <option v-for="t in timeOptions" :key="'start-' + t" :value="t">{{ t }}</option>
                    </select>
                  </div>
                  <div>
                    <label class="text-xs font-black text-slate-500 uppercase tracking-wider block mb-1">종료 시간</label>
                    <select v-model="editForm.end_time" class="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 text-xs font-black text-slate-800 outline-none">
                      <option v-for="t in timeOptions" :key="'end-' + t" :value="t">{{ t }}</option>
                    </select>
                  </div>
                </div>

                <!-- 해당일 & 해당 공간 기존 예약 및 중복 현황 박스 -->
                <div class="rounded-2xl border p-4 space-y-3 transition-colors"
                     :class="hasConflict ? 'border-rose-300 bg-rose-50/40' : 'border-slate-200 bg-slate-50/80'">
                  
                  <div class="flex items-center justify-between gap-2">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="text-xs font-black text-slate-800 flex items-center gap-1.5">
                        <ClockIcon class="w-4 h-4 text-indigo-600" />
                        해당 공간 예약 현황
                      </span>
                      <span class="text-[0.6875rem] font-bold text-slate-400">
                        {{ editForm.reservation_date }} · {{ currentEditRoom?.room_name }}
                      </span>
                    </div>

                    <!-- Status summary pill -->
                    <div>
                      <span v-if="isLoadingRoomReservations" class="text-[0.6875rem] font-bold text-slate-400 flex items-center gap-1">
                        <ArrowPathIcon class="w-3.5 h-3.5 animate-spin" /> 조회 중...
                      </span>
                      <span v-else-if="hasConflict" class="px-2.5 py-1 bg-rose-500 text-white rounded-lg text-[0.6875rem] font-black flex items-center gap-1 shadow-sm">
                        <ExclamationCircleIcon class="w-3.5 h-3.5" /> 시간 중복 발생!
                      </span>
                      <span v-else-if="existingRoomReservations.length > 0 || existingBlockedTimes.length > 0" class="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[0.6875rem] font-black flex items-center gap-1">
                        <CheckCircleIcon class="w-3.5 h-3.5" /> 예약 가능 (중복 없음)
                      </span>
                      <span v-else class="px-2.5 py-1 bg-slate-100 text-slate-500 rounded-lg text-[0.6875rem] font-bold">
                        예약 없음 (전 시간 가능)
                      </span>
                    </div>
                  </div>

                  <!-- Conflict Alert Banner -->
                  <div v-if="hasConflict" class="p-3 bg-rose-100/90 border border-rose-300 rounded-xl text-xs font-bold text-rose-800 flex items-start gap-2 animate-pulse">
                    <ExclamationCircleIcon class="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div class="leading-relaxed">
                      선택하신 시간(<strong class="font-black text-rose-950">{{ editForm.start_time }} ~ {{ editForm.end_time }}</strong>)에 이미 기존 일정과 <strong>시간이 중복</strong>됩니다. 시간을 조정해 주세요.
                    </div>
                  </div>

                  <!-- Reservation / Blocked Times List -->
                  <div class="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                    <!-- If no bookings on that day -->
                    <div v-if="existingRoomReservations.length === 0 && existingBlockedTimes.length === 0 && !isLoadingRoomReservations" 
                         class="text-center py-3 text-xs font-bold text-slate-400 bg-white/70 rounded-xl border border-dashed border-slate-200">
                      해당 일자에 등록된 다른 예약 일정이 없습니다.
                    </div>

                    <!-- Blocked Times list -->
                    <div v-for="bt in existingBlockedTimes" :key="'bt-' + bt.id"
                         :class="isBlockedConflict(bt) ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-400/20' : 'bg-white border-slate-200/80'"
                         class="p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs transition-all">
                      <div class="flex items-center gap-2 min-w-0">
                        <span class="px-2 py-0.5 rounded-md text-[0.625rem] font-black bg-rose-100 text-rose-700 border border-rose-200 shrink-0">
                          고정일정
                        </span>
                        <span class="font-black text-slate-800 shrink-0">
                          {{ bt.start_time.slice(0, 5) }} ~ {{ bt.end_time.slice(0, 5) }}
                        </span>
                        <span class="text-slate-500 font-medium truncate">
                          {{ bt.reason || '사용 불가 일정' }}
                        </span>
                      </div>
                      <span v-if="isBlockedConflict(bt)" class="px-2 py-0.5 bg-rose-600 text-white rounded-md text-[0.625rem] font-black shrink-0">
                        시간 중복
                      </span>
                    </div>

                    <!-- Reservations list with status badge -->
                    <div v-for="r in existingRoomReservations" :key="'ex-' + r.id"
                         :class="isReservationConflict(r) ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-400/20' : 'bg-white border-slate-200/80'"
                         class="p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs transition-all">
                      <div class="flex items-center gap-2 min-w-0">
                        <!-- Status Badge -->
                        <span v-if="r.status === 'approved'" class="px-2 py-0.5 rounded-md text-[0.625rem] font-black bg-indigo-100 text-indigo-700 border border-indigo-200 shrink-0">
                          승인완료
                        </span>
                        <span v-else-if="r.status === 'pending'" class="px-2 py-0.5 rounded-md text-[0.625rem] font-black bg-amber-100 text-amber-700 border border-amber-200 shrink-0">
                          승인대기
                        </span>
                        <span v-else-if="r.status === 'rejected'" class="px-2 py-0.5 rounded-md text-[0.625rem] font-black bg-slate-100 text-slate-400 border border-slate-200 line-through shrink-0">
                          반려됨
                        </span>
                        <span v-else class="px-2 py-0.5 rounded-md text-[0.625rem] font-black bg-slate-100 text-slate-400 border border-slate-200 shrink-0">
                          {{ r.status }}
                        </span>

                        <!-- Time -->
                        <span class="font-black shrink-0" :class="isReservationConflict(r) ? 'text-rose-900' : 'text-slate-800'">
                          {{ r.start_time.slice(0, 5) }} ~ {{ r.end_time.slice(0, 5) }}
                        </span>

                        <!-- Title & Requester -->
                        <span class="font-bold truncate" :class="isReservationConflict(r) ? 'text-rose-700' : 'text-slate-600'">
                          {{ r.title }}
                        </span>
                        <span class="text-slate-400 text-[0.6875rem] font-medium shrink-0">
                          ({{ r.requester_name }})
                        </span>
                      </div>

                      <!-- Overlap Badge if conflict -->
                      <div class="shrink-0 flex items-center gap-1.5">
                        <span v-if="isReservationConflict(r)" class="px-2 py-0.5 bg-rose-600 text-white rounded-md text-[0.625rem] font-black flex items-center gap-0.5 shadow-xs">
                          ⚠️ 시간 중복
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Purpose / Reason -->
                <div>
                  <label class="text-xs font-black text-slate-500 uppercase tracking-wider block mb-1">사용 목적</label>
                  <textarea v-model="editForm.reason" rows="2" class="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs font-bold text-slate-800 outline-none resize-none"></textarea>
                </div>

                <!-- Required Admin Modification Reason -->
                <div class="bg-indigo-50/60 border border-indigo-200 rounded-2xl p-4 space-y-2">
                  <div class="flex items-center gap-2 text-xs font-black text-indigo-700">
                    <ChatBubbleBottomCenterTextIcon class="w-4 h-4" />
                    <span>변경 사유 (필수 기재)</span>
                    <span class="text-[0.6875rem] font-medium text-slate-400">카카오 알림톡으로 발송됩니다.</span>
                  </div>
                  <textarea v-model="editForm.admin_reason" rows="2" 
                            placeholder="예: 교회 행사 일정 조율로 인해 3층 세미나실로 공간 변경 안내 드립니다." 
                            class="w-full bg-white border border-indigo-200 rounded-xl p-3 text-xs font-bold text-slate-800 placeholder:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"></textarea>
                </div>
              </div>
            </template>
          </div>

          <!-- Modal Footer Actions -->
          <div class="px-8 py-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
            <!-- Normal Mode Buttons -->
            <template v-if="!isEditing">
              <div class="flex items-center gap-2">
                <!-- If Pending, show Approve Button -->
                <button v-if="detailReservation?.status === 'pending'" 
                        @click="approveFromDetail" 
                        class="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all shadow-md active:scale-95 flex items-center gap-1.5">
                  <CheckCircleIcon class="w-4 h-4" /> 승인하기
                </button>

                <!-- Modify Button (If not cancelled) -->
                <button v-if="detailReservation?.status !== 'cancelled' && detailReservation?.status !== 'rejected'" 
                        @click="startEdit" 
                        class="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-black transition-all flex items-center gap-1.5">
                  <PencilSquareIcon class="w-4 h-4" /> 예약 변경
                </button>

                <!-- Cancel Button (If not cancelled) -->
                <button v-if="detailReservation?.status !== 'cancelled' && detailReservation?.status !== 'rejected'" 
                        @click="openCancelModal" 
                        class="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-black transition-all flex items-center gap-1.5">
                  <XCircleIcon class="w-4 h-4" /> 예약 취소
                </button>
              </div>

              <button @click="showDetailModal = false" class="px-5 py-2.5 text-xs font-black text-slate-400 hover:text-slate-700 transition-colors">
                닫기
              </button>
            </template>

            <!-- Edit Mode Buttons -->
            <template v-else>
              <div class="flex items-center gap-2 w-full justify-end">
                <button @click="isEditing = false" class="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-black transition-all">
                  취소
                </button>
                <button @click="updateReservation" 
                        :disabled="isUpdating"
                        class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all shadow-md active:scale-95 flex items-center gap-1.5">
                  <ArrowPathIcon v-if="isUpdating" class="w-4 h-4 animate-spin" />
                  <span>변경 저장</span>
                </button>
              </div>
            </template>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Cancellation Reason Modal with KakaoTalk Notice -->
    <Teleport to="body">
      <transition enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0 scale-95" enter-to-class="opacity-100 scale-100">
        <div v-if="showCancelConfirmModal" class="fixed inset-0 z-[2500] flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" @click="showCancelConfirmModal = false"></div>
          <div class="bg-white rounded-[2.5rem] shadow-2xl p-7 max-w-md w-full space-y-5 z-10 border border-white">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center">
                <XCircleIcon class="w-6 h-6" />
              </div>
              <div>
                <h3 class="text-base font-black text-slate-900">예약 취소</h3>
                <p class="text-xs text-slate-500 font-bold">
                  <strong>{{ detailReservation?.requester_name }}</strong>님의 예약을 취소합니다.
                </p>
              </div>
            </div>

            <!-- Summary Box -->
            <div class="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-xs font-bold text-slate-600 space-y-1">
              <div>공간: {{ detailReservation?.room_name }}</div>
              <div>일시: {{ detailReservation?.reservation_date }} {{ detailReservation?.start_time?.slice(0,5) }} ~ {{ detailReservation?.end_time?.slice(0,5) }}</div>
            </div>

            <!-- Recurring Cancellation Scope Options (If Recurring) -->
            <div v-if="detailReservation?.is_recurring" class="space-y-2 bg-indigo-50/50 p-3.5 rounded-2xl border border-indigo-100">
              <label class="text-xs font-black text-slate-800 flex items-center justify-between">
                <span>반복 예약 취소 범위</span>
                <span class="text-[0.625rem] font-black text-indigo-600 bg-white px-2 py-0.5 rounded-full border border-indigo-200">반복 설정됨</span>
              </label>
              <div class="grid grid-cols-2 gap-2">
                <button type="button" @click="cancelScope = 'single'"
                        :class="[cancelScope === 'single' ? 'bg-white border-indigo-600 text-indigo-700 ring-2 ring-indigo-500/20 shadow-sm' : 'bg-white/60 border-slate-200 text-slate-600 hover:bg-white']"
                        class="p-3 rounded-xl border text-left transition-all">
                  <div class="text-xs font-black">해당 건만 취소</div>
                  <div class="text-[0.625rem] text-slate-400 font-medium mt-0.5">{{ detailReservation?.reservation_date }} 1건만 취소</div>
                </button>
                <button type="button" @click="cancelScope = 'all'"
                        :class="[cancelScope === 'all' ? 'bg-rose-50 border-rose-500 text-rose-700 ring-2 ring-rose-500/20 shadow-sm' : 'bg-white/60 border-slate-200 text-slate-600 hover:bg-white']"
                        class="p-3 rounded-xl border text-left transition-all">
                  <div class="text-xs font-black flex items-center gap-1">
                    <span>반복 전체 취소</span>
                    <span class="text-[0.5625rem] bg-rose-500 text-white px-1.5 py-0.2 rounded-full">전체</span>
                  </div>
                  <div class="text-[0.625rem] text-slate-400 font-medium mt-0.5">반복 일정 전체 일괄 취소</div>
                </button>
              </div>
            </div>

            <!-- Cancel Reason Textarea -->
            <div class="space-y-1.5">
              <label class="text-xs font-black text-rose-600 flex items-center gap-2">
                <ChatBubbleBottomCenterTextIcon class="w-4 h-4" />
                <span>취소 사유 (필수 기재)</span>
                <span class="text-[0.6875rem] font-medium text-slate-400">카카오 알림톡으로 발송됩니다.</span>
              </label>
              <textarea v-model="cancelReason" rows="3"
                        placeholder="예: 교회 특별 집회 일정으로 인해 부득이하게 취소 처리되었습니다."
                        class="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs font-bold text-slate-800 placeholder:text-slate-300 outline-none focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-300 resize-none transition-all"></textarea>
            </div>

            <div class="flex gap-3 pt-2">
              <button @click="showCancelConfirmModal = false" class="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-500 py-3 rounded-2xl font-black text-xs transition-all">
                닫기
              </button>
              <button @click="confirmCancelReservation" 
                      :disabled="isCancelling"
                      class="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-3 rounded-2xl font-black text-xs transition-all shadow-lg shadow-rose-200 active:scale-95 flex items-center justify-center gap-1.5">
                <ArrowPathIcon v-if="isCancelling" class="w-4 h-4 animate-spin" />
                <span>취소 확정</span>
              </button>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<style scoped>
.stripe-bg {
  background-image: repeating-linear-gradient(
    45deg,
    transparent,
    transparent 10px,
    rgba(225, 29, 72, 0.08) 10px,
    rgba(225, 29, 72, 0.08) 20px
  );
}
</style>
