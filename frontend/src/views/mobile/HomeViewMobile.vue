<template>
  <div class="space-y-8 animate-in fade-in duration-500">
    <!-- Welcome Section -->
    <div class="space-y-1">
      <h2 class="text-2xl font-black text-slate-900 tracking-tight">{{ auth.user?.userName }}님, 안녕하세요! 👋</h2>
      <p class="text-slate-400 text-[12px] font-black uppercase tracking-widest">오늘도 평안한 하루 되세요.</p>
    </div>

    <!-- Quick Stats / Status -->
    <div class="grid grid-cols-2 gap-4">
      <div @click="$router.push('/m/my-reservations')" class="bg-indigo-600 p-5 rounded-[2.5rem] text-white shadow-xl shadow-indigo-100 flex flex-col justify-between aspect-square active:scale-95 transition-all">
        <div class="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
          <CalendarIcon class="w-6 h-6 text-white" />
        </div>
        <div>
          <div class="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">나의 예약</div>
          <div class="text-3xl font-black">{{ myResCount }}건</div>
        </div>
      </div>
      <div @click="$router.push('/m/reservations')" class="bg-white p-5 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col justify-between aspect-square active:scale-95 transition-all">
        <div class="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center">
          <PlusIcon class="w-6 h-6 text-indigo-600" />
        </div>
        <div>
          <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">신규 신청</div>
          <div class="text-xl font-black text-slate-900">공간 예약하기</div>
        </div>
      </div>
    </div>

    <!-- Upcoming Reservation Card -->
    <div class="space-y-4">
      <div class="flex justify-between items-center px-1">
        <h3 class="text-sm font-black text-slate-900 uppercase tracking-widest">다가오는 예약</h3>
        <router-link to="/m/my-reservations" class="text-[10px] font-black text-indigo-600 uppercase tracking-widest">전체보기</router-link>
      </div>

      <div v-if="upcomingRes" class="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col gap-4">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
            <MapPinIcon class="w-6 h-6" />
          </div>
          <div>
            <div class="text-xs font-black text-slate-400 uppercase tracking-widest mb-0.5">{{ upcomingRes.room_name }}</div>
            <div class="text-lg font-black text-slate-900">{{ upcomingRes.title || '공간 사용' }}</div>
          </div>
        </div>
        <div class="flex items-center justify-between bg-slate-50 p-4 rounded-2xl">
          <div class="flex items-center gap-2">
            <CalendarDaysIcon class="w-4 h-4 text-slate-400" />
            <span class="text-xs font-bold text-slate-600">{{ upcomingRes.reservation_date }}</span>
          </div>
          <div class="flex items-center gap-2">
            <ClockIcon class="w-4 h-4 text-slate-400" />
            <span class="text-xs font-bold text-indigo-600">{{ upcomingRes.start_time.slice(0, 5) }} - {{ upcomingRes.end_time.slice(0, 5) }}</span>
          </div>
        </div>
      </div>
      <div v-else class="bg-slate-50/50 border border-dashed border-slate-200 rounded-[2.5rem] p-10 text-center">
        <p class="text-xs font-bold text-slate-400">예정된 예약이 없습니다.</p>
      </div>
    </div>

    <!-- Banner / Info Section -->
    <div @click="$router.push('/m/guide')" class="bg-slate-900 p-8 rounded-[2.5rem] text-white relative overflow-hidden active:scale-95 transition-all">
      <div class="relative z-10 space-y-2">
        <h4 class="text-lg font-black tracking-tight leading-tight">원천교회 공간 사용 수칙을<br>확인해 주세요.</h4>
        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] pt-2">이용 가이드 보기 →</p>
      </div>
      <BuildingOfficeIcon class="absolute -right-4 -bottom-4 w-32 h-32 text-white/5" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../../store/auth'
import axios from 'axios'
import { 
  CalendarIcon, 
  PlusIcon, 
  MapPinIcon, 
  CalendarDaysIcon, 
  ClockIcon,
  BuildingOfficeIcon
} from '@heroicons/vue/24/outline'

const auth = useAuthStore()
const upcomingRes = ref(null)
const myResCount = ref(0)

onMounted(async () => {
  try {
    const today = new Date().toISOString().split('T')[0]
    const res = await axios.get(`/api/reservations?user_id=${auth.user.id}&start_date=${today}`)
    const all = res.data
    myResCount.value = all.length
    if (all.length > 0) {
      upcomingRes.value = all[0]
    }
  } catch (e) {}
})
</script>
