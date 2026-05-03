<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import axios from 'axios'
import { PlusIcon, PencilIcon, TrashIcon, EllipsisVerticalIcon, NoSymbolIcon } from '@heroicons/vue/24/outline'

import { useModalStore } from '@/stores/useModalStore'

const modal = useModalStore()
const rooms = ref([])
const departments = ref([])
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


const fetchRooms = async () => {
  const res = await axios.get('/api/rooms')
  rooms.value = res.data
}

const fetchDepartments = async () => {
  const res = await axios.get('/api/departments')
  departments.value = res.data
}

const openModal = (room = null) => {
  selectedFile.value = null
  previewUrl.value = null
  if (room) {
    editingRoom.value = room
    form.value = { ...room }
    previewUrl.value = room.image_url
  } else {
    editingRoom.value = null
    form.value = { room_name: '', capacity: '', floor: '', dept_name: '', manager_name: '', manager_contact: '', image_url: null }
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
  <div class="p-4 space-y-6 pb-24">
    <div class="flex justify-between items-center px-2">
      <h1 class="text-2xl font-black">공간 관리</h1>
      <button @click="openModal()" class="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg">
        <PlusIcon class="w-6 h-6" />
      </button>
    </div>

    <div class="space-y-4">
      <div v-for="room in rooms" :key="room.id" class="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between">
        <div class="flex items-center gap-4">
           <div class="w-12 h-12 bg-slate-50 flex items-center justify-center rounded-2xl font-black text-slate-400 overflow-hidden">
             <img v-if="room.image_url" :src="room.image_url" class="w-full h-full object-cover" />
             <template v-else>{{ room.floor }}</template>
           </div>

           <div>
             <h3 class="font-bold text-slate-900">{{ room.room_name }}</h3>
             <p class="text-[12px] text-slate-400">{{ room.dept_name }} | {{ room.manager_name }} | {{ formatPhone(room.manager_contact) }}</p>
             <p class="text-[12px] text-indigo-500 font-bold">수용인원: {{ room.capacity || '-' }}명</p>
             
             <!-- Blocked Times mini badges -->
             <div v-if="room.blocked_times?.length > 0" class="flex flex-wrap gap-1 mt-2">
               <div v-for="bt in room.blocked_times" :key="'mob-bt-'+bt.id" 
                    class="px-1.5 py-0.5 bg-rose-50 text-[12px] font-black text-rose-600 rounded">
                 {{ getDayLabel(bt.day_of_week) }} {{ bt.start_time.slice(0,5) }}
               </div>
             </div>
           </div>
        </div>
        <div class="flex gap-1">
          <button @click="openBlockedModal(room)" class="p-2 text-indigo-500"><NoSymbolIcon class="w-5 h-5" /></button>
          <button @click="openModal(room)" class="p-2 text-slate-300"><PencilIcon class="w-5 h-5" /></button>
        </div>
      </div>
    </div>

    <!-- Mobile Modal -->
    <div v-if="showModal" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex flex-col justify-end">
       <div class="bg-white rounded-t-[3rem] p-8 space-y-6 animate-slide-up">
          <h2 class="text-xl font-black">{{ editingRoom ? '공간 정보 수정' : '새 공간 등록' }}</h2>
          <div class="space-y-4">
            <div class="flex gap-4">
              <input v-model="form.room_name" type="text" class="flex-[2] input-field p-4 bg-slate-50 border-none rounded-2xl" placeholder="공간명" />
              <input v-model="form.capacity" type="number" min="1" class="flex-1 input-field p-4 bg-slate-50 border-none rounded-2xl" placeholder="인원" />
            </div>
            <div class="flex gap-4">
               <input v-model="form.floor" type="text" class="flex-1 input-field p-4 bg-slate-50 border-none rounded-2xl" placeholder="층" />
               <select v-model="form.dept_name" class="flex-1 input-field p-4 bg-slate-50 border-none rounded-2xl">
                 <option value="">부서 선택</option>
                 <option v-for="dept in departments" :key="dept.id" :value="dept.dept_name">
                   {{ dept.dept_name }}
                 </option>
               </select>
            </div>
            <input v-model="form.manager_name" type="text" class="input-field p-4 bg-slate-50 border-none rounded-2xl w-full" placeholder="담당자 성명" />
            <input v-model="form.manager_contact" type="text" class="input-field p-4 bg-slate-50 border-none rounded-2xl w-full" placeholder="담당자 연락처" />
            
            <div class="space-y-2">
              <div v-if="previewUrl" class="relative w-full aspect-video rounded-2xl overflow-hidden border border-slate-200">
                <img :src="previewUrl" class="w-full h-full object-cover" />
                <button @click="previewUrl = null; selectedFile = null; form.image_url = null" class="absolute top-2 right-2 p-1.5 bg-white/80 backdrop-blur rounded-full text-slate-600 hover:text-red-600">
                  <TrashIcon class="w-4 h-4" />
                </button>
              </div>
              <label class="block w-full cursor-pointer bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl py-4 px-6 text-center hover:bg-slate-100">
                <input type="file" @change="onFileChange" accept="image/*" class="hidden" />
                <span class="text-xs font-bold text-slate-400">{{ previewUrl ? '사진 변경' : '공간 사진 등록' }}</span>
              </label>
            </div>

          </div>
          <div class="flex gap-4 pt-4">
            <button @click="showModal = false" class="flex-1 p-4 font-bold text-slate-400 uppercase tracking-widest text-xs">닫기</button>
            <button @click="saveRoom" class="flex-1 p-4 bg-slate-900 text-white rounded-2xl font-bold">확인</button>
          </div>
       </div>
    </div>

    <!-- Blocked Times Mobile Modal -->
    <div v-if="showBlockedModal" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex flex-col justify-end">
       <div class="bg-white rounded-t-[3rem] p-8 space-y-6 animate-slide-up max-h-[90vh] overflow-y-auto">
          <div class="flex justify-between items-start">
            <h2 class="text-xl font-black">{{ currentRoomForBlocked?.room_name }} - 예약 불가 설정</h2>
            <button @click="showBlockedModal = false" class="p-2 text-slate-400"><PlusIcon class="w-6 h-6 rotate-45" /></button>
          </div>

          <div class="space-y-4">
            <div class="bg-slate-50 p-6 rounded-[2rem] space-y-4">
              <!-- Recurring Type -->
              <div class="flex gap-1.5 p-1 bg-white rounded-2xl shadow-sm">
                <button v-for="t in [['weekly','주간'], ['monthly_date','월간(일)'], ['monthly_nth','월간(요일)']]" :key="t[0]"
                        @click="blockedForm.recurring_type = t[0]"
                        :class="[blockedForm.recurring_type === t[0] ? 'bg-rose-500 text-white shadow-md' : 'text-slate-400']"
                        class="flex-1 py-2.5 rounded-xl text-[12px] font-black uppercase tracking-widest transition-all">
                  {{ t[1] }}
                </button>
              </div>

              <!-- Conditional Inputs -->
              <div v-if="blockedForm.recurring_type === 'weekly'" class="flex items-center gap-3">
                <span class="text-[12px] font-black text-slate-400 uppercase tracking-widest w-10">요일</span>
                <select v-model="blockedForm.day_of_week" class="flex-1 bg-white border-none rounded-xl py-3 px-4 text-xs font-bold appearance-none shadow-sm">
                  <option v-for="d in days" :key="d.val" :value="d.val">{{ d.label }}요일</option>
                </select>
              </div>

              <div v-if="blockedForm.recurring_type === 'monthly_date'" class="flex items-center gap-3">
                <span class="text-[12px] font-black text-slate-400 uppercase tracking-widest w-10">일자</span>
                <select v-model="blockedForm.day_of_month" class="flex-1 bg-white border-none rounded-xl py-3 px-4 text-xs font-bold appearance-none shadow-sm">
                  <option v-for="n in 31" :key="n" :value="n">매월 {{ n }}일</option>
                </select>
              </div>

              <div v-if="blockedForm.recurring_type === 'monthly_nth'" class="space-y-3">
                <div class="flex items-center gap-3">
                  <span class="text-[12px] font-black text-slate-400 uppercase tracking-widest w-10">주차</span>
                  <select v-model="blockedForm.nth_week" class="flex-1 bg-white border-none rounded-xl py-3 px-4 text-xs font-bold appearance-none shadow-sm">
                    <option v-for="n in 5" :key="n" :value="n">{{ n }}번째 주</option>
                  </select>
                </div>
                <div class="flex items-center gap-3">
                  <span class="text-[12px] font-black text-slate-400 uppercase tracking-widest w-10">요일</span>
                  <select v-model="blockedForm.day_of_week" class="flex-1 bg-white border-none rounded-xl py-3 px-4 text-xs font-bold appearance-none shadow-sm">
                    <option v-for="d in days" :key="d.val" :value="d.val">{{ d.label }}요일</option>
                  </select>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-1.5">
                  <span class="text-[12px] font-black text-slate-400 uppercase tracking-widest ml-1">시작 시간</span>
                  <div class="flex gap-1.5">
                    <select v-model="startHour" class="flex-1 bg-white border-none rounded-xl py-3 px-1 text-[11px] font-bold appearance-none text-center shadow-sm">
                      <option v-for="h in hours.slice(0, 24)" :key="'msh-'+h" :value="h">{{ h }}시</option>
                    </select>
                    <select v-model="startMin" class="flex-1 bg-white border-none rounded-xl py-3 px-1 text-[11px] font-bold appearance-none text-center shadow-sm">
                      <option v-for="m in minutes" :key="'msm-'+m" :value="m">{{ m }}분</option>
                    </select>
                  </div>
                </div>
                <div class="space-y-1.5">
                  <span class="text-[12px] font-black text-slate-400 uppercase tracking-widest ml-1">종료 시간</span>
                  <div class="flex gap-1.5">
                    <select v-model="endHour" class="flex-1 bg-white border-none rounded-xl py-3 px-1 text-[11px] font-bold appearance-none text-center shadow-sm">
                      <option v-for="h in hours" :key="'meh-'+h" :value="h">{{ h }}시</option>
                    </select>
                    <select v-model="endMin" class="flex-1 bg-white border-none rounded-xl py-3 px-1 text-[11px] font-bold appearance-none text-center shadow-sm">
                      <option v-for="m in minutes" :key="'mem-'+m" :value="m">{{ m }}분</option>
                    </select>
                  </div>
                </div>
              </div>

              <div class="space-y-1.5">
                <label class="text-[12px] font-black text-slate-400 uppercase tracking-widest ml-1">차단 사유</label>
                <div class="flex gap-2">
                  <input v-model="blockedForm.reason" type="text" placeholder="사유 (예: 점검)" class="flex-1 bg-white border-none rounded-xl py-3 px-4 text-xs font-bold shadow-sm" />
                  <button @click="addBlockedTime" class="bg-rose-500 text-white px-5 py-3 rounded-xl font-bold text-xs shadow-lg shadow-rose-100">추가</button>
                </div>
              </div>
            </div>

            <div class="space-y-2">
              <div v-for="bt in blockedTimes" :key="bt.id" class="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                <div class="flex items-center gap-3">
                  <span class="bg-rose-100 text-rose-600 text-[12px] font-black px-2 py-1 rounded-lg">
                    <template v-if="bt.recurring_type === 'monthly_date'">매월 {{ bt.day_of_month }}일</template>
                    <template v-else-if="bt.recurring_type === 'monthly_nth'">매월 {{ bt.nth_week }}주 {{ getDayLabel(bt.day_of_week) }}</template>
                    <template v-else>{{ getDayLabel(bt.day_of_week) }}</template>
                  </span>
                  <div class="text-xs font-bold text-slate-900">{{ bt.start_time.slice(0,5) }} - {{ bt.end_time.slice(0,5) }}</div>
                </div>
                <button @click="deleteBlockedTime(bt.id)" class="p-2 text-slate-300"><TrashIcon class="w-4 h-4" /></button>
              </div>
            </div>
          </div>

          <button @click="showBlockedModal = false" class="w-full p-4 bg-slate-900 text-white rounded-2xl font-bold">닫기</button>
       </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes slide-up {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
.animate-slide-up {
  animation: slide-up 0.3s ease-out forwards;
}
</style>
