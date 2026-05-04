<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import axios from 'axios'
import { useAuthStore } from '@/store/auth'
import { 
  ChevronLeftIcon, ChevronRightIcon, 
  ChevronDoubleLeftIcon, ChevronDoubleRightIcon,
  CalendarIcon, MagnifyingGlassIcon,
  ViewColumnsIcon, ListBulletIcon,
  ClockIcon, XMarkIcon, SparklesIcon,
  ChevronDownIcon, ChevronRightIcon as ChevronRightIconSmall,
  MapPinIcon, UsersIcon, InformationCircleIcon, LightBulbIcon,
  ArrowPathIcon
} from '@heroicons/vue/24/outline'
import { getHoliday } from '@/utils/holidays'
import { useModalStore } from '@/stores/useModalStore'

const modal = useModalStore()

const formatDate = (date) => {
  if (!date) return ''
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const authStore = useAuthStore()
const rooms = ref([])
const reservations = ref([])
const selectedDate = ref(formatDate(new Date()))
const viewMode = ref('calendar') // 'calendar' or 'list'
const calendarSubMode = ref('month') // 'month', 'week', 'day'
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
const hoveredRoom = ref(null)
const roomTooltipPos = ref({ x: 0, y: 0 })

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
  selectedDate.value = formatDate(date)
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
  
  // Start from the Sunday of the first week
  const startDate = new Date(firstDay)
  startDate.setDate(1 - firstDay.getDay())
  
  const days = []
  const tempDate = new Date(startDate)
  
  // Fill 42 days (6 weeks) or until the end of the month's last week
  // To avoid the user's issue with extra rows, we only fill up to the week that contains the last day
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

// Sync calendarDate when selectedDate changes (from main header arrows)
watch(selectedDate, (newVal) => {
  const d = new Date(newVal + 'T00:00:00')
  if (d.getFullYear() !== calendarDate.value.getFullYear() || d.getMonth() !== calendarDate.value.getMonth()) {
    calendarDate.value = new Date(d.getFullYear(), d.getMonth(), 1)
  }
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

const isMyReservation = computed(() => {
  if (!detailReservation.value || !authStore.user) return false
  return detailReservation.value.requester_id === authStore.user.id
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
  if (target === 'start') form.value.start_time = timeStr
  else form.value.end_time = timeStr
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

const dayTimeSlots = computed(() => {
  const slots = []
  for (let h = 9; h <= 23; h++) {
    slots.push(`${h.toString().padStart(2, '0')}:00`)
  }
  slots.push('24:00')
  return slots
})

const filteredReservations = computed(() => {
  return reservations.value.filter(res => {
    const matchesSearch = !searchQuery.value || 
      res.requester_name.includes(searchQuery.value) || 
      (res.title && res.title.includes(searchQuery.value))
    
    if (statusFilter.value !== 'all' && res.status !== statusFilter.value) return false
    
    // 목록형일 경우 종료된 예약은 제외
    if (viewMode.value === 'list') {
      const datePart = String(res.reservation_date).substring(0, 10)
      const resEndStr = `${datePart} ${res.end_time}`
      
      const now = currentTime.value
      const nowStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      
      if (resEndStr < nowStr) return false
    }

    return matchesSearch
  }).sort((a, b) => {
    if (a.reservation_date !== b.reservation_date) {
      return a.reservation_date.localeCompare(b.reservation_date)
    }
    return a.start_time.localeCompare(b.start_time)
  })
})

const fetchData = async () => {
  try {
    let url = `/api/reservations`
    const d = new Date(selectedDate.value + 'T00:00:00')
    
    // Always use calendarSubMode logic even for List View
    if (calendarSubMode.value === 'month') {
      const start = new Date(d.getFullYear(), d.getMonth(), 1)
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0)
      url += `?start_date=${formatDate(start)}&end_date=${formatDate(end)}`
    } else if (calendarSubMode.value === 'week') {
      const start = new Date(d)
      start.setDate(d.getDate() - d.getDay())
      const end = new Date(start)
      end.setDate(start.getDate() + 6)
      url += `?start_date=${formatDate(start)}&end_date=${formatDate(end)}`
    } else {
      url += `?date=${selectedDate.value}`
    }

    const [roomsRes, resvRes] = await Promise.all([
      axios.get('/api/rooms'),
      axios.get(url)
    ])
    rooms.value = roomsRes.data
    reservations.value = resvRes.data
    
    if (expandedFloors.value.length === 0 && roomsRes.data.length > 0) {
      // 3층은 접고, B3 포함 나머지 층은 펼침
      expandedFloors.value = floors.value.filter(f => f !== '3')
    }
  } catch (err) {
    console.error('Failed to fetch data:', err)
  }
}

watch([selectedDate, calendarSubMode, viewMode], fetchData)

const toggleFloor = (floor) => {
  const idx = expandedFloors.value.indexOf(floor)
  if (idx > -1) expandedFloors.value.splice(idx, 1)
  else expandedFloors.value.push(floor)
}

const isFloorExpanded = (floor) => expandedFloors.value.includes(floor)

const getReservationsForRoom = (roomId) => {
  return reservations.value.filter(r => r.room_id === roomId)
}

const getBlockedForRoomAndDate = (room, date) => {
  if (!room || !room.blocked_times) return []
  const d = new Date(date + 'T00:00:00')
  const dow = d.getDay()
  const dom = d.getDate()
  const nth = Math.ceil(dom / 7)
  
  return room.blocked_times.filter(bt => {
    if (bt.recurring_type === 'daily') {
      return true
    } else if (bt.recurring_type === 'monthly_date') {
      return bt.day_of_month == dom
    } else if (bt.recurring_type === 'monthly_nth') {
      return bt.nth_week == nth && bt.day_of_week == dow
    } else {
      // Default to weekly
      return bt.day_of_week == dow
    }
  })
}

const isSlotBlocked = (room, date, time) => {
  const blocked = getBlockedForRoomAndDate(room, date)
  return blocked.some(bt => {
    const t = time.slice(0, 5)
    return t >= bt.start_time.slice(0, 5) && t < bt.end_time.slice(0, 5)
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


const editForm = ref({
  title: '',
  reservation_date: '',
  start_time: '',
  end_time: '',
  reason: ''
})

const openBooking = (room, time = '09:00', date = null) => {
  if (date) selectedDate.value = date
  selectedRoom.value = room
  form.value = {
    title: '',
    start_time: time,
    end_time: '',
    reason: '',
    is_recurring: false,
    recurring_type: 'weekly',
    recurring_end_date: '',
    requester_name: authStore.user?.userName || '',
    requester_phone: authStore.user?.phone || ''
  }

  const [h, m] = time.split(':').map(Number)
  let endH = h, endM = m + 30
  if (endM >= 60) { endH += 1; endM = 0 }
  form.value.end_time = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`
  
  const endDate = new Date()
  endDate.setMonth(endDate.getMonth() + 1)
  form.value.recurring_end_date = formatDate(endDate)
  showBookingModal.value = true
}

// Recurring Calendar Logic
const showRecurringCalendar = ref(false)
const recurringCalendarDate = ref(new Date())
const recurringCalendarPosition = ref({ top: 0, left: 0 })

const toggleRecurringCalendar = (event) => {
  const rect = event.currentTarget.getBoundingClientRect()
  recurringCalendarPosition.value = {
    top: rect.bottom,
    left: rect.left
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
  d.setMonth(d.getMonth() + offset)
  recurringCalendarDate.value = d
}

const moveRecurringCalendarYear = (offset) => {
  const d = new Date(recurringCalendarDate.value)
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
  if (!form.value.requester_name?.trim()) return modal.showAlert('신청자 이름을 입력해주세요.')
  if (!form.value.requester_phone?.trim()) return modal.showAlert('연락처를 입력해주세요.')
  
  if (form.value.is_recurring) {
    if (!form.value.recurring_end_date) return modal.showAlert('반복 종료일을 선택해 주세요.')
    if (form.value.recurring_type === 'weekly' && form.value.recurring_days.length === 0) {
      return modal.showAlert('반복할 요일을 하나 이상 선택해 주세요.')
    }
  }

  try {
    await axios.post('/api/reservations', {
      ...form.value,
      room_id: selectedRoom.value.id,
      reservation_date: selectedDate.value
    })
    modal.showAlert('예약 신청이 완료되었습니다.')
    showBookingModal.value = false
    fetchData()
  } catch (e) {
    modal.showAlert(e.response?.data?.message || '예약 중 오류가 발생했습니다.')
  }
}

const submitInquiry = async () => {
  await axios.post('/api/reservations/inquiry', {
    reservation_id: selectedReservation.value.id,
    content: inquiryContent.value
  })
  modal.showAlert('문의가 전송되었습니다.')
  showInquiryModal.value = false
}

const changeDate = (days) => {
  const d = new Date(selectedDate.value + 'T00:00:00')
  if (calendarSubMode.value === 'month') {
    d.setMonth(d.getMonth() + (days > 0 ? 1 : -1))
    d.setDate(1)
  } else if (calendarSubMode.value === 'week') {
    d.setDate(d.getDate() + (days > 0 ? 7 : -7))
  } else {
    d.setDate(d.getDate() + days)
  }
  selectedDate.value = formatDate(d)
}

const getReservationsForDate = (date) => {
  return reservations.value
    .filter(r => r.reservation_date === date && (r.status === 'approved' || r.status === 'pending'))
    .sort((a, b) => a.start_time.localeCompare(b.start_time))
}

const getReservationsForRoomAndDate = (roomId, date) => {
  return reservations.value
    .filter(r => r.room_id === roomId && r.reservation_date === date && (r.status === 'approved' || r.status === 'pending'))
    .sort((a, b) => a.start_time.localeCompare(b.start_time))
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
  if (res.reservation_date === formatDate(today)) {
    const [h, m] = res.end_time.split(':').map(Number)
    const nowH = currentTime.value.getHours()
    const nowM = currentTime.value.getMinutes()
    return (h < nowH) || (h === nowH && m <= nowM)
  }
  return false
}

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

const handleRoomMouseEnter = (room, event) => {
  hoveredRoom.value = room
  updateRoomTooltipPos(event)
}

const handleRoomMouseMove = (event) => {
  updateRoomTooltipPos(event)
}

const handleRoomMouseLeave = () => {
  hoveredRoom.value = null
}

const updateRoomTooltipPos = (event) => {
  let x = event.clientX + 15
  let y = event.clientY - 20
  
  // Approximate tooltip dimensions (based on max-w-[320px] and estimated content height)
  const tooltipWidth = 320
  const tooltipHeight = 400
  
  // Check right edge
  if (x + tooltipWidth > window.innerWidth) {
    x = event.clientX - tooltipWidth - 15
  }
  
  // Check bottom edge
  if (y + tooltipHeight > window.innerHeight) {
    y = event.clientY - tooltipHeight + 20
  }
  
  // Safety check for top edge
  if (y < 10) y = 10
  if (x < 10) x = 10

  roomTooltipPos.value = { x, y }
}

const isDragging = ref(false)
const dragStartSlot = ref(null)
const dragEndSlot = ref(null)
const dragRoomId = ref(null)

const handleMouseDown = (room, time) => {
  if (isSlotBlocked(room, selectedDate.value, time)) return
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
    let endH = h + 1, endM = m // Day view cells are 1 hour
    if (endH >= 24) endH = 23
    
    openBooking(room, startTime)
    form.value.end_time = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`
  }
  isDragging.value = false
}

const getSelectionStyle = (roomId) => {
  if (!isDragging.value || dragRoomId.value !== roomId || !dragStartSlot.value || !dragEndSlot.value) return { display: 'none' }
  const idx1 = dayTimeSlots.value.indexOf(dragStartSlot.value)
  const idx2 = dayTimeSlots.value.indexOf(dragEndSlot.value)
  const startIdx = Math.min(idx1, idx2)
  const endIdx = Math.max(idx1, idx2)
  return {
    left: `${startIdx * 80}px`,
    width: `${(endIdx - startIdx + 1) * 80}px`,
    backgroundColor: 'rgba(79, 70, 229, 0.15)',
    border: '2px solid rgba(79, 70, 229, 0.4)',
    zIndex: 10,
    pointerEvents: 'none'
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
    modal.showAlert('문의가 등록되었습니다.')
  } catch (err) { modal.showAlert('문의 등록 실패') }
}

const submitAnswer = async (inquiryId) => {
  const answer = answerContents.value[inquiryId]
  if (!answer?.trim()) return
  try {
    await axios.put(`/api/reservations/inquiry/${inquiryId}`, { answer })
    fetchInquiries(detailReservation.value.id)
    modal.showAlert('답변이 등록되었습니다.')
  } catch (err) { modal.showAlert('답변 등록 실패') }
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
    modal.showAlert('예약이 수정되었습니다.')
    isEditing.value = false
    fetchData()
    detailReservation.value = { ...detailReservation.value, ...editForm.value }
  } catch (err) { modal.showAlert('수정 실패') }
}

const cancelReservation = async (id) => {
  if (!await modal.showConfirm('정말 이 예약을 취소(삭제)하시겠습니까?')) return
  try {
    await axios.delete(`/api/reservations/${id}`)
    modal.showAlert('예약이 취소되었습니다.')
    showDetailModal.value = false
    fetchData()
  } catch (err) {
    modal.showAlert('취소 실패: ' + (err.response?.data?.message || '알 수 없는 오류'))
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
      <!-- Left: View Mode, Calendar SubMode, Date Picker -->
      <div class="flex items-center gap-2">
        <!-- View Mode (Calendar/List) -->
        <div class="bg-slate-100/80 p-0.5 rounded-xl flex gap-0.5 shadow-inner mr-1">
          <button @click="viewMode = 'calendar'" :class="[viewMode === 'calendar' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400']" 
                  class="p-2 rounded-lg transition-all"><CalendarIcon class="w-4 h-4" /></button>
          <button @click="viewMode = 'list'" :class="[viewMode === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400']" 
                  class="p-2 rounded-lg transition-all"><ListBulletIcon class="w-4 h-4" /></button>
        </div>

        <!-- Month, Week, Day Toggles -->
        <div class="bg-slate-100/80 p-0.5 rounded-xl flex gap-1 shadow-inner mr-1">
          <button v-for="m in ['month', 'week', 'day']" :key="m" @click="calendarSubMode = m"
                  :class="[calendarSubMode === m ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700']"
                  class="px-4 py-2 rounded-lg transition-all text-xs font-black uppercase tracking-tight">
            {{ m === 'month' ? '월' : m === 'week' ? '주' : '일' }}
          </button>
        </div>

        <div class="flex items-center bg-white border border-slate-200 rounded-xl shadow-sm p-0.5">
          <button @click="changeDate(-1)" class="p-1.5 hover:bg-slate-50 rounded-lg transition-colors text-slate-400">
            <ChevronLeftIcon class="w-3.5 h-3.5" />
          </button>
          
          <button @click="toggleCalendar" class="px-4 py-1.5 flex items-center gap-3 group hover:bg-slate-50 rounded-lg transition-colors">
            <div class="flex items-center gap-2">
              <span class="text-sm font-black text-slate-800 group-hover:text-indigo-600">{{ formattedDisplayDate }}</span>
              <span v-if="calendarSubMode === 'day' && getHoliday(selectedDate)" class="px-2 py-0.5 bg-rose-100 text-rose-600 rounded-md text-[12px] font-black uppercase">{{ getHoliday(selectedDate) }}</span>
            </div>
            <CalendarIcon class="w-5 h-5 text-indigo-500/50 group-hover:text-indigo-600 transition-colors" />
          </button>

          <button @click="changeDate(1)" class="p-1.5 hover:bg-slate-50 rounded-lg transition-colors text-slate-400">
            <ChevronRightIcon class="w-3.5 h-3.5" />
          </button>
        </div>

        <button @click="selectedDate = formatDate(new Date())" 
                class="px-3 py-2 bg-indigo-50 text-indigo-600 text-[12px] font-black rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm active:scale-95 uppercase tracking-widest">
          Today
        </button>
      </div>

      <!-- Center: Empty (Space reserved for alignment) -->
      <div class="hidden md:block flex-1"></div>

      <!-- Right: Search -->
      <div v-if="viewMode === 'list'" class="flex items-center gap-2 w-full md:w-auto">
        <div class="relative flex-1 md:w-48 group">
          <MagnifyingGlassIcon class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
          <input type="text" v-model="searchQuery" placeholder="신청자명 또는 신청명으로 검색..." 
                 class="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-1.5 pl-9 pr-3 text-xs font-bold text-slate-700 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none" />
        </div>
      </div>
    </header>

    <!-- Sub Header: Legend & Controls -->
    <div class="bg-white border-b border-slate-200/60 px-4 py-1.5 flex justify-between items-center shrink-0 z-20">
      <div class="flex gap-4">
        <div class="flex items-center gap-1.5 text-[12px] font-bold text-slate-500">
          <span class="w-2.5 h-2.5 bg-indigo-600 rounded-sm shadow-sm"></span> 승인완료
        </div>
        <div class="flex items-center gap-1.5 text-[12px] font-bold text-slate-500">
          <span class="w-2.5 h-2.5 bg-amber-400 rounded-sm shadow-sm"></span> 승인대기
        </div>
      </div>
      
    </div>

    <!-- Main Content -->
    <main class="flex-1 overflow-auto relative bg-white">
      <!-- Calendar View -->
      <div v-if="viewMode === 'calendar'" class="h-full flex flex-col">
        <!-- Month View -->
        <div v-if="calendarSubMode === 'month'" class="flex-1 overflow-auto px-12 pb-4">
          <!-- Sticky Header Container to cover top padding area -->
          <div class="sticky top-0 z-30 bg-white pt-4">
            <div class="grid grid-cols-7 gap-px bg-slate-200 border-x border-t border-slate-200 rounded-t-3xl shadow-sm">
              <div v-for="(d, i) in ['일', '월', '화', '수', '목', '금', '토']" :key="d" 
                   :class="[
                     i === 0 ? 'text-rose-600 rounded-tl-[1.4rem]' : 
                     i === 6 ? 'text-blue-600 rounded-tr-[1.4rem]' : 
                     'text-slate-900'
                   ]"
                   class="bg-violet-100 py-3 text-center text-[12px] font-black uppercase tracking-[0.2em] border-b border-violet-200/50 outline outline-1 outline-violet-100">
                {{ d }}
              </div>
            </div>
          </div>

          <!-- Calendar Grid Content -->
          <div class="grid grid-cols-7 gap-px bg-slate-200 border-x border-b border-slate-200 rounded-b-3xl shadow-sm">
            <div v-for="(d, idx) in calendarDays" :key="idx" 
                 @click="selectedDate = formatDate(d.date); calendarSubMode = 'day'"
                 :class="[d.current ? 'bg-white' : 'bg-slate-50/50', selectedDate === formatDate(d.date) ? 'ring-2 ring-inset ring-indigo-500 z-10' : '']"
                 class="min-h-[140px] p-3 transition-colors hover:bg-slate-50/80 group cursor-pointer"
                 :style="idx >= calendarDays.length - 7 ? 'border-bottom-left-radius: (idx === calendarDays.length - 7 ? \'1.4rem\' : \'0\'); border-bottom-right-radius: (idx === calendarDays.length - 1 ? \'1.4rem\' : \'0\');' : ''">
              <div class="flex justify-between items-start mb-2">
                <div class="flex items-center gap-1.5">
                  <span :class="[
                          d.current ? 'text-slate-900' : 'text-slate-300', 
                          d.date.getDay() === 0 || getHoliday(formatDate(d.date)) ? (d.current ? 'text-rose-500' : 'text-rose-300') : 
                          d.date.getDay() === 6 ? (d.current ? 'text-blue-500' : 'text-blue-300') : ''
                        ]" 
                        class="text-xs font-black">{{ d.day }}</span>
                  <span v-if="getHoliday(formatDate(d.date))" 
                        :class="d.current ? 'text-rose-500' : 'text-rose-300'"
                        class="text-[12px] font-black truncate max-w-[80px]">{{ getHoliday(formatDate(d.date)) }}</span>
                </div>
              </div>
              <div class="space-y-1">
                <div v-for="res in getReservationsForDate(formatDate(d.date)).slice(0, 4)" :key="res.id"
                     @click.stop="openDetail(res)"
                     :class="[
                       isEnded(res) ? 'bg-slate-200 text-slate-400 shadow-none' : 
                       res.status === 'pending' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-indigo-600 text-white shadow-sm'
                     ]"
                     class="text-[12px] font-bold px-1.5 py-0.5 rounded truncate cursor-pointer hover:opacity-80 transition-all">
                  <span v-if="res.status === 'pending'" class="text-[12px] opacity-70">[대기]</span>
                  {{ res.start_time.slice(0,5) }} [{{ res.room_name.split(' ')[0] }}] {{ res.title || '예약' }}
                </div>
                <div v-if="getReservationsForDate(formatDate(d.date)).length > 4" class="text-[12px] font-black text-slate-400 pl-1 mt-1">
                  + {{ getReservationsForDate(formatDate(d.date)).length - 4 }}개
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Week View -->
        <div v-else-if="calendarSubMode === 'week'" class="flex-1 overflow-hidden px-12 py-4">
          <div class="h-full border border-slate-200 rounded-3xl overflow-auto shadow-sm bg-white relative">
            <div class="inline-flex flex-col min-w-full">
              <!-- Sticky Header Row -->
              <div class="flex sticky top-0 z-[60]">
                <!-- Corner Header -->
                <div class="w-40 sticky left-0 z-[70] bg-violet-100 border-r border-b border-violet-200/50 flex items-center justify-center px-4 h-12">
                  <span class="text-[12px] font-black text-slate-900 uppercase tracking-widest">Rooms</span>
                </div>
                <!-- Week Dates Header -->
                <div class="flex-1 flex bg-violet-100 border-b border-violet-200/50 h-12">
                  <div v-for="(date, idx) in weekDates" :key="date" 
                       class="flex-1 min-w-[140px] border-r border-slate-100 flex items-center justify-center gap-2">
                    <div class="flex items-center gap-1.5">
                      <span :class="[idx === 0 || getHoliday(date) ? 'text-rose-500' : idx === 6 ? 'text-blue-500' : 'text-slate-600']" 
                            class="text-[12px] font-black uppercase">{{ ['일', '월', '화', '수', '목', '금', '토'][idx] }}</span>
                      <span :class="[date === formatDate(new Date()) ? 'text-indigo-600' : idx === 0 || getHoliday(date) ? 'text-rose-500' : idx === 6 ? 'text-blue-500' : 'text-slate-900']" 
                            class="text-[14px] font-black">{{ date.split('-')[2] }}</span>
                    </div>
                    <span v-if="getHoliday(date)" class="text-[12px] font-black text-rose-500 truncate max-w-[60px]">{{ getHoliday(date) }}</span>
                  </div>
                </div>
              </div>

              <!-- Content Rows -->
              <template v-for="floor in floors" :key="'week-floor-' + floor">
                <!-- Floor Sticky Header Row -->
                <div class="flex sticky top-12 z-[50]">
                  <div class="w-40 sticky left-0 z-[55] bg-slate-900 border-r border-b border-slate-800 h-10 px-4 flex items-center justify-between shadow-lg">
                    <span class="text-[12px] font-black text-white uppercase tracking-widest">{{ floor.includes('B') ? floor : floor + 'F' }}</span>
                    <button @click="toggleFloor(floor)" class="p-1 hover:bg-white/10 rounded transition-colors group/floor">
                      <ChevronDownIcon :class="{'rotate-180': !isFloorExpanded(floor)}" class="w-3.5 h-3.5 text-slate-400 transition-transform group-hover/floor:text-white" />
                    </button>
                  </div>
                  <div class="flex-1 flex bg-slate-50 border-b border-slate-200 h-10">
                    <div v-for="date in weekDates" :key="'floor-pad-' + date" class="flex-1 min-w-[140px] border-r border-slate-200/50"></div>
                  </div>
                </div>

                <!-- Room Rows -->
                <template v-if="isFloorExpanded(floor)">
                  <div v-for="room in roomsByFloor[floor]" :key="'week-room-row-' + room.id" class="flex border-b border-slate-100 group">
                    <!-- Sticky Room Sidebar -->
                    <div class="w-40 sticky left-0 z-30 bg-white border-r border-slate-200 group-hover:bg-violet-50/30 transition-colors h-28 px-4 flex items-center justify-center text-center cursor-help"
                         @mouseenter="handleRoomMouseEnter(room, $event)"
                         @mousemove="handleRoomMouseMove($event)"
                         @mouseleave="handleRoomMouseLeave">
                      <span class="text-[14px] font-bold text-slate-600 line-clamp-3 leading-tight">{{ room.room_name }}</span>
                    </div>
                    <!-- Cells Grid -->
                    <div class="flex-1 flex">
                      <div v-for="date in weekDates" :key="'cell-' + room.id + '-' + date" 
                           @click="selectedDate = date; calendarSubMode = 'day'"
                           class="flex-1 min-w-[140px] border-r border-slate-100 p-2 space-y-1.5 overflow-hidden hover:bg-slate-50/50 transition-colors cursor-pointer">
                        <!-- Blocked Times in Week View -->
                        <div v-for="bt in getBlockedForRoomAndDate(room, date)" :key="'bt-' + bt.id"
                             class="text-[12px] font-black px-1.5 py-1 rounded truncate bg-orange-900/10 text-orange-900/60 border border-dashed border-orange-900/20">
                          <span class="mr-1">[불가]</span> {{ bt.start_time.slice(0,5) }}-{{ bt.end_time.slice(0,5) }} {{ bt.reason || '관리자 설정' }}
                        </div>

                        <div v-for="res in getReservationsForRoomAndDate(room.id, date).slice(0, 2)" :key="res.id"
                             @click.stop="openDetail(res)"
                             :class="[
                               isEnded(res) ? 'bg-slate-100 text-slate-400 border border-slate-200 shadow-none' : 
                               res.status === 'pending' ? 'bg-amber-400 text-white shadow-sm' : 'bg-indigo-600 text-white shadow-sm'
                             ]"
                             class="text-[12px] font-black px-1.5 py-1 rounded truncate transition-all">
                          <span v-if="res.status === 'pending'" class="mr-1 text-[7px] bg-white/30 px-1 rounded">대기</span>
                          ({{ res.start_time.slice(0,5) }}~{{ res.end_time.slice(0,5) }}) {{ res.title || '예약' }}
                        </div>
                        <div v-if="getReservationsForRoomAndDate(room.id, date).length + getBlockedForRoomAndDate(room, date).length > 3" class="text-[12px] font-black text-slate-400 px-1">
                          + {{ getReservationsForRoomAndDate(room.id, date).length + getBlockedForRoomAndDate(room, date).length - 2 }}개
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
        <div v-else-if="calendarSubMode === 'day'" class="flex-1 overflow-hidden px-12 py-4">
          <div class="h-full border border-slate-200 rounded-3xl overflow-auto shadow-sm bg-white relative">
            <div class="inline-flex flex-col min-w-full">
              <!-- Sticky Header Row -->
              <div class="flex sticky top-0 z-[60]">
                <!-- Corner Header -->
                <div class="w-40 sticky left-0 z-[70] bg-violet-100 border-r border-b border-violet-200/50 flex items-center justify-center px-4 h-12">
                  <span class="text-[12px] font-black text-slate-900 uppercase tracking-widest">Rooms</span>
                </div>
                <!-- Time Slots Header -->
                <div class="flex-1 flex bg-violet-100 border-b border-violet-200/50 h-12">
                  <div v-for="time in dayTimeSlots" :key="'day-time-' + time" 
                       class="w-[80px] shrink-0 h-full flex items-center border-r border-slate-100">
                     <span class="text-[12px] font-black text-slate-900 px-2">{{ time }}</span>
                  </div>
                </div>
              </div>

              <!-- Content Rows -->
              <template v-for="floor in floors" :key="'day-floor-' + floor">
                <!-- Floor Sticky Header Row -->
                <div class="flex sticky top-10 z-[50]">
                  <div class="w-40 sticky left-0 z-[55] bg-slate-900 border-r border-b border-slate-800 h-10 px-4 flex items-center justify-between shadow-lg">
                    <span class="text-[12px] font-black text-white uppercase tracking-widest">{{ floor.includes('B') ? floor : floor + 'F' }}</span>
                    <button @click="toggleFloor(floor)" class="p-1 hover:bg-white/10 rounded transition-colors group/floor">
                      <ChevronDownIcon :class="{'rotate-180': !isFloorExpanded(floor)}" class="w-3.5 h-3.5 text-slate-400 transition-transform group-hover/floor:text-white" />
                    </button>
                  </div>
                  <div class="flex-1 flex bg-slate-50 border-b border-slate-200 h-10">
                    <div v-for="time in dayTimeSlots" :key="'day-floor-pad-' + time" class="w-[80px] shrink-0 border-r border-slate-200/50"></div>
                  </div>
                </div>

                <!-- Room Rows -->
                <template v-if="isFloorExpanded(floor)">
                  <div v-for="room in roomsByFloor[floor]" :key="'day-room-row-' + room.id" class="flex border-b border-slate-100 relative group">
                    <!-- Sticky Room Sidebar -->
                    <div class="w-40 sticky left-0 z-30 bg-white border-r border-slate-200 group-hover:bg-violet-50/30 transition-colors h-28 px-4 flex items-center justify-center text-center cursor-help"
                         @mouseenter="handleRoomMouseEnter(room, $event)"
                         @mousemove="handleRoomMouseMove($event)"
                         @mouseleave="handleRoomMouseLeave">
                      <span class="text-[14px] font-bold text-slate-600 line-clamp-3 leading-tight">{{ room.room_name }}</span>
                    </div>
                    <!-- Timeline Grid Area -->
                    <div class="flex-1 relative h-28">
                      <div class="absolute inset-0 flex" @mouseleave="handleMouseUp">
                        <div v-for="time in dayTimeSlots" :key="'cell-' + room.id + '-' + time" 
                             @mousedown="handleMouseDown(room, time)"
                             @mouseover="handleMouseOver(room, time)"
                             :class="[
                               isSlotBlocked(room, selectedDate, time) ? 'bg-slate-100/50 cursor-not-allowed' : 'hover-stripe-blue cursor-crosshair'
                             ]"
                             class="w-[80px] shrink-0 h-full border-r border-slate-100/50 transition-colors relative">
                          <div v-if="isTimeInRange(room, time)" class="absolute inset-0 selected-stripe-blue z-10"></div>
                        </div>
                      </div>

                      <!-- Blocked Areas -->
                      <div class="absolute inset-0 pointer-events-none">
                        <div v-for="bt in getBlockedForRoomAndDate(room, selectedDate)" :key="'day-bt-' + bt.id"
                             :style="getBlockedStyle(bt)"
                             class="absolute top-2 bottom-2 bg-orange-900/10 border border-orange-900/20 z-10 flex items-center justify-center overflow-hidden stripe-bg rounded-lg">
                          <span class="text-[12px] font-black text-orange-900/40 uppercase tracking-tighter whitespace-nowrap rotate-[-10deg]">Reserved for maintenance</span>
                        </div>
                      </div>

                      <!-- Reservations Stack -->
                      <div class="absolute inset-0 pointer-events-none">
                        <template v-for="(res, rIdx) in getReservationsForRoomAndDate(room.id, selectedDate).sort((a,b) => a.start_time.localeCompare(b.start_time)).slice(0, 3)" :key="res.id">
                          <div @click.stop="openDetail(res)"
                               :style="{ ...getDayReservationStyle(res), top: (6 + rIdx * 32) + 'px' }"
                               :class="[
                                 isEnded(res) ? 'bg-slate-100 text-slate-400 border border-slate-200 shadow-none' : 
                                 res.status === 'pending' ? 'bg-amber-400 text-white shadow-md' : 'bg-indigo-600 text-white shadow-sm'
                               ]"
                               class="absolute h-7 rounded flex items-center px-2 text-[12px] font-black truncate z-20 pointer-events-auto cursor-pointer hover:scale-[1.02] transition-transform">
                            <span v-if="res.status === 'pending'" class="mr-1 text-[12px] bg-white/20 px-1.5 py-0.5 rounded-full">대기</span>
                            {{ res.start_time.slice(0,5) }}~{{ res.end_time.slice(0,5) }} | {{ res.title || '예약' }}
                          </div>
                        </template>
                        <div v-if="getReservationsForRoomAndDate(room.id, selectedDate).length > 3" 
                             class="absolute bottom-1.5 right-4 text-[12px] font-black text-slate-400 bg-white/80 px-2 py-0.5 rounded-full border border-slate-100">
                          + {{ getReservationsForRoomAndDate(room.id, selectedDate).length - 3 }}개
                        </div>
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
      <div v-else class="p-6 max-w-6xl mx-auto">
        <div class="flex flex-col md:flex-row gap-4 justify-between items-center mb-8 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
           <div class="flex p-1 bg-slate-100 rounded-xl">
             <button v-for="s in [{ id: 'all', name: '전체' }, { id: 'approved', name: '승인완료' }, { id: 'pending', name: '승인대기' }]" :key="s.id" @click="statusFilter = s.id"
             :class="[statusFilter === s.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500']"
             class="px-5 py-1.5 rounded-lg text-xs font-black transition-all">{{ s.name }}</button>
           </div>
           <div class="text-[12px] font-black text-slate-400 uppercase tracking-widest">Found <span class="text-indigo-600">{{ filteredReservations.length }}</span> items</div>
        </div>
        <div v-if="filteredReservations.length === 0" class="py-24 text-center border-2 border-dashed border-slate-100 rounded-[3rem]">
           <CalendarIcon class="w-12 h-12 text-slate-200 mx-auto mb-4" />
           <p class="text-sm font-black text-slate-300 uppercase tracking-widest">예약 내역이 없습니다</p>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div v-for="res in filteredReservations" :key="'list-res-' + res.id" @click="openDetail(res)"
               :class="[isEnded(res) ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white border-slate-200 hover:border-indigo-600']"
               class="border rounded-2xl p-5 transition-all cursor-pointer group h-full relative">
            <div class="flex justify-between items-start mb-3">
              <div class="flex items-center gap-2">
                <span class="bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-lg text-[12px] font-black uppercase tracking-tighter">{{ res.floor }}{{ res.floor.includes('B') ? '' : 'F' }}</span>
                <span class="text-xs font-black text-slate-900 group-hover:text-indigo-600">{{ res.room_name }}</span>
              </div>
              <span :class="[res.status === 'approved' ? 'bg-indigo-600 text-white' : 'bg-amber-100 text-amber-700']" class="px-2 py-0.5 rounded-md text-[12px] font-black uppercase shadow-sm">{{ res.status === 'approved' ? 'Approved' : 'Pending' }}</span>
            </div>
            <div class="flex items-center gap-2 mb-3">
              <CalendarIcon class="w-3 h-3 text-indigo-500" />
              <span class="text-[12px] font-black text-slate-500">{{ res.reservation_date }} ({{ ['일','월','화','수','목','금','토'][new Date(res.reservation_date).getDay()] }})</span>
            </div>
            <h3 class="text-base font-black text-slate-800 mb-4 leading-tight flex-1">{{ res.title || '신청명 없음' }}</h3>
            <div class="pt-4 border-t border-slate-50 flex items-center justify-between">
              <div class="flex items-center gap-1.5">
                <ClockIcon class="w-3.5 h-3.5 text-slate-300" />
                <span class="text-[11px] font-black text-slate-700">{{ res.start_time.slice(0,5) }} — {{ res.end_time.slice(0,5) }}</span>
              </div>
              <span class="text-[12px] font-bold text-slate-400 italic">By {{ res.requester_name }}</span>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Modal: Detail -->
    <Teleport to="body">
      <div v-if="showDetailModal" class="fixed inset-0 z-[2000] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" @click="showDetailModal = false"></div>
        <div class="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl border border-white overflow-hidden animate-in transform-gpu antialiased">
          <div class="bg-slate-900 px-10 py-10 text-white relative">
            <button @click="showDetailModal = false" class="absolute top-8 right-8 p-2 hover:bg-white/10 rounded-full transition-colors"><XMarkIcon class="w-6 h-6" /></button>
            <div class="flex items-center gap-3 mb-4">
              <span class="bg-indigo-600 px-3 py-1 rounded-lg text-[12px] font-black uppercase tracking-widest shadow-lg">{{ detailReservation.floor }}{{ detailReservation.floor.includes('B') ? '' : 'F' }}</span>
              <span class="text-indigo-400 text-sm font-black">{{ detailReservation.room_name }}</span>
            </div>
            
            <template v-if="isEditing">
              <input type="text" v-model="editForm.title" class="w-full bg-white/10 border-b border-white/20 focus:border-indigo-400 focus:outline-none text-2xl font-black leading-tight tracking-tighter placeholder:text-white/30 p-2 rounded" placeholder="신청명을 입력하세요" />
            </template>
            <h2 v-else class="text-2xl font-black leading-tight tracking-tighter">{{ detailReservation.title || '공간 예약 상세' }}</h2>
          </div>

          <div class="px-10 py-8 space-y-8 overflow-y-auto max-h-[60vh]">
            <!-- Time & Date Info -->
            <div class="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
               <!-- Date -->
               <div class="flex items-center justify-between">
                 <div class="flex items-center gap-4">
                   <div class="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm"><CalendarIcon class="w-5 h-5 text-indigo-600" /></div>
                   <div class="flex-1">
                     <p class="text-[12px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Date</p>
                     <input v-if="isEditing" type="date" v-model="editForm.reservation_date" class="bg-transparent border-none p-0 font-black text-lg text-slate-900 focus:ring-0" />
                     <p v-else class="text-lg font-black text-slate-900 tracking-tighter">{{ detailReservation.reservation_date }} ({{ ['일','월','화','수','목','금','토'][new Date(detailReservation.reservation_date).getDay()] }})</p>
                   </div>
                 </div>
                 <div :class="detailReservation.status === 'approved' ? 'bg-indigo-600' : 'bg-amber-500'" class="px-4 py-1.5 rounded-xl text-white text-[12px] font-black uppercase tracking-widest">
                   {{ detailReservation.status === 'approved' ? 'Approved' : 'Pending' }}
                 </div>
               </div>
               
               <!-- Time -->
               <div class="flex items-center gap-4 pt-4 border-t border-slate-200/50">
                 <div class="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm"><ClockIcon class="w-5 h-5 text-indigo-600" /></div>
                 <div class="flex-1 grid grid-cols-2 gap-4">
                   <div>
                     <p class="text-[12px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Start</p>
                     <input v-if="isEditing" type="time" v-model="editForm.start_time" class="bg-transparent border-none p-0 font-black text-lg text-slate-900 focus:ring-0" />
                     <p v-else class="text-lg font-black text-slate-900 tracking-tighter">{{ detailReservation.start_time.slice(0,5) }}</p>
                   </div>
                   <div>
                     <p class="text-[12px] font-black text-slate-400 uppercase tracking-widest mb-0.5">End</p>
                     <input v-if="isEditing" type="time" v-model="editForm.end_time" class="bg-transparent border-none p-0 font-black text-lg text-slate-900 focus:ring-0" />
                     <p v-else class="text-lg font-black text-slate-900 tracking-tighter">{{ detailReservation.end_time.slice(0,5) }}</p>
                   </div>
                 </div>
               </div>
            </div>

            <!-- Requester Info -->
            <div class="grid grid-cols-2 gap-8">
              <div class="space-y-1">
                <span class="text-[12px] font-black text-slate-400 uppercase tracking-widest">신청자</span>
                <p class="text-base font-black text-slate-900">{{ detailReservation.requester_name }}</p>
              </div>
              <div class="space-y-1">
                <span class="text-[12px] font-black text-slate-400 uppercase tracking-widest">연락처</span>
                <p class="text-base font-black text-slate-900">{{ detailReservation.requester_phone || '미기재' }}</p>
              </div>
            </div>

            <!-- Reason -->
            <div class="space-y-2">
              <span class="text-[12px] font-black text-slate-400 uppercase tracking-widest">Reason / Purpose</span>
              <template v-if="isEditing">
                <textarea v-model="editForm.reason" class="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl font-bold text-sm focus:ring-indigo-500 focus:border-indigo-500 min-h-[100px]" placeholder="수정할 사유를 입력하세요"></textarea>
              </template>
              <p v-else class="text-slate-900 font-bold leading-relaxed text-sm bg-slate-100 p-4 rounded-xl border border-slate-200/50">
                {{ detailReservation.reason || '신청 사유가 없습니다.' }}
              </p>
            </div>
          </div>

          <div class="px-10 py-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <template v-if="isMyReservation && !isEditing">
                <button @click="startEdit" class="px-5 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[12px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-colors">수정하기</button>
                <button @click="cancelReservation(detailReservation.id)" class="px-5 py-2 bg-rose-50 text-rose-600 rounded-xl text-[12px] font-black uppercase tracking-widest hover:bg-rose-100 transition-colors">삭제하기</button>
              </template>
              <template v-else-if="isEditing">
                <button @click="updateReservation" class="px-6 py-2 bg-indigo-600 text-white rounded-xl text-[12px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100">저장 완료</button>
                <button @click="isEditing = false" class="px-6 py-2 bg-slate-200 text-slate-600 rounded-xl text-[12px] font-black uppercase tracking-widest hover:bg-slate-300 transition-colors">취소</button>
              </template>
            </div>
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
             <button @click.stop="selectCalendarDate(new Date())" class="text-[12px] font-black bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">TODAY</button>
           </div>
           <div class="flex gap-1">
             <button @click.stop="moveCalendarYear(-1)" class="p-1.5 text-slate-300"><ChevronDoubleLeftIcon class="w-3.5 h-3.5" /></button>
             <button @click.stop="moveCalendarMonth(-1)" class="p-1.5 text-slate-400"><ChevronLeftIcon class="w-4 h-4" /></button>
             <button @click.stop="moveCalendarMonth(1)" class="p-1.5 text-slate-400"><ChevronRightIcon class="w-4 h-4" /></button>
             <button @click.stop="moveCalendarYear(1)" class="p-1.5 text-slate-300"><ChevronDoubleRightIcon class="w-3.5 h-3.5" /></button>
           </div>
         </div>
         <div class="grid grid-cols-7 gap-1 mb-2">
           <div v-for="d in ['일', '월', '화', '수', '목', '금', '토']" :key="d" class="text-[12px] font-black text-slate-300 text-center uppercase tracking-widest">{{ d }}</div>
         </div>
         <div class="grid grid-cols-7 gap-1">
           <button v-for="(d, idx) in calendarDays" :key="idx" @click.stop="selectCalendarDate(d.date)"
                   :class="[d.current ? 'text-slate-700' : 'text-slate-200', selectedDate === formatDate(d.date) ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-slate-50']"
                   class="aspect-square flex items-center justify-center text-[11px] font-black rounded-lg transition-all">{{ d.day }}</button>
         </div>
      </div>
    </Teleport>

    <!-- Modal: Booking (Compact & Scrollable) -->
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
                  <span class="text-[12px] font-black text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md uppercase tracking-widest">{{ selectedRoom?.floor }}{{ String(selectedRoom?.floor).includes('B') ? '' : 'F' }}</span>
                  <p class="text-[12px] font-black text-slate-900 uppercase tracking-tighter">{{ selectedRoom?.room_name }} | {{ selectedDate }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Content Area (Scrollable) -->
          <div class="flex-1 overflow-y-auto px-8 py-6 space-y-4 scrollbar-hide">
            <!-- Application Title Input -->
            <div class="bg-white p-4 rounded-3xl border border-slate-200/60 shadow-sm group focus-within:border-indigo-500 transition-all">
              <label class="flex items-center gap-1.5 text-[12px] font-black text-slate-400 mb-1 uppercase tracking-widest">
                <SparklesIcon class="w-3 h-3" />
                신청명
              </label>
              <input type="text" v-model="form.title" placeholder="무엇을 위한 예약인가요?" 
                     class="w-full bg-transparent border-none p-0 font-black text-lg text-slate-900 placeholder:text-slate-200 focus:ring-0" />
            </div>

            <!-- Time Selection Row -->
            <div class="grid grid-cols-2 gap-3">
              <!-- Start Time -->
              <div class="bg-white p-3 rounded-2xl border border-slate-200/60 shadow-sm focus-within:border-indigo-500 transition-all">
                <label class="text-[12px] font-black text-slate-400 mb-1.5 block uppercase tracking-widest text-center">시작 시간</label>
                <div class="flex items-center gap-1">
                  <select :value="getAmPm(form.start_time)" @change="e => updateTime('start', 'ampm', e.target.value, form.start_time)" 
                          class="flex-1 min-w-0 bg-slate-50 border-none rounded-lg py-1.5 px-1 font-black text-[12px] text-slate-700 focus:ring-1 focus:ring-indigo-500/20 appearance-none text-center cursor-pointer">
                    <option v-for="opt in ampmOptions" :key="opt" :value="opt">{{ opt }}</option>
                  </select>
                  <select :value="getHour12(form.start_time)" @change="e => updateTime('start', 'hour', e.target.value, form.start_time)" 
                          class="flex-1 min-w-0 bg-slate-50 border-none rounded-lg py-1.5 px-1 font-black text-[12px] text-slate-700 focus:ring-1 focus:ring-indigo-500/20 appearance-none text-center cursor-pointer">
                    <option v-for="h in hourOptions" :key="h" :value="h">{{ h }}시</option>
                  </select>
                  <select :value="getMinute(form.start_time)" @change="e => updateTime('start', 'minute', e.target.value, form.start_time)" 
                          class="flex-1 min-w-0 bg-slate-50 border-none rounded-lg py-1.5 px-1 font-black text-[12px] text-slate-700 focus:ring-1 focus:ring-indigo-500/20 appearance-none text-center cursor-pointer">
                    <option v-for="m in minuteOptions" :key="m" :value="m">{{ m }}분</option>
                  </select>
                </div>
              </div>

              <!-- End Time -->
              <div class="bg-white p-3 rounded-2xl border border-slate-200/60 shadow-sm focus-within:border-indigo-500 transition-all">
                <label class="text-[12px] font-black text-slate-400 mb-1.5 block uppercase tracking-widest text-center">종료 시간</label>
                <div class="flex items-center gap-1">
                  <select :value="getAmPm(form.end_time)" @change="e => updateTime('end', 'ampm', e.target.value, form.end_time)" 
                          class="flex-1 min-w-0 bg-slate-50 border-none rounded-lg py-1.5 px-1 font-black text-[12px] text-slate-700 focus:ring-1 focus:ring-indigo-500/20 appearance-none text-center cursor-pointer">
                    <option v-for="opt in ampmOptions" :key="opt" :value="opt">{{ opt }}</option>
                  </select>
                  <select :value="getHour12(form.end_time)" @change="e => updateTime('end', 'hour', e.target.value, form.end_time)" 
                          class="flex-1 min-w-0 bg-slate-50 border-none rounded-lg py-1.5 px-1 font-black text-[12px] text-slate-700 focus:ring-1 focus:ring-indigo-500/20 appearance-none text-center cursor-pointer">
                    <option v-for="h in hourOptions" :key="h" :value="h">{{ h }}시</option>
                  </select>
                  <select :value="getMinute(form.end_time)" @change="e => updateTime('end', 'minute', e.target.value, form.end_time)" 
                          class="flex-1 min-w-0 bg-slate-50 border-none rounded-lg py-1.5 px-1 font-black text-[12px] text-slate-700 focus:ring-1 focus:ring-indigo-500/20 appearance-none text-center cursor-pointer">
                    <option v-for="m in minuteOptions" :key="m" :value="m">{{ m }}분</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- Recurring Options -->
            <div class="bg-white p-4 rounded-3xl border border-slate-200/60 shadow-sm space-y-3 transition-all">
              <div class="flex items-center justify-between">
                <label class="flex items-center gap-1.5 text-[12px] font-black text-slate-400 uppercase tracking-widest">
                  <ArrowPathIcon class="w-3 h-3" />
                  반복 예약 설정
                </label>
                <button @click="form.is_recurring = !form.is_recurring" 
                        :class="[form.is_recurring ? 'bg-indigo-600' : 'bg-slate-200']"
                        class="w-8 h-4 rounded-full relative transition-colors duration-200 focus:outline-none">
                  <div :class="[form.is_recurring ? 'translate-x-4' : 'translate-x-1']"
                       class="absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform duration-200 shadow-sm"></div>
                </button>
              </div>
              
              <div v-if="form.is_recurring" class="pt-3 border-t border-slate-50 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div class="flex gap-1.5">
                  <button v-for="type in [['daily', '매일'], ['weekly', '매주'], ['monthly', '매월']]" :key="type[0]"
                          @click="form.recurring_type = type[0]"
                          :class="[form.recurring_type === type[0] ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200']"
                          class="flex-1 py-1.5 rounded-lg text-[12px] font-black uppercase tracking-widest transition-all">
                    {{ type[1] }}
                  </button>
                </div>

                <!-- Weekly Days Selection -->
                <div v-if="form.recurring_type === 'weekly'" class="space-y-2">
                  <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">요일 선택 (중복 가능)</label>
                  <div class="flex justify-between gap-1">
                    <button v-for="(day, idx) in ['일', '월', '화', '수', '목', '금', '토']" :key="idx"
                            @click="toggleRecurringDay(idx)"
                            :class="[form.recurring_days.includes(idx) ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-50 text-slate-400 border-slate-100']"
                            class="w-8 h-8 rounded-lg border text-[11px] font-black transition-all">
                      {{ day }}
                    </button>
                  </div>
                </div>

                <!-- Monthly Options -->
                <div v-if="form.recurring_type === 'monthly'" class="space-y-3">
                  <div class="flex gap-2">
                    <button @click="form.recurring_month_option = 'date'"
                            :class="[form.recurring_month_option === 'date' ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-white text-slate-400 border-slate-100']"
                            class="flex-1 py-2 rounded-xl border text-[11px] font-black transition-all">매월 특정 일자</button>
                    <button @click="form.recurring_month_option = 'nth'"
                            :class="[form.recurring_month_option === 'nth' ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-white text-slate-400 border-slate-100']"
                            class="flex-1 py-2 rounded-xl border text-[11px] font-black transition-all">매월 특정 주차</button>
                  </div>

                  <!-- Monthly by Date -->
                  <div v-if="form.recurring_month_option === 'date'" class="flex items-center gap-2 px-1">
                    <select v-model="form.recurring_month_date" class="flex-1 bg-slate-50 border border-slate-100 rounded-lg py-2 px-3 font-black text-xs text-slate-700 focus:ring-1 focus:ring-indigo-500/20">
                      <option v-for="d in 31" :key="d" :value="d">{{ d }}일</option>
                    </select>
                    <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">에 반복</span>
                  </div>

                  <!-- Monthly by Nth Week -->
                  <div v-if="form.recurring_month_option === 'nth'" class="flex items-center gap-2 px-1">
                    <select v-model="form.recurring_month_nth_week" class="flex-1 bg-slate-50 border border-slate-100 rounded-lg py-2 px-2 font-black text-xs text-slate-700 focus:ring-1 focus:ring-indigo-500/20">
                      <option v-for="n in 5" :key="n" :value="n">{{ n }}째주</option>
                    </select>
                    <select v-model="form.recurring_month_nth_day" class="flex-1 bg-slate-50 border border-slate-100 rounded-lg py-2 px-2 font-black text-xs text-slate-700 focus:ring-1 focus:ring-indigo-500/20">
                      <option v-for="(d, i) in ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']" :key="i" :value="i">{{ d }}</option>
                    </select>
                    <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">에 반복</span>
                  </div>
                </div>

                <div class="bg-slate-50 p-3 rounded-xl border border-slate-100 relative group cursor-pointer" @click="toggleRecurringCalendar">
                  <label class="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest cursor-pointer group-hover:text-indigo-500 transition-colors">반복 종료일</label>
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
                <label class="block text-[12px] font-black text-slate-400 mb-1 uppercase tracking-widest">신청자 성함</label>
                <input type="text" v-model="form.requester_name" placeholder="홍길동" 
                       class="w-full bg-transparent border-none p-0 font-black text-sm text-slate-900 placeholder:text-slate-200 focus:ring-0" />
              </div>
              <div class="bg-white p-4 rounded-3xl border border-slate-200/60 shadow-sm">
                <label class="block text-[12px] font-black text-slate-400 mb-1 uppercase tracking-widest">연락처</label>
                <input type="tel" v-model="form.requester_phone" placeholder="010-0000-0000" 
                       class="w-full bg-transparent border-none p-0 font-black text-sm text-slate-900 placeholder:text-slate-200 focus:ring-0" />
              </div>
            </div>

            <!-- Reason TextArea -->
            <div class="bg-white p-4 rounded-3xl border border-slate-200/60 shadow-sm">
              <label class="block text-[12px] font-black text-slate-400 mb-1 uppercase tracking-widest">예약 사유</label>
              <textarea v-model="form.reason" class="w-full bg-transparent border-none p-0 font-bold text-xs text-slate-700 placeholder:text-slate-200 focus:ring-0 h-16 resize-none" placeholder="사용 목적 입력..."></textarea>
            </div>
          </div>

          <!-- Footer Actions (Fixed) -->
          <div class="px-8 py-6 bg-white border-t border-slate-100 flex items-center gap-3 shrink-0">
            <button @click="showBookingModal = false" class="px-6 py-3 bg-slate-100 border border-slate-200/60 rounded-2xl text-[11px] font-black text-slate-600 hover:bg-slate-200 hover:text-slate-900 hover:border-slate-300 transition-all uppercase tracking-widest">취소</button>
            <button @click="submitBooking" class="flex-1 bg-indigo-600 text-white py-3 px-6 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
              🗓 예약 신청하기
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Modal: Recurring End Date Calendar -->
    <Teleport to="body">
      <div v-if="showRecurringCalendar" class="fixed inset-0 z-[5000]" @click="showRecurringCalendar = false"></div>
      <div v-if="showRecurringCalendar" 
           :style="{ top: (recurringCalendarPosition.top + 8) + 'px', left: recurringCalendarPosition.left + 'px' }" 
           class="fixed z-[5001] bg-white rounded-[2rem] shadow-2xl border border-slate-200/60 p-6 w-[320px] transform -translate-x-1/2 mt-2"
           :class="{'translate-x-0': recurringCalendarPosition.left < 160}">
         <div class="flex justify-between items-center mb-6">
           <div class="flex items-center gap-2">
             <h4 class="text-sm font-black text-slate-900">{{ recurringCalendarDate.getFullYear() }}년 {{ recurringCalendarDate.getMonth() + 1 }}월</h4>
           </div>
           <div class="flex gap-1">
             <button @click.stop="moveRecurringCalendarYear(-1)" class="p-1.5 text-slate-300 hover:text-indigo-600 transition-colors"><ChevronDoubleLeftIcon class="w-3.5 h-3.5" /></button>
             <button @click.stop="moveRecurringCalendarMonth(-1)" class="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors"><ChevronLeftIcon class="w-4 h-4" /></button>
             <button @click.stop="moveRecurringCalendarMonth(1)" class="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors"><ChevronRightIcon class="w-4 h-4" /></button>
             <button @click.stop="moveRecurringCalendarYear(1)" class="p-1.5 text-slate-300 hover:text-indigo-600 transition-colors"><ChevronDoubleRightIcon class="w-3.5 h-3.5" /></button>
           </div>
         </div>
         <div class="grid grid-cols-7 gap-1 mb-2">
           <div v-for="d in ['일', '월', '화', '수', '목', '금', '토']" :key="d" class="text-[12px] font-black text-slate-300 text-center uppercase tracking-widest">{{ d }}</div>
         </div>
         <div class="grid grid-cols-7 gap-1">
           <button v-for="(d, idx) in recurringCalendarDays" :key="idx" @click.stop="selectRecurringDate(d.date)"
                   :class="[d.current ? 'text-slate-700' : 'text-slate-200', form.recurring_end_date === formatDate(d.date) ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-slate-50']"
                   class="aspect-square flex flex-col items-center justify-center rounded-lg transition-all">
             <span class="text-[11px] font-black">{{ d.day }}</span>
             <span v-if="getHoliday(formatDate(d.date))" class="w-1 h-1 bg-rose-500 rounded-full mt-0.5"></span>
           </button>
         </div>
      </div>
    </Teleport>
    <!-- Tooltip: Room Info -->
    <Teleport to="body">
      <div v-if="hoveredRoom" 
           :style="{ top: roomTooltipPos.y + 'px', left: roomTooltipPos.x + 'px' }"
           class="fixed z-[3000] pointer-events-none transition-all duration-200">
        <div class="bg-white/90 backdrop-blur-xl border border-white shadow-2xl rounded-2xl overflow-hidden min-w-[240px] max-w-[320px] animate-in fade-in zoom-in duration-200">
          <div class="bg-violet-600 px-4 py-3 text-white flex justify-between items-center">
            <div class="flex items-center gap-2">
              <InformationCircleIcon class="w-4 h-4" />
              <span class="text-xs font-black uppercase tracking-widest">Space Info</span>
            </div>
            <span class="text-[12px] font-black bg-white/20 px-2 py-0.5 rounded-full uppercase">{{ hoveredRoom.floor }}{{ String(hoveredRoom.floor).includes('B') ? '' : 'F' }}</span>
          </div>
          
          <!-- Room Image -->
          <div class="w-full h-32 bg-slate-100 overflow-hidden relative">
            <img v-if="hoveredRoom.image_url" :src="hoveredRoom.image_url" class="w-full h-full object-cover" />
            <div v-else class="w-full h-full flex flex-col items-center justify-center text-slate-300">
              <LightBulbIcon class="w-8 h-8 mb-1 opacity-20" />
              <span class="text-[12px] font-black uppercase tracking-widest opacity-40">No Image Available</span>
            </div>
            <div class="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
          </div>

          <div class="p-4 space-y-4">
            <div>
              <h4 class="text-sm font-black text-slate-900 mb-1">{{ hoveredRoom.room_name }}</h4>
              <p v-if="hoveredRoom.description" class="text-[12px] font-bold text-slate-500 leading-relaxed">{{ hoveredRoom.description }}</p>
            </div>
            
            <div class="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
              <div class="flex items-center gap-2">
                <div class="w-7 h-7 bg-slate-50 rounded-lg flex items-center justify-center">
                  <UsersIcon class="w-3.5 h-3.5 text-violet-600" />
                </div>
                <div>
                  <p class="text-[12px] font-black text-slate-400 uppercase">Capacity</p>
                  <p class="text-[11px] font-black text-slate-800">{{ hoveredRoom.capacity || 'N/A' }}명</p>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <div class="w-7 h-7 bg-slate-50 rounded-lg flex items-center justify-center">
                  <MapPinIcon class="w-3.5 h-3.5 text-violet-600" />
                </div>
                <div>
                  <p class="text-[12px] font-black text-slate-400 uppercase">Location</p>
                  <p class="text-[11px] font-black text-slate-800">{{ hoveredRoom.location || hoveredRoom.floor + '층' }}</p>
                </div>
              </div>
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
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.stripe-bg {
  background-image: linear-gradient(45deg, rgba(226, 232, 240, 0.4) 25%, transparent 25%, transparent 50%, rgba(226, 232, 240, 0.4) 50%, rgba(226, 232, 240, 0.4) 75%, transparent 75%, transparent);
  background-size: 20px 20px;
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
</style>
