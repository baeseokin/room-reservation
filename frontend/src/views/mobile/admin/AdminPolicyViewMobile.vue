<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { useModalStore } from '@/stores/useModalStore'
import { 
  AdjustmentsHorizontalIcon, 
  ArrowPathIcon,
  ShieldCheckIcon,
  CalendarIcon,
  ClockIcon,
  NoSymbolIcon
} from '@heroicons/vue/24/outline'

const modal = useModalStore()
const loading = ref(false)
const saving = ref(false)

const policy = ref({
  allow_same_day: 0,
  allow_monday: 0,
  allow_holidays: 0,
  start_time: '09:00:00',
  end_time: '17:00:00'
})

// Generate time options for dropdowns (00:00 to 24:00)
const timeOptions = ref([])
for (let h = 0; h <= 24; h++) {
  const hh = h.toString().padStart(2, '0')
  timeOptions.value.push(`${hh}:00`)
  if (h < 24) {
    timeOptions.value.push(`${hh}:30`)
  }
}

const fetchPolicy = async () => {
  loading.value = true
  try {
    const res = await axios.get('/api/reservations/policy')
    policy.value = {
      ...res.data,
      start_time: res.data.start_time.slice(0, 5),
      end_time: res.data.end_time.slice(0, 5)
    }
  } catch (error) {
    console.error('Fetch policy error:', error)
    modal.showAlert('예약 정책 설정을 불러오지 못했습니다.')
  } finally {
    loading.value = false
  }
}

const savePolicy = async () => {
  if (policy.value.start_time >= policy.value.end_time) {
    modal.showAlert('종료 시간은 시작 시간보다 이후여야 합니다.')
    return
  }

  saving.value = true
  try {
    await axios.put('/api/reservations/policy', {
      allow_same_day: policy.value.allow_same_day ? 1 : 0,
      allow_monday: policy.value.allow_monday ? 1 : 0,
      allow_holidays: policy.value.allow_holidays ? 1 : 0,
      start_time: `${policy.value.start_time}:00`,
      end_time: `${policy.value.end_time}:00`
    })
    modal.showAlert('예약 정책 설정이 성공적으로 저장되었습니다.')
  } catch (error) {
    console.error('Save policy error:', error)
    modal.showAlert('정책 설정 저장 중 오류가 발생했습니다.')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  fetchPolicy()
})
</script>

