<script setup>
// MyReservationsView.vue - Optimized Layout & Custom Calendar
import { ref, onMounted, computed } from 'vue'
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
  ChevronDoubleRightIcon
} from '@heroicons/vue/24/outline'

const auth = useAuthStore()
const reservations = ref([])
const loading = ref(false)

// Query filters
const startDate = ref(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]) // 30 days ago
const endDate = ref(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]) // 30 days later

// Edit Modal State
const showEditModal = ref(false)
const editingRes = ref(null)
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
  else if (calendarTarget.value === 'filter_start') startDate.value = dateStr
  else if (calendarTarget.value === 'filter_end') endDate.value = dateStr
  
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
    const res = await axios.get(`/api/reservations?user_id=${auth.user.id}&start_date=${startDate.value}&end_date=${endDate.value}`)
    reservations.value = res.data
  } catch (error) {
    console.error('Fetch failed:', error)
  } finally {
    loading.value = false
  }
}


const isSelectedDate = (date) => {
  const dateStr = date.toISOString().split('T')[0]
  if (calendarTarget.value === 'edit') return editForm.value.reservation_date === dateStr
  if (calendarTarget.value === 'filter_start') return startDate.value === dateStr
  if (calendarTarget.value === 'filter_end') return endDate.value === dateStr
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
  try {
    await axios.put(`/api/reservations/${editingRes.value.id}`, editForm.value)
    alert('예약이 수정되었습니다.')
    showEditModal.value = false
    fetchMyReservations()
  } catch (error) {
    alert(error.response?.data?.message || '수정 중 오류가 발생했습니다.')
  }
}

const cancelReservation = async (id) => {
  if (confirm('정말 예약을 취소하시겠습니까?')) {
    try {
      await axios.delete(`/api/reservations/${id}`)
      alert('예약이 취소되었습니다.')
      showEditModal.value = false
      fetchMyReservations()
    } catch (error) {
      alert('취소 중 오류가 발생했습니다.')
    }
  }
}

const getStatusClass = (status) => {
  if (status === 'cancelled') return 'bg-red-50 text-red-500'
  return 'bg-green-50 text-green-600'
}

onMounted(fetchMyReservations)
</script>

