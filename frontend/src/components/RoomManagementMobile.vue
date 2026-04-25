<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { PlusIcon, PencilIcon, TrashIcon, EllipsisVerticalIcon } from '@heroicons/vue/24/outline'

const rooms = ref([])
const departments = ref([])
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
    form.value = { room_name: '', floor: '', dept_name: '', manager_name: '', manager_contact: '', image_url: null }
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
             <p class="text-xs text-slate-400">{{ room.dept_name }} | {{ room.manager_name }}</p>
           </div>
        </div>
        <div class="flex gap-1">
          <button @click="openModal(room)" class="p-2 text-slate-300"><PencilIcon class="w-5 h-5" /></button>
        </div>
      </div>
    </div>

    <!-- Mobile Modal -->
    <div v-if="showModal" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex flex-col justify-end">
       <div class="bg-white rounded-t-[3rem] p-8 space-y-6 animate-slide-up">
          <h2 class="text-xl font-black">{{ editingRoom ? '공간 정보 수정' : '새 공간 등록' }}</h2>
          <div class="space-y-4">
            <input v-model="form.room_name" type="text" class="input-field p-4 bg-slate-50 border-none rounded-2xl" placeholder="공간명" />
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
            <button @click="showModal = false" class="flex-1 p-4 font-bold text-slate-400 uppercase tracking-widest text-xs">Close</button>
            <button @click="saveRoom" class="flex-1 p-4 bg-slate-900 text-white rounded-2xl font-bold">확인</button>
          </div>
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
