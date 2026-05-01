<template>
  <div class="space-y-6">
    <div class="space-y-1">
      <h2 class="text-2xl font-black text-slate-900 tracking-tight">신규 가입 승인</h2>
      <p class="text-slate-400 text-[11px] font-black uppercase tracking-widest">대기 중인 회원가입 신청입니다.</p>
    </div>

    <div v-if="loading" class="flex justify-center py-20">
      <div class="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
    </div>

    <div v-else-if="apps.length === 0" class="text-center py-20 bg-white rounded-[2.5rem] border border-dashed border-slate-200 text-slate-300 font-bold text-sm uppercase tracking-widest">
      대기 중인 신청이 없습니다.
    </div>

    <div v-else class="space-y-4">
      <div v-for="app in apps" :key="app.id" class="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 space-y-4">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center font-black text-slate-400">{{ app.user_name.charAt(0) }}</div>
          <div>
            <div class="text-base font-black text-slate-900">{{ app.user_name }}</div>
            <div class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{{ app.user_id }}</div>
          </div>
        </div>
        
        <div class="bg-slate-50 p-4 rounded-2xl space-y-1.5">
           <div class="flex items-center gap-2 text-xs font-bold text-slate-600"><BuildingOfficeIcon class="w-3.5 h-3.5" /> {{ app.dept_name || '부서 미지정' }}</div>
           <div class="flex items-center gap-2 text-xs font-bold text-slate-600"><PhoneIcon class="w-3.5 h-3.5" /> {{ app.phone }}</div>
        </div>

        <div class="flex gap-3 pt-2">
           <button @click="reject(app)" class="flex-1 py-4 bg-rose-50 text-rose-500 font-black text-[10px] uppercase tracking-widest rounded-2xl active:scale-95 transition-all">거절</button>
           <button @click="approve(app)" class="flex-1 py-4 bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-lg shadow-slate-200 active:scale-95 transition-all">승인</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { BuildingOfficeIcon, PhoneIcon } from '@heroicons/vue/24/outline'

const apps = ref([])
const loading = ref(false)

const fetchApps = async () => {
  loading.value = true
  try {
    const res = await axios.get('/api/users')
    apps.value = res.data.filter(u => !u.is_approved)
  } catch (e) {}
  finally { loading.value = false }
}

onMounted(fetchApps)

const approve = async (app) => {
  if (!confirm('승인하시겠습니까?')) return
  await axios.patch(`/api/users/${app.id}/approve`, { roleNames: ['사용자'] })
  fetchApps()
}

const reject = async (app) => {
  if (!confirm('신청을 거절하고 삭제하시겠습니까?')) return
  await axios.delete(`/api/users/${app.id}`)
  fetchApps()
}
</script>
