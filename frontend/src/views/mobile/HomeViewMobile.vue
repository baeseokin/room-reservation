<template>
  <div class="space-y-8 animate-in fade-in duration-500">
    <!-- Welcome Section -->
    <div class="space-y-1">
      <h2 class="text-2xl font-black text-slate-900 tracking-tight">{{ auth.user?.userName }}님, 안녕하세요! 👋</h2>
      <p class="text-slate-400 text-[12px] font-black uppercase tracking-widest">오늘도 평안한 하루 되세요.</p>
    </div>

    <!-- Quick Stats / Status -->
    <div class="grid grid-cols-2 gap-4">
      <!-- Left Card: My Reservations (User) or Pending Approvals (Admin) -->
      <div v-if="!auth.isAdmin" @click="$router.push('/m/my-reservations')" class="bg-indigo-600 p-5 rounded-[2.5rem] text-white shadow-xl shadow-indigo-100 flex flex-col justify-between aspect-square active:scale-95 transition-all">
        <div class="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
          <CalendarIcon class="w-6 h-6 text-white" />
        </div>
        <div>
          <div class="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">나의 예약</div>
          <div class="text-3xl font-black">{{ myResCount }}건</div>
        </div>
      </div>
      <div v-else @click="$router.push('/m/admin/reservations')" class="bg-rose-500 p-5 rounded-[2.5rem] text-white shadow-xl shadow-rose-100 flex flex-col justify-between aspect-square active:scale-95 transition-all">
        <div class="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
          <CheckBadgeIcon class="w-6 h-6 text-white" />
        </div>
        <div>
          <div class="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">예약 승인 대기</div>
          <div class="text-3xl font-black">{{ pendingResCount }}건</div>
        </div>
      </div>

      <!-- Right Card: Book Space (User) or New Sign-ups (Admin) -->
      <div v-if="!auth.isAdmin" @click="$router.push('/m/reservations')" class="bg-white p-5 rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50 flex flex-col justify-between aspect-square active:scale-95 transition-all">
        <div class="w-10 h-10 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center">
          <PlusIcon class="w-6 h-6 text-indigo-600" />
        </div>
        <div>
          <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">신규 신청</div>
          <div class="text-xl font-black text-slate-900">공간 예약하기</div>
        </div>
      </div>
      <div v-else @click="$router.push('/m/admin/applications')" class="bg-white p-5 rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50 flex flex-col justify-between aspect-square active:scale-95 transition-all">
        <div class="w-10 h-10 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center">
          <UserPlusIcon class="w-6 h-6 text-rose-500" />
        </div>
        <div>
          <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">신규 가입 대기</div>
          <div class="text-3xl font-black text-slate-900">{{ pendingUserCount }}건</div>
        </div>
      </div>
    </div>

    <!-- Upcoming Reservation Card -->
    <div class="space-y-4">
      <div class="flex justify-between items-center px-1">
        <h3 class="text-sm font-black text-slate-900 uppercase tracking-widest">다가오는 예약</h3>
        <router-link to="/m/my-reservations" class="text-[10px] font-black text-indigo-600 uppercase tracking-widest">전체보기</router-link>
      </div>

      <div v-if="upcomingRes" class="bg-white p-6 rounded-[3rem] border border-slate-200 shadow-xl shadow-slate-200/50 flex flex-col gap-4">
        <div class="flex items-center gap-4">
          <div class="w-16 h-16 rounded-[1.4rem] bg-indigo-50 overflow-hidden flex shrink-0 items-center justify-center font-black text-indigo-400 shadow-inner">
            <img v-if="upcomingRes.image_url" :src="upcomingRes.image_url" class="w-full h-full object-cover" />
            <MapPinIcon v-else class="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <div class="flex items-center gap-1.5 mb-1">
              <span class="text-[9px] font-black bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md uppercase tracking-tighter">{{ upcomingRes.floor }}{{ upcomingRes.floor.includes('B') ? '' : 'F' }}</span>
              <div class="text-xs font-black text-slate-400 uppercase tracking-widest">{{ upcomingRes.room_name }}</div>
            </div>
            <div class="text-lg font-black text-slate-900 leading-tight">{{ upcomingRes.title || '공간 사용' }}</div>
          </div>
        </div>
        <div class="flex items-center justify-between bg-slate-50 border border-slate-100 p-4 rounded-2xl">
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
  BuildingOfficeIcon,
  UserPlusIcon,
  CheckBadgeIcon
} from '@heroicons/vue/24/outline'

const auth = useAuthStore()
const upcomingRes = ref(null)
const myResCount = ref(0)
const pendingResCount = ref(0)
const pendingUserCount = ref(0)

onMounted(async () => {
  try {
    // 1. Fetch data for common/user stats
    const res = await axios.get(`/api/reservations`, { 
      params: { 
        user_id: auth.user.id,
        status: 'all'
      } 
    })
    const all = res.data
    
    const now = new Date()
    const activeReservations = all.filter(r => {
      if (r.status === 'rejected' || r.status === 'cancelled') return false
      const endTime = new Date(`${r.reservation_date}T${r.end_time}`)
      return endTime > now
    })
    
    myResCount.value = activeReservations.length

    const futureOnly = activeReservations.filter(r => {
      const startTime = new Date(`${r.reservation_date}T${r.start_time}`)
      return startTime > now
    })

    futureOnly.sort((a, b) => {
      const timeA = new Date(`${a.reservation_date}T${a.start_time}`).getTime()
      const timeB = new Date(`${b.reservation_date}T${b.start_time}`).getTime()
      return timeA - timeB
    })

    if (futureOnly.length > 0) {
      upcomingRes.value = futureOnly[0]
    }

    // 2. Fetch data for admin stats if applicable
    if (auth.isAdmin) {
      // Fetch pending reservations count
      const pRes = await axios.get('/api/reservations', { params: { status: 'pending' } })
      pendingResCount.value = pRes.data.length

      // Fetch pending users count
      const pUsers = await axios.get('/api/users')
      pendingUserCount.value = pUsers.data.filter(u => !u.is_approved).length
    }

  } catch (e) {
    console.error('Home stats fetch error:', e)
  }
})
</script>
