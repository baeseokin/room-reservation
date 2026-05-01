<template>
  <div class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <!-- Header -->
    <div class="space-y-1">
      <h2 class="text-2xl font-black text-slate-900 tracking-tight">이용 가이드</h2>
      <p class="text-slate-400 text-[11px] font-black uppercase tracking-widest">원천교회 공간 사용을 위한 안내입니다.</p>
    </div>

    <!-- Guide Content -->
    <div class="space-y-6">
      <!-- Section 1: Reservation -->
      <div class="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/50 space-y-4">
        <div class="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
          <CalendarIcon class="w-6 h-6" />
        </div>
        <h3 class="text-lg font-black text-slate-900">예약 및 승인</h3>
        <ul class="space-y-3">
          <li class="flex gap-3 items-start">
            <div class="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-1.5 shrink-0"></div>
            <p class="text-sm font-bold text-slate-600 leading-relaxed">모든 공간은 최소 30분 단위로 예약이 가능합니다.</p>
          </li>
          <li class="flex gap-3 items-start">
            <div class="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-1.5 shrink-0"></div>
            <p class="text-sm font-bold text-slate-600 leading-relaxed">예약 신청 후 관리자의 승인이 있어야 사용이 확정됩니다.</p>
          </li>
          <li class="flex gap-3 items-start">
            <div class="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-1.5 shrink-0"></div>
            <p class="text-sm font-bold text-slate-600 leading-relaxed">승인 결과는 카카오 알림톡으로 발송됩니다.</p>
          </li>
        </ul>
      </div>

      <!-- Section 2: Usage Rules -->
      <div class="bg-slate-900 p-8 rounded-[3rem] text-white space-y-4 relative overflow-hidden">
        <div class="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white relative z-10">
          <ShieldCheckIcon class="w-6 h-6" />
        </div>
        <h3 class="text-lg font-black relative z-10">공간 사용 수칙</h3>
        <ul class="space-y-3 relative z-10">
          <li class="flex gap-3 items-start">
            <div class="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0"></div>
            <p class="text-sm font-bold text-slate-300 leading-relaxed">사용 후 냉난방기 및 전등을 반드시 꺼주세요.</p>
          </li>
          <li class="flex gap-3 items-start">
            <div class="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0"></div>
            <p class="text-sm font-bold text-slate-300 leading-relaxed">음식물 반입은 원칙적으로 금지됩니다.</p>
          </li>
          <li class="flex gap-3 items-start">
            <div class="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0"></div>
            <p class="text-sm font-bold text-slate-300 leading-relaxed">사용 후 비품은 원래 자리에 정리해 주세요.</p>
          </li>
        </ul>
        <BuildingOfficeIcon class="absolute -right-8 -bottom-8 w-48 h-48 text-white/5" />
      </div>

      <!-- Section 3: Cancellation -->
      <div class="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/50 space-y-4">
        <div class="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500">
          <XCircleIcon class="w-6 h-6" />
        </div>
        <h3 class="text-lg font-black text-slate-900">취소 및 변경</h3>
        <ul class="space-y-3">

          <li class="flex gap-3 items-start">
            <div class="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0"></div>
            <p class="text-sm font-bold text-slate-600 leading-relaxed">당일 급한 변경이 필요한 경우, 사무실(02-337-5400)로 연락 바랍니다.</p>
          </li>
        </ul>
      </div>
    </div>

    <!-- Footer Action -->
    <div class="pt-4 text-center">
      <button @click="$router.back()" class="px-8 py-4 bg-slate-100 text-slate-500 font-black text-xs uppercase tracking-widest rounded-3xl active:scale-95 transition-all">
        이전 화면으로
      </button>
    </div>
  </div>
</template>

<script setup>
import { 
  CalendarIcon, 
  ShieldCheckIcon, 
  BuildingOfficeIcon,
  XCircleIcon 
} from '@heroicons/vue/24/outline'
</script>
