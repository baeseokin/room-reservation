<script setup>
import { useAuthStore } from '../store/auth'
import { CalendarIcon, MapPinIcon, BellIcon } from '@heroicons/vue/24/outline'

const auth = useAuthStore()
</script>

<template>
  <div class="p-8 max-w-5xl mx-auto space-y-12 py-16">
    <div class="space-y-4 text-center">
      <h2 class="text-slate-400 font-bold uppercase tracking-widest text-sm">Welcome back</h2>
      <h1 class="text-5xl font-black text-slate-900 tracking-tighter">
        안녕하세요, <span class="text-indigo-600">{{ auth.user?.userName }}</span>님!
      </h1>
      <p class="text-slate-500 text-lg font-medium">오늘은 어떤 공간에서 활동하시나요?</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8">
      <router-link to="/reservations" class="group bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/50 hover:shadow-indigo-500/20 transition-all hover:-translate-y-2">
         <div class="bg-indigo-50 w-16 h-16 rounded-3xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors mb-6">
            <CalendarIcon class="w-8 h-8" />
         </div>
         <h3 class="text-2xl font-bold text-slate-900 mb-2">공간 예약하기</h3>
         <p class="text-slate-500 font-medium">사용 가능한 빈 공간을 확인하고 즉시 예약하세요.</p>
      </router-link>

      <router-link to="/my-reservations" class="group bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/50 hover:shadow-indigo-500/20 transition-all hover:-translate-y-2">
         <div class="bg-slate-50 w-16 h-16 rounded-3xl flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-colors mb-6">
            <BellIcon class="w-8 h-8" />
         </div>
         <h3 class="text-2xl font-bold text-slate-900 mb-2">나의 예약 확인</h3>
         <p class="text-slate-500 font-medium">현재 예약된 내역과 알림을 관리합니다.</p>
      </router-link>
    </div>

    <div v-if="auth.user?.roles.includes('관리자')" class="bg-slate-900 rounded-[3rem] p-12 text-white flex flex-col md:flex-row items-center justify-between gap-8">
       <div class="space-y-2">
          <h3 class="text-3xl font-black">관리자 도구</h3>
          <p class="text-slate-400 font-medium">공간 정보 업데이트 및 사용자 권한을 관리할 수 있습니다.</p>
       </div>
       <router-link to="/rooms" class="bg-white text-slate-900 px-8 py-4 rounded-2xl font-black hover:bg-indigo-50 transition-colors">
          관리 시작하기
       </router-link>
    </div>
  </div>
</template>
