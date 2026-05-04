<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import axios from 'axios'
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  BuildingOffice2Icon, 
  HomeIcon, 
  ArrowPathIcon, 
  ClockIcon, 
  NoSymbolIcon,
  UserIcon,
  PhoneIcon,
  UsersIcon,
  XMarkIcon
} from '@heroicons/vue/24/outline'

import { useModalStore } from '@/stores/useModalStore'

const modal = useModalStore()
const rooms = ref([])
const departments = ref([])
const isLoading = ref(false)
const showModal = ref(false)
const editingRoom = ref(null)
const form = ref({
  room_name: '',
  capacity: '',
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

watch(() => form.value.manager_contact, (val) => {
  if (!val) return
  const digits = val.replace(/\D/g, '')
  if (digits.length <= 3) {
    form.value.manager_contact = digits
  } else if (digits.length <= 7) {
    form.value.manager_contact = `${digits.slice(0, 3)}-${digits.slice(3)}`
  } else {
    form.value.manager_contact = `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`
  }
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
    form.value = { room_name: '', capacity: '', floor: floor || '3', dept_name: '', manager_name: '', manager_contact: '', image_url: null }
  }
  showModal.value = true
}

const saveRoom = async () => {
  if (form.value.capacity && parseInt(form.value.capacity) <= 0) {
    return modal.showAlert('수용인원은 1명 이상의 양수만 입력 가능합니다.')
  }
  try {
    const formData = new FormData()
    formData.append('room_name', form.value.room_name)
    formData.append('capacity', form.value.capacity)
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
    modal.showAlert('저장에 실패했습니다: ' + (err.response?.data?.error || err.message))
  }
}

const deleteRoom = async (id) => {
  if (await modal.showConfirm('정말 삭제하시겠습니까?')) {
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
    modal.showAlert('등록 실패: ' + (err.response?.data?.error || err.message))
  }
}

const deleteBlockedTime = async (blockedId) => {
  if (await modal.showConfirm('삭제하시겠습니까?')) {
    await axios.delete(`/api/rooms/blocked-times/${blockedId}`)
    fetchBlockedTimes(currentRoomForBlocked.value.id)
  }
}

const getDayLabel = (val) => days.find(d => d.val == val)?.label || ''

const formatPhone = (val) => {
  if (!val) return '-'
  const digits = val.replace(/\D/g, '')
  if (digits.length <= 3) return digits
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`
}

onMounted(() => {
  fetchRooms()
  fetchDepartments()
})
</script>

<template>
  <div class="space-y-6 pb-20">
    <!-- Header -->
    <div class="flex justify-between items-center px-2">
      <div class="space-y-1">
        <h2 class="text-2xl font-black text-slate-900 tracking-tight">공간 관리</h2>
        <p class="text-slate-400 text-[11px] font-black uppercase tracking-widest">시설물 등록 및 관리 설정을 관리합니다.</p>
      </div>
      <div class="flex gap-2">
        <button @click="fetchRooms" class="p-3 bg-white border border-slate-100 rounded-2xl shadow-sm text-slate-400 active:scale-95 transition-all">
          <ArrowPathIcon class="w-5 h-5" :class="{ 'animate-spin': isLoading }" />
        </button>
        <button @click="openModal()" class="p-3 bg-slate-900 text-white rounded-2xl shadow-lg shadow-slate-200 active:scale-95 transition-all">
          <PlusIcon class="w-5 h-5" />
        </button>
      </div>
    </div>

    <!-- Filter Tabs (Floor) -->
    <div class="flex gap-2 overflow-x-auto pb-2 px-2 scrollbar-hide">
      <button @click="filterFloor = 'all'"
        :class="filterFloor === 'all' ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-100'"
        class="px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0">
        전체
      </button>
      <button v-for="f in floorOrder" :key="f"
        @click="filterFloor = f"
        :class="filterFloor === f ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-100'"
        class="px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0">
        {{ f }}층
      </button>
    </div>

    <!-- Room List -->
    <div v-if="isLoading" class="flex justify-center py-20">
      <div class="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
    </div>

    <div v-else-if="filteredRooms.length === 0" class="text-center py-32 bg-white rounded-[2.5rem] border border-slate-100 mx-2">
      <div class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
        <HomeIcon class="w-8 h-8 text-slate-200" />
      </div>
      <p class="text-slate-400 font-black text-[10px] uppercase tracking-widest">등록된 공간이 없습니다</p>
    </div>

    <div v-else class="space-y-4 px-2">
      <div v-for="room in filteredRooms" :key="room.id"
        class="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
        
        <!-- Room Image (Optional) -->
        <div v-if="room.image_url" class="w-full h-48 relative">
          <img :src="room.image_url" class="w-full h-full object-cover" />
          <div class="absolute top-4 right-4 bg-slate-900/80 backdrop-blur text-white px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
            {{ room.floor }}층
          </div>
        </div>

        <div class="p-6 space-y-6">
          <!-- Room Info Header -->
          <div class="flex justify-between items-start">
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <span v-if="!room.image_url" class="bg-slate-100 text-slate-500 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">
                  {{ room.floor }}층
                </span>
                <span class="bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">
                  {{ room.dept_name || '전체 공용' }}
                </span>
              </div>
              <h3 class="text-xl font-black text-slate-900 tracking-tight">{{ room.room_name }}</h3>
            </div>
          </div>

          <!-- Specs Grid -->
          <div class="grid grid-cols-2 gap-4">
            <div class="bg-slate-50 p-4 rounded-3xl space-y-1">
              <span class="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                <UsersIcon class="w-3 h-3" /> 수용인원
              </span>
              <p class="text-sm font-black text-slate-700">{{ room.capacity ? room.capacity + '명' : '미지정' }}</p>
            </div>
            <div class="bg-slate-50 p-4 rounded-3xl space-y-1">
              <span class="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                <UserIcon class="w-3 h-3" /> 관리담당
              </span>
              <p class="text-sm font-black text-slate-700 truncate">{{ room.manager_name || '미지정' }}</p>
            </div>
          </div>

          <!-- Contact info if exists -->
          <div v-if="room.manager_contact" class="flex items-center gap-3 px-2">
            <div class="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0">
              <PhoneIcon class="w-4 h-4 text-indigo-600" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">담당 연락처</p>
              <p class="text-sm font-black text-slate-700">{{ formatPhone(room.manager_contact) }}</p>
            </div>
          </div>

          <!-- Blocked Times Section -->
          <div v-if="room.blocked_times?.length > 0" class="space-y-2 px-2 border-t border-slate-100 pt-4">
            <span class="text-[10px] font-black text-rose-500 uppercase tracking-widest block mb-2">예약 불가 시간</span>
            <div class="flex flex-wrap gap-2">
              <div v-for="bt in room.blocked_times" :key="'list-bt-'+bt.id" 
                class="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 border border-rose-100 rounded-xl">
                <span class="text-[10px] font-black text-rose-600">{{ getDayLabel(bt.day_of_week) }}</span>
                <span class="text-[10px] font-bold text-slate-500">{{ bt.start_time.slice(0,5) }}-{{ bt.end_time.slice(0,5) }}</span>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="grid grid-cols-3 gap-2 pt-2">
            <button @click="openBlockedModal(room)" class="flex flex-col items-center justify-center gap-1.5 py-4 bg-white border border-slate-100 rounded-3xl text-indigo-600 active:scale-95 transition-all">
              <NoSymbolIcon class="w-5 h-5" />
              <span class="text-[9px] font-black uppercase tracking-widest">차단설정</span>
            </button>
            <button @click="openModal(room.floor, room)" class="flex flex-col items-center justify-center gap-1.5 py-4 bg-white border border-slate-100 rounded-3xl text-slate-900 active:scale-95 transition-all">
              <PencilIcon class="w-5 h-5" />
              <span class="text-[9px] font-black uppercase tracking-widest">수정</span>
            </button>
            <button @click="deleteRoom(room.id)" class="flex flex-col items-center justify-center gap-1.5 py-4 bg-rose-50 rounded-3xl text-rose-500 active:scale-95 transition-all">
              <TrashIcon class="w-5 h-5" />
              <span class="text-[9px] font-black uppercase tracking-widest">삭제</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modals -->
    <Teleport to="body">
      <!-- Add/Edit Room Modal -->
      <div v-if="showModal" class="fixed inset-0 bg-slate-900/80 backdrop-blur-xl flex items-end sm:items-center justify-center z-[100]">
        <div class="bg-white w-full max-w-lg rounded-t-[3rem] sm:rounded-[3.5rem] p-8 sm:p-12 space-y-8 animate-in slide-in-from-bottom duration-500 overflow-y-auto max-h-[90vh]">
          <div class="flex justify-between items-center">
            <div class="space-y-1">
              <span class="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-widest">공간 설정</span>
              <h2 class="text-2xl font-black text-slate-900 tracking-tight">{{ editingRoom ? '공간 정보 수정' : '새 공간 등록' }}</h2>
            </div>
            <button @click="showModal = false" class="p-2 bg-slate-50 text-slate-400 rounded-full">
              <XMarkIcon class="w-6 h-6" />
            </button>
          </div>

          <form @submit.prevent="saveRoom" class="space-y-6">
            <div class="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 space-y-6">
              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-1.5">
                  <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">공간명</label>
                  <input v-model="form.room_name" type="text" placeholder="예: 비전홀" required class="w-full bg-white border-none rounded-2xl py-4 px-5 font-bold shadow-sm focus:ring-2 focus:ring-indigo-500 transition-all text-sm" />
                </div>
                <div class="space-y-1.5">
                  <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">수용인원</label>
                  <input v-model="form.capacity" type="number" min="1" placeholder="명" class="w-full bg-white border-none rounded-2xl py-4 px-5 font-bold shadow-sm focus:ring-2 focus:ring-indigo-500 transition-all text-sm text-center" />
                </div>
              </div>
              
              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-1.5">
                  <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">위치 (층)</label>
                  <select v-model="form.floor" required class="w-full bg-white border-none rounded-2xl py-4 px-5 font-bold shadow-sm focus:ring-2 focus:ring-indigo-500 appearance-none text-sm">
                    <option v-for="f in floorOrder" :key="f" :value="f">{{ f }}층</option>
                  </select>
                </div>
                <div class="space-y-1.5">
                  <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">소속 부서</label>
                  <select v-model="form.dept_name" class="w-full bg-white border-none rounded-2xl py-4 px-5 font-bold shadow-sm focus:ring-2 focus:ring-indigo-500 appearance-none text-sm">
                    <option value="">전체 공용</option>
                    <option v-for="dept in departments" :key="dept.id" :value="dept.dept_name">{{ dept.dept_name }}</option>
                  </select>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-1.5">
                  <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">담당자</label>
                  <input v-model="form.manager_name" type="text" placeholder="이름" class="w-full bg-white border-none rounded-2xl py-4 px-5 font-bold shadow-sm focus:ring-2 focus:ring-indigo-500 transition-all text-sm" />
                </div>
                <div class="space-y-1.5">
                  <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">연락처</label>
                  <input v-model="form.manager_contact" type="text" placeholder="휴대폰" class="w-full bg-white border-none rounded-2xl py-4 px-5 font-bold shadow-sm focus:ring-2 focus:ring-indigo-500 transition-all text-sm" />
                </div>
              </div>

              <!-- Room Image Upload -->
              <div class="space-y-2">
                <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">공간 사진</label>
                <div v-if="previewUrl" class="relative w-full aspect-video rounded-3xl overflow-hidden border border-slate-200">
                  <img :src="previewUrl" class="w-full h-full object-cover" />
                  <button type="button" @click="previewUrl = null; selectedFile = null; form.image_url = null" class="absolute top-3 right-3 p-2 bg-rose-500 text-white rounded-full shadow-lg">
                    <TrashIcon class="w-4 h-4" />
                  </button>
                </div>
                <label v-else class="flex flex-col items-center justify-center w-full aspect-video bg-white border-2 border-dashed border-slate-200 rounded-[2.5rem] hover:bg-indigo-50 hover:border-indigo-300 transition-all cursor-pointer">
                  <PlusIcon class="w-6 h-6 text-slate-300 mb-2" />
                  <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">사진 업로드 (선택)</span>
                  <input type="file" @change="onFileChange" accept="image/*" class="hidden" />
                </label>
              </div>
            </div>

            <div class="flex gap-4">
              <button type="button" @click="showModal = false" class="flex-1 py-5 bg-slate-100 text-slate-400 rounded-3xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all">취소</button>
              <button type="submit" class="flex-[2] bg-slate-900 text-white py-5 rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 active:scale-95 transition-all">
                {{ editingRoom ? '수정 완료' : '등록 완료' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Blocked Times Modal -->
      <div v-if="showBlockedModal" class="fixed inset-0 bg-slate-900/80 backdrop-blur-xl flex items-end sm:items-center justify-center z-[100]">
        <div class="bg-white w-full max-w-lg rounded-t-[3rem] sm:rounded-[3.5rem] p-8 sm:p-12 space-y-8 animate-in slide-in-from-bottom duration-500 overflow-y-auto max-h-[90vh] scrollbar-hide">
          <div class="flex justify-between items-center">
            <div class="space-y-1">
              <span class="text-[10px] font-black text-rose-500 bg-rose-50 px-3 py-1 rounded-full uppercase tracking-widest">예약 불가 시간</span>
              <h2 class="text-2xl font-black text-slate-900 tracking-tight">{{ currentRoomForBlocked?.room_name }}</h2>
            </div>
            <button @click="showBlockedModal = false" class="p-2 bg-slate-50 text-slate-400 rounded-full">
              <XMarkIcon class="w-6 h-6" />
            </button>
          </div>

          <!-- Add New Blocked Time Form -->
          <div class="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 space-y-6">
             <div class="space-y-1.5">
               <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">반복 유형</label>
               <div class="flex gap-2">
                 <button v-for="t in [['weekly','주 단위'], ['monthly_date','일자'], ['monthly_nth','요일차']]" :key="t[0]"
                         @click="blockedForm.recurring_type = t[0]"
                         :class="[blockedForm.recurring_type === t[0] ? 'bg-rose-500 text-white shadow-lg shadow-rose-100' : 'bg-white text-slate-400 shadow-sm']"
                         class="flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">
                   {{ t[1] }}
                 </button>
               </div>
             </div>

             <!-- Day/Date Selections -->
             <div v-if="blockedForm.recurring_type === 'weekly'" class="space-y-1.5">
               <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">요일 선택</label>
               <div class="grid grid-cols-7 gap-1">
                 <button v-for="d in days" :key="d.val" 
                   @click="blockedForm.day_of_week = d.val"
                   :class="[blockedForm.day_of_week === d.val ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-400 shadow-sm']"
                   class="py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                   {{ d.label }}
                 </button>
               </div>
             </div>

             <div v-else-if="blockedForm.recurring_type === 'monthly_date'" class="space-y-1.5">
               <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">매월 일자</label>
               <select v-model="blockedForm.day_of_month" class="w-full bg-white border-none rounded-2xl py-4 px-5 font-bold shadow-sm focus:ring-2 focus:ring-rose-500 appearance-none text-sm">
                 <option v-for="n in 31" :key="n" :value="n">매월 {{ n }}일</option>
               </select>
             </div>

             <div v-else-if="blockedForm.recurring_type === 'monthly_nth'" class="grid grid-cols-2 gap-4">
               <div class="space-y-1.5">
                 <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">주차 선택</label>
                 <select v-model="blockedForm.nth_week" class="w-full bg-white border-none rounded-2xl py-4 px-5 font-bold shadow-sm focus:ring-2 focus:ring-rose-500 appearance-none text-sm">
                   <option v-for="n in 5" :key="n" :value="n">{{ n }}번째 주</option>
                 </select>
               </div>
               <div class="space-y-1.5">
                 <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">요일 선택</label>
                 <select v-model="blockedForm.day_of_week" class="w-full bg-white border-none rounded-2xl py-4 px-5 font-bold shadow-sm focus:ring-2 focus:ring-rose-500 appearance-none text-sm">
                   <option v-for="d in days" :key="d.val" :value="d.val">{{ d.label }}요일</option>
                 </select>
               </div>
             </div>

             <!-- Time Selections -->
             <div class="grid grid-cols-2 gap-4 border-t border-slate-100 pt-6">
                <div class="space-y-1.5">
                  <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">시작</label>
                  <div class="flex gap-2">
                    <select v-model="startHour" class="flex-1 bg-white border-none rounded-2xl py-3 px-2 font-bold shadow-sm focus:ring-2 focus:ring-rose-500 appearance-none text-xs text-center">
                      <option v-for="h in hours.slice(0,24)" :key="h" :value="h">{{ h }}시</option>
                    </select>
                    <select v-model="startMin" class="flex-1 bg-white border-none rounded-2xl py-3 px-2 font-bold shadow-sm focus:ring-2 focus:ring-rose-500 appearance-none text-xs text-center">
                      <option v-for="m in minutes" :key="m" :value="m">{{ m }}분</option>
                    </select>
                  </div>
                </div>
                <div class="space-y-1.5">
                  <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">종료</label>
                  <div class="flex gap-2">
                    <select v-model="endHour" class="flex-1 bg-white border-none rounded-2xl py-3 px-2 font-bold shadow-sm focus:ring-2 focus:ring-rose-500 appearance-none text-xs text-center">
                      <option v-for="h in hours" :key="h" :value="h">{{ h }}시</option>
                    </select>
                    <select v-model="endMin" class="flex-1 bg-white border-none rounded-2xl py-3 px-2 font-bold shadow-sm focus:ring-2 focus:ring-rose-500 appearance-none text-xs text-center">
                      <option v-for="m in minutes" :key="m" :value="m">{{ m }}분</option>
                    </select>
                  </div>
                </div>
             </div>

             <div class="space-y-1.5">
               <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">차단 사유</label>
               <input v-model="blockedForm.reason" type="text" placeholder="예: 정기 행정업무 시간" class="w-full bg-white border-none rounded-2xl py-4 px-5 font-bold shadow-sm focus:ring-2 focus:ring-rose-500 text-sm" />
             </div>

             <button @click="addBlockedTime" class="w-full bg-rose-500 text-white py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-rose-100 active:scale-95 transition-all">
               시간 차단 추가하기
             </button>
          </div>

          <!-- Existing Blocked Times List -->
          <div class="space-y-4">
            <h3 class="text-xs font-black text-slate-900 uppercase tracking-widest ml-1">차단 리스트</h3>
            <div v-if="blockedTimes.length === 0" class="text-center py-10 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
               <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest">등록된 차단 내역 없음</p>
            </div>
            <div v-else class="space-y-3">
              <div v-for="bt in blockedTimes" :key="bt.id" class="bg-white border border-slate-100 p-5 rounded-[2rem] flex items-center justify-between shadow-sm">
                <div class="space-y-1">
                  <div class="flex items-center gap-2">
                    <span class="text-[10px] font-black text-rose-600 uppercase tracking-widest">
                      <template v-if="bt.recurring_type === 'monthly_date'">매월 {{ bt.day_of_month }}일</template>
                      <template v-else-if="bt.recurring_type === 'monthly_nth'">{{ bt.nth_week }}주차 {{ getDayLabel(bt.day_of_week) }}요일</template>
                      <template v-else>{{ getDayLabel(bt.day_of_week) }}요일</template>
                    </span>
                    <span class="text-xs font-black text-slate-900">{{ bt.start_time.slice(0,5) }} - {{ bt.end_time.slice(0,5) }}</span>
                  </div>
                  <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{{ bt.reason || '사유 미입력' }}</p>
                </div>
                <button @click="deleteBlockedTime(bt.id)" class="p-3 bg-rose-50 text-rose-500 rounded-2xl">
                  <TrashIcon class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div class="pt-4">
            <button @click="showBlockedModal = false" class="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all">
              설정 완료
            </button>
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
