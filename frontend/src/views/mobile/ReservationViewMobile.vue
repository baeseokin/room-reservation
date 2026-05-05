<template>
  <div class="space-y-6 pb-12">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <div class="space-y-1">
        <h2 class="text-2xl font-black text-slate-900 tracking-tight">공간 예약</h2>
        <p class="text-slate-400 text-[11px] font-black uppercase tracking-widest">원하시는 방식으로 예약해 보세요.</p>
      </div>
    </div>

    <!-- Date Picker Trigger (Moved Above Switcher) -->
    <button @click="showCalendar = true" 
      class="w-full bg-indigo-50 border border-indigo-100 px-6 py-4 rounded-2xl flex items-center justify-between active:scale-[0.98] transition-all">
       <div class="flex items-center gap-3">
         <div class="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
           <CalendarDaysIcon class="w-5 h-5 text-indigo-600" />
         </div>
         <span class="text-base font-black text-indigo-900">{{ formattedSelectedDate }}</span>
       </div>
       <ChevronDownIcon class="w-5 h-5 text-indigo-300" />
    </button>

    <!-- Mode Switcher -->
    <div class="bg-slate-100 p-1.5 rounded-[2rem] flex items-center gap-1">
      <button v-for="m in ['time', 'room']" :key="m"
        @click="mode = m"
        :class="[mode === m ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-400']"
        class="flex-1 py-3.5 rounded-[1.8rem] text-xs font-black uppercase tracking-widest transition-all">
        {{ m === 'time' ? '시간별 예약' : '공간별 예약' }}
      </button>
    </div>

    <!-- Mode: By Time -->
    <div v-if="mode === 'time'" class="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
       <div class="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-xl shadow-slate-200/50 space-y-6">
          <div class="grid grid-cols-2 gap-4">
             <div class="space-y-2">
                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-center block">시작 시간</label>
                <select v-model="searchForm.start_time" class="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-2 font-black text-center text-slate-700">
                   <option v-for="t in timeSlots" :key="t" :value="t">{{ t }}</option>
                </select>
             </div>
             <div class="space-y-2">
                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-center block">종료 시간</label>
                <select v-model="searchForm.end_time" class="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-2 font-black text-center text-slate-700">
                   <option v-for="t in timeSlots" :key="t" :value="t">{{ t }}</option>
                </select>
             </div>
          </div>
          <button @click="searchAvailableRooms" class="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all">
             예약 가능 장소 찾기
          </button>
       </div>

       <div v-if="hasSearched" class="space-y-4">
          <h3 class="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">검색 결과 ({{ availableRooms.length }})</h3>
          <div v-if="availableRooms.length === 0" class="bg-slate-50 border border-dashed border-slate-200 p-10 rounded-[2.5rem] text-center">
             <p class="text-xs font-bold text-slate-400">해당 시간에 예약 가능한 공간이 없습니다.</p>
          </div>
          <div v-for="room in availableRooms" :key="room.id"
            @click="openReservationForm(room)"
            class="bg-white p-5 rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50 flex items-center justify-between active:scale-[0.98] transition-all">
            <div class="flex items-center gap-4">
               <div class="w-16 h-16 rounded-[1.4rem] bg-indigo-50 overflow-hidden flex shrink-0 items-center justify-center font-black text-indigo-400 shadow-inner">
                 <img v-if="room.image_url" :src="room.image_url" class="w-full h-full object-cover" />
                 <span v-else>{{ room.floor }}</span>
               </div>
               <div>
                 <div class="flex items-center gap-1.5 mb-1">
                   <span class="text-[9px] font-black bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md uppercase tracking-tighter">{{ room.floor }}{{ room.floor.includes('B') ? '' : 'F' }}</span>
                   <div class="text-sm font-black text-slate-900">{{ room.room_name }}</div>
                 </div>
                 <div class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">정원 {{ room.capacity }}명</div>
               </div>
            </div>
            <div class="bg-indigo-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">선택</div>
          </div>
       </div>
    </div>

    <!-- Mode: By Room -->
    <div v-else class="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <!-- Floor Selector -->
      <div class="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <button v-for="f in floorOptions" :key="f"
          @click="selectedFloor = f"
          :class="[selectedFloor === f ? 'bg-slate-900 text-white' : 'bg-white text-slate-400 border-slate-200']"
          class="px-5 py-2.5 rounded-xl border text-[11px] font-black uppercase tracking-widest transition-all shrink-0">
          {{ f }}
        </button>
      </div>

      <!-- Room List -->
      <div class="space-y-4">
        <div v-for="room in filteredRooms" :key="room.id" 
          @click="openRoomDetail(room)"
          class="bg-white p-5 rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50 flex items-center justify-between active:scale-[0.98] transition-all">
          <div class="flex items-center gap-4">
            <div class="w-16 h-16 rounded-[1.4rem] bg-slate-50 overflow-hidden flex shrink-0 items-center justify-center font-black text-slate-400 shadow-inner">
              <img v-if="room.image_url" :src="room.image_url" class="w-full h-full object-cover" />
              <span v-else>{{ room.floor }}</span>
            </div>
            <div>
              <div class="flex items-center gap-1.5 mb-1">
                <span class="text-[9px] font-black bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md uppercase tracking-tighter">{{ room.floor }}{{ room.floor.includes('B') ? '' : 'F' }}</span>
                <div class="text-sm font-black text-slate-900">{{ room.room_name }}</div>
              </div>
              <div class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">정원 {{ room.capacity }}명</div>
            </div>
          </div>
          <div class="flex flex-col items-end gap-1">
             <ChevronRightIcon class="w-5 h-5 text-slate-300" />
             <span class="text-[9px] font-black text-indigo-400 uppercase tracking-tighter">현황보기</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Room Detail Bottom Sheet (Timeline) -->
    <Teleport to="body">
       <div v-if="showRoomDetail" class="fixed inset-0 z-[100] flex flex-col justify-end">
          <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" @click="showRoomDetail = false"></div>
          <div class="relative bg-white rounded-t-[3rem] p-8 max-h-[85vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom-full duration-300">
             <div class="w-12 h-1.5 bg-slate-100 rounded-full mx-auto mb-8 shrink-0"></div>
             
             <div class="space-y-1 mb-8 shrink-0">
                <div class="flex items-center justify-between">
                  <h3 class="text-2xl font-black text-slate-900 tracking-tight">{{ selectedRoom?.room_name }}</h3>
                  <span class="text-xs font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase">{{ selectedRoom?.floor }}</span>
                </div>
                <p class="text-slate-400 text-xs font-bold">{{ selectedDate }} 예약 현황</p>
             </div>

              <div class="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                <div v-if="roomReservations.length === 0 && currentRoomBlockedTimes.length === 0" class="py-12 text-center bg-slate-50 rounded-3xl">
                   <p class="text-sm font-bold text-slate-400">당일 예약 내역이 없습니다.<br>원하시는 시간에 예약해 보세요!</p>
                </div>
                <template v-else>
                   <!-- Blocked Times -->
                   <div v-for="bt in currentRoomBlockedTimes" :key="'bt-'+bt.id" class="flex gap-4 items-start opacity-70">
                      <div class="w-16 text-[10px] font-black text-rose-300 uppercase py-1 border-r border-rose-100">
                         {{ bt.start_time.slice(0, 5) }}
                      </div>
                      <div class="flex-1 bg-rose-50 p-4 rounded-2xl border border-rose-100">
                         <div class="text-sm font-black text-rose-800">{{ bt.reason || '관리자 설정 예약 불가' }}</div>
                         <div class="text-[10px] font-bold text-rose-400 uppercase mt-0.5">{{ bt.start_time.slice(0, 5) }} - {{ bt.end_time.slice(0, 5) }}</div>
                      </div>
                   </div>
                   <!-- Actual Reservations -->
                   <div v-for="res in roomReservations" :key="res.id" class="flex gap-4 items-start">
                      <div class="w-16 text-[10px] font-black text-slate-300 uppercase py-1 border-r border-slate-100">
                         {{ res.start_time.slice(0, 5) }}
                      </div>
                      <div class="flex-1 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                         <div class="text-sm font-black text-slate-800">{{ res.title || '공간 사용' }}</div>
                         <div class="text-[10px] font-bold text-indigo-400 uppercase mt-0.5">{{ res.start_time.slice(0, 5) }} - {{ res.end_time.slice(0, 5) }}</div>
                      </div>
                   </div>
                </template>
              </div>

             <div class="pt-8 shrink-0">
                <button @click="openReservationForm(selectedRoom)" class="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all">
                   이 공간 예약하기
                </button>
             </div>
          </div>
       </div>
    </Teleport>

    <!-- Calendar Bottom Sheet -->
    <Teleport to="body">
       <div v-if="showCalendar" class="fixed inset-0 z-[200] flex flex-col justify-end">
          <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" @click="showCalendar = false"></div>
          <div class="relative bg-white rounded-t-[3rem] p-8 animate-in slide-in-from-bottom-full duration-300">
             <div class="w-12 h-1.5 bg-slate-100 rounded-full mx-auto mb-8"></div>
             
             <div class="flex justify-between items-center mb-6">
                <h3 class="text-xl font-black text-slate-900 tracking-tight">날짜 선택</h3>
                <div class="flex gap-1">
                   <button @click="moveMonth(-1)" class="p-2 hover:bg-slate-50 rounded-xl"><ChevronLeftIcon class="w-5 h-5 text-slate-400" /></button>
                   <span class="text-sm font-black text-slate-900 w-24 text-center py-2">{{ currentCalDate.getFullYear() }}.{{ String(currentCalDate.getMonth() + 1).padStart(2, '0') }}</span>
                   <button @click="moveMonth(1)" class="p-2 hover:bg-slate-50 rounded-xl"><ChevronRightIcon class="w-5 h-5 text-slate-400" /></button>
                </div>
             </div>

             <div class="grid grid-cols-7 gap-2 mb-2">
                <span v-for="d in ['일','월','화','수','목','금','토']" :key="d" class="text-center text-[10px] font-black text-slate-300 uppercase">{{ d }}</span>
             </div>
             <div class="grid grid-cols-7 gap-2">
                <button v-for="(day, idx) in calendarDays" :key="idx"
                  @click="selectDate(day.date)"
                  :disabled="!day.current"
                  :class="[
                    day.current ? 'text-slate-700' : 'text-slate-100',
                    isToday(day.date) ? 'text-indigo-600' : '',
                    isSelected(day.date) ? 'bg-indigo-600 !text-white shadow-lg' : ''
                  ]"
                  class="aspect-square flex items-center justify-center text-xs font-black rounded-xl transition-all active:scale-90">
                  {{ day.day }}
                </button>
             </div>
             <button @click="showCalendar = false" class="w-full mt-8 py-5 bg-slate-50 text-slate-400 font-black text-xs uppercase tracking-widest rounded-3xl">닫기</button>
          </div>
       </div>
    </Teleport>

    <!-- Reservation Form Bottom Sheet -->
    <Teleport to="body">
      <div v-if="showReservationForm" class="fixed inset-0 z-[150] flex flex-col justify-end">
        <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" @click="showReservationForm = false"></div>
        <div class="relative bg-white rounded-t-[3rem] p-8 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-full duration-300">
          <div class="w-12 h-1.5 bg-slate-100 rounded-full mx-auto mb-8"></div>
          
          <div class="space-y-6">
            <div class="space-y-1">
              <h3 class="text-2xl font-black text-slate-900 tracking-tight">{{ selectedRoom?.room_name }} 예약</h3>
              <p class="text-slate-400 text-xs font-bold uppercase tracking-widest">{{ selectedDate }} / {{ selectedRoom?.floor }}</p>
            </div>

            <!-- Time Selection (In form) -->
            <div class="grid grid-cols-2 gap-4">
              <div class="bg-slate-50 border border-slate-200 p-5 rounded-[2rem] space-y-1">
                <label class="text-[10px] font-black text-slate-400 uppercase text-center block tracking-widest">시작 시간</label>
                <select v-model="form.start_time" class="w-full bg-transparent border-none font-black text-center text-slate-700 focus:ring-0">
                   <option v-for="t in timeSlots" :key="t" :value="t">{{ t }}</option>
                </select>
              </div>
              <div class="bg-slate-50 border border-slate-200 p-5 rounded-[2rem] space-y-1">
                <label class="text-[10px] font-black text-slate-400 uppercase text-center block tracking-widest">종료 시간</label>
                <select v-model="form.end_time" class="w-full bg-transparent border-none font-black text-center text-slate-700 focus:ring-0">
                   <option v-for="t in timeSlots" :key="t" :value="t">{{ t }}</option>
                </select>
              </div>
            </div>

            <div class="bg-slate-50 border border-slate-200 p-6 rounded-[2rem] space-y-2">
              <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">신청 명칭</label>
              <input v-model="form.title" type="text" placeholder="예: 청년부 모임" class="w-full bg-transparent border-none font-bold text-slate-700 p-0 focus:ring-0" />
            </div>

            <div class="bg-slate-50 border border-slate-200 p-6 rounded-[2rem] space-y-2">
              <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">상세 내용</label>
              <textarea v-model="form.reason" placeholder="사용 목적을 입력하세요" class="w-full bg-transparent border-none font-bold text-slate-700 p-0 h-24 resize-none focus:ring-0"></textarea>
            </div>

            <div class="bg-white border border-slate-200 p-6 rounded-[2rem] space-y-4">
              <div class="flex items-center justify-between">
                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">반복 예약 설정</label>
                <button @click="form.is_recurring = !form.is_recurring" 
                        :class="[form.is_recurring ? 'bg-indigo-600' : 'bg-slate-200']"
                        class="w-10 h-5 rounded-full relative transition-colors duration-200 focus:outline-none">
                  <div :class="[form.is_recurring ? 'translate-x-5' : 'translate-x-1']"
                       class="absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-200 shadow-sm"></div>
                </button>
              </div>

              <div v-if="form.is_recurring" class="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                <!-- Recurrence Type -->
                <div class="flex gap-2">
                  <button v-for="type in [['daily', '매일'], ['weekly', '매주'], ['monthly', '매월']]" :key="type[0]"
                          @click="form.recurring_type = type[0]"
                          :class="[form.recurring_type === type[0] ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-400']"
                          class="flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                    {{ type[1] }}
                  </button>
                </div>

                <!-- Weekly Days Selection -->
                <div v-if="form.recurring_type === 'weekly'" class="space-y-2">
                  <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">요일 선택 (중복 가능)</label>
                  <div class="flex justify-between gap-1">
                    <button v-for="(day, idx) in ['일', '월', '화', '수', '목', '금', '토']" :key="idx"
                            @click="toggleRecurringDay(idx)"
                            :class="[form.recurring_days.includes(idx) ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400 border-slate-100']"
                            class="w-8 h-8 rounded-lg border text-[10px] font-black transition-all">
                      {{ day }}
                    </button>
                  </div>
                </div>

                <!-- Monthly Options -->
                <div v-if="form.recurring_type === 'monthly'" class="space-y-4">
                  <div class="flex gap-2">
                    <button @click="form.recurring_month_option = 'date'"
                            :class="[form.recurring_month_option === 'date' ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-white text-slate-400 border-slate-100']"
                            class="flex-1 py-3 rounded-xl border text-[10px] font-black transition-all">매월 특정 일자</button>
                    <button @click="form.recurring_month_option = 'nth'"
                            :class="[form.recurring_month_option === 'nth' ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-white text-slate-400 border-slate-100']"
                            class="flex-1 py-3 rounded-xl border text-[10px] font-black transition-all">매월 특정 주차</button>
                  </div>

                  <!-- Monthly by Date -->
                  <div v-if="form.recurring_month_option === 'date'" class="flex items-center gap-2">
                    <select v-model="form.recurring_month_date" class="flex-1 bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 font-black text-center text-slate-700">
                      <option v-for="d in 31" :key="d" :value="d">{{ d }}일</option>
                    </select>
                    <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">에 반복</span>
                  </div>

                  <!-- Monthly by Nth Week -->
                  <div v-if="form.recurring_month_option === 'nth'" class="flex items-center gap-2">
                    <select v-model="form.recurring_month_nth_week" class="flex-1 bg-slate-50 border border-slate-200 rounded-xl py-3 px-2 font-black text-center text-slate-700">
                      <option v-for="n in 5" :key="n" :value="n">{{ n }}째주</option>
                    </select>
                    <select v-model="form.recurring_month_nth_day" class="flex-1 bg-slate-50 border border-slate-200 rounded-xl py-3 px-2 font-black text-center text-slate-700">
                      <option v-for="(d, i) in ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']" :key="i" :value="i">{{ d }}</option>
                    </select>
                    <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">에 반복</span>
                  </div>
                </div>

                <!-- End Date Selection -->
                <div class="space-y-2">
                   <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">반복 종료일</label>
                   <button @click="showRecurringEndCalendar = true" 
                           class="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 px-6 font-black text-slate-700 flex items-center justify-between active:scale-[0.98] transition-all">
                      <span>{{ form.recurring_end_date || '날짜 선택' }}</span>
                      <CalendarIcon class="w-5 h-5 text-slate-300" />
                   </button>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4 pt-4">
               <button @click="showReservationForm = false" class="py-5 bg-slate-50 text-slate-400 font-black text-xs uppercase tracking-widest rounded-[2rem]">취소</button>
               <button @click="submitReservation" class="py-5 bg-slate-900 text-white font-black text-xs uppercase tracking-widest rounded-[2rem] shadow-xl shadow-slate-200 active:scale-95 transition-all">신청 완료</button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
    
    <!-- Recurring End Date Calendar Bottom Sheet -->
    <Teleport to="body">
       <div v-if="showRecurringEndCalendar" class="fixed inset-0 z-[250] flex flex-col justify-end">
          <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" @click="showRecurringEndCalendar = false"></div>
          <div class="relative bg-white rounded-t-[3rem] p-8 animate-in slide-in-from-bottom-full duration-300">
             <div class="w-12 h-1.5 bg-slate-100 rounded-full mx-auto mb-8"></div>
             
             <div class="flex justify-between items-center mb-6">
                <h3 class="text-xl font-black text-slate-900 tracking-tight">반복 종료일 선택</h3>
                <div class="flex gap-1">
                   <button @click="moveRecurringMonth(-1)" class="p-2 hover:bg-slate-50 rounded-xl"><ChevronLeftIcon class="w-5 h-5 text-slate-400" /></button>
                   <span class="text-sm font-black text-slate-900 w-24 text-center py-2">{{ recurringEndCalDate.getFullYear() }}.{{ String(recurringEndCalDate.getMonth() + 1).padStart(2, '0') }}</span>
                   <button @click="moveRecurringMonth(1)" class="p-2 hover:bg-slate-50 rounded-xl"><ChevronRightIcon class="w-5 h-5 text-slate-400" /></button>
                </div>
             </div>
 
             <div class="grid grid-cols-7 gap-2 mb-2">
                <span v-for="d in ['일','월','화','수','목','금','토']" :key="d" class="text-center text-[10px] font-black text-slate-300 uppercase">{{ d }}</span>
             </div>
             <div class="grid grid-cols-7 gap-2">
                <button v-for="(day, idx) in recurringEndCalendarDays" :key="idx"
                  @click="selectRecurringEndDate(day.date)"
                  :disabled="!day.current"
                  :class="[
                    day.current ? 'text-slate-700' : 'text-slate-100',
                    isToday(day.date) ? 'text-indigo-600' : '',
                    form.recurring_end_date === formatDate(day.date) ? 'bg-indigo-600 !text-white shadow-lg' : ''
                  ]"
                  class="aspect-square flex items-center justify-center text-xs font-black rounded-xl transition-all active:scale-90">
                  {{ day.day }}
                </button>
             </div>
             <button @click="showRecurringEndCalendar = false" class="w-full mt-8 py-5 bg-slate-50 text-slate-400 font-black text-xs uppercase tracking-widest rounded-3xl">닫기</button>
          </div>
       </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import axios from 'axios'
