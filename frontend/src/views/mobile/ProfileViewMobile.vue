<template>
  <div class="space-y-8">
    <div class="space-y-1">
      <h2 class="text-2xl font-black text-slate-900 tracking-tight">프로필 설정</h2>
      <p class="text-slate-400 text-[11px] font-black uppercase tracking-widest">본인의 계정 정보를 관리합니다.</p>
    </div>

    <!-- Profile Header -->
    <div class="flex flex-col items-center gap-4 py-8 bg-white rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/50">
      <div class="w-24 h-24 rounded-[2rem] bg-indigo-50 flex items-center justify-center text-indigo-600 text-3xl font-black">
        {{ auth.user?.userName.charAt(0) }}
      </div>
      <div class="text-center">
        <h3 class="text-xl font-black text-slate-900">{{ auth.user?.userName }}</h3>
        <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{{ auth.user?.userId }}</p>
      </div>
    </div>

    <!-- Info List -->
    <div class="space-y-4">
      <div class="bg-white p-6 rounded-3xl border border-slate-100 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <div class="p-3 bg-slate-50 rounded-2xl text-slate-400"><BuildingOfficeIcon class="w-5 h-5" /></div>
          <div>
            <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest">소속 부서</div>
            <div class="text-sm font-black text-slate-700">{{ auth.user?.deptName || '미지정' }}</div>
          </div>
        </div>
      </div>

      <div class="bg-white p-6 rounded-3xl border border-slate-100 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <div class="p-3 bg-slate-50 rounded-2xl text-slate-400"><PhoneIcon class="w-5 h-5" /></div>
          <div>
            <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest">연락처</div>
            <div class="text-sm font-black text-slate-700">{{ auth.user?.phone }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="space-y-4 pt-4">
       <button @click="$router.push('/m/change-password')" class="w-full py-5 bg-white border border-slate-200 rounded-3xl font-black text-xs uppercase tracking-widest text-slate-600 shadow-sm active:scale-95 transition-all">비밀번호 변경</button>
       <button @click="logout" class="w-full py-5 bg-rose-50 text-rose-500 font-black text-xs uppercase tracking-widest rounded-3xl active:scale-95 transition-all">로그아웃</button>
    </div>
  </div>
</template>

<script setup>
import { useAuthStore } from '../../store/auth'
import { BuildingOfficeIcon, PhoneIcon } from '@heroicons/vue/24/outline'

const auth = useAuthStore()

const logout = () => {
  auth.logout()
}
</script>
