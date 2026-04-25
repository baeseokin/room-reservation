<script setup>
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'
import { PlusIcon, PencilIcon, TrashIcon, BuildingOffice2Icon, HomeIcon } from '@heroicons/vue/24/outline'

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


// Fixed floor order for Blueprint
const floorOrder = ['3', '1', 'B1', 'B3']

const fetchRooms = async () => {
  const res = await axios.get('/api/rooms')
  rooms.value = res.data
}

const fetchDepartments = async () => {
  const res = await axios.get('/api/departments')
  departments.value = res.data
}

const roomsByFloor = computed(() => {
  const map = {}
  rooms.value.forEach(room => {
    const f = room.floor
    if (!map[f]) map[f] = []
    map[f].push(room)
  })
  return map
})

const openModal = (floor = '', room = null) => {
  selectedFile.value = null
  previewUrl.value = null
  if (room) {
    editingRoom.value = room
    form.value = { ...room }
    previewUrl.value = room.image_url
  } else {
    editingRoom.value = null
    form.value = { room_name: '', floor: floor, dept_name: '', manager_name: '', manager_contact: '', image_url: null }
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

onMounted(() => {
  fetchRooms()
  fetchDepartments()
})
</script>

<template>
  <div class="p-6 max-w-7xl mx-auto space-y-6 bg-slate-50 h-screen flex flex-col font-sans overflow-hidden">
    <div class="flex justify-between items-end border-b-2 border-slate-900 pb-3 shrink-0">
      <div class="space-y-0.5">
        <h1 class="text-3xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">공간 관리</h1>
        <p class="text-slate-400 font-bold uppercase tracking-[0.2em] text-[8px]">공간 배치도</p>
      </div>
      <div class="flex items-center gap-3 text-[9px] font-black text-slate-400 uppercase">
         <span class="flex items-center gap-1"><span class="w-2 h-2 bg-indigo-600 rounded-sm"></span> 등록됨</span>
         <span class="flex items-center gap-1"><span class="w-2 h-2 bg-white border border-dashed border-slate-300 rounded-sm"></span> 비어있음</span>
      </div>
    </div>

    <!-- Blueprint Container -->
    <div class="flex-1 flex flex-col gap-2 min-h-0">
      <div v-for="fLabel in floorOrder" :key="fLabel" class="group flex items-stretch gap-4 flex-1 min-h-0">
        <!-- Floor Label -->
        <div class="w-24 bg-slate-900 text-white flex flex-col items-center justify-center rounded-xl shadow-lg transition-all group-hover:bg-indigo-600 shrink-0">
           <span class="text-[8px] font-black opacity-50 uppercase leading-none">{{ fLabel.includes('B') ? '지하' : '지상' }}</span>
           <span class="text-xl font-black tracking-tighter">{{ fLabel }}층</span>
        </div>

        <!-- Rooms Row -->
        <div class="flex-1 bg-white border border-slate-200 rounded-[1.5rem] p-2 flex items-center gap-2 overflow-x-auto shadow-sm group-hover:shadow-indigo-500/5 transition-all scrollbar-hide">
           <!-- Individual Room Tile -->
           <div v-for="room in roomsByFloor[fLabel]" :key="room.id" 
                class="min-w-[160px] h-full bg-slate-50 border border-slate-100 rounded-2xl p-3 flex flex-col justify-between hover:bg-white hover:border-indigo-200 hover:shadow-lg transition-all cursor-pointer group/room relative">
             <div class="overflow-hidden flex-1 flex flex-col justify-between">
               <div>
                 <div class="flex justify-between items-start gap-1">
                    <h3 class="text-[11px] font-black text-slate-800 leading-tight uppercase truncate">{{ room.room_name }}</h3>
                    <div class="flex gap-1 opacity-0 group-hover/room:opacity-100 transition-opacity shrink-0">
                      <button @click.stop="openModal(fLabel, room)" class="p-1 hover:bg-slate-100 rounded text-slate-400"><PencilIcon class="w-3 h-3" /></button>
                      <button @click.stop="deleteRoom(room.id)" class="p-1 hover:bg-slate-100 rounded text-slate-400"><TrashIcon class="w-3 h-3" /></button>
                    </div>
                 </div>
                 <p class="text-[8px] text-slate-400 font-bold mt-0.5 uppercase truncate">{{ room.dept_name || 'Public' }}</p>
               </div>

               <div v-if="room.image_url" class="mt-2 w-full h-16 rounded-lg overflow-hidden border border-slate-100">
                 <img :src="room.image_url" class="w-full h-full object-cover" />
               </div>
             </div>

             
             <div class="flex justify-between items-center bg-white rounded-lg px-2 py-1 border border-slate-100 mt-2">
                <span class="text-[8px] font-bold text-slate-500 truncate">{{ room.manager_name }}</span>
             </div>
           </div>

           <!-- Add Button Tile -->
           <button @click="openModal(fLabel)" 
                   class="min-w-[80px] h-full border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-1 hover:border-indigo-400 hover:bg-indigo-50 group/add transition-all shrink-0">
              <PlusIcon class="w-4 h-4 text-slate-300 group-hover/add:text-indigo-600" />
              <span class="text-[8px] font-black text-slate-300 uppercase tracking-widest group-hover/add:text-indigo-600">추가</span>
           </button>
        </div>
      </div>
    </div>

    <!-- Modal (Redesigned) -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 bg-slate-900/80 backdrop-blur-xl flex items-center justify-center p-4 z-[100]">
        <div class="bg-white rounded-[3.5rem] shadow-2xl max-w-lg w-full p-12 space-y-10 animate-in fade-in zoom-in duration-300">
          <div class="space-y-1">
            <span class="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-widest">설정</span>
            <h2 class="text-3xl font-black text-slate-900">{{ editingRoom ? '공간 수정' : '새 공간 추가' }}</h2>
          </div>

          <div class="space-y-6">
            <div class="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
              <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">공간 정보</label>
              <div class="space-y-4">
                <input v-model="form.room_name" type="text" placeholder="공간명 입력 (예: 본당)" class="w-full bg-white border-none rounded-2xl py-4 px-6 font-bold shadow-sm focus:ring-2 focus:ring-indigo-500" />
                <div class="grid grid-cols-2 gap-4">
                  <div class="relative">
                    <select v-model="form.floor" class="w-full bg-white border-none rounded-2xl py-4 px-6 font-bold shadow-sm focus:ring-2 focus:ring-indigo-500 appearance-none">
                      <option value="">층 선택</option>
                      <option v-for="f in floorOrder" :key="f" :value="f">{{ f }}층</option>
                    </select>
                    <span class="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-300 pointer-events-none">층</span>
                  </div>
                  <select v-model="form.dept_name" class="w-full bg-white border-none rounded-2xl py-4 px-6 font-bold shadow-sm focus:ring-2 focus:ring-indigo-500 appearance-none">
                    <option value="">소속 부서</option>
                    <option v-for="dept in departments" :key="dept.id" :value="dept.dept_name">{{ dept.dept_name }}</option>
                  </select>
                </div>
              </div>
            </div>

            <div class="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
              <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">관리 및 미디어</label>
              <div class="space-y-4">
                <input v-model="form.manager_name" type="text" placeholder="관리자 이름" class="w-full bg-white border-none rounded-2xl py-4 px-6 font-bold shadow-sm focus:ring-2 focus:ring-indigo-500" />
                <input v-model="form.manager_contact" type="text" placeholder="연락처" class="w-full bg-white border-none rounded-2xl py-4 px-6 font-bold shadow-sm focus:ring-2 focus:ring-indigo-500" />
                
                <div class="space-y-2">
                  <div v-if="previewUrl" class="relative w-full aspect-video rounded-2xl overflow-hidden border border-slate-200">
                    <img :src="previewUrl" class="w-full h-full object-cover" />
                    <button @click="previewUrl = null; selectedFile = null; form.image_url = null" class="absolute top-2 right-2 p-1.5 bg-white/80 backdrop-blur rounded-full text-slate-600 hover:text-red-600">
                      <TrashIcon class="w-4 h-4" />
                    </button>
                  </div>
                  <label class="block w-full cursor-pointer bg-white border-2 border-dashed border-slate-200 rounded-2xl py-4 px-6 text-center hover:border-indigo-400 hover:bg-indigo-50 transition-all">
                    <input type="file" @change="onFileChange" accept="image/*" class="hidden" />
                    <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">{{ previewUrl ? '사진 변경' : '공간 사진 업로드' }}</span>
                  </label>
                </div>
              </div>
            </div>

          </div>

          <div class="flex gap-4">
            <button @click="showModal = false" class="flex-1 py-5 border border-slate-200 rounded-3xl font-black text-xs uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all">취소</button>
            <button @click="saveRoom" class="flex-1 bg-slate-900 text-white py-5 rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-indigo-600 shadow-xl transition-all active:scale-95">등록 완료</button>
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
