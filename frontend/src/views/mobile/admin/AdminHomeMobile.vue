<template>
  <div class="space-y-6">
    <div class="space-y-1">
      <h2 class="text-2xl font-black text-slate-900 tracking-tight">관리자 센터</h2>
      <p class="text-slate-400 text-[11px] font-black uppercase tracking-widest">시스템 관리 기능을 이용하세요.</p>
    </div>

    <div class="grid grid-cols-1 gap-4">
      <router-link v-for="item in adminMenu" :key="item.path" :to="item.path"
        class="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 flex items-center justify-between active:scale-[0.98] transition-all">
        <div class="flex items-center gap-5">
          <div :class="item.color" class="w-14 h-14 rounded-2xl flex items-center justify-center">
            <component :is="item.icon" class="w-7 h-7 text-white" />
          </div>
          <div>
            <div class="text-base font-black text-slate-900">{{ item.label }}</div>
            <div class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{{ item.desc }}</div>
          </div>
        </div>
        <ChevronRightIcon class="w-5 h-5 text-slate-300" />
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { 
  CalendarIcon, 
  UserGroupIcon, 
  BuildingOfficeIcon, 
  HomeModernIcon,
  ChevronRightIcon 
} from '@heroicons/vue/24/outline'

const adminMenu = [
  { path: '/m/admin/reservations', icon: CalendarIcon, label: '예약 승인', desc: '신청 검토 및 승인', color: 'bg-indigo-600' },
  { path: '/m/admin/applications', icon: UserGroupIcon, label: '가입 승인', desc: '신규 회원 승인 대기', color: 'bg-emerald-500' },
  { path: '/m/admin/users', icon: UserGroupIcon, label: '사용자 관리', desc: '회원 정보 및 권한 설정', color: 'bg-amber-500' },
  { path: '/m/admin/rooms', icon: HomeModernIcon, label: '공간 관리', desc: '회의실 등록 및 수정', color: 'bg-slate-900' },
  { path: '/m/admin/departments', icon: BuildingOfficeIcon, label: '부서 관리', desc: '조직도 및 부서 설정', color: 'bg-rose-500' }
]
</script>
