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
  ExclamationCircleIcon, SparklesIcon, InformationCircleIcon
} from '@heroicons/vue/24/outline'
import { getHoliday } from '@/utils/holidays'
import { useModalStore } from '@/stores/useModalStore'
import { useAuthStore } from '@/store/auth'

const emit = defineEmits(['updated'])
const modal = useModalStore()
const authStore = useAuthStore()

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
const statusFilter = ref('approved')
const includeBlocked = ref(false)
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

const isPastDate = (dateStrOrObj) => {
  const target = typeof dateStrOrObj === 'string' ? dateStrOrObj : formatDate(dateStrOrObj)
  return target < formatDate(new Date())
}

const selectCalendarDate = (date) => {
  selectedDate.value = formatDate(date)
  showCalendar.value = false
}

const selectCalendarDateMonthView = (date) => {
  if (isPastDate(date)) return
  openBooking(null, '09:00', formatDate(date))
}

const selectWeekDateCell = (room, date) => {
  if (isPastDate(date)) return
  openBooking(room, '09:00', date)
}

const moveCalendarMonth = (offset) => {
  const d = new Date(calendarDate.value)
  d.setDate(1)
  d.setMonth(d.getMonth() + offset)
  calendarDate.value = d
}

const moveCalendarYear = (offset) => {
  const d = new Date(calendarDate.value)
  d.setDate(1)
  d.setFullYear(d.getFullYear() + offset)
  calendarDate.value = d
}

const changeDate = (days) => {
  const d = new Date(selectedDate.value + 'T00:00:00')
  if (calendarSubMode.value === 'month') {
    d.setDate(1)
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
    
    if (viewMode.value === 'list' || calendarSubMode.value === 'month') {
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

const getBlockedInstancesForDate = (date) => {
  if (!date || !rooms.value.length) return []
  const instances = []
  for (const room of rooms.value) {
    const blocked = getBlockedForRoomAndDate(room, date)
    for (const bt of blocked) {
      instances.push({
        id: `blocked-${room.id}-${bt.id}-${date}`,
        is_blocked: true,
        room_id: room.id,
        room_name: room.room_name,
        floor: room.floor,
        reservation_date: date,
        start_time: bt.start_time,
        end_time: bt.end_time,
        title: bt.reason || '고정 일정',
        reason: bt.reason || '',
        requester_name: '관리자',
        status: 'blocked'
      })
    }
  }
  return instances.sort((a, b) => a.start_time.localeCompare(b.start_time))
}

const getCalendarItemsForDate = (date) => {
  const resList = getReservationsForDate(date)
  if (!includeBlocked.value) return resList
  const blockedList = getBlockedInstancesForDate(date)
  return [...resList, ...blockedList].sort((a, b) => a.start_time.localeCompare(b.start_time))
}

const currentViewDates = computed(() => {
  const d = new Date(selectedDate.value + 'T00:00:00')
  if (viewMode.value === 'list' || calendarSubMode.value === 'month') {
    const year = d.getFullYear()
    const month = d.getMonth()
    const lastDay = new Date(year, month + 1, 0).getDate()
    const dates = []
    for (let day = 1; day <= lastDay; day++) {
      dates.push(formatDate(new Date(year, month, day)))
    }
    return dates
  } else if (calendarSubMode.value === 'week') {
    return weekDates.value
  } else {
    return [selectedDate.value]
  }
})

const getAllBlockedInstances = computed(() => {
  const instances = []
  for (const date of currentViewDates.value) {
    instances.push(...getBlockedInstancesForDate(date))
  }
  return instances
})

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
  const items = reservations.value.filter(res => {
    if (statusFilter.value !== 'all' && res.status !== statusFilter.value) return false
    if (!searchQuery.value) return true
    const q = searchQuery.value.toLowerCase()
    return (
      res.title?.toLowerCase().includes(q) ||
      res.requester_name?.toLowerCase().includes(q) ||
      res.room_name?.toLowerCase().includes(q)
    )
  })

  if (includeBlocked.value && (statusFilter.value === 'all' || statusFilter.value === 'approved')) {
    const q = searchQuery.value?.toLowerCase() || ''
    const blockedItems = getAllBlockedInstances.value.filter(bt => {
      if (!q) return true
      return (
        bt.title?.toLowerCase().includes(q) ||
        bt.requester_name?.toLowerCase().includes(q) ||
        bt.room_name?.toLowerCase().includes(q)
      )
    })
    items.push(...blockedItems)
  }

  return items.sort((a, b) => {
    const dateA = String(a.reservation_date).slice(0, 10)
    const dateB = String(b.reservation_date).slice(0, 10)
    if (dateA !== dateB) return dateA.localeCompare(dateB)
    return (a.start_time || '').localeCompare(b.start_time || '')
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
  return conflictingReservations.value.length > 0
})

const modifyScope = ref('single')

// Start Edit Mode
const startEdit = () => {
  modifyScope.value = 'single'
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
    modal.showAlert('선택한 시간에 이미 중복된 예약이 있습니다. 시간을 다시 확인해 주세요.')
    return
  }
  if (!editForm.value.admin_reason?.trim()) {
    modal.showAlert('신청자에게 알림톡으로 전송될 [변경 사유]를 반드시 입력해 주세요.')
    return
  }

  isUpdating.value = true
  try {
    const res = await axios.put(`/api/reservations/${detailReservation.value.id}`, {
      room_id: editForm.value.room_id,
      title: editForm.value.title,
      reservation_date: editForm.value.reservation_date,
      start_time: editForm.value.start_time,
      end_time: editForm.value.end_time,
      reason: editForm.value.reason,
      admin_reason: editForm.value.admin_reason,
      modify_scope: detailReservation.value.is_recurring ? modifyScope.value : 'single'
    })

    const updatedCount = res.data?.count || 1
    modal.showAlert(
      updatedCount > 1
        ? `총 ${updatedCount}건의 반복 예약이 성공적으로 변경되었으며, 신청자에게 카카오톡 알림톡이 발송되었습니다.`
        : '예약이 성공적으로 변경되었으며, 신청자에게 카카오톡 알림톡이 발송되었습니다.'
    )
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
    openDetail(found)
  } else {
    try {
      const { data } = await axios.get('/api/reservations', { params: { status: 'all' } })
      const res = data.find(r => String(r.id) === String(id))
      if (res) {
        selectedDate.value = formatDate(res.reservation_date)
        await fetchData()
        openDetail(res)
      }
    } catch (e) {
      console.error('Failed to open reservation by id:', e)
    }
  }
}

// ==========================================
// Booking Modal (Admin Reservation Creation)
// ==========================================
const showBookingModal = ref(false)
const selectedRoom = ref(null)
const bookingDate = ref(formatDate(new Date()))
const bookingEndDate = ref(formatDate(new Date()))
const bookingStep = ref('form')
const bookingModalContentRef = ref(null)
const isAgreed = ref(false)
const ruleAgreements = ref([false, false, false, false, false])

const isAllAgreed = computed({
  get: () => ruleAgreements.value.every(v => v),
  set: (val) => {
    ruleAgreements.value = ruleAgreements.value.map(() => val)
  }
})

const spaceRules = [
  { title: '냉난방 및 전등 소등', desc: '사용 후에는 반드시 냉난방기와 전등을 모두 꺼주세요.' },
  { title: '음식물 반입 금지', desc: '쾌적한 환경을 위해 공간 내 음식물 반입은 원칙적으로 금지됩니다.' },
  { title: '비품 원위치 및 정리', desc: '사용하신 비품과 기자재는 퇴실 전 원래 자리에 정돈해 주세요.' },
  { title: '기물 파손 책임', desc: '시설 및 비품 파손에 주의해 주시고, 파손 발생 시 즉시 사무실로 알려주세요.' },
  { title: '목적 외 사용 금지 (개인 레슨 / 외부 행사 금지)', desc: '본 시설은 교회 공식 사역용 공간입니다. 사적 이익을 위한 개인 레슨이나 사전 승인되지 않은 외부 단체·개인의 행사 및 연습 목적으로는 일절 사용할 수 없습니다.' }
]

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
  let [h, m] = current.split(':').map(v => isNaN(parseInt(v)) ? 0 : parseInt(v))
  let ampm = h >= 12 ? '오후' : '오전'
  let h12 = h % 12
  if (h12 === 0) h12 = 12
  
  if (type === 'ampm') ampm = val
  if (type === 'hour') h12 = Number(val)
  if (type === 'minute') m = Number(val)
  
  let newH = h12 % 12
  if (ampm === '오후') newH += 12
  
  const timeStr = `${newH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
  if (target === 'start') form.value.start_time = timeStr
  else form.value.end_time = timeStr
}

const form = ref({
  title: '',
  start_time: '09:00',
  end_time: '10:00',
  reason: '',
  is_recurring: false,
  recurring_type: 'weekly',
  recurring_end_date: '',
  recurring_days: [],
  recurring_month_option: 'date',
  recurring_month_date: new Date().getDate(),
  recurring_month_nth_week: Math.ceil(new Date().getDate() / 7),
  recurring_month_nth_day: new Date().getDay(),
  requester_name: '',
  requester_phone: ''
})

const toggleRecurringDay = (dayIdx) => {
  const index = form.value.recurring_days.indexOf(dayIdx)
  if (index > -1) {
    form.value.recurring_days.splice(index, 1)
  } else {
    form.value.recurring_days.push(dayIdx)
  }
}

watch(() => form.value.requester_phone, (val) => {
  if (!val) return
  const digits = val.replace(/\D/g, '')
  if (digits.length <= 3) {
    form.value.requester_phone = digits
  } else if (digits.length <= 7) {
    form.value.requester_phone = `${digits.slice(0, 3)}-${digits.slice(3)}`
  } else {
    form.value.requester_phone = `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`
  }
})

const addOneHour = (timeStr) => {
  if (!timeStr) return ''
  const [h, m] = timeStr.split(':').map(Number)
  const nextH = Math.min(23, h + 1)
  return `${String(nextH).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

watch(() => form.value.start_time, (newStart) => {
  if (newStart) {
    form.value.end_time = addOneHour(newStart)
  }
})

const bookingRoomReservations = ref([])

watch(bookingDate, (newStart) => {
  if (newStart && (!bookingEndDate.value || bookingEndDate.value < newStart)) {
    bookingEndDate.value = newStart
  }
})

const bookingDatesInRange = computed(() => {
  if (!bookingDate.value) return []
  const endStr = bookingEndDate.value && bookingEndDate.value >= bookingDate.value
    ? bookingEndDate.value
    : bookingDate.value
  const dates = []
  const curr = new Date(bookingDate.value + 'T00:00:00')
  const end = new Date(endStr + 'T00:00:00')
  let count = 0
  while (curr <= end && count < 365) {
    dates.push(formatDate(curr))
    curr.setDate(curr.getDate() + 1)
    count++
  }
  return dates
})

const fetchBookingRoomReservations = async () => {
  if (!selectedRoom.value?.id || !bookingDate.value) {
    bookingRoomReservations.value = []
    return
  }
  try {
    const endStr = bookingEndDate.value && bookingEndDate.value >= bookingDate.value
      ? bookingEndDate.value
      : bookingDate.value
    const params = {
      room_id: selectedRoom.value.id,
      status: 'all'
    }
    if (endStr > bookingDate.value) {
      params.start_date = bookingDate.value
      params.end_date = endStr
    } else {
      params.date = bookingDate.value
    }
    const res = await axios.get('/api/reservations', { params })
    bookingRoomReservations.value = res.data || []
  } catch (err) {
    console.error('Failed to fetch booking room reservations:', err)
  }
}

watch(
  [() => selectedRoom.value?.id, bookingDate, bookingEndDate, showBookingModal],
  ([roomId, dateStr, endDateStr, isOpen]) => {
    if (isOpen && roomId && dateStr) {
      fetchBookingRoomReservations()
    }
  }
)

const currentRoomSchedule = computed(() => {
  if (!selectedRoom.value) return []
  const items = []
  const isMultiDay = bookingDatesInRange.value.length > 1

  for (const dStr of bookingDatesInRange.value) {
    const shortDate = dStr.slice(5).replace('-', '/')
    const blocked = getBlockedForRoomAndDate(selectedRoom.value, dStr)
    blocked.forEach(bt => {
      items.push({
        id: `bt-${dStr}-${bt.id}`,
        date: dStr,
        shortDate: isMultiDay ? shortDate : null,
        type: 'blocked',
        title: bt.reason || '관리자 설정 고정 일정',
        requester_name: null,
        start_time: bt.start_time.slice(0, 5),
        end_time: bt.end_time.slice(0, 5)
      })
    })

    const roomRes = bookingRoomReservations.value.filter(r => r.reservation_date === dStr)
    roomRes.forEach(res => {
      if (res.status === 'rejected' || res.status === 'cancelled') return
      items.push({
        id: `res-${res.id}`,
        date: dStr,
        shortDate: isMultiDay ? shortDate : null,
        type: 'reservation',
        title: res.title || '공간 사용',
        requester_name: res.requester_name,
        start_time: res.start_time.slice(0, 5),
        end_time: res.end_time.slice(0, 5)
      })
    })
  }

  return items.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date)
    return a.start_time.localeCompare(b.start_time)
  })
})

