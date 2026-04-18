<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { 
  ChatBubbleLeftRightIcon, 
  ArrowRightCircleIcon, 
  CheckBadgeIcon, 
  ClockIcon,
  ArrowPathRoundedSquareIcon,
  InboxIcon,
  PaperAirplaneIcon
} from '@heroicons/vue/24/outline'

const receivedInquiries = ref([])
const sentInquiries = ref([])
const activeTab = ref('received') // 'received' | 'sent'
const loading = ref(false)
const answerContents = ref({})

const fetchInquiries = async () => {
  loading.value = true
  try {
    const res = await axios.get('/api/reservations/inquiries/mine')
    receivedInquiries.value = res.data.received
    sentInquiries.value = res.data.sent
    
    // Initialize answer contents
    res.data.received.forEach(i => {
      answerContents.value[i.id] = i.answer || ''
    })
  } catch (err) {
    console.error('Failed to fetch inquiries:', err)
  } finally {
    loading.value = false
  }
}

const submitAnswer = async (inquiryId) => {
  const answer = answerContents.value[inquiryId]
  if (!answer?.trim()) return
  try {
    await axios.put(`/api/reservations/inquiry/${inquiryId}`, { answer })
    alert('답변이 전송되었습니다.')
    fetchInquiries()
  } catch (err) {
    alert('답변 전송 실패')
  }
}

const transferReservation = async (inquiryId) => {
  if (confirm('정말 이 사용자에게 예약 공간을 양도하시겠습니까? \n양도 후에는 예약 주권이 변경되며 해당 예약은 내 목록에서 사라질 수 있습니다.')) {
    try {
      await axios.post(`/api/reservations/inquiry/${inquiryId}/transfer`)
      alert('예약이 성공적으로 양도되었습니다.')
      fetchInquiries()
    } catch (err) {
      alert(err.response?.data?.message || '양도 중 오류가 발생했습니다.')
    }
  }
}

const getStatusBadge = (status) => {
  switch(status) {
    case 'transferred': return 'bg-indigo-600 text-white border-none'
    case 'answered': return 'bg-emerald-50 text-emerald-600 border border-emerald-100'
    default: return 'bg-amber-50 text-amber-600 border border-amber-100'
  }
}

onMounted(fetchInquiries)
</script>

