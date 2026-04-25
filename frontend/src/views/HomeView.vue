<script setup>
import { CalendarIcon, BuildingOfficeIcon, SparklesIcon } from '@heroicons/vue/24/outline'
</script>

<template>
  <div class="min-h-[calc(100vh-8rem)]">
    <!-- Hero Section -->
    <div class="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white py-24 px-6 text-center relative overflow-hidden">
      <!-- BG decoration -->
      <div class="absolute inset-0 pointer-events-none">
        <div class="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl"></div>
        <div class="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl"></div>
      </div>

      <div class="relative max-w-3xl mx-auto space-y-6">
        <div class="inline-flex items-center gap-2 bg-white/10 border border-white/20 backdrop-blur px-4 py-2 rounded-full text-xs font-black text-slate-300 uppercase tracking-widest">
          <SparklesIcon class="w-4 h-4 text-indigo-400" />
          원천교회 공간 예약시스템
        </div>
        <h1 class="text-5xl md:text-6xl font-black tracking-tighter leading-tight">
          공간을 예약하고<br />
          <span class="text-indigo-400">함께 사용해요</span>
        </h1>
        <p class="text-slate-400 text-lg font-medium max-w-xl mx-auto">
          로그인 없이 누구나 공간을 확인하고 예약 신청을 할 수 있습니다.<br/>
          관리자 승인 후 예약이 확정됩니다.
        </p>
        <div class="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <router-link to="/reservations"
            class="bg-indigo-600 hover:bg-indigo-500 text-white font-black px-8 py-4 rounded-2xl shadow-xl shadow-indigo-600/30 transition-all hover:-translate-y-0.5 active:scale-[0.98] text-sm uppercase tracking-widest">
            🗓 공간 예약하기
          </router-link>
        </div>
      </div>
    </div>

    <!-- Info Cards -->
    <div class="max-w-4xl mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="bg-white rounded-3xl p-8 border border-slate-100 shadow-xl shadow-slate-200/50 hover:shadow-indigo-500/10 transition-all hover:-translate-y-1 group">
        <div class="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-indigo-600 transition-colors">
          <CalendarIcon class="w-7 h-7 text-indigo-600 group-hover:text-white transition-colors" />
        </div>
        <h3 class="text-lg font-black text-slate-900 mb-2">쉬운 예약 신청</h3>
        <p class="text-slate-500 text-sm font-medium leading-relaxed">별도의 회원가입 없이 이름과 연락처만 입력하면 바로 예약 신청이 가능합니다.</p>
      </div>

      <div class="bg-white rounded-3xl p-8 border border-slate-100 shadow-xl shadow-slate-200/50 hover:shadow-indigo-500/10 transition-all hover:-translate-y-1 group">
        <div class="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-amber-500 transition-colors">
          <BuildingOfficeIcon class="w-7 h-7 text-amber-500 group-hover:text-white transition-colors" />
        </div>
        <h3 class="text-lg font-black text-slate-900 mb-2">다양한 공간</h3>
        <p class="text-slate-500 text-sm font-medium leading-relaxed">예배당, 소그룹 방, 세미나실 등 다양한 공간의 현황을 실시간으로 확인하세요.</p>
      </div>

      <div class="bg-white rounded-3xl p-8 border border-slate-100 shadow-xl shadow-slate-200/50 hover:shadow-indigo-500/10 transition-all hover:-translate-y-1 group">
        <div class="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-emerald-600 transition-colors">
          <SparklesIcon class="w-7 h-7 text-emerald-600 group-hover:text-white transition-colors" />
        </div>
        <h3 class="text-lg font-black text-slate-900 mb-2">빠른 승인 알림</h3>
        <p class="text-slate-500 text-sm font-medium leading-relaxed">관리자 승인 시 카카오 알림톡으로 즉시 예약 결과를 받아볼 수 있습니다.</p>
      </div>
    </div>

    <!-- CTA -->
    <div class="max-w-4xl mx-auto px-6 pb-16">
      <div class="bg-slate-900 rounded-[2.5rem] p-12 text-white text-center space-y-6">
        <h2 class="text-3xl font-black">지금 바로 예약하세요</h2>
        <p class="text-slate-400 font-medium">원하는 날짜와 시간을 선택하고 공간을 신청하세요.</p>
        <router-link to="/reservations"
          class="inline-block bg-white text-slate-900 font-black px-8 py-4 rounded-2xl hover:bg-indigo-50 transition-colors text-sm uppercase tracking-widest">
          캘린더 바로가기 →
        </router-link>
      </div>
    </div>
  </div>
</template>
