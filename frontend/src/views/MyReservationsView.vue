<script setup>
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'
import { useAuthStore } from '../store/auth'
import { 
  CalendarDaysIcon, 
  ClockIcon, 
  MapPinIcon, 
  FunnelIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
  CheckCircleIcon
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

const inquiries = ref([])
const answerContents = ref({})

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

const fetchInquiries = async (reservationId) => {
  try {
    const res = await axios.get(`/api/reservations/${reservationId}/inquiries`)
    inquiries.value = res.data
    res.data.forEach(inc => {
      if (!answerContents.value[inc.id]) {
        answerContents.value[inc.id] = inc.answer || ''
      }
    })
  } catch (err) {
    console.error('Failed to fetch inquiries:', err)
  }
}

const submitAnswer = async (inquiryId) => {
  const answer = answerContents.value[inquiryId]
  if (!answer?.trim()) return
  try {
    await axios.put(`/api/reservations/inquiry/${inquiryId}`, { answer })
    fetchInquiries(editingRes.value.id)
    alert('답변이 등록되었습니다.')
  } catch (err) {
    alert('답변 등록 실패')
  }
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
  fetchInquiries(res.id)
}

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
        <p class="text-slate-400 font-bold uppercase tracking-widest text-[10px]">관리 및 예약 공간</p>
      </div>

      <!-- Date Filter -->
      <div class="bg-white p-2 rounded-[2rem] border border-slate-200 shadow-xl flex items-center gap-2">
         <div class="flex items-center gap-2 px-4">
           <input type="date" v-model="startDate" class="bg-transparent border-none focus:ring-0 font-bold text-slate-700 text-sm" />
           <span class="text-slate-300">~</span>
           <input type="date" v-model="endDate" class="bg-transparent border-none focus:ring-0 font-bold text-slate-700 text-sm" />
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
            <th class="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">공간 / 층</th>
            <th class="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">날짜 / 시간</th>
            <th class="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">신청명</th>
            <th class="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">상태</th>
            <th class="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">관리</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading" v-for="i in 3" :key="'loader-'+i" class="animate-pulse">
             <td colspan="5" class="px-8 py-6 bg-slate-50/50"></td>
          </tr>
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
               <div class="text-[10px] font-black text-indigo-400 mt-1 uppercase">{{ res.start_time }} - {{ res.end_time }}</div>
            </td>
            <td class="px-8 py-6">
              <div class="font-black text-slate-900 leading-tight">{{ res.title || '신청명 없음' }}</div>
              <div class="text-[10px] text-slate-400 font-bold mt-1 max-w-[200px] truncate italic">{{ res.reason }}</div>
            </td>
            <td class="px-8 py-6">
              <span :class="getStatusClass(res.status)" class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter">
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
              <span class="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full uppercase tracking-widest">예약 상세 정보</span>
              <h2 class="text-2xl font-black text-slate-900 pt-2">{{ editForm.title || editingRes.room_name }}</h2>
              <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{{ editingRes.room_name }} | {{ editingRes.reservation_date }}</p>
            </div>
            <button @click="showEditModal = false" class="p-2 bg-slate-50 rounded-2xl text-slate-400 hover:text-slate-900 transition-all">
              <XMarkIcon class="w-6 h-6" />
            </button>
          </div>

          <!-- Edit Form -->
          <div class="grid grid-cols-2 gap-4">
             <div class="space-y-4">
                <div class="bg-slate-50 p-4 rounded-3xl">
                  <label class="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">신청명</label>
                  <input type="text" v-model="editForm.title" class="w-full bg-transparent border-none p-0 font-black text-slate-800 focus:ring-0 font-sans" />
                </div>
                <div class="bg-slate-50 p-4 rounded-3xl">
                  <label class="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">날짜</label>
                  <input type="date" v-model="editForm.reservation_date" class="w-full bg-transparent border-none p-0 font-black text-slate-700 focus:ring-0 font-sans" />
                </div>
             </div>
             <div class="space-y-4">
                <div class="bg-slate-50 p-4 rounded-3xl">
                  <label class="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">시작 시간</label>
                  <input type="time" v-model="editForm.start_time" class="w-full bg-transparent border-none p-0 font-black text-slate-700 focus:ring-0 font-sans" />
                </div>
                <div class="bg-slate-50 p-4 rounded-3xl">
                  <label class="block text-[10px] font-black text-slate-300 mb-2 uppercase tracking-widest">종료 시간</label>
                  <input type="time" v-model="editForm.end_time" class="w-full bg-transparent border-none p-0 font-black text-slate-700 focus:ring-0 font-sans" />
                </div>
             </div>
          </div>
          
          <div class="bg-slate-50 p-6 rounded-[2rem]">
            <label class="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">사용 목적</label>
            <textarea v-model="editForm.reason" class="w-full bg-transparent border-none p-0 font-bold text-slate-700 h-20 resize-none focus:ring-0 font-sans" placeholder="목적을 입력하세요"></textarea>
          </div>

          <!-- Inquiries & Answers Section -->
          <div class="space-y-4 pt-4 border-t border-slate-100">
            <div class="flex items-center justify-between px-1">
              <span class="text-[10px] font-black text-slate-300 uppercase tracking-widest">받은 문의 내역</span>
              <span class="text-[9px] font-black text-indigo-400 bg-indigo-50 px-2 py-1 rounded-lg">{{ inquiries.length }} 메시지</span>
            </div>

            <!-- Inquiry List -->
            <div class="space-y-4">
              <div v-for="inc in inquiries" :key="inc.id" class="space-y-2">
                <!-- Question -->
                <div class="flex items-start gap-4">
                  <div class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                    <span class="text-[10px] font-black text-slate-400">?</span>
                  </div>
                  <div class="flex-1 bg-slate-50 p-4 rounded-2xl">
                    <div class="flex justify-between items-center mb-1">
                      <span class="text-[9px] font-black text-slate-800">{{ inc.inquirer_name }}</span>
                      <span class="text-[8px] font-bold text-slate-300">{{ new Date(inc.created_at).toLocaleString() }}</span>
                    </div>
                    <p class="text-xs text-slate-600 font-bold">{{ inc.content }}</p>
                  </div>
                </div>

                <!-- Answer Input (As the Owner) -->
                <div v-if="!inc.answer" class="pl-12 flex gap-2">
                   <input type="text" v-model="answerContents[inc.id]" placeholder="답변을 입력하여 예약자로서 응답하세요..." 
                          class="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold focus:ring-0 font-sans" />
                   <button @click="submitAnswer(inc.id)" class="bg-indigo-600 text-white px-4 py-2 rounded-xl text-[10px] font-black shadow-lg shadow-indigo-100 active:scale-95 transition-transform">답변전송</button>
                </div>

                <!-- Existing Answer -->
                <div v-if="inc.answer" class="flex items-start gap-3 pl-12">
                  <div class="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
                    <span class="text-[10px] font-black text-white">A</span>
                  </div>
                  <div class="flex-1 bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                    <div class="text-[9px] font-black text-indigo-600 mb-1">나의 답변</div>
                    <p class="text-xs text-indigo-700 font-black">{{ inc.answer }}</p>
                  </div>
                </div>
              </div>

              <div v-if="inquiries.length === 0" class="text-center py-6">
                <p class="text-[10px] text-slate-300 font-black uppercase tracking-widest">문의 내역이 없습니다.</p>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex gap-4 pt-4 border-t border-slate-100">
             <button @click="cancelReservation(editingRes.id)" class="flex-1 py-5 bg-red-50 text-red-500 font-black uppercase tracking-widest text-xs rounded-[2rem] hover:bg-red-100 transition-all active:scale-95">예약 취소 / 삭제</button>
             <button @click="updateReservation" class="flex-1 bg-slate-900 text-white py-5 font-black uppercase tracking-widest text-xs rounded-[2rem] shadow-xl active:scale-95 transition-all">예약 수정</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Optional styling */
input[type="date"]::-webkit-calendar-picker-indicator {
  cursor: pointer;
  filter: invert(0.2);
}
</style>