import { useAuthStore } from '../../store/auth'
import { 
  CalendarIcon, 
  CalendarDaysIcon, 
  ClockIcon, 
  BuildingOfficeIcon, 
  MapPinIcon, 
  ChevronRightIcon, 
  ChevronLeftIcon,
  ChevronDownIcon 
} from '@heroicons/vue/24/outline'

import { useModalStore } from '@/stores/useModalStore'

const modal = useModalStore()
const auth = useAuthStore()
const mode = ref('time') // 'time' or 'room'
const rooms = ref([])
const reservations = ref([]) // All reservations for selected date
const roomReservations = ref([]) // Reservations for selected room on selected date
const currentRoomBlockedTimes = ref([]) // Blocked times for selected room on selected date

const formatDate = (date) => {
  if (!date) return ''
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const selectedDate = ref(formatDate(new Date()))
const selectedFloor = ref('전체')
const selectedRoom = ref(null)

const showCalendar = ref(false)
const showRoomDetail = ref(false)
const showReservationForm = ref(false)
const showRecurringEndCalendar = ref(false)

const currentCalDate = ref(new Date())
const recurringEndCalDate = ref(new Date())
const hasSearched = ref(false)

const form = ref({
  start_time: '09:00',
  end_time: '10:00',
  title: '',
  reason: '',
  is_recurring: false,
  recurring_type: 'weekly',
  recurring_end_date: formatDate(new Date(new Date().setMonth(new Date().getMonth() + 1))),
  recurring_days: [], // For weekly: [0, 1, 2, 3, 4, 5, 6]
  recurring_month_option: 'date', // 'date' or 'nth'
  recurring_month_date: new Date().getDate(),
  recurring_month_nth_week: Math.ceil(new Date().getDate() / 7),
  recurring_month_nth_day: new Date().getDay()
})

const searchForm = ref({
  start_time: '09:00',
  end_time: '10:00'
})

const floorOptions = computed(() => {
  const floors = ['전체', ...new Set(rooms.value.map(r => r.floor))]
  return floors
})

const filteredRooms = computed(() => {
  if (selectedFloor.value === '전체') return rooms.value
  return rooms.value.filter(r => r.floor === selectedFloor.value)
})

const formattedSelectedDate = computed(() => {
  if (!selectedDate.value) return ''
  const [y, m, d] = selectedDate.value.split('-').map(Number)
  const dateObj = new Date(y, m - 1, d)
  const days = ['일','월','화','수','목','금','토']
  return `${y}년 ${m}월 ${d}일 (${days[dateObj.getDay()]})`
})

const timeSlots = computed(() => {
  const slots = []
  for (let h = 7; h <= 22; h++) {
    const hh = String(h).padStart(2, '0')
    slots.push(`${hh}:00`, `${hh}:30`)
  }
  return slots
})

const calendarDays = computed(() => {
  return generateCalendarDays(currentCalDate.value)
})

const recurringEndCalendarDays = computed(() => {
  return generateCalendarDays(recurringEndCalDate.value)
})

const generateCalendarDays = (baseDate) => {
  const year = baseDate.getFullYear()
  const month = baseDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  
  const startOffset = firstDay.getDay()
  const totalDays = lastDay.getDate()
  
  const days = []
  // Fill empty slots from prev month
  for (let i = 0; i < startOffset; i++) {
    days.push({ day: '', date: null, current: false })
  }
  // Fill actual days
  for (let i = 1; i <= totalDays; i++) {
    const d = new Date(year, month, i)
    days.push({ day: i, date: d, current: true })
  }
  return days
}

const availableRooms = ref([])

onMounted(async () => {
  const [roomRes] = await Promise.all([
    axios.get('/api/rooms'),
    fetchReservations()
  ])
  rooms.value = roomRes.data
})

const fetchReservations = async () => {
  try {
    const res = await axios.get(`/api/reservations?date=${selectedDate.value}`)
    reservations.value = res.data
  } catch (e) {}
}

const selectDate = (date) => {
  if (!date) return
  selectedDate.value = formatDate(date)
  showCalendar.value = false
  fetchReservations()
  hasSearched.value = false
}

const moveMonth = (offset) => {
  const d = new Date(currentCalDate.value)
  d.setMonth(d.getMonth() + offset)
  currentCalDate.value = d
}

const moveRecurringMonth = (offset) => {
  const d = new Date(recurringEndCalDate.value)
  d.setMonth(d.getMonth() + offset)
  recurringEndCalDate.value = d
}

const selectRecurringEndDate = (date) => {
  if (!date) return
  form.value.recurring_end_date = formatDate(date)
  showRecurringEndCalendar.value = false
}

const isToday = (date) => {
  if (!date) return false
  return formatDate(date) === formatDate(new Date())
}

const isSelected = (date) => {
  if (!date) return false
  return formatDate(date) === selectedDate.value
}

const getBlockedForRoomAndDate = (room, date) => {
  if (!room || !room.blocked_times) return []
  const d = new Date(date + 'T00:00:00')
  const dow = d.getDay()
  const dom = d.getDate()
  const nth = Math.ceil(dom / 7)
  
  return room.blocked_times.filter(bt => {
    if (bt.recurring_type === 'daily') {
      return true
    } else if (bt.recurring_type === 'monthly_date') {
      return bt.day_of_month == dom
    } else if (bt.recurring_type === 'monthly_nth') {
      return bt.nth_week == nth && bt.day_of_week == dow
    } else {
      // Default to weekly
      return bt.day_of_week == dow
    }
  })
}

const openRoomDetail = async (room) => {
  selectedRoom.value = room
  roomReservations.value = reservations.value.filter(r => r.room_id === room.id)
  currentRoomBlockedTimes.value = getBlockedForRoomAndDate(room, selectedDate.value)
  showRoomDetail.value = true
}

const openReservationForm = (room) => {
  selectedRoom.value = room
  if (mode.value === 'time') {
    form.value.start_time = searchForm.value.start_time
    form.value.end_time = searchForm.value.end_time
  }
  showRoomDetail.value = false
  showReservationForm.value = true
}

const searchAvailableRooms = () => {
  hasSearched.value = true
  const { start_time, end_time } = searchForm.value
  
  availableRooms.value = rooms.value.filter(room => {
    // 1. Check reservation conflicts
    const resList = reservations.value.filter(r => r.room_id === room.id && r.status !== 'rejected')
    const isResConflict = resList.some(r => {
      const s1 = r.start_time.slice(0,5)
      const e1 = r.end_time.slice(0,5)
      const s2 = start_time
      const e2 = end_time
      return (s1 < e2 && e1 > s2)
    })
    
    if (isResConflict) return false

    // 2. Check blocked time conflicts
    const blocked = getBlockedForRoomAndDate(room, selectedDate.value)
    const isBlockedConflict = blocked.some(bt => {
      const s1 = bt.start_time.slice(0,5)
      const e1 = bt.end_time.slice(0,5)
      const s2 = start_time
      const e2 = end_time
      return (s1 < e2 && e1 > s2)
    })

    return !isBlockedConflict
  })
}

const toggleRecurringDay = (dayIdx) => {
  const index = form.value.recurring_days.indexOf(dayIdx)
  if (index > -1) {
    form.value.recurring_days.splice(index, 1)
  } else {
    form.value.recurring_days.push(dayIdx)
  }
}

const submitReservation = async () => {
  if (!form.value.title) { modal.showAlert('신청 명칭을 입력해 주세요.'); return; }
  if (form.value.start_time >= form.value.end_time) { modal.showAlert('종료 시간은 시작 시간보다 늦어야 합니다.'); return; }
  
  if (form.value.is_recurring) {
    if (!form.value.recurring_end_date) {
      modal.showAlert('반복 종료일을 선택해 주세요.');
      return;
    }
    if (form.value.recurring_type === 'weekly' && form.value.recurring_days.length === 0) {
      modal.showAlert('반복할 요일을 하나 이상 선택해 주세요.');
      return;
    }
  }

  try {
    const payload = {
      ...form.value,
      room_id: selectedRoom.value.id,
      reservation_date: selectedDate.value,
      requester_name: auth.user.userName,
      requester_phone: auth.user.phone
    }
    await axios.post('/api/reservations', payload)
    modal.showAlert('예약 신청이 완료되었습니다.')
    showReservationForm.value = false
    fetchReservations()
    hasSearched.value = false
  } catch (e) {
    modal.showAlert(e.response?.data?.message || '예약 실패')
  }
}

watch(selectedDate, () => {
  fetchReservations()
})
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
</style>

