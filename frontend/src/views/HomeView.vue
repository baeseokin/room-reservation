<script setup>
import { 
  CalendarDaysIcon, 
  UserCircleIcon, 
  QuestionMarkCircleIcon, 
  ChevronRightIcon,
  SparklesIcon,
  BuildingOffice2Icon,
  ClockIcon
} from '@heroicons/vue/24/outline'
import { useAuthStore } from '../store/auth'

const auth = useAuthStore()
</script>

<template>
  <div class="min-h-full bg-slate-50/50 pb-20">
    <!-- Hero Section (Premium Bright) -->
    <div class="relative overflow-hidden bg-white border-b border-slate-100">
      <div class="absolute inset-0 pointer-events-none overflow-hidden">
        <div class="absolute -top-24 -right-24 w-96 h-96 bg-indigo-50 rounded-full blur-3xl opacity-50"></div>
        <div class="absolute top-1/2 -left-24 w-64 h-64 bg-rose-50 rounded-full blur-3xl opacity-30"></div>
      </div>

      <div class="max-w-7xl mx-auto px-6 py-20 lg:py-28 relative">
        <div class="flex flex-col lg:flex-row items-center gap-16">
          <div class="flex-1 space-y-8 text-center lg:text-left">
            <div class="inline-flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-full text-[12px] font-black text-indigo-600 uppercase tracking-[0.2em]">
              <SparklesIcon class="w-4 h-4" />
              Woncheon Space Reservation
            </div>
            
            <h1 class="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter leading-[1.1]">
              성도님의 헌신과 친교를 위한<br />
              <span class="text-indigo-600">아름다운 공간</span>
            </h1>
            
            <p class="text-lg text-slate-500 font-medium max-w-xl mx-auto lg:mx-0 leading-relaxed">
              원천교회 모든 성도님들이 자유롭게 소통하고 기도할 수 있도록<br class="hidden sm:block" />
              다양한 공간을 쉽고 빠르게 예약하실 수 있습니다.
            </p>


          </div>


        </div>
      </div>
    </div>

    <!-- Quick Navigation Grid -->
    <div class="max-w-7xl mx-auto px-6 -mt-10 relative z-20">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <router-link to="/home/reservations" class="group bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 hover:border-indigo-200 hover:shadow-indigo-500/10 transition-all duration-300">
          <div class="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500">
            <CalendarDaysIcon class="w-7 h-7" />
          </div>
          <h3 class="text-xl font-black text-slate-900 mb-2">공간 예약 신청</h3>
          <p class="text-slate-500 text-sm font-medium leading-relaxed">예배실, 세미나실 등 교회 내 다양한 공간을 실시간으로 확인하고 예약하세요.</p>
        </router-link>

        <router-link to="/home/my-reservations" class="group bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 hover:border-emerald-200 hover:shadow-emerald-500/10 transition-all duration-300">
          <div class="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-500">
            <ClockIcon class="w-7 h-7" />
          </div>
          <h3 class="text-xl font-black text-slate-900 mb-2">예약 현황 확인</h3>
          <p class="text-slate-500 text-sm font-medium leading-relaxed">내가 신청한 예약의 승인 상태를 확인하고 필요 시 일정을 변경하거나 취소할 수 있습니다.</p>
        </router-link>
      </div>
    </div>

    <!-- Usage Guide Section -->
    <div class="max-w-7xl mx-auto px-6 mt-20">
      <div class="bg-indigo-600 rounded-[3rem] p-10 lg:p-16 text-white relative overflow-hidden group">
        <div class="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -mr-24 -mt-24 blur-3xl transition-transform duration-700 group-hover:scale-110"></div>
        <div class="relative z-10 flex flex-col lg:flex-row items-center gap-12">
          <div class="flex-1 space-y-6">
            <h2 class="text-3xl font-black tracking-tight">공간 사용이 처음이신가요?</h2>
            <div class="space-y-4">
              <div class="flex items-start gap-4">
                <div class="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center text-sm font-black shrink-0">1</div>
                <p class="font-bold text-indigo-50 leading-relaxed">원하시는 공간과 시간을 선택하여 예약을 신청합니다.</p>
              </div>
              <div class="flex items-start gap-4">
                <div class="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center text-sm font-black shrink-0">2</div>
                <p class="font-bold text-indigo-50 leading-relaxed">관리자의 승인이 완료되면 예약이 확정됩니다.</p>
              </div>
              <div class="flex items-start gap-4">
                <div class="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center text-sm font-black shrink-0">3</div>
                <p class="font-bold text-indigo-50 leading-relaxed">승인 결과는 알림톡 또는 내 예약 확인 메뉴에서 보실 수 있습니다.</p>
              </div>
            </div>
          </div>
          <div class="flex-none">
            <router-link to="/home/profile" class="bg-white text-indigo-600 px-10 py-5 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-50 transition-all shadow-2xl">
              내 프로필 설정하기
            </router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-in {
  animation: fadeIn 1s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
