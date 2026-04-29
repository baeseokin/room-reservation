<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import axios from 'axios'
import { PlusIcon, PencilIcon, TrashIcon, BuildingOffice2Icon, HomeIcon, ArrowPathIcon, ClockIcon, NoSymbolIcon } from '@heroicons/vue/24/outline'

const rooms = ref([])
const departments = ref([])
const isLoading = ref(false)
const showModal = ref(false)
const editingRoom = ref(null)
const form = ref({
  room_name: '',
  floor: '',
  dept_name: '',
  manager_name: '',
  manager_contact: '',
  image_url: null
})
const selectedFile = ref(null)
const previewUrl = ref(null)
const showBlockedModal = ref(false)
const currentRoomForBlocked = ref(null)
const blockedTimes = ref([])
const blockedForm = ref({
  recurring_type: 'weekly',
  day_of_week: '1',
  day_of_month: 1,
  nth_week: 1,
  start_time: '09:00',
  end_time: '12:00',
  reason: ''
})

const startHour = ref('09')
const startMin = ref('00')
const endHour = ref('12')
const endMin = ref('00')

watch([startHour, startMin], () => {
  blockedForm.value.start_time = `${startHour.value}:${startMin.value}`
})
watch([endHour, endMin], () => {
  blockedForm.value.end_time = `${endHour.value}:${endMin.value}`
})

const hours = Array.from({ length: 25 }, (_, i) => String(i).padStart(2, '0'))
const minutes = ['00', '30']

const days = [
  { val: '0', label: '일' },
  { val: '1', label: '월' },
  { val: '2', label: '화' },
  { val: '3', label: '수' },
  { val: '4', label: '목' },
  { val: '5', label: '금' },
  { val: '6', label: '토' }
]

const onFileChange = (e) => {
  const file = e.target.files[0]
  if (file) {
    selectedFile.value = file
    previewUrl.value = URL.createObjectURL(file)
  }
}

// Fixed floor order for Blueprint
const floorOrder = ['3', '1', 'B1', 'B3']
const filterFloor = ref('all')

const filteredRooms = computed(() => {
  if (filterFloor.value === 'all') return rooms.value
  return rooms.value.filter(r => r.floor === filterFloor.value)
})

const fetchRooms = async () => {
  isLoading.value = true
  try {
    const res = await axios.get('/api/rooms')
    rooms.value = res.data
  } finally {
    isLoading.value = false
  }
}

const fetchDepartments = async () => {
  const res = await axios.get('/api/departments')
  departments.value = res.data
}

const openModal = (floor = '', room = null) => {
  selectedFile.value = null
  previewUrl.value = null
  if (room) {
    editingRoom.value = room
    form.value = { ...room }
    previewUrl.value = room.image_url
  } else {
    editingRoom.value = null
    form.value = { room_name: '', floor: floor || '3', dept_name: '', manager_name: '', manager_contact: '', image_url: null }
  }
  showModal.value = true
}