const timeConflictError = computed(() => {
  if (!form.value.start_time || !form.value.end_time) return null

  if (bookingEndDate.value && bookingEndDate.value < bookingDate.value) {
    return '종료 일자는 시작 일자보다 같거나 이후여야 합니다.'
  }

  if (form.value.start_time >= form.value.end_time) {
    return '종료 시간은 시작 시간보다 늦어야 합니다.'
  }

  if (selectedRoom.value) {
    const isMultiDay = bookingDatesInRange.value.length > 1
    for (const dStr of bookingDatesInRange.value) {
      const datePrefix = isMultiDay ? `[${dStr}] ` : ''

      const roomRes = bookingRoomReservations.value.filter(r => r.reservation_date === dStr)
      const resConflict = roomRes.find(r => {
        if (r.status === 'rejected' || r.status === 'cancelled') return false
        const s1 = r.start_time.slice(0, 5)
        const e1 = r.end_time.slice(0, 5)
        const s2 = form.value.start_time
        const e2 = form.value.end_time
        return (s1 < e2 && e1 > s2)
      })
      if (resConflict) {
        const title = resConflict.title || '기존 예약'
        const name = resConflict.requester_name ? `(${resConflict.requester_name})` : ''
        return `${datePrefix}이미 예약된 일정이 있어 예약이 불가능합니다. [${resConflict.start_time.slice(0, 5)}~${resConflict.end_time.slice(0, 5)} ${title} ${name}]`
      }
    }
  }

  return null
})

const openBooking = (room, time = '09:00', date = null, endDateParam = null) => {
  const targetDate = date || selectedDate.value
  if (isPastDate(targetDate)) return
  bookingDate.value = targetDate
  bookingEndDate.value = endDateParam && endDateParam >= targetDate ? endDateParam : targetDate
  selectedRoom.value = room || null
  bookingRoomReservations.value = []
  const dObj = new Date(targetDate + 'T00:00:00')
  form.value = {
    title: '',
    start_time: time,
    end_time: addOneHour(time),
    reason: '',
    is_recurring: false,
    recurring_type: 'weekly',
    recurring_end_date: '',
    recurring_days: [],
    recurring_month_option: 'date',
    recurring_month_date: dObj.getDate(),
    recurring_month_nth_week: Math.ceil(dObj.getDate() / 7),
    recurring_month_nth_day: dObj.getDay(),
    requester_name: authStore.user?.userName || '',
    requester_phone: authStore.user?.phone || ''
  }

  const endDate = new Date(dObj)
  endDate.setDate(1)
  endDate.setMonth(endDate.getMonth() + 1)
  const lastDay = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0).getDate()
  endDate.setDate(Math.min(dObj.getDate(), lastDay))
  form.value.recurring_end_date = formatDate(endDate)
  bookingStep.value = 'form'
  isAgreed.value = false
  ruleAgreements.value = [false, false, false, false, false]
  showBookingModal.value = true
}

const showRecurringCalendar = ref(false)
const recurringCalendarDate = ref(new Date())
const recurringCalendarPosition = ref({ top: 0, left: 0 })

const toggleRecurringCalendar = (event) => {
  const rect = event.currentTarget.getBoundingClientRect()
  const spaceBelow = window.innerHeight - rect.bottom
  const calendarHeight = 350

  if (spaceBelow < calendarHeight && rect.top > calendarHeight) {
    recurringCalendarPosition.value = {
      bottom: window.innerHeight - rect.top + 8,
      left: rect.left,
      isAbove: true
    }
  } else {
    recurringCalendarPosition.value = {
      top: rect.bottom + 8,
      left: rect.left,
      isAbove: false
    }
  }
  
  if (!showRecurringCalendar.value && form.value.recurring_end_date) {
    const d = new Date(form.value.recurring_end_date + 'T00:00:00')
    if (!isNaN(d.getTime())) {
      recurringCalendarDate.value = new Date(d.getFullYear(), d.getMonth(), 1)
    }
  }
  
  showRecurringCalendar.value = !showRecurringCalendar.value
}

