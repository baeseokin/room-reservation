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
      // Ensure time string matches format (HH:MM)
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
  <div class="p-6 max-w-4xl mx-auto space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-black text-slate-900 flex items-center gap-2">
          <AdjustmentsHorizontalIcon class="w-7 h-7 text-indigo-600" />
          기본 예약 정책 설정
        </h1>
        <p class="text-slate-500 text-sm font-medium mt-0.5">일반 성도 대상 예약 신청 시 적용되는 규칙 및 이용 제한 정책을 제어합니다.</p>
      </div>
      <button @click="fetchPolicy" class="p-3 bg-white border border-slate-200 text-slate-500 rounded-2xl hover:bg-slate-50 transition-all shadow-sm">
        <ArrowPathIcon class="w-5 h-5" :class="{ 'animate-spin': loading }" />
      </button>
    </div>

    <!-- Main Settings Container -->
    <div class="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 p-8 space-y-8 relative overflow-hidden">
      <!-- Loading Overlay -->
      <div v-if="loading" class="absolute inset-0 bg-white/70 backdrop-blur-sm z-10 flex items-center justify-center">
        <div class="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Date Constraints Section -->
        <div class="space-y-4">
          <h2 class="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">일자 제약 조건</h2>
          
          <div class="space-y-3">
            <!-- Same Day Control -->
            <div class="p-5 rounded-[2rem] border border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div class="flex items-center gap-4">
                <div class="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center">
                  <NoSymbolIcon class="w-5 h-5" />
                </div>
                <div>
                  <div class="text-sm font-black text-slate-900">당일 예약 제약</div>
                  <div class="text-xs text-slate-400 font-bold mt-0.5">당일에 바로 예약하는 것을 금지합니다.</div>
                </div>
              </div>
              <button 
                @click="policy.allow_same_day = policy.allow_same_day ? 0 : 1"
                :class="[policy.allow_same_day ? 'bg-indigo-600 text-white font-black' : 'bg-slate-200 text-slate-400']"
                class="px-4 py-2 rounded-xl text-xs font-bold transition-all min-w-[70px] text-center shadow-sm">
                {{ policy.allow_same_day ? '허용됨' : '제한됨' }}
              </button>
            </div>

            <!-- Monday Control -->
            <div class="p-5 rounded-[2rem] border border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div class="flex items-center gap-4">
                <div class="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center">
                  <CalendarIcon class="w-5 h-5" />
                </div>
                <div>
                  <div class="text-sm font-black text-slate-900">월요일 예약 제약</div>
                  <div class="text-xs text-slate-400 font-bold mt-0.5">매주 월요일에는 예약 신청을 금지합니다.</div>
                </div>
              </div>
              <button 
                @click="policy.allow_monday = policy.allow_monday ? 0 : 1"
                :class="[policy.allow_monday ? 'bg-indigo-600 text-white font-black' : 'bg-slate-200 text-slate-400']"
                class="px-4 py-2 rounded-xl text-xs font-bold transition-all min-w-[70px] text-center shadow-sm">
                {{ policy.allow_monday ? '허용됨' : '제한됨' }}
              </button>
            </div>

            <!-- Holiday Control -->
            <div class="p-5 rounded-[2rem] border border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div class="flex items-center gap-4">
                <div class="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center">
                  <ShieldCheckIcon class="w-5 h-5" />
                </div>
                <div>
                  <div class="text-sm font-black text-slate-900">공휴일 예약 제약</div>
                  <div class="text-xs text-slate-400 font-bold mt-0.5">한국 법정 공휴일의 예약 신청을 금지합니다.</div>
                </div>
              </div>
              <button 
                @click="policy.allow_holidays = policy.allow_holidays ? 0 : 1"
                :class="[policy.allow_holidays ? 'bg-indigo-600 text-white font-black' : 'bg-slate-200 text-slate-400']"
                class="px-4 py-2 rounded-xl text-xs font-bold transition-all min-w-[70px] text-center shadow-sm">
                {{ policy.allow_holidays ? '허용됨' : '제한됨' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Time Range Section -->
        <div class="space-y-4">
          <h2 class="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">이용 제한 시간 범위</h2>
          
          <div class="p-6 rounded-[2rem] border border-slate-100 bg-slate-50/50 space-y-6 h-[calc(100%-1.75rem)] flex flex-col justify-center">
            <div class="flex items-start gap-4 mb-2">
              <div class="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0">
                <ClockIcon class="w-5 h-5" />
              </div>
              <div>
                <div class="text-sm font-black text-slate-900">예약 신청 시간대 범위</div>
                <div class="text-xs text-slate-400 font-bold mt-0.5">일반 사용자가 신청할 수 있는 시작/종료 시간을 제한합니다.</div>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-2">
                <label class="block text-[0.6875rem] font-black text-slate-400 uppercase tracking-widest ml-1">가능 시작 시간</label>
                <select v-model="policy.start_time" 
                  class="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3.5 text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all cursor-pointer">
                  <option v-for="t in timeOptions" :key="'start-'+t" :value="t">{{ t }}</option>
                </select>
              </div>
              <div class="space-y-2">
                <label class="block text-[0.6875rem] font-black text-slate-400 uppercase tracking-widest ml-1">가능 종료 시간</label>
                <select v-model="policy.end_time" 
                  class="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3.5 text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all cursor-pointer">
                  <option v-for="t in timeOptions" :key="'end-'+t" :value="t">{{ t }}</option>
                </select>
              </div>
            </div>

            <div class="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50 text-xs font-bold text-indigo-600 leading-relaxed">
              ※ 관리자 권한을 가진 사용자는 설정된 예약 제약조건과 이용 시간 범위를 무시하고 언제든 자유롭게 예약할 수 있습니다.
            </div>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="pt-6 border-t border-slate-100 flex justify-end gap-3">
        <button 
          @click="fetchPolicy" 
          class="px-6 py-4 border border-slate-200 rounded-3xl font-black text-xs uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all">
          초기화
        </button>
        <button 
          @click="savePolicy" 
          :disabled="saving"
          class="px-10 py-4 bg-slate-900 text-white rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-indigo-600 shadow-xl transition-all active:scale-[0.98] flex items-center gap-2">
          <ArrowPathIcon v-if="saving" class="w-4 h-4 animate-spin" />
          설정 저장하기
        </button>
      </div>
    </div>
  </div>
</template>