<template>
  <div class="p-8 max-w-6xl mx-auto space-y-10 min-h-screen font-sans">
    <!-- Header Section -->
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
      <div class="space-y-2">
        <h1 class="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
          <CalendarDaysIcon class="w-10 h-10 text-indigo-600" />
          나의 예약 현황
        </h1>
        <p class="text-slate-400 font-bold uppercase tracking-widest text-[12px]">관리 및 예약 공간</p>
      </div>

      <!-- Date Filter -->
      <div class="bg-white p-2 rounded-[2rem] border border-slate-200 shadow-xl flex items-center gap-2">
          <div class="flex items-center gap-3 px-6">
            <div @click="e => toggleCalendar(e, 'filter_start')" class="flex items-center gap-2 cursor-pointer group">
              <span class="font-black text-slate-700 text-sm group-hover:text-indigo-600 transition-colors">{{ startDate }}</span>
              <CalendarDaysIcon class="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors" />
            </div>
            <span class="text-slate-300 font-black">~</span>
            <div @click="e => toggleCalendar(e, 'filter_end')" class="flex items-center gap-2 cursor-pointer group">
              <span class="font-black text-slate-700 text-sm group-hover:text-indigo-600 transition-colors">{{ endDate }}</span>
              <CalendarDaysIcon class="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors" />
            </div>
          </div>
         <button @click="fetchMyReservations" class="bg-slate-900 text-white px-8 py-3 rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95">
           검색
         </button>
      </div>
    </div>

    <!-- Table Section -->
    <div class="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl overflow-hidden">
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="bg-slate-50 border-b border-slate-100">
            <th class="px-8 py-6 text-[12px] font-black text-slate-400 uppercase tracking-widest">공간 / 층</th>
            <th class="px-8 py-6 text-[12px] font-black text-slate-400 uppercase tracking-widest">날짜 / 시간</th>
            <th class="px-8 py-6 text-[12px] font-black text-slate-400 uppercase tracking-widest">신청명</th>
            <th class="px-8 py-6 text-[12px] font-black text-slate-400 uppercase tracking-widest">상태</th>
            <th class="px-8 py-6 text-[12px] font-black text-slate-400 uppercase tracking-widest text-center">관리</th>
          </tr>
        </thead>
        <tbody>
          <template v-if="loading">
            <tr v-for="i in 3" :key="'loader-'+i" class="animate-pulse">
              <td colspan="5" class="px-8 py-6 bg-slate-50/50"></td>
            </tr>
          </template>
          <tr v-else-if="reservations.length === 0">
             <td colspan="5" class="px-8 py-20 text-center">
                <div class="text-slate-300 font-bold">조회된 예약 내역이 없습니다.</div>
             </td>
          </tr>
          <tr v-for="res in reservations" :key="res.id" 
              @click="openEditModal(res)"
              class="group hover:bg-indigo-50/30 transition-colors cursor-pointer">
            <td class="px-8 py-6">
              <div class="flex items-center gap-4">
                <div class="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-xs font-black text-slate-500 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                  {{ res.floor }}
                </div>
                <span class="font-bold text-slate-800">{{ res.room_name }}</span>
              </div>
            </td>
            <td class="px-8 py-6">
               <div class="font-bold text-slate-800">{{ res.reservation_date }}</div>
               <div class="text-[12px] font-black text-indigo-400 mt-1 uppercase">{{ res.start_time }} - {{ res.end_time }}</div>
            </td>
            <td class="px-8 py-6">
              <div class="font-black text-slate-900 leading-tight">{{ res.title || '신청명 없음' }}</div>
              <div class="text-[12px] text-slate-400 font-bold mt-1 max-w-[200px] truncate italic">{{ res.reason }}</div>
            </td>
            <td class="px-8 py-6">
              <span :class="getStatusClass(res.status)" class="px-3 py-1 rounded-full text-[12px] font-black uppercase tracking-tighter">
                {{ res.status === 'cancelled' ? '취소됨' : '승인됨' }}
              </span>
            </td>
            <td class="px-8 py-6 text-center">
               <button class="p-2 bg-slate-50 hover:bg-slate-900 rounded-xl transition-all text-slate-300 hover:text-white">
                  <PencilSquareIcon class="w-5 h-5" />
               </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Edit/Detail Modal -->
    <div v-if="showEditModal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div class="bg-white rounded-[3rem] shadow-2xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in duration-300 max-h-[90vh] overflow-y-auto">
        <div class="p-10 space-y-8 text-left">
          <div class="flex justify-between items-start">
            <div class="space-y-1">
              <span class="text-[12px] font-black text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full uppercase tracking-widest">예약 상세 정보</span>
              <h2 class="text-2xl font-black text-slate-900 pt-2">{{ editForm.title || editingRes.room_name }}</h2>
            </div>
            <button @click="showEditModal = false" class="p-2 bg-slate-50 rounded-2xl text-slate-400 hover:text-slate-900 transition-all">
              <XMarkIcon class="w-6 h-6" />
            </button>
          </div>

          <!-- Edit Form -->
          <div class="space-y-4">
            <!-- Date Row -->
            <div class="bg-slate-50 p-4 rounded-3xl relative">
              <label class="block text-[12px] font-black text-slate-400 mb-[5px] uppercase tracking-widest">날짜</label>
              <div @click="toggleCalendar" class="flex items-center justify-between cursor-pointer group">
                <span class="font-black text-slate-700">{{ editForm.reservation_date }}</span>
                <CalendarDaysIcon class="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors" />
              </div>
            </div>

            <!-- Time Row (Start & End) -->
            <div class="grid grid-cols-2 gap-4">
              <!-- Start Time -->
              <div class="bg-slate-50 p-3 rounded-2xl">
                <label class="block text-[12px] font-black text-slate-400 mb-1.5 uppercase tracking-widest text-center">시작 시간</label>
                <div class="flex items-center gap-1">
                  <select :value="getAmPm(editForm.start_time)" @change="e => updateTime('start', 'ampm', e.target.value, editForm.start_time)" 
                          class="flex-1 min-w-0 bg-white border-none rounded-lg py-1.5 px-1 font-black text-[12px] text-slate-700 focus:ring-1 focus:ring-indigo-500/20 appearance-none text-center cursor-pointer shadow-sm">
                    <option v-for="opt in ampmOptions" :key="opt" :value="opt">{{ opt }}</option>
                  </select>
                  <select :value="getHour12(editForm.start_time)" @change="e => updateTime('start', 'hour', e.target.value, editForm.start_time)" 
                          class="flex-1 min-w-0 bg-white border-none rounded-lg py-1.5 px-1 font-black text-[12px] text-slate-700 focus:ring-1 focus:ring-indigo-500/20 appearance-none text-center cursor-pointer shadow-sm">
                    <option v-for="h in hourOptions" :key="h" :value="h">{{ h }}시</option>
                  </select>
                  <select :value="getMinute(editForm.start_time)" @change="e => updateTime('start', 'minute', e.target.value, editForm.start_time)" 
                          class="flex-1 min-w-0 bg-white border-none rounded-lg py-1.5 px-1 font-black text-[12px] text-slate-700 focus:ring-1 focus:ring-indigo-500/20 appearance-none text-center cursor-pointer shadow-sm">
                    <option v-for="m in minuteOptions" :key="m" :value="m">{{ m }}분</option>
                  </select>
                </div>
              </div>

              <!-- End Time -->
              <div class="bg-slate-50 p-3 rounded-2xl">
                <label class="block text-[12px] font-black text-slate-400 mb-1.5 uppercase tracking-widest text-center">종료 시간</label>
                <div class="flex items-center gap-1">
                  <select :value="getAmPm(editForm.end_time)" @change="e => updateTime('end', 'ampm', e.target.value, editForm.end_time)" 
                          class="flex-1 min-w-0 bg-white border-none rounded-lg py-1.5 px-1 font-black text-[12px] text-slate-700 focus:ring-1 focus:ring-indigo-500/20 appearance-none text-center cursor-pointer shadow-sm">
                    <option v-for="opt in ampmOptions" :key="opt" :value="opt">{{ opt }}</option>
                  </select>
                  <select :value="getHour12(editForm.end_time)" @change="e => updateTime('end', 'hour', e.target.value, editForm.end_time)" 
                          class="flex-1 min-w-0 bg-white border-none rounded-lg py-1.5 px-1 font-black text-[12px] text-slate-700 focus:ring-1 focus:ring-indigo-500/20 appearance-none text-center cursor-pointer shadow-sm">
                    <option v-for="h in hourOptions" :key="h" :value="h">{{ h }}시</option>
                  </select>
                  <select :value="getMinute(editForm.end_time)" @change="e => updateTime('end', 'minute', e.target.value, editForm.end_time)" 
                          class="flex-1 min-w-0 bg-white border-none rounded-lg py-1.5 px-1 font-black text-[12px] text-slate-700 focus:ring-1 focus:ring-indigo-500/20 appearance-none text-center cursor-pointer shadow-sm">
                    <option v-for="m in minuteOptions" :key="m" :value="m">{{ m }}분</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
          
          <div class="bg-slate-50 p-6 rounded-[2rem]">
            <label class="block text-[12px] font-black text-slate-400 mb-[5px] uppercase tracking-widest">사용 목적</label>
            <textarea v-model="editForm.reason" class="w-full bg-transparent border-none p-0 font-bold text-slate-700 h-20 resize-none focus:ring-0 font-sans" placeholder="목적을 입력하세요"></textarea>
          </div>


          <!-- Actions -->
          <div class="flex gap-4 pt-4 border-t border-slate-100">
             <button @click="cancelReservation(editingRes.id)" class="flex-1 py-5 bg-red-50 text-red-500 font-black uppercase tracking-widest text-xs rounded-[2rem] hover:bg-red-100 transition-all active:scale-95">예약 취소 / 삭제</button>
             <button @click="updateReservation" class="flex-1 bg-slate-900 text-white py-5 font-black uppercase tracking-widest text-xs rounded-[2rem] shadow-xl active:scale-95 transition-all">예약 수정</button>
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
          <span class="text-[11px] font-black text-slate-900 uppercase tracking-widest">
            {{ calendarDate.getFullYear() }}. {{ (calendarDate.getMonth() + 1).toString().padStart(2, '0') }}
          </span>
          <div class="flex gap-1">
            <button @click="moveCalendarMonth(1)" class="p-1 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-900 transition-all"><ChevronRightIcon class="w-3.5 h-3.5" /></button>
            <button @click="moveCalendarYear(1)" class="p-1 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-900 transition-all"><ChevronDoubleRightIcon class="w-3.5 h-3.5" /></button>
          </div>
        </div>
        <div class="grid grid-cols-7 gap-1 mb-2">
          <span v-for="d in ['일','월','화','수','목','금','토']" :key="d" class="text-[12px] font-black text-slate-300 text-center uppercase">{{ d }}</span>
        </div>
        <div class="grid grid-cols-7 gap-1">
          <button v-for="(day, idx) in calendarDays" :key="idx"
                  @click="selectCalendarDate(day.date)"
                  :class="[
                    day.current ? 'text-slate-700 hover:bg-indigo-50 hover:text-indigo-600' : 'text-slate-200',
                    isSelectedDate(day.date) ? 'bg-indigo-600 !text-white shadow-lg shadow-indigo-100' : ''
                  ]"
                  class="aspect-square flex items-center justify-center text-[12px] font-black rounded-lg transition-all">
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