const selectRecurringDate = (date) => {
  form.value.recurring_end_date = formatDate(date)
  showRecurringCalendar.value = false
}

const moveRecurringCalendarMonth = (offset) => {
  const d = new Date(recurringCalendarDate.value)
  d.setDate(1)
  d.setMonth(d.getMonth() + offset)
  recurringCalendarDate.value = d
}

const moveRecurringCalendarYear = (offset) => {
  const d = new Date(recurringCalendarDate.value)
  d.setDate(1)
  d.setFullYear(d.getFullYear() + offset)
  recurringCalendarDate.value = d
}

const recurringCalendarDays = computed(() => {
  const year = recurringCalendarDate.value.getFullYear()
  const month = recurringCalendarDate.value.getMonth()
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

const submitBooking = async () => {
  if (!selectedRoom.value) {
    return modal.showAlert('예약할 공간을 선택해 주세요.')
  }

  if (isPastDate(bookingDate.value)) {
    return modal.showAlert('과거 일자에는 예약을 신청할 수 없습니다.')
  }

  if (timeConflictError.value) {
    return modal.showAlert(timeConflictError.value)
  }

  if (form.value.start_time >= form.value.end_time) {
    return modal.showAlert('종료 시간은 시작 시간보다 이후여야 합니다.')
  }

  if (!form.value.title?.trim()) return modal.showAlert('신청명을 입력해주세요.')
  if (!form.value.requester_name?.trim()) return modal.showAlert('신청자 이름을 입력해주세요.')
  if (!form.value.requester_phone?.trim()) return modal.showAlert('연락처를 입력해주세요.')
  
  if (form.value.is_recurring) {
    if (!form.value.recurring_end_date) return modal.showAlert('반복 종료일을 선택해 주세요.')
    if (form.value.recurring_type === 'weekly' && form.value.recurring_days.length === 0) {
      return modal.showAlert('반복할 요일을 하나 이상 선택해 주세요.')
    }
  }

  if (bookingStep.value === 'form') {
    bookingStep.value = 'agreement'
    nextTick(() => {
      if (bookingModalContentRef.value) {
        bookingModalContentRef.value.scrollTop = 0
      }
      const el = document.getElementById('admin-agreement-title')
      if (el) el.focus({ preventScroll: true })
    })
    return
  }

  if (!isAllAgreed.value || !isAgreed.value) {
    return modal.showAlert('모든 공간사용 수칙에 동의하셔야 신청이 가능합니다.')
  }

  try {
    const isMultiDayRange = !form.value.is_recurring && bookingEndDate.value && bookingEndDate.value > bookingDate.value
    const payload = {
      ...form.value,
      is_recurring: form.value.is_recurring || isMultiDayRange,
      recurring_type: form.value.is_recurring ? form.value.recurring_type : 'daily',
      recurring_end_date: form.value.is_recurring ? form.value.recurring_end_date : (isMultiDayRange ? bookingEndDate.value : ''),
      room_id: selectedRoom.value.id,
      reservation_date: bookingDate.value
    }
    const res = await axios.post('/api/reservations', payload)
    const createdCount = res.data?.ids?.length || 1
    modal.showAlert(
      createdCount > 1
        ? `총 ${createdCount}건의 예약 신청이 완료되었습니다.`
        : '예약 신청이 완료되었습니다.'
    )
    showBookingModal.value = false
    await fetchData()
    emit('updated')
  } catch (e) {
    modal.showAlert(e.response?.data?.message || '예약 중 오류가 발생했습니다.')
  }
}

const isSlotBlocked = (room, date, time) => {
  return isPastDate(date)
}

const isDragging = ref(false)
const dragStartSlot = ref(null)
const dragEndSlot = ref(null)
const dragRoomId = ref(null)

const handleMouseDown = (room, time) => {
  if (isPastDate(selectedDate.value) || isSlotBlocked(room, selectedDate.value, time)) return
  isDragging.value = true
  dragRoomId.value = room.id
  dragStartSlot.value = time
  dragEndSlot.value = time
}

const isTimeInRange = (room, time) => {
  if (!isDragging.value || dragRoomId.value !== room.id || !dragStartSlot.value || !dragEndSlot.value) return false
  const slots = dayTimeSlots.value
  const idxStart = slots.indexOf(dragStartSlot.value)
  const idxEnd = slots.indexOf(dragEndSlot.value)
  const idxCurrent = slots.indexOf(time)
  const min = Math.min(idxStart, idxEnd)
  const max = Math.max(idxStart, idxEnd)
  return idxCurrent >= min && idxCurrent <= max
}

const handleMouseOver = (room, time) => {
  if (isDragging.value && dragRoomId.value === room.id) {
    dragEndSlot.value = time
  }
}

const handleMouseUp = () => {
  if (!isDragging.value) return
  const room = rooms.value.find(r => r.id === dragRoomId.value)
  if (room && dragStartSlot.value && dragEndSlot.value) {
    const slots = dayTimeSlots.value
    const idx1 = slots.indexOf(dragStartSlot.value)
    const idx2 = slots.indexOf(dragEndSlot.value)
    const startIdx = Math.min(idx1, idx2)
    const endIdx = Math.max(idx1, idx2)
    
    const startTime = slots[startIdx]
    const endTimeSlot = slots[endIdx]
    const [h, m] = endTimeSlot.split(':').map(Number)
    let endH = h + 1, endM = m
    if (endH >= 24) endH = 23
    
    openBooking(room, startTime, selectedDate.value)
    form.value.end_time = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`
  }
  isDragging.value = false
}

// Month View Date Range Drag Selection
const isMonthDragging = ref(false)
const monthDragStartDate = ref(null)
const monthDragEndDate = ref(null)

const handleMonthMouseDown = (dateObj) => {
  if (isPastDate(dateObj)) return
  const dStr = formatDate(dateObj)
  isMonthDragging.value = true
  monthDragStartDate.value = dStr
  monthDragEndDate.value = dStr
}

const handleMonthMouseOver = (dateObj) => {
  if (!isMonthDragging.value) return
  if (isPastDate(dateObj)) return
  monthDragEndDate.value = formatDate(dateObj)
}

const handleMonthMouseUp = () => {
  if (!isMonthDragging.value) return
  if (monthDragStartDate.value && monthDragEndDate.value) {
    const d1 = monthDragStartDate.value
    const d2 = monthDragEndDate.value
    const startStr = d1 <= d2 ? d1 : d2
    const endStr = d1 <= d2 ? d2 : d1
    openBooking(null, '09:00', startStr, endStr)
  }
  isMonthDragging.value = false
  monthDragStartDate.value = null
  monthDragEndDate.value = null
}

const isDateInMonthDragRange = (dateObj) => {
  if (!isMonthDragging.value || !monthDragStartDate.value || !monthDragEndDate.value) return false
  const dStr = formatDate(dateObj)
  const minD = monthDragStartDate.value <= monthDragEndDate.value ? monthDragStartDate.value : monthDragEndDate.value
  const maxD = monthDragStartDate.value <= monthDragEndDate.value ? monthDragEndDate.value : monthDragStartDate.value
  return dStr >= minD && dStr <= maxD
}

const getMonthDragEdgeLabel = (dateObj) => {
  if (!isMonthDragging.value || !monthDragStartDate.value || !monthDragEndDate.value) return null
  const dStr = formatDate(dateObj)
  const minD = monthDragStartDate.value <= monthDragEndDate.value ? monthDragStartDate.value : monthDragEndDate.value
  const maxD = monthDragStartDate.value <= monthDragEndDate.value ? monthDragEndDate.value : monthDragStartDate.value
  if (minD === maxD && dStr === minD) return '선택'
  if (dStr === minD) return '시작'
  if (dStr === maxD) return '종료'
  return null
}

// Week View Room + Date Range Drag Selection
const isWeekDragging = ref(false)
const weekDragRoom = ref(null)
const weekDragStartDate = ref(null)
const weekDragEndDate = ref(null)

const handleWeekMouseDown = (room, dateStr) => {
  if (isPastDate(dateStr)) return
  isWeekDragging.value = true
  weekDragRoom.value = room
  weekDragStartDate.value = dateStr
  weekDragEndDate.value = dateStr
}

const handleWeekMouseOver = (room, dateStr) => {
  if (!isWeekDragging.value || weekDragRoom.value?.id !== room.id) return
  if (isPastDate(dateStr)) return
  weekDragEndDate.value = dateStr
}

const handleWeekMouseUp = () => {
  if (!isWeekDragging.value) return
  if (weekDragRoom.value && weekDragStartDate.value && weekDragEndDate.value) {
    const d1 = weekDragStartDate.value
    const d2 = weekDragEndDate.value
    const startStr = d1 <= d2 ? d1 : d2
    const endStr = d1 <= d2 ? d2 : d1
    openBooking(weekDragRoom.value, '09:00', startStr, endStr)
  }
  isWeekDragging.value = false
  weekDragRoom.value = null
  weekDragStartDate.value = null
  weekDragEndDate.value = null
}

const isDateInWeekDragRange = (room, dateStr) => {
  if (!isWeekDragging.value || weekDragRoom.value?.id !== room.id || !weekDragStartDate.value || !weekDragEndDate.value) return false
  const minD = weekDragStartDate.value <= weekDragEndDate.value ? weekDragStartDate.value : weekDragEndDate.value
  const maxD = weekDragStartDate.value <= weekDragEndDate.value ? weekDragEndDate.value : weekDragStartDate.value
  return dateStr >= minD && dateStr <= maxD
}

const getWeekDragEdgeLabel = (room, dateStr) => {
  if (!isWeekDragging.value || weekDragRoom.value?.id !== room.id || !weekDragStartDate.value || !weekDragEndDate.value) return null
  const minD = weekDragStartDate.value <= weekDragEndDate.value ? weekDragStartDate.value : weekDragEndDate.value
  const maxD = weekDragStartDate.value <= weekDragEndDate.value ? weekDragEndDate.value : weekDragStartDate.value
  if (minD === maxD && dateStr === minD) return '선택'
  if (dateStr === minD) return '시작'
  if (dateStr === maxD) return '종료'
  return null
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

        <button @click="includeBlocked = !includeBlocked"
                type="button"
                :aria-pressed="includeBlocked"
                :class="[
                  includeBlocked 
                    ? 'bg-rose-600 text-white border-rose-600 shadow-sm shadow-rose-200' 
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200'
                ]"
                class="px-2.5 sm:px-3.5 py-1.5 sm:py-2 border text-xs font-black rounded-2xl transition-all active:scale-95 flex items-center gap-1.5 whitespace-nowrap shrink-0">
          <span :class="[
                  includeBlocked ? 'bg-white text-rose-600' : 'bg-slate-200 text-transparent'
                ]"
                class="w-3.5 h-3.5 rounded flex items-center justify-center transition-colors shrink-0">
            <svg class="w-2.5 h-2.5 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </span>
          <span>고정 일정 포함</span>
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
          <div v-if="includeBlocked" class="flex items-center gap-1 sm:gap-1.5 shrink-0 whitespace-nowrap">
            <span class="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-rose-100 border border-dashed border-rose-400 rounded-md shadow-sm shrink-0"></span>
            <span class="whitespace-nowrap">고정 일정</span>
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
          <div class="grid grid-cols-7 gap-px bg-slate-200 border-x border-b border-slate-200 rounded-b-2xl shadow-sm overflow-hidden select-none"
               @mouseleave="handleMonthMouseUp"
               @mouseup="handleMonthMouseUp">
            <div v-for="(d, idx) in calendarDays" :key="idx" 
                 @mousedown="handleMonthMouseDown(d.date)"
                 @mouseover="handleMonthMouseOver(d.date)"
                 :class="[
                   isDateInMonthDragRange(d.date)
                     ? (getMonthDragEdgeLabel(d.date) ? 'bg-indigo-100/80 ring-2 ring-inset ring-indigo-600 z-10' : 'bg-indigo-50/90 ring-1 ring-inset ring-indigo-400/50 z-10')
                     : (d.current ? 'bg-white' : 'bg-slate-50/60'), 
                   !isMonthDragging && selectedDate === formatDate(d.date) ? 'ring-2 ring-inset ring-indigo-500 z-10' : '',
                   isPastDate(d.date) ? 'cursor-default' : 'cursor-pointer hover:bg-indigo-50/40'
                 ]"
                 class="min-h-[130px] p-2.5 transition-colors group">
              <div class="flex justify-between items-start mb-1.5">
                <div class="flex items-center gap-1.5">
                  <span :class="[
                          getMonthDragEdgeLabel(d.date) ? 'bg-indigo-600 text-white w-5 h-5 rounded-full inline-flex items-center justify-center shadow-xs' :
                          d.current ? 'text-slate-900' : 'text-slate-300', 
                          !getMonthDragEdgeLabel(d.date) && (d.date.getDay() === 0 || getHoliday(formatDate(d.date))) ? (d.current ? 'text-rose-500' : 'text-rose-300') : 
                          !getMonthDragEdgeLabel(d.date) && d.date.getDay() === 6 ? (d.current ? 'text-blue-500' : 'text-blue-300') : ''
                        ]" 
                        class="text-xs font-black transition-all">{{ d.day }}</span>
                  <span v-if="getHoliday(formatDate(d.date))" 
                        :class="d.current ? 'text-rose-500' : 'text-rose-300'"
                        class="text-[0.625rem] font-bold truncate max-w-[70px]">{{ getHoliday(formatDate(d.date)) }}</span>
                </div>
                <span v-if="getMonthDragEdgeLabel(d.date)"
                      class="px-1.5 py-0.5 bg-indigo-600 text-white rounded-md text-[0.5625rem] font-black tracking-tight shadow-xs">
                  {{ getMonthDragEdgeLabel(d.date) }}
                </span>
              </div>
              <div class="space-y-1">
                <div v-for="res in getCalendarItemsForDate(formatDate(d.date)).slice(0, 4)" :key="res.id"
                     @mousedown.stop
                     @click="!res.is_blocked && ($event.stopPropagation(), openDetail(res))"
                     :class="[
                       res.is_blocked ? 'bg-rose-100 text-rose-800 border border-dashed border-rose-300 shadow-xs' :
                       isEnded(res) ? 'bg-slate-200 text-slate-700 shadow-sm border border-slate-300 cursor-pointer hover:opacity-85' : 
                       res.status === 'pending' ? 'bg-amber-500 text-white shadow-md cursor-pointer hover:opacity-85' : 'bg-indigo-600 text-white shadow-md cursor-pointer hover:opacity-85'
                     ]"
                     class="text-[0.6875rem] font-bold px-1.5 py-0.5 rounded-lg truncate transition-all">
                  <span v-if="!res.is_blocked && res.status === 'pending'" class="text-[0.5625rem] bg-white/30 px-1 py-0.2 rounded mr-1">대기</span>
                  {{ res.start_time.slice(0,5) }} [{{ res.room_name?.split(' ')[0] }}] {{ res.title || (res.is_blocked ? '고정 일정' : '예약') }}
                </div>
                <div v-if="getCalendarItemsForDate(formatDate(d.date)).length > 4" class="text-[0.625rem] font-black text-slate-400 pl-1 mt-0.5">
                  + {{ getCalendarItemsForDate(formatDate(d.date)).length - 4 }}개
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
                    <div class="flex-1 flex select-none"
                         @mouseleave="handleWeekMouseUp"
                         @mouseup="handleWeekMouseUp">
                      <div v-for="date in weekDates" :key="'cell-' + room.id + '-' + date" 
                           @mousedown="handleWeekMouseDown(room, date)"
                           @mouseover="handleWeekMouseOver(room, date)"
                           :class="[
                             isDateInWeekDragRange(room, date)
                               ? (getWeekDragEdgeLabel(room, date) ? 'bg-indigo-100/80 ring-2 ring-inset ring-indigo-600 z-10' : 'bg-indigo-50/90 ring-1 ring-inset ring-indigo-400/50 z-10')
                               : '',
                             isPastDate(date) ? 'cursor-default' : 'hover:bg-indigo-50/40 cursor-pointer'
                           ]"
                           class="flex-1 min-w-[140px] border-r border-slate-200 p-2 space-y-1 overflow-hidden transition-colors relative">
                        <div v-if="getWeekDragEdgeLabel(room, date)" class="flex justify-end mb-0.5">
                          <span class="px-1.5 py-0.5 bg-indigo-600 text-white rounded-md text-[0.5625rem] font-black tracking-tight shadow-xs">
                            {{ getWeekDragEdgeLabel(room, date) }}
                          </span>
                        </div>
                        <!-- Blocked Times -->
                        <template v-if="includeBlocked">
                          <div v-for="bt in getBlockedForRoomAndDate(room, date)" :key="'bt-' + bt.id"
                               class="text-[0.625rem] font-black px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-dashed border-rose-300 truncate">
                            {{ bt.start_time.slice(0,5) }}~{{ bt.end_time.slice(0,5) }} {{ bt.reason || '' }}
                          </div>
                        </template>

                        <!-- Reservations -->
                        <div v-for="res in getReservationsForRoomAndDate(room.id, date).slice(0, 4)" :key="res.id"
                             @mousedown.stop
                             @click.stop="openDetail(res)"
                             :class="[
                               isEnded(res) ? 'bg-slate-200 text-slate-700 border border-slate-300 shadow-sm' : 
                               res.status === 'pending' ? 'bg-amber-500 text-white shadow-md' : 'bg-indigo-600 text-white shadow-md'
                             ]"
                             class="text-[0.6875rem] font-bold px-1.5 py-1 rounded-lg truncate transition-all hover:scale-[1.01]">
                          <span v-if="res.status === 'pending'" class="mr-1 text-[0.5625rem] font-bold bg-white/30 px-1 py-0.2 rounded">대기</span>
                          ({{ res.start_time.slice(0,5) }}) {{ res.title || '예약' }}
                        </div>
                        <div v-if="getReservationsForRoomAndDate(room.id, date).length + (includeBlocked ? getBlockedForRoomAndDate(room, date).length : 0) > 4" class="text-[0.625rem] font-black text-slate-400 px-1">
                          + {{ getReservationsForRoomAndDate(room.id, date).length + (includeBlocked ? getBlockedForRoomAndDate(room, date).length : 0) - 4 }}개
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
                      <div class="absolute inset-0 flex" @mouseleave="handleMouseUp" @mouseup="handleMouseUp">
                        <div v-for="time in dayTimeSlots" :key="'cell-' + room.id + '-' + time" 
                             @mousedown="handleMouseDown(room, time)"
                             @mouseover="handleMouseOver(room, time)"
                             :class="[
                               isSlotBlocked(room, selectedDate, time) ? 'bg-slate-200 cursor-not-allowed stripe-bg' : 'hover-stripe-blue cursor-crosshair'
                             ]"
                             class="w-[80px] shrink-0 h-full border-r border-slate-100 transition-colors relative">
                          <div v-if="isTimeInRange(room, time)" class="absolute inset-0 selected-stripe-blue z-10"></div>
                        </div>
                      </div>

                      <!-- Blocked Areas -->
                      <div v-if="includeBlocked" class="absolute inset-0 pointer-events-none">
                        <div v-for="bt in getBlockedForRoomAndDate(room, selectedDate)" :key="'day-bt-' + bt.id"
                             :style="getBlockedStyle(bt)"
                             class="absolute top-2 bottom-2 bg-rose-100/90 border border-rose-300 z-10 flex items-center justify-center overflow-hidden rounded-xl stripe-bg">
                          <span class="text-[0.625rem] font-black text-rose-800 uppercase tracking-tighter whitespace-nowrap rotate-[-10deg]">
                            {{ bt.reason || '고정 일정' }}
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
          <div class="flex flex-wrap items-center gap-2 w-full md:w-auto">
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
          <div v-for="res in filteredItems" :key="'list-res-' + res.id" @click="!res.is_blocked && openDetail(res)"
               :class="[
                 res.is_blocked ? (isEnded(res) ? 'bg-rose-50/40 border-rose-200/70 opacity-60 cursor-default' : 'bg-rose-50/70 border-rose-200 cursor-default') :
                 isEnded(res) ? 'bg-slate-50 border-slate-200 opacity-60 cursor-pointer' : 'bg-white border-slate-200 hover:border-indigo-500 hover:shadow-md cursor-pointer'
               ]"
               class="border rounded-2xl p-5 transition-all group flex flex-col justify-between">
            <div>
              <div class="flex justify-between items-start mb-2">
                <span :class="res.is_blocked ? 'bg-rose-100 text-rose-700' : 'bg-indigo-50 text-indigo-600'" class="px-2.5 py-1 rounded-lg text-xs font-black">
                  {{ res.floor }}{{ String(res.floor).includes('B') ? '' : 'F' }} · {{ res.room_name }}
                </span>
                <span v-if="res.is_blocked" class="bg-rose-500 text-white px-2 py-0.5 rounded-md text-[0.6875rem] font-black">
                  고정 일정
                </span>
                <span v-else :class="[
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
              <h3 class="text-sm font-black text-slate-900 mt-2 mb-1" :class="{ 'group-hover:text-indigo-600 transition-colors': !res.is_blocked }">
                {{ res.title || (res.is_blocked ? '고정 일정' : '(신청명 없음)') }}
              </h3>
              <p class="text-xs font-bold text-slate-500">
                {{ res.reservation_date }} · {{ res.start_time?.slice(0,5) }} ~ {{ res.end_time?.slice(0,5) }}
              </p>
            </div>
            <div class="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-xs text-slate-400 font-bold">
              <span>{{ res.is_blocked ? '구분: 관리자 설정 (고정 일정)' : `신청자: ${res.requester_name}` }}</span>
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
                <div v-if="detailReservation.is_recurring" class="space-y-1.5">
                  <label class="text-xs font-black text-slate-500 uppercase tracking-wider block">반복 예약 변경 범위</label>
                  <div class="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      @click="modifyScope = 'single'"
                      class="py-2.5 rounded-xl text-xs font-black border transition-all"
                      :class="modifyScope === 'single' ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' : 'bg-slate-50 text-slate-600 border-slate-200'"
                    >
                      이 일정만 변경
                    </button>
                    <button
                      type="button"
                      @click="modifyScope = 'all'"
                      class="py-2.5 rounded-xl text-xs font-black border transition-all"
                      :class="modifyScope === 'all' ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' : 'bg-slate-50 text-slate-600 border-slate-200'"
                    >
                      유효한 전체 일정 변경
                    </button>
                  </div>
                </div>

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
                    <input type="date" v-model="editForm.reservation_date" :disabled="detailReservation.is_recurring && modifyScope === 'all'" class="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 text-xs font-black text-slate-800 outline-none disabled:opacity-50" />
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
                          고정 일정
                        </span>
                        <span class="font-black text-slate-800 shrink-0">
                          {{ bt.start_time.slice(0, 5) }} ~ {{ bt.end_time.slice(0, 5) }}
                        </span>
                        <span class="text-slate-500 font-medium truncate">
                          {{ bt.reason || '고정 일정' }}
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

    <!-- Modal: Booking (Admin Reservation Input Popup) -->
    <Teleport to="body">
      <div v-if="showBookingModal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[4000]">
        <div class="bg-[#F8FAFC] w-full max-w-lg rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] border border-white overflow-hidden animate-in transform-gpu flex flex-col max-h-[90vh]">
          <!-- Header Area (Fixed) -->
          <div class="bg-white px-8 pt-8 pb-4 relative shrink-0">
            <button @click="showBookingModal = false" class="absolute top-6 right-6 p-2 bg-slate-50 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"><XMarkIcon class="w-4 h-4" /></button>
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
                <CalendarIcon class="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 class="text-xl font-black text-slate-900 tracking-tighter">공간 예약 신청</h2>
                <div class="flex items-center gap-2">
                  <template v-if="selectedRoom">
                    <span class="text-[0.75rem] font-black text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md uppercase tracking-widest">{{ selectedRoom.floor }}{{ String(selectedRoom.floor).includes('B') ? '' : 'F' }}</span>
                    <p class="text-[0.75rem] font-black text-slate-900 uppercase tracking-tighter">
                      {{ selectedRoom.room_name }} | {{ bookingEndDate && bookingEndDate > bookingDate ? `${bookingDate} ~ ${bookingEndDate}` : bookingDate }}
                    </p>
                  </template>
                  <template v-else>
                    <span class="text-[0.75rem] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md">공간 미선택</span>
                    <p class="text-[0.75rem] font-black text-slate-500 tracking-tighter">
                      예약할 공간을 선택해 주세요 | {{ bookingEndDate && bookingEndDate > bookingDate ? `${bookingDate} ~ ${bookingEndDate}` : bookingDate }}
                    </p>
                  </template>
                </div>
              </div>
            </div>
          </div>

          <!-- Content Area (Scrollable) -->
          <div ref="bookingModalContentRef" class="flex-1 overflow-y-auto px-8 py-6 space-y-4 scrollbar-hide">
            <template v-if="bookingStep === 'form'">
              <!-- Room Selection -->
              <div class="bg-white p-4 rounded-3xl border shadow-sm group transition-all"
                   :class="[!selectedRoom ? 'border-indigo-400 ring-2 ring-indigo-500/10 bg-indigo-50/10' : 'border-slate-200/60 focus-within:border-indigo-500']">
                <div class="flex items-center justify-between mb-1">
                  <label class="flex items-center gap-1.5 text-[0.75rem] font-black uppercase tracking-widest"
                         :class="[!selectedRoom ? 'text-indigo-600' : 'text-slate-400']">
                    <MapPinIcon class="w-3.5 h-3.5 text-indigo-500" />
                    예약 공간
                  </label>
                  <span v-if="!selectedRoom" class="text-[0.6875rem] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full animate-pulse">
                    필수 선택
                  </span>
                </div>
                <select v-model="selectedRoom" 
                        :class="[!selectedRoom ? 'text-indigo-600' : 'text-slate-900']"
                        class="w-full bg-transparent border-none p-0 font-black text-sm focus:ring-0 cursor-pointer outline-none">
                  <option :value="null" disabled>예약할 공간을 선택해 주세요</option>
                  <option v-for="r in rooms" :key="r.id" :value="r" class="text-slate-900">
                    [{{ r.floor }}{{ String(r.floor).includes('B') ? '' : 'F' }}] {{ r.room_name }}
                  </option>
                </select>
              </div>

              <!-- Date Range Selection (Start Date ~ End Date) -->
              <div class="bg-white p-4 rounded-3xl border border-slate-200/60 shadow-sm space-y-2.5 transition-all">
                <div class="flex items-center justify-between">
                  <label class="flex items-center gap-1.5 text-[0.75rem] font-black text-slate-400 uppercase tracking-widest">
                    <CalendarIcon class="w-3.5 h-3.5 text-indigo-500" />
                    예약 기간 (시작일 ~ 종료일)
                  </label>
                  <span v-if="bookingDatesInRange.length > 1" class="text-[0.6875rem] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                    연속 {{ bookingDatesInRange.length }}일
                  </span>
                </div>
                <div class="grid grid-cols-2 gap-3">
                  <div class="bg-slate-50 px-3 py-2 rounded-2xl border border-slate-200/60 focus-within:border-indigo-500 focus-within:bg-white transition-all">
                    <span class="block text-[0.625rem] font-black text-slate-400 mb-0.5">시작 일자</span>
                    <input type="date" v-model="bookingDate" :min="formatDate(new Date())"
                           class="w-full bg-transparent border-none p-0 font-black text-xs sm:text-sm text-slate-900 focus:ring-0 cursor-pointer outline-none" />
                  </div>
                  <div class="bg-slate-50 px-3 py-2 rounded-2xl border border-slate-200/60 focus-within:border-indigo-500 focus-within:bg-white transition-all">
                    <span class="block text-[0.625rem] font-black text-slate-400 mb-0.5">종료 일자</span>
                    <input type="date" v-model="bookingEndDate" :min="bookingDate || formatDate(new Date())"
                           class="w-full bg-transparent border-none p-0 font-black text-xs sm:text-sm text-slate-900 focus:ring-0 cursor-pointer outline-none" />
                  </div>
                </div>
              </div>

              <!-- 해당 기간/당일 예약 현황 (Simple Badges) -->
              <div class="bg-white p-4 rounded-3xl border border-slate-200/60 shadow-sm space-y-2.5">
                <div class="flex items-center justify-between">
                  <label class="flex items-center gap-1.5 text-[0.75rem] font-black text-slate-500 uppercase tracking-wider">
                    <ClockIcon class="w-3.5 h-3.5 text-indigo-500" />
                    {{ bookingDatesInRange.length > 1 ? '선택 기간 예약 현황' : '당일 예약 현황' }}
                  </label>
                  <span class="text-[0.6875rem] font-bold text-slate-400">
                    {{ bookingDatesInRange.length > 1 ? `${bookingDate} ~ ${bookingEndDate}` : bookingDate }}
                  </span>
                </div>

                <div v-if="!selectedRoom" class="py-3 px-4 text-center bg-indigo-50/50 rounded-2xl border border-dashed border-indigo-200">
                  <p class="text-xs font-bold text-indigo-600">먼저 예약할 공간을 선택해 주세요.</p>
                </div>
                <div v-else-if="currentRoomSchedule.length === 0" class="py-3 px-4 text-center bg-slate-50/80 rounded-2xl border border-dashed border-slate-200">
                  <p class="text-xs font-bold text-slate-400">
                    {{ bookingDatesInRange.length > 1 ? '선택한 기간에 예약 내역이 없습니다. (원하는 시간에 예약 가능)' : '당일 예약 내역이 없습니다. (원하는 시간에 예약 가능)' }}
                  </p>
                </div>
                <div v-else class="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1 custom-scrollbar">
                  <div v-for="item in currentRoomSchedule" :key="item.id"
                       class="inline-flex items-center rounded-xl border overflow-hidden shadow-xs text-xs transition-all"
                       :class="item.type === 'blocked' ? 'border-rose-200 bg-rose-50/60' : 'border-slate-200 bg-white'">
                    <span class="px-2 py-0.5 font-black text-[0.6875rem] font-mono tracking-tight shrink-0 flex items-center gap-1"
                          :class="item.type === 'blocked' ? 'bg-rose-100 text-rose-700' : 'bg-slate-800 text-white'">
                      <span class="w-1.5 h-1.5 rounded-full" :class="item.type === 'blocked' ? 'bg-rose-500' : 'bg-emerald-400'"></span>
                      <span v-if="item.shortDate" class="opacity-80 mr-0.5">[{{ item.shortDate }}]</span>
                      {{ item.start_time }} - {{ item.end_time }}
                    </span>
                    <span class="px-2 py-0.5 font-bold text-xs truncate max-w-[200px] flex items-center gap-1"
                          :class="item.type === 'blocked' ? 'text-rose-800' : 'text-slate-800'">
                      <span>{{ item.title }}</span>
                      <span v-if="item.requester_name" class="text-[0.625rem] font-normal text-slate-400">({{ item.requester_name }})</span>
                    </span>
                  </div>
                </div>
              </div>

              <!-- Time Selection Row -->
              <div class="space-y-2">
                <div class="grid grid-cols-2 gap-3">
                  <!-- Start Time -->
                  <div class="bg-white p-3 rounded-2xl border shadow-sm transition-all"
                       :class="[timeConflictError ? 'border-rose-300 bg-rose-50/20' : 'border-slate-200/60 focus-within:border-indigo-500']">
                    <label class="text-[0.75rem] font-black mb-1.5 block uppercase tracking-widest text-center"
                           :class="[timeConflictError ? 'text-rose-400' : 'text-slate-400']">시작 시간</label>
                    <div class="flex items-center gap-1">
                      <select :value="getAmPm(form.start_time)" @change="e => updateTime('start', 'ampm', e.target.value, form.start_time)" 
                              class="flex-1 min-w-0 bg-slate-50 border-none rounded-lg py-1.5 px-1 font-black text-[0.75rem] text-slate-700 focus:ring-1 focus:ring-indigo-500/20 appearance-none text-center cursor-pointer outline-none">
                        <option v-for="opt in ampmOptions" :key="opt" :value="opt">{{ opt }}</option>
                      </select>
                      <select :value="getHour12(form.start_time)" @change="e => updateTime('start', 'hour', e.target.value, form.start_time)" 
                              class="flex-1 min-w-0 bg-slate-50 border-none rounded-lg py-1.5 px-1 font-black text-[0.75rem] text-slate-700 focus:ring-1 focus:ring-indigo-500/20 appearance-none text-center cursor-pointer outline-none">
                        <option v-for="h in hourOptions" :key="h" :value="h">{{ h }}시</option>
                      </select>
                      <select :value="getMinute(form.start_time)" @change="e => updateTime('start', 'minute', e.target.value, form.start_time)" 
                              class="flex-1 min-w-0 bg-slate-50 border-none rounded-lg py-1.5 px-1 font-black text-[0.75rem] text-slate-700 focus:ring-1 focus:ring-indigo-500/20 appearance-none text-center cursor-pointer outline-none">
                        <option v-for="m in minuteOptions" :key="m" :value="m">{{ m }}분</option>
                      </select>
                    </div>
                  </div>

                  <!-- End Time -->
                  <div class="bg-white p-3 rounded-2xl border shadow-sm transition-all"
                       :class="[timeConflictError ? 'border-rose-300 bg-rose-50/20' : 'border-slate-200/60 focus-within:border-indigo-500']">
                    <label class="text-[0.75rem] font-black mb-1.5 block uppercase tracking-widest text-center"
                           :class="[timeConflictError ? 'text-rose-400' : 'text-slate-400']">종료 시간</label>
                    <div class="flex items-center gap-1">
                      <select :value="getAmPm(form.end_time)" @change="e => updateTime('end', 'ampm', e.target.value, form.end_time)" 
                              class="flex-1 min-w-0 bg-slate-50 border-none rounded-lg py-1.5 px-1 font-black text-[0.75rem] text-slate-700 focus:ring-1 focus:ring-indigo-500/20 appearance-none text-center cursor-pointer outline-none">
                        <option v-for="opt in ampmOptions" :key="opt" :value="opt">{{ opt }}</option>
                      </select>
                      <select :value="getHour12(form.end_time)" @change="e => updateTime('end', 'hour', e.target.value, form.end_time)" 
                              class="flex-1 min-w-0 bg-slate-50 border-none rounded-lg py-1.5 px-1 font-black text-[0.75rem] text-slate-700 focus:ring-1 focus:ring-indigo-500/20 appearance-none text-center cursor-pointer outline-none">
                        <option v-for="h in hourOptions" :key="h" :value="h">{{ h }}시</option>
                      </select>
                      <select :value="getMinute(form.end_time)" @change="e => updateTime('end', 'minute', e.target.value, form.end_time)" 
                              class="flex-1 min-w-0 bg-slate-50 border-none rounded-lg py-1.5 px-1 font-black text-[0.75rem] text-slate-700 focus:ring-1 focus:ring-indigo-500/20 appearance-none text-center cursor-pointer outline-none">
                        <option v-for="m in minuteOptions" :key="m" :value="m">{{ m }}분</option>
                      </select>
                    </div>
                  </div>
                </div>

                <!-- Immediate '예약 불가' message under time selectors -->
                <div v-if="timeConflictError" class="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2.5 animate-in fade-in duration-200">
                  <span class="text-[0.625rem] font-black bg-rose-500 text-white px-2 py-0.5 rounded-md shrink-0">예약 불가</span>
                  <p class="text-xs font-bold text-rose-600 leading-tight">{{ timeConflictError }}</p>
                </div>
              </div>

              <!-- Application Title Input -->
              <div class="bg-white p-4 rounded-3xl border border-slate-200/60 shadow-sm group focus-within:border-indigo-500 transition-all">
                <label class="flex items-center gap-1.5 text-[0.75rem] font-black text-slate-400 mb-1 uppercase tracking-widest">
                  <SparklesIcon class="w-3 h-3" />
                  신청명
                </label>
                <input type="text" v-model="form.title" placeholder="무엇을 위한 예약인가요?" 
                       class="w-full bg-transparent border-none p-0 font-black text-lg text-slate-900 placeholder:text-slate-200 focus:ring-0 outline-none" />
              </div>

              <!-- Recurring Options -->
              <div class="bg-white p-4 rounded-3xl border border-slate-200/60 shadow-sm space-y-3 transition-all">
                <div class="flex items-center justify-between">
                  <label class="flex items-center gap-1.5 text-[0.75rem] font-black text-slate-400 uppercase tracking-widest">
                    <ArrowPathIcon class="w-3 h-3" />
                    반복 예약 설정
                  </label>
                  <button type="button" @click="form.is_recurring = !form.is_recurring" 
                          :class="[form.is_recurring ? 'bg-indigo-600' : 'bg-slate-200']"
                          class="w-8 h-4 rounded-full relative transition-colors duration-200 focus:outline-none">
                    <div :class="[form.is_recurring ? 'translate-x-4' : 'translate-x-1']"
                         class="absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform duration-200 shadow-sm"></div>
                  </button>
                </div>
                
                <div v-if="form.is_recurring" class="pt-3 border-t border-slate-50 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div class="flex gap-1.5">
                    <button v-for="type in [['daily', '매일'], ['weekly', '매주'], ['monthly', '매월']]" :key="type[0]"
                            type="button"
                            @click="form.recurring_type = type[0]"
                            :class="[form.recurring_type === type[0] ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200']"
                            class="flex-1 py-1.5 rounded-lg text-[0.75rem] font-black uppercase tracking-widest transition-all">
                      {{ type[1] }}
                    </button>
                  </div>

                  <!-- Weekly Days Selection -->
                  <div v-if="form.recurring_type === 'weekly'" class="space-y-2">
                    <label class="text-[0.625rem] font-black text-slate-400 uppercase tracking-widest ml-1">요일 선택 (중복 가능)</label>
                    <div class="flex justify-between gap-1">
                      <button v-for="(day, idx) in ['일', '월', '화', '수', '목', '금', '토']" :key="idx"
                              type="button"
                              @click="toggleRecurringDay(idx)"
                              :class="[form.recurring_days.includes(idx) ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-50 text-slate-400 border-slate-100']"
                              class="w-8 h-8 rounded-lg border text-[0.6875rem] font-black transition-all">
                        {{ day }}
                      </button>
                    </div>
                  </div>

                  <!-- Monthly Options -->
                  <div v-if="form.recurring_type === 'monthly'" class="space-y-3">
                    <div class="flex gap-2">
                      <button type="button" @click="form.recurring_month_option = 'date'"
                              :class="[form.recurring_month_option === 'date' ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-white text-slate-400 border-slate-100']"
                              class="flex-1 py-2 rounded-xl border text-[0.6875rem] font-black transition-all">매월 특정 일자</button>
                      <button type="button" @click="form.recurring_month_option = 'nth'"
                              :class="[form.recurring_month_option === 'nth' ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-white text-slate-400 border-slate-100']"
                              class="flex-1 py-2 rounded-xl border text-[0.6875rem] font-black transition-all">매월 특정 주차</button>
                    </div>

                    <!-- Monthly by Date -->
                    <div v-if="form.recurring_month_option === 'date'" class="flex items-center gap-2 px-1">
                      <select v-model="form.recurring_month_date" class="flex-1 bg-slate-50 border border-slate-100 rounded-lg py-2 px-3 font-black text-xs text-slate-700 focus:ring-1 focus:ring-indigo-500/20 outline-none">
                        <option v-for="d in 31" :key="d" :value="d">{{ d }}일</option>
                      </select>
                      <span class="text-[0.625rem] font-black text-slate-400 uppercase tracking-widest">에 반복</span>
                    </div>

                    <!-- Monthly by Nth Week -->
                    <div v-if="form.recurring_month_option === 'nth'" class="flex items-center gap-2 px-1">
                      <select v-model="form.recurring_month_nth_week" class="flex-1 bg-slate-50 border border-slate-100 rounded-lg py-2 px-2 font-black text-xs text-slate-700 focus:ring-1 focus:ring-indigo-500/20 outline-none">
                        <option v-for="n in 5" :key="n" :value="n">{{ n }}째주</option>
                      </select>
                      <select v-model="form.recurring_month_nth_day" class="flex-1 bg-slate-50 border border-slate-100 rounded-lg py-2 px-2 font-black text-xs text-slate-700 focus:ring-1 focus:ring-indigo-500/20 outline-none">
                        <option v-for="(d, i) in ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']" :key="i" :value="i">{{ d }}</option>
                      </select>
                      <span class="text-[0.625rem] font-black text-slate-400 uppercase tracking-widest">에 반복</span>
                    </div>
                  </div>

                  <div class="bg-slate-50 p-3 rounded-xl border border-slate-100 relative group cursor-pointer" @click="toggleRecurringCalendar">
                    <label class="block text-[0.625rem] font-black text-slate-400 mb-1 uppercase tracking-widest cursor-pointer group-hover:text-indigo-500 transition-colors">반복 종료일</label>
                    <div class="flex items-center justify-between">
                      <span class="font-black text-xs text-slate-700 group-hover:text-indigo-600 transition-colors">{{ form.recurring_end_date || '날짜 선택' }}</span>
                      <CalendarIcon class="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                    </div>
                  </div>
                </div>
              </div>

              <!-- Requester Info Grid -->
              <div class="grid grid-cols-2 gap-3">
                <div class="bg-white p-4 rounded-3xl border border-slate-200/60 shadow-sm">
                  <label class="block text-[0.75rem] font-black text-slate-400 mb-1 uppercase tracking-widest">신청자 성함</label>
                  <input type="text" v-model="form.requester_name" placeholder="홍길동" 
                         class="w-full bg-transparent border-none p-0 font-black text-sm text-slate-900 placeholder:text-slate-200 focus:ring-0 outline-none" />
                </div>
                <div class="bg-white p-4 rounded-3xl border border-slate-200/60 shadow-sm">
                  <label class="block text-[0.75rem] font-black text-slate-400 mb-1 uppercase tracking-widest">연락처</label>
                  <input type="tel" v-model="form.requester_phone" placeholder="010-0000-0000" 
                         class="w-full bg-transparent border-none p-0 font-black text-sm text-slate-900 placeholder:text-slate-200 focus:ring-0 outline-none" />
                </div>
              </div>

              <!-- Reason TextArea -->
              <div class="bg-white p-4 rounded-3xl border border-slate-200/60 shadow-sm">
                <label class="block text-[0.75rem] font-black text-slate-400 mb-1 uppercase tracking-widest">예약 사유</label>
                <textarea v-model="form.reason" class="w-full bg-transparent border-none p-0 font-bold text-xs text-slate-700 placeholder:text-slate-200 focus:ring-0 h-16 resize-none outline-none" placeholder="사용 목적 입력..."></textarea>
              </div>
            </template>

            <template v-else-if="bookingStep === 'agreement'">
              <div class="animate-in fade-in zoom-in duration-300 space-y-6 py-4">
                <div class="bg-indigo-50 p-6 rounded-[2rem] border border-indigo-100">
                  <h3 id="admin-agreement-title" tabindex="-1" class="text-base font-black text-indigo-900 mb-4 flex items-center gap-2 outline-none">
                    <InformationCircleIcon class="w-5 h-5" />
                    공간 사용 수칙 동의
                  </h3>
                  <ul class="space-y-4">
                    <li v-for="(rule, idx) in spaceRules" :key="idx" class="flex flex-col gap-2" :class="{ 'border-t border-indigo-100/50 pt-4': idx > 0 }">
                      <div class="flex gap-3">
                        <span class="shrink-0 w-5 h-5 bg-white rounded-full flex items-center justify-center text-[0.625rem] font-black text-indigo-600 shadow-sm">0{{ idx + 1 }}</span>
                        <div>
                          <p class="text-sm font-black text-slate-800">{{ rule.title }}</p>
                          <p class="text-sm font-bold text-slate-600 mt-1 leading-snug">{{ rule.desc }}</p>
                        </div>
                      </div>
                      <label class="flex items-center gap-2 self-end cursor-pointer group">
                        <span class="text-[0.6875rem] font-bold text-slate-500 uppercase tracking-widest">동의:</span>
                        <div class="w-5 h-5 rounded border flex items-center justify-center transition-all"
                             :class="[ruleAgreements[idx] ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white group-hover:border-indigo-300']">
                          <svg v-if="ruleAgreements[idx]" class="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <span class="text-xs font-bold text-slate-600">예</span>
                        <input type="checkbox" v-model="ruleAgreements[idx]" class="hidden" />
                      </label>
                    </li>
                  </ul>
                </div>

                <div class="space-y-3 mt-6">
                  <label class="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-[1.5rem] cursor-pointer hover:border-indigo-500 transition-all group"
                         :class="{ 'border-indigo-500 bg-indigo-50/30': isAllAgreed }">
                    <div class="relative flex items-center justify-center w-6 h-6 shrink-0">
                      <input type="checkbox" v-model="isAllAgreed" class="peer appearance-none w-6 h-6 border-2 border-slate-200 rounded-lg checked:bg-indigo-600 checked:border-indigo-600 transition-all cursor-pointer" />
                      <svg class="absolute w-4 h-4 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="4">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span class="text-sm font-black text-slate-700">전체동의</span>
                  </label>

                  <label class="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-[1.5rem] cursor-pointer hover:border-indigo-500 transition-all group"
                         :class="{ 'border-indigo-500 bg-indigo-50/30': isAgreed }">
                    <div class="relative flex items-center justify-center w-6 h-6 shrink-0">
                      <input type="checkbox" v-model="isAgreed" class="peer appearance-none w-6 h-6 border-2 border-slate-200 rounded-lg checked:bg-indigo-600 checked:border-indigo-600 transition-all cursor-pointer" />
                      <svg class="absolute w-4 h-4 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="4">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span class="text-sm font-black text-slate-700">위 수칙을 확인했으며 이에 동의 합니다.</span>
                  </label>
                </div>
              </div>
            </template>
          </div>

          <!-- Footer Actions (Fixed) -->
          <div class="px-8 py-6 bg-white border-t border-slate-100 flex items-center gap-3 shrink-0">
            <button type="button" @click="bookingStep === 'agreement' ? bookingStep = 'form' : showBookingModal = false" 
                    class="px-6 py-3 bg-slate-100 border border-slate-200/60 rounded-2xl text-[0.6875rem] font-black text-slate-600 hover:bg-slate-200 hover:text-slate-900 hover:border-slate-300 transition-all uppercase tracking-widest">
              {{ bookingStep === 'agreement' ? '이전으로' : '취소' }}
            </button>
            <button type="button" @click="submitBooking" 
                    :disabled="bookingStep === 'form' && !!timeConflictError"
                    :class="[bookingStep === 'form' && !!timeConflictError ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none' : 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 hover:bg-indigo-700']"
                    class="flex-1 py-3 px-6 rounded-2xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2">
              {{ bookingStep === 'agreement' ? '🗓 최종 신청하기' : '🗓 예약 신청하기' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Modal: Recurring End Date Calendar -->
    <Teleport to="body">
      <div v-if="showRecurringCalendar" class="fixed inset-0 z-[5000]" @click="showRecurringCalendar = false"></div>
      <div v-if="showRecurringCalendar" 
           :style="{ 
             top: recurringCalendarPosition.top !== undefined ? recurringCalendarPosition.top + 'px' : 'auto', 
             bottom: recurringCalendarPosition.bottom !== undefined ? recurringCalendarPosition.bottom + 'px' : 'auto', 
             left: recurringCalendarPosition.left + 'px' 
           }" 
           class="fixed z-[5001] bg-white rounded-[2rem] shadow-2xl border border-slate-200/60 p-6 w-[320px] transform -translate-x-1/2"
           :class="{'translate-x-0': recurringCalendarPosition.left < 160}">
         <div class="flex justify-between items-center mb-6">
           <div class="flex items-center gap-2">
             <h4 class="text-sm font-black text-slate-900">{{ recurringCalendarDate.getFullYear() }}년 {{ recurringCalendarDate.getMonth() + 1 }}월</h4>
           </div>
           <div class="flex gap-1">
             <button type="button" @click.stop="moveRecurringCalendarYear(-1)" class="p-1.5 text-slate-300 hover:text-indigo-600 transition-colors"><ChevronDoubleLeftIcon class="w-3.5 h-3.5" /></button>
             <button type="button" @click.stop="moveRecurringCalendarMonth(-1)" class="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors"><ChevronLeftIcon class="w-4 h-4" /></button>
             <button type="button" @click.stop="moveRecurringCalendarMonth(1)" class="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors"><ChevronRightIcon class="w-4 h-4" /></button>
             <button type="button" @click.stop="moveRecurringCalendarYear(1)" class="p-1.5 text-slate-300 hover:text-indigo-600 transition-colors"><ChevronDoubleRightIcon class="w-3.5 h-3.5" /></button>
           </div>
         </div>
         <div class="grid grid-cols-7 gap-1 mb-2">
           <div v-for="d in ['일', '월', '화', '수', '목', '금', '토']" :key="d" class="text-[0.75rem] font-black text-slate-300 text-center uppercase tracking-widest">{{ d }}</div>
         </div>
         <div class="grid grid-cols-7 gap-1">
           <button v-for="(d, idx) in recurringCalendarDays" :key="idx" type="button" @click.stop="selectRecurringDate(d.date)"
                   :class="[d.current ? 'text-slate-700' : 'text-slate-200', form.recurring_end_date === formatDate(d.date) ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-slate-50']"
                   class="aspect-square flex flex-col items-center justify-center rounded-lg transition-all">
             <span class="text-[0.6875rem] font-black">{{ d.day }}</span>
             <span v-if="getHoliday(formatDate(d.date))" class="w-1 h-1 bg-rose-500 rounded-full mt-0.5"></span>
           </button>
         </div>
      </div>
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

.hover-stripe-blue:hover {
  background: repeating-linear-gradient(
    45deg,
    rgba(79, 70, 229, 0.08),
    rgba(79, 70, 229, 0.08) 8px,
    rgba(79, 70, 229, 0.15) 8px,
    rgba(79, 70, 229, 0.15) 16px
  ) !important;
  box-shadow: inset 0 0 0 1px rgba(79, 70, 229, 0.2);
}

.selected-stripe-blue {
  background: repeating-linear-gradient(
    45deg,
    rgba(79, 70, 229, 0.2),
    rgba(79, 70, 229, 0.2) 10px,
    rgba(79, 70, 229, 0.3) 10px,
    rgba(79, 70, 229, 0.3) 20px
  );
  border-left: 2px solid #4f46e5;
  border-right: 2px solid #4f46e5;
}

.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
</style>