<template>
  <div class="space-y-6 pb-12">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="space-y-1">
        <h2 class="text-2xl font-black text-slate-900 flex items-center gap-2">
          <AdjustmentsHorizontalIcon class="w-6 h-6 text-indigo-600" />
          예약 정책 설정
        </h2>
        <p class="text-slate-400 text-[0.6875rem] font-black uppercase tracking-widest">일반 성도 대상 예약 규칙 관리</p>
      </div>
      <button @click="fetchPolicy" class="w-10 h-10 flex items-center justify-center bg-white border border-slate-100 rounded-xl shadow-md text-slate-400 active:scale-95 transition-all">
        <ArrowPathIcon class="w-5 h-5" :class="{ 'animate-spin': loading }" />
      </button>
    </div>

    <!-- Main Container -->
    <div class="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50 p-6 space-y-6 relative overflow-hidden">
      <!-- Loading Overlay -->
      <div v-if="loading" class="absolute inset-0 bg-white/70 backdrop-blur-sm z-10 flex items-center justify-center">
        <div class="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>

      <!-- Date Constraints Section -->
      <div class="space-y-4">
        <h3 class="text-[0.6875rem] font-black text-slate-400 uppercase tracking-widest pl-1">일자 제약 조건</h3>
        
        <div class="space-y-3">
          <!-- Same Day Control -->
          <div class="p-4 rounded-3xl border border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
                <NoSymbolIcon class="w-4 h-4" />
              </div>
              <div>
                <div class="text-xs font-black text-slate-900">당일 예약 금지</div>
                <div class="text-[0.625rem] text-slate-400 font-bold mt-0.5">당일 예약 불가능 여부</div>
              </div>
            </div>
            <button 
              @click="policy.allow_same_day = policy.allow_same_day ? 0 : 1"
              :class="[policy.allow_same_day ? 'bg-indigo-600 text-white font-black' : 'bg-slate-200 text-slate-400']"
              class="px-3 py-1.5 rounded-lg text-[0.6875rem] font-bold transition-all min-w-[65px] text-center shadow-sm">
              {{ policy.allow_same_day ? '허용됨' : '제한됨' }}
            </button>
          </div>

          <!-- Monday Control -->
          <div class="p-4 rounded-3xl border border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
                <CalendarIcon class="w-4 h-4" />
              </div>
              <div>
                <div class="text-xs font-black text-slate-900">월요일 예약 금지</div>
                <div class="text-[0.625rem] text-slate-400 font-bold mt-0.5">월요일 예약 불가능 여부</div>
              </div>
            </div>
            <button 
              @click="policy.allow_monday = policy.allow_monday ? 0 : 1"
              :class="[policy.allow_monday ? 'bg-indigo-600 text-white font-black' : 'bg-slate-200 text-slate-400']"
              class="px-3 py-1.5 rounded-lg text-[0.6875rem] font-bold transition-all min-w-[65px] text-center shadow-sm">
              {{ policy.allow_monday ? '허용됨' : '제한됨' }}
            </button>
          </div>

          <!-- Holiday Control -->
          <div class="p-4 rounded-3xl border border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
                <ShieldCheckIcon class="w-4 h-4" />
              </div>
              <div>
                <div class="text-xs font-black text-slate-900">공휴일 예약 금지</div>
                <div class="text-[0.625rem] text-slate-400 font-bold mt-0.5">공휴일 예약 불가능 여부</div>
              </div>
            </div>
            <button 
              @click="policy.allow_holidays = policy.allow_holidays ? 0 : 1"
              :class="[policy.allow_holidays ? 'bg-indigo-600 text-white font-black' : 'bg-slate-200 text-slate-400']"
              class="px-3 py-1.5 rounded-lg text-[0.6875rem] font-bold transition-all min-w-[65px] text-center shadow-sm">
              {{ policy.allow_holidays ? '허용됨' : '제한됨' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Time Range Section -->
      <div class="space-y-4">
        <h3 class="text-[0.6875rem] font-black text-slate-400 uppercase tracking-widest pl-1">이용 제한 시간 범위</h3>
        
        <div class="p-4 rounded-3xl border border-slate-100 bg-slate-50/50 space-y-4">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0">
              <ClockIcon class="w-4 h-4" />
            </div>
            <div>
              <div class="text-xs font-black text-slate-900">이용 가능 시간대 설정</div>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1">
              <label class="block text-[0.5625rem] font-black text-slate-400 uppercase tracking-widest ml-1 text-center">시작 시간</label>
              <select v-model="policy.start_time" 
                class="w-full bg-white border border-slate-200 rounded-xl py-3 px-2 text-xs font-black text-center text-slate-700 focus:ring-0">
                <option v-for="t in timeOptions" :key="'start-m-'+t" :value="t">{{ t }}</option>
              </select>
            </div>
            <div class="space-y-1">
              <label class="block text-[0.5625rem] font-black text-slate-400 uppercase tracking-widest ml-1 text-center">종료 시간</label>
              <select v-model="policy.end_time" 
                class="w-full bg-white border border-slate-200 rounded-xl py-3 px-2 text-xs font-black text-center text-slate-700 focus:ring-0">
                <option v-for="t in timeOptions" :key="'end-m-'+t" :value="t">{{ t }}</option>
              </select>
            </div>
            
            <div class="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50 text-[0.6875rem] font-bold text-indigo-600 leading-relaxed">
              ※ 관리자 권한을 가진 사용자는 설정된 예약 제약조건과 이용 시간 범위를 무시하고 언제든 자유롭게 예약할 수 있습니다.
            </div>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="grid grid-cols-3 gap-3 pt-4 border-t border-slate-100">
        <button 
          @click="fetchPolicy" 
          class="py-4 border border-slate-200 rounded-2xl font-black text-[0.625rem] uppercase tracking-widest text-slate-400">
          초기화
        </button>
        <button 
          @click="savePolicy" 
          :disabled="saving"
          class="col-span-2 bg-slate-900 text-white py-4 rounded-2xl font-black text-[0.625rem] uppercase tracking-widest hover:bg-indigo-600 shadow-md active:scale-[0.98] flex items-center justify-center gap-1.5">
          <ArrowPathIcon v-if="saving" class="w-3.5 h-3.5 animate-spin" />
          설정 저장하기
        </button>
      </div>
    </div>
  </div>
</template>