const saveRoom = async () => {
  try {
    const formData = new FormData()
    formData.append('room_name', form.value.room_name)
    formData.append('floor', form.value.floor)
    formData.append('dept_name', form.value.dept_name)
    formData.append('manager_name', form.value.manager_name)
    formData.append('manager_contact', form.value.manager_contact)
    if (selectedFile.value) {
      formData.append('image', selectedFile.value)
    }

    if (editingRoom.value) {
      await axios.put(`/api/rooms/${editingRoom.value.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
    } else {
      await axios.post('/api/rooms', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
    }
    showModal.value = false
    fetchRooms()
  } catch (err) {
    alert('저장에 실패했습니다: ' + (err.response?.data?.error || err.message))
  }
}

const deleteRoom = async (id) => {
  if (confirm('정말 삭제하시겠습니까?')) {
    await axios.delete(`/api/rooms/${id}`)
    fetchRooms()
  }
}

const openBlockedModal = async (room) => {
  currentRoomForBlocked.value = room
  await fetchBlockedTimes(room.id)
  showBlockedModal.value = true
}

const fetchBlockedTimes = async (roomId) => {
  const res = await axios.get(`/api/rooms/${roomId}/blocked-times`)
  blockedTimes.value = res.data
}

const addBlockedTime = async () => {
  try {
    await axios.post(`/api/rooms/${currentRoomForBlocked.value.id}/blocked-times`, blockedForm.value)
    blockedForm.value.reason = ''
    fetchBlockedTimes(currentRoomForBlocked.value.id)
  } catch (err) {
    alert('등록 실패: ' + (err.response?.data?.error || err.message))
  }
}

const deleteBlockedTime = async (blockedId) => {
  if (confirm('삭제하시겠습니까?')) {
    await axios.delete(`/api/rooms/blocked-times/${blockedId}`)
    fetchBlockedTimes(currentRoomForBlocked.value.id)
  }
}

const getDayLabel = (val) => days.find(d => d.val == val)?.label || ''

onMounted(() => {
  fetchRooms()
  fetchDepartments()
})
</script>

<template>
  <div class="p-6 max-w-7xl mx-auto space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-black text-slate-900">공간 관리</h1>
        <p class="text-slate-500 text-sm font-medium mt-0.5">시설물을 등록하고 관리 부서 및 담당자를 지정하세요.</p>
      </div>
      <div class="flex gap-2">
        <button @click="fetchRooms" class="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all">
          <ArrowPathIcon class="w-4 h-4" :class="{ 'animate-spin': isLoading }" />
          새로고침
        </button>
        <button @click="openModal()" class="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-black hover:bg-indigo-600 transition-all shadow-lg shadow-slate-200 active:scale-95">
          <PlusIcon class="w-4 h-4" />
          새 공간 등록
        </button>
      </div>
    </div>

    <!-- Filter Tabs (Floor) -->
    <div class="flex items-center gap-2 bg-white border border-slate-100 rounded-2xl p-1.5 w-fit shadow-sm">
      <button @click="filterFloor = 'all'"
        :class="filterFloor === 'all' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:text-slate-900'"
        class="px-5 py-2 rounded-xl text-xs font-black transition-all uppercase tracking-widest">
        전체
      </button>
      <button v-for="f in floorOrder" :key="f"
        @click="filterFloor = f"
        :class="filterFloor === f ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:text-slate-900'"
        class="px-5 py-2 rounded-xl text-xs font-black transition-all uppercase tracking-widest">
        {{ f }}층
      </button>
    </div>

    <!-- Rooms Table/List -->
    <div class="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
      <div v-if="filteredRooms.length === 0" class="text-center py-20">
        <HomeIcon class="w-12 h-12 text-slate-200 mx-auto mb-4" />
        <p class="text-slate-400 font-black text-sm uppercase tracking-widest">해당 층에 등록된 공간이 없습니다</p>
      </div>

      <div v-else class="divide-y divide-slate-100">
        <div v-for="room in filteredRooms" :key="room.id"
          class="p-6 hover:bg-slate-50 transition-all flex flex-col md:flex-row md:items-center gap-6 group">
          
          <!-- Room Image or Placeholder -->
          <div class="w-full md:w-40 h-28 shrink-0 rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 relative group">
            <img v-if="room.image_url" :src="room.image_url" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            <div v-else class="w-full h-full flex items-center justify-center">
              <BuildingOffice2Icon class="w-8 h-8 text-slate-200" />
            </div>
            <div class="absolute top-2 left-2 px-2 py-1 bg-slate-900/80 backdrop-blur text-white text-[9px] font-black rounded-lg uppercase tracking-tighter">
              {{ room.floor }}층
            </div>
          </div>

          <!-- Info -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-3 mb-1">
              <h3 class="text-lg font-black text-slate-900 tracking-tight">{{ room.room_name }}</h3>
              <span class="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full uppercase tracking-widest">
                {{ room.dept_name || '전체 공용' }}
              </span>
            </div>
            
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-2 gap-x-6 mt-3">
              <div class="flex items-center gap-2">
                <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest w-12">담당자</span>
                <span class="text-xs font-bold text-slate-700">{{ room.manager_name || '미지정' }}</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest w-12">연락처</span>
                <span class="text-xs font-bold text-slate-700">{{ room.manager_contact || '-' }}</span>
              </div>
              
              <!-- Blocked Times Badges -->
              <div v-if="room.blocked_times?.length > 0" class="flex flex-wrap gap-1 col-span-full mt-2">
                <span class="text-[10px] font-black text-rose-500 uppercase tracking-widest w-full mb-1">예약 불가 시간</span>
                <div v-for="bt in room.blocked_times" :key="'list-bt-'+bt.id" 
                     class="flex items-center gap-1.5 px-2 py-1 bg-rose-50/50 border border-rose-100 rounded-lg">
                  <span class="text-[9px] font-black text-rose-600">{{ getDayLabel(bt.day_of_week) }}</span>
                  <span class="text-[9px] font-bold text-slate-600">{{ bt.start_time.slice(0,5) }}-{{ bt.end_time.slice(0,5) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-2 shrink-0 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
            <button @click="openBlockedModal(room)"
              title="예약 불가 시간 설정"
              class="p-3 bg-white border border-slate-200 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all active:scale-95">
              <NoSymbolIcon class="w-4 h-4" />
            </button>
            <button @click="openModal(room.floor, room)"
              class="p-3 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all active:scale-95">
              <PencilIcon class="w-4 h-4" />
            </button>
            <button @click="deleteRoom(room.id)"
              class="p-3 bg-white border border-slate-200 text-rose-500 rounded-xl hover:bg-rose-50 hover:border-rose-200 transition-all active:scale-95">
              <TrashIcon class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal (Premium Redesign) -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-xl flex items-center justify-center p-4 z-[100]">
        <div class="bg-white rounded-[3rem] shadow-2xl max-w-lg w-full p-10 space-y-8 animate-in fade-in zoom-in duration-300 overflow-y-auto max-h-[90vh] scrollbar-hide">
          <div class="flex justify-between items-start">
            <div class="space-y-1">
              <span class="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-widest">시설 정보 설정</span>
              <h2 class="text-3xl font-black text-slate-900 tracking-tight">{{ editingRoom ? '공간 정보 수정' : '새 공간 등록' }}</h2>
            </div>
            <button @click="showModal = false" class="p-2 text-slate-400 hover:text-slate-900 transition-colors"><PlusIcon class="w-6 h-6 rotate-45" /></button>
          </div>

          <form @submit.prevent="saveRoom" class="space-y-6">
            <div class="space-y-4">
              <div class="space-y-1.5">
                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">공간명</label>
                <input v-model="form.room_name" type="text" placeholder="예: 비전홀" required class="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 font-bold shadow-inner focus:ring-2 focus:ring-indigo-500 transition-all" />
              </div>
              
              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-1.5">
                  <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">위치 (층)</label>
                  <select v-model="form.floor" required class="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 font-bold shadow-inner focus:ring-2 focus:ring-indigo-500 appearance-none">
                    <option v-for="f in floorOrder" :key="f" :value="f">{{ f }}층</option>
                  </select>
                </div>
                <div class="space-y-1.5">
                  <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">소속 부서</label>
                  <select v-model="form.dept_name" class="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 font-bold shadow-inner focus:ring-2 focus:ring-indigo-500 appearance-none">
                    <option value="">전체 공용</option>
                    <option v-for="dept in departments" :key="dept.id" :value="dept.dept_name">{{ dept.dept_name }}</option>
                  </select>
                </div>
              </div>
            </div>

            <div class="space-y-4 pt-4 border-t border-slate-100">
              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-1.5">
                  <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">담당자</label>
                  <input v-model="form.manager_name" type="text" placeholder="담당자 이름" class="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 font-bold shadow-inner focus:ring-2 focus:ring-indigo-500 transition-all" />
                </div>
                <div class="space-y-1.5">
                  <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">연락처</label>
                  <input v-model="form.manager_contact" type="text" placeholder="담당자 연락처" class="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 font-bold shadow-inner focus:ring-2 focus:ring-indigo-500 transition-all" />
                </div>
              </div>

              <div class="space-y-2">
                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">공간 사진</label>
                <div class="relative group">
                  <div v-if="previewUrl" class="relative w-full aspect-video rounded-3xl overflow-hidden border-2 border-slate-100">
                    <img :src="previewUrl" class="w-full h-full object-cover" />
                    <button type="button" @click="previewUrl = null; selectedFile = null; form.image_url = null" class="absolute top-3 right-3 p-2 bg-rose-500 text-white rounded-full hover:bg-rose-600 transition-all shadow-lg">
                      <TrashIcon class="w-4 h-4" />
                    </button>
                  </div>
                  <label v-else class="flex flex-col items-center justify-center w-full aspect-video bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl hover:bg-indigo-50 hover:border-indigo-300 transition-all cursor-pointer">
                    <PlusIcon class="w-8 h-8 text-slate-300 mb-2" />
                    <span class="text-xs font-bold text-slate-400">사진 업로드 (선택)</span>
                    <input type="file" @change="onFileChange" accept="image/*" class="hidden" />
                  </label>
                </div>
              </div>
            </div>

            <div class="flex gap-4 pt-6">
              <button type="button" @click="showModal = false" class="flex-1 py-5 bg-slate-100 text-slate-500 rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all">취소</button>
              <button type="submit" class="flex-[2] bg-slate-900 text-white py-5 rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-indigo-600 shadow-xl shadow-indigo-100 transition-all active:scale-[0.98]">
                {{ editingRoom ? '정보 수정 완료' : '새 공간 등록 완료' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
    <!-- Blocked Times Modal -->
    <Teleport to="body">
      <div v-if="showBlockedModal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-xl flex items-center justify-center p-4 z-[100]">
        <div class="bg-white rounded-[3rem] shadow-2xl max-w-2xl w-full p-10 space-y-8 animate-in fade-in zoom-in duration-300 overflow-y-auto max-h-[90vh] scrollbar-hide">
          <div class="flex justify-between items-start">
            <div class="space-y-1">
              <span class="text-[10px] font-black text-rose-600 bg-rose-50 px-3 py-1 rounded-full uppercase tracking-widest">예약 불가 설정</span>
              <h2 class="text-3xl font-black text-slate-900 tracking-tight">{{ currentRoomForBlocked?.room_name }}</h2>
              <p class="text-slate-500 text-sm font-bold">정기적인 유지보수나 고정 업무 시간을 차단합니다.</p>
            </div>
            <button @click="showBlockedModal = false" class="p-2 text-slate-400 hover:text-slate-900 transition-colors"><PlusIcon class="w-6 h-6 rotate-45" /></button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-1 gap-8">
            <!-- Add Form -->
            <div class="bg-slate-50 rounded-3xl p-8 space-y-6">
              <h3 class="text-sm font-black text-slate-900 uppercase tracking-widest mb-2">불가 시간 추가</h3>
              <div class="space-y-4">
                <!-- Row 1: Recurring Type -->
                <div class="space-y-1.5">
                  <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">반복 유형</label>
                  <div class="flex gap-2">
                    <button v-for="t in [['weekly','주 단위'], ['monthly_date','월 단위 (일자)'], ['monthly_nth','월 단위 (요일)']]" :key="t[0]"
                            type="button" @click="blockedForm.recurring_type = t[0]"
                            :class="[blockedForm.recurring_type === t[0] ? 'bg-rose-600 text-white shadow-lg shadow-rose-100' : 'bg-white text-slate-500 hover:bg-slate-100']"
                            class="flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">
                      {{ t[1] }}
                    </button>
                  </div>
                </div>

                <!-- Selection (Day/Date/Nth) -->
                <div v-if="blockedForm.recurring_type === 'weekly'" class="space-y-1.5">
                  <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">요일</label>
                  <select v-model="blockedForm.day_of_week" class="w-full bg-white border-none rounded-2xl py-4 px-5 font-bold shadow-sm focus:ring-2 focus:ring-rose-500 appearance-none">
                    <option v-for="d in days" :key="d.val" :value="d.val">{{ d.label }}요일</option>
                  </select>
                </div>

                <div v-else-if="blockedForm.recurring_type === 'monthly_date'" class="space-y-1.5">
                  <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">매월 일자</label>
                  <select v-model="blockedForm.day_of_month" class="w-full bg-white border-none rounded-2xl py-4 px-5 font-bold shadow-sm focus:ring-2 focus:ring-rose-500 appearance-none">
                    <option v-for="n in 31" :key="n" :value="n">매월 {{ n }}일</option>
                  </select>
                </div>

                <div v-else-if="blockedForm.recurring_type === 'monthly_nth'" class="grid grid-cols-2 gap-4">
                  <div class="space-y-1.5">
                    <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">주차</label>
                    <select v-model="blockedForm.nth_week" class="w-full bg-white border-none rounded-2xl py-4 px-5 font-bold shadow-sm focus:ring-2 focus:ring-rose-500 appearance-none">
                      <option v-for="n in 5" :key="n" :value="n">{{ n }}번째 주</option>
                    </select>
                  </div>
                  <div class="space-y-1.5">
                    <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">요일</label>
                    <select v-model="blockedForm.day_of_week" class="w-full bg-white border-none rounded-2xl py-4 px-5 font-bold shadow-sm focus:ring-2 focus:ring-rose-500 appearance-none">
                      <option v-for="d in days" :key="d.val" :value="d.val">{{ d.label }}요일</option>
                    </select>
                  </div>
                </div>

                <!-- Row 3: Times (Same Row) -->
                <div class="grid grid-cols-2 gap-4">
                  <div class="space-y-1.5">
                    <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">시작 시간</label>
                    <div class="flex gap-2">
                      <select v-model="startHour" class="flex-1 bg-white border-none rounded-2xl py-4 px-3 font-bold shadow-sm focus:ring-2 focus:ring-rose-500 appearance-none text-center">
                        <option v-for="h in hours.slice(0, 24)" :key="'sh-'+h" :value="h">{{ h }}시</option>
                      </select>
                      <select v-model="startMin" class="flex-1 bg-white border-none rounded-2xl py-4 px-3 font-bold shadow-sm focus:ring-2 focus:ring-rose-500 appearance-none text-center">
                        <option v-for="m in minutes" :key="'sm-'+m" :value="m">{{ m }}분</option>
                      </select>
                    </div>
                  </div>
                  <div class="space-y-1.5">
                    <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">종료 시간</label>
                    <div class="flex gap-2">
                      <select v-model="endHour" class="flex-1 bg-white border-none rounded-2xl py-4 px-3 font-bold shadow-sm focus:ring-2 focus:ring-rose-500 appearance-none text-center">
                        <option v-for="h in hours" :key="'eh-'+h" :value="h">{{ h }}시</option>
                      </select>
                      <select v-model="endMin" class="flex-1 bg-white border-none rounded-2xl py-4 px-3 font-bold shadow-sm focus:ring-2 focus:ring-rose-500 appearance-none text-center">
                        <option v-for="m in minutes" :key="'em-'+m" :value="m">{{ m }}분</option>
                      </select>
                    </div>
                  </div>
                </div>
                
                <!-- Row 2: Reason -->
                <div class="space-y-1.5">
                  <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">차단 사유</label>
                  <div class="flex gap-4">
                    <input v-model="blockedForm.reason" type="text" placeholder="점검, 행정 업무 등 사유를 입력하세요" class="flex-1 bg-white border-none rounded-2xl py-4 px-5 font-bold shadow-sm focus:ring-2 focus:ring-rose-500" />
                    <button @click="addBlockedTime" class="bg-rose-500 text-white px-8 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-rose-600 transition-all shadow-lg shadow-rose-100 active:scale-95 flex items-center gap-2">
                      <PlusIcon class="w-5 h-5" />
                      <span>추가</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- List -->
            <div class="space-y-4">
              <h3 class="text-sm font-black text-slate-900 uppercase tracking-widest">등록된 불가 시간</h3>
              <div v-if="blockedTimes.length === 0" class="text-center py-10 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                <p class="text-slate-400 text-xs font-bold">등록된 예약 불가 시간이 없습니다.</p>
              </div>
              <div v-else class="space-y-2">
                <div v-for="bt in blockedTimes" :key="bt.id" class="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl group hover:border-rose-200 transition-all">
                  <div class="flex items-center gap-4">
                    <div class="bg-rose-50 text-rose-600 text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest whitespace-nowrap">
                      <template v-if="bt.recurring_type === 'monthly_date'">매월 {{ bt.day_of_month }}일</template>
                      <template v-else-if="bt.recurring_type === 'monthly_nth'">매월 {{ bt.nth_week }}주차 {{ getDayLabel(bt.day_of_week) }}요일</template>
                      <template v-else>{{ getDayLabel(bt.day_of_week) }}요일</template>
                    </div>
                    <div>
                      <div class="text-sm font-black text-slate-900">{{ bt.start_time.slice(0,5) }} - {{ bt.end_time.slice(0,5) }}</div>
                      <div class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{{ bt.reason || '사유 없음' }}</div>
                    </div>
                  </div>
                  <button @click="deleteBlockedTime(bt.id)" class="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                    <TrashIcon class="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="pt-4 flex justify-end">
            <button @click="showBlockedModal = false" class="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl shadow-slate-200">설정 완료</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