<template>
  <div class="p-8 max-w-5xl mx-auto space-y-10 min-h-screen font-sans">
    <!-- Header -->
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
      <div class="space-y-2">
        <h1 class="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
          <ChatBubbleLeftRightIcon class="w-10 h-10 text-indigo-600" />
          나의 문의 관리
        </h1>
        <p class="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Communication Hub & Space Transfer</p>
      </div>

      <!-- Tabs -->
      <div class="bg-slate-100 p-1 rounded-2xl flex gap-1">
        <button 
          @click="activeTab = 'received'"
          :class="[activeTab === 'received' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600']"
          class="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black transition-all"
        >
          <InboxIcon class="w-4 h-4" />
          받은 문의
        </button>
        <button 
          @click="activeTab = 'sent'"
          :class="[activeTab === 'sent' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600']"
          class="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black transition-all"
        >
          <PaperAirplaneIcon class="w-4 h-4" />
          보낸 문의
        </button>
      </div>
    </div>

    <!-- Content -->
    <div v-if="loading" class="flex flex-col items-center justify-center py-20 space-y-4">
      <div class="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
      <p class="text-xs font-black text-slate-300 uppercase tracking-widest">Loading Inquiries...</p>
    </div>

    <div v-else class="space-y-6">
      <!-- Received List -->
      <div v-if="activeTab === 'received'" class="grid gap-6">
        <div v-if="receivedInquiries.length === 0" class="text-center py-20 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-100">
           <p class="text-slate-300 font-black uppercase tracking-widest">내가 받은 문의가 없습니다.</p>
        </div>
        
        <div v-for="inc in receivedInquiries" :key="inc.id" 
             class="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-500 group">
          <div class="p-8 space-y-6">
            <!-- Card Header -->
            <div class="flex justify-between items-start">
              <div class="space-y-2">
                <div class="flex items-center gap-2">
                  <span :class="getStatusBadge(inc.status)" class="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter shadow-sm">
                    {{ inc.status }}
                  </span>
                  <span class="text-[10px] font-black text-slate-300 italic">{{ new Date(inc.created_at).toLocaleString() }}</span>
                </div>
                <h3 class="text-xl font-black text-slate-900 leading-tight">
                  <span class="text-indigo-600 mr-2">{{ inc.room_name }}</span>
                  {{ inc.reservation_title || 'Reservation' }}
                </h3>
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{{ inc.reservation_date }} | {{ inc.start_time }} - {{ inc.end_time }}</p>
              </div>
              <div class="w-14 h-14 bg-indigo-50 rounded-[1.5rem] flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform duration-500">
                 <ArrowRightCircleIcon class="w-8 h-8 opacity-20" />
              </div>
            </div>

            <!-- Content Area -->
            <div class="grid md:grid-cols-2 gap-8 items-start">
              <!-- Question -->
              <div class="space-y-3">
                <div class="flex items-center gap-2">
                  <span class="w-1.5 h-1.5 bg-amber-400 rounded-full"></span>
                  <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">문의: {{ inc.inquirer_name }} 님</span>
                </div>
                <div class="bg-amber-50/50 p-6 rounded-[2rem] border border-amber-100/50 italic text-sm text-slate-700 font-bold leading-relaxed">
                  " {{ inc.content }} "
                </div>
              </div>

              <!-- Answer / Actions -->
              <div class="space-y-3">
                <div class="flex items-center gap-2">
                  <span class="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                  <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">나의 답변 & 관리</span>
                </div>
                
                <div class="space-y-4">
                  <textarea 
                    v-model="answerContents[inc.id]"
                    :disabled="inc.status === 'transferred'"
                    class="w-full bg-slate-50 border-none rounded-[2rem] p-6 text-sm font-bold text-slate-600 placeholder:text-slate-300 focus:ring-2 focus:ring-indigo-100 transition-all resize-none h-28"
                    placeholder="답변을 가감없이 남겨주세요."
                  ></textarea>
                  
                  <div class="flex gap-2">
                    <button 
                      @click="submitAnswer(inc.id)"
                      :disabled="inc.status === 'transferred'"
                      class="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 disabled:opacity-50 transition-all"
                    >
                      답변 전송
                    </button>
                    <button 
                      v-if="inc.status !== 'transferred'"
                      @click="transferReservation(inc.id)"
                      class="px-6 bg-indigo-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 hover:bg-indigo-700 transition-all flex items-center gap-2"
                    >
                      <ArrowPathRoundedSquareIcon class="w-4 h-4" />
                      공간 양도
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Sent List -->
      <div v-else class="grid gap-6">
        <div v-if="sentInquiries.length === 0" class="text-center py-20 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-100">
           <p class="text-slate-300 font-black uppercase tracking-widest">내가 보낸 문의가 없습니다.</p>
        </div>

        <div v-for="inc in sentInquiries" :key="inc.id" 
             class="bg-white rounded-[2.5rem] border border-slate-50 shadow-lg overflow-hidden flex flex-col md:flex-row">
          <div class="md:w-1/3 bg-slate-50 p-8 border-r border-slate-100 flex flex-col justify-between">
            <div class="space-y-2">
               <span :class="getStatusBadge(inc.status)" class="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter block w-fit">
                  {{ inc.status }}
               </span>
               <h4 class="text-lg font-black text-slate-800 leading-tight pt-2">{{ inc.room_name }}</h4>
               <p class="text-xs font-bold text-slate-400">{{ inc.reservation_date }}</p>
            </div>
            <div class="text-[10px] font-black text-indigo-400 uppercase tracking-widest pt-4">{{ inc.start_time }} - {{ inc.end_time }}</div>
          </div>
          
          <div class="md:w-2/3 p-8 space-y-6">
            <div class="space-y-2">
              <span class="text-[10px] font-black text-slate-300 uppercase tracking-widest">나의 문의 내용</span>
              <p class="text-sm font-bold text-slate-600 leading-relaxed italic border-l-4 border-amber-200 pl-4">" {{ inc.content }} "</p>
            </div>
            
            <div v-if="inc.answer" class="space-y-2">
              <span class="text-[10px] font-black text-indigo-400 uppercase tracking-widest">상대방의 답변</span>
              <div class="bg-indigo-50/50 p-5 rounded-2xl text-xs font-black text-indigo-700 leading-relaxed">
                 {{ inc.answer }}
              </div>
            </div>
            <div v-else class="flex flex-col items-center justify-center py-6 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
               <ClockIcon class="w-6 h-6 text-slate-200 mb-2" />
               <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest">답변 대기 중입니다</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-in {
  animation: fadeIn 0.5s ease-out;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
