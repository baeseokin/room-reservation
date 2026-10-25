<template>
  <div class="space-y-6 pb-12">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <div class="space-y-1">
        <h2 class="text-2xl font-black text-slate-900 tracking-tight">공간 예약</h2>
        <p class="text-slate-400 text-[0.6875rem] font-black uppercase tracking-widest">원하시는 방식으로 예약해 보세요.</p>
      </div>
    </div>

    <!-- Inline Mini Calendar -->
    <div class="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50">
       <div class="flex justify-between items-center mb-6">
          <div class="flex items-center gap-2">
            <CalendarDaysIcon class="w-5 h-5 text-indigo-600" />
            <h3 class="text-base font-black text-slate-900 tracking-tight">날짜 선택</h3>
          </div>
          <div class="flex gap-1 items-center bg-slate-50 rounded-xl p-1">
             <button @click="moveMonth(-1)" class="p-1.5 hover:bg-white rounded-lg transition-colors shadow-sm"><ChevronLeftIcon class="w-4 h-4 text-slate-400" /></button>
             <span class="text-xs font-black text-slate-900 w-16 text-center">{{ currentCalDate.getFullYear() }}.{{ String(currentCalDate.getMonth() + 1).padStart(2, '0') }}</span>
             <button @click="moveMonth(1)" class="p-1.5 hover:bg-white rounded-lg transition-colors shadow-sm"><ChevronRightIcon class="w-4 h-4 text-slate-400" /></button>
          </div>
       </div>

       <div class="grid grid-cols-7 gap-1 mb-2">
          <span v-for="d in ['일','월','화','수','목','금','토']" :key="d" class="text-center text-[0.625rem] font-black text-slate-400 uppercase">{{ d }}</span>
       </div>
       <div class="grid grid-cols-7 gap-1">
          <button v-for="(day, idx) in calendarDays" :key="idx"
            @click="day.date && !auth.isAdmin && isDateDisabledByPolicy(formatDate(day.date)) ? modal.showAlert(checkDatePolicy(formatDate(day.date))) : selectDate(day.date)"
            :disabled="!day.current"
            :class="[
              day.current ? 'text-slate-700' : 'text-slate-200',
              day.current && !isSelected(day.date) && !isDateDisabledByPolicy(formatDate(day.date)) ? 'hover:bg-slate-50' : '',
              isToday(day.date) && !isSelected(day.date) ? 'text-indigo-600 font-black' : '',
              isSelected(day.date) ? 'bg-indigo-600 !text-white shadow-md hover:bg-indigo-500' : '',
              day.date && !auth.isAdmin && isDateDisabledByPolicy(formatDate(day.date)) ? 'opacity-30 cursor-not-allowed' : ''
            ]"
            class="aspect-square flex items-center justify-center text-xs font-bold rounded-xl transition-all active:scale-95">
            {{ day.day }}
          </button>
       </div>
    </div>

    <!-- Mode Switcher -->
    <div class="bg-slate-100 p-1.5 rounded-[2rem] flex items-center gap-1">
      <button v-for="m in ['room', 'time']" :key="m"
        @click="mode = m"
        :class="[mode === m ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-400']"
        class="flex-1 py-3.5 rounded-[1.8rem] text-xs font-black uppercase tracking-widest transition-all">
        {{ m === 'room' ? '공간별 예약' : '시간별 예약' }}
      </button>
    </div>

    <!-- Mode: By Room -->
    <div v-if="mode === 'room'" class="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
      <!-- Floor Selector -->
      <div class="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <button v-for="f in floorOptions" :key="f"
          @click="selectedFloor = f"
          :class="[selectedFloor === f ? 'bg-slate-900 text-white' : 'bg-white text-slate-400 border-slate-200']"
          class="px-5 py-2.5 rounded-xl border text-[0.6875rem] font-black uppercase tracking-widest transition-all shrink-0">
          {{ f }}
        </button>
      </div>

      <!-- Room List -->
      <div class="space-y-4">
        <div v-for="room in filteredRooms" :key="room.id" 
          @click="openReservationForm(room)"
          class="bg-white p-5 rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50 flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer">
          <div class="flex items-center gap-4">
            <div class="w-16 h-16 rounded-[1.4rem] bg-slate-50 overflow-hidden flex shrink-0 items-center justify-center font-black text-slate-400 shadow-inner">
              <img v-if="room.image_url" :src="room.image_url" class="w-full h-full object-cover" />
              <span v-else>{{ room.floor }}</span>
            </div>
            <div>
              <div class="flex items-center gap-1.5 mb-1">
                <span class="text-[0.5625rem] font-black bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md uppercase tracking-tighter">{{ room.floor }}{{ room.floor.includes('B') ? '' : 'F' }}</span>
                <div class="text-sm font-black text-slate-900">{{ room.room_name }}</div>
              </div>
              <div class="text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest">정원 {{ room.capacity }}명</div>
            </div>
          </div>
          <div class="flex flex-col items-end gap-1">
             <ChevronRightIcon class="w-5 h-5 text-slate-300" />
             <span class="text-[0.5625rem] font-black text-indigo-500 uppercase tracking-tighter">예약하기</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Mode: By Time -->
    <div v-else class="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
       <div class="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-xl shadow-slate-200/50 space-y-6">
          <div class="grid grid-cols-2 gap-4">
             <div class="space-y-2">
                <label class="text-[0.625rem] font-black text-slate-400 uppercase tracking-widest ml-1 text-center block">시작 시간</label>
                <select v-model="searchForm.start_time" class="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 px-2 font-black text-center text-slate-700">
                   <option v-for="t in timeSlots" :key="t" :value="t">{{ t }}</option>
                </select>
             </div>
             <div class="space-y-2">
                <label class="text-[0.625rem] font-black text-slate-400 uppercase tracking-widest ml-1 text-center block">종료 시간</label>
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
                   <span class="text-[0.5625rem] font-black bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md uppercase tracking-tighter">{{ room.floor }}{{ room.floor.includes('B') ? '' : 'F' }}</span>
                   <div class="text-sm font-black text-slate-900">{{ room.room_name }}</div>
                 </div>
                 <div class="text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest">정원 {{ room.capacity }}명</div>
               </div>
            </div>
            <div class="bg-indigo-600 text-white px-4 py-2 rounded-xl text-[0.625rem] font-black uppercase tracking-widest">선택</div>
          </div>
       </div>
    </div>

    <!-- Combined Reservation Form Bottom Sheet -->
    <Teleport to="body">
      <div v-if="showReservationForm" class="fixed inset-0 z-[150] flex flex-col justify-end">
        <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" @click="showReservationForm = false"></div>
        <div ref="bookingModalSheetRef" class="relative bg-white rounded-t-[2.5rem] p-6 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-full duration-300">
          <div class="w-12 h-1.5 bg-slate-100 rounded-full mx-auto mb-5"></div>
          
          <div class="space-y-4">
            <!-- Room Header (Only in form step) -->
            <div v-if="bookingStep === 'form'" class="space-y-3">
              <div v-if="selectedRoom?.image_url" class="w-full h-36 rounded-2xl overflow-hidden shadow-inner bg-slate-50 shrink-0">
                <img :src="selectedRoom?.image_url" class="w-full h-full object-cover" />
              </div>
              <div class="space-y-0.5">
                <div class="flex items-center justify-between">
                  <h3 class="text-xl font-black text-slate-900 tracking-tight">{{ selectedRoom?.room_name }} 예약</h3>
                  <span class="text-xs font-black text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full uppercase">{{ selectedRoom?.floor }}{{ selectedRoom?.floor?.includes('B') ? '' : 'F' }}</span>
                </div>
                <p class="text-slate-400 text-[0.6875rem] font-bold uppercase tracking-wider">{{ selectedDate }} / 정원 {{ selectedRoom?.capacity }}명</p>
              </div>
            </div>

            <!-- Step 1: Form Data -->
            <div v-if="bookingStep === 'form'" class="space-y-3.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
              
              <!-- 1. Existing Reservations Status (Simple Badge Design) -->
              <div class="space-y-2">
                <div class="px-0.5">
                  <label class="text-[0.6875rem] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <ClockIcon class="w-3.5 h-3.5 text-indigo-500" />
                    당일 예약 현황
                  </label>
                </div>

                <div v-if="currentRoomSchedule.length === 0" class="py-2.5 px-3.5 text-center bg-slate-50/80 rounded-xl border border-dashed border-slate-200">
                  <p class="text-xs font-bold text-slate-400">당일 예약 내역이 없습니다. (원하는 시간에 예약 가능)</p>
                </div>
                <div v-else class="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1 custom-scrollbar">
                  <div v-for="item in currentRoomSchedule" :key="item.id"
                       class="inline-flex items-center rounded-xl border overflow-hidden shadow-xs text-xs transition-all"
                       :class="item.type === 'blocked' ? 'border-rose-200 bg-rose-50/60' : 'border-slate-200 bg-white'">
                    <!-- Time Badge -->
                    <span class="px-2 py-0.5 font-black text-[0.6875rem] font-mono tracking-tight shrink-0 flex items-center gap-1"
                          :class="item.type === 'blocked' ? 'bg-rose-100 text-rose-700' : 'bg-slate-800 text-white'">
                      <span class="w-1.5 h-1.5 rounded-full" :class="item.type === 'blocked' ? 'bg-rose-500' : 'bg-emerald-400'"></span>
                      {{ item.start_time }} - {{ item.end_time }}
                    </span>
                    <!-- Title Badge -->
                    <span class="px-2 py-0.5 font-bold text-xs truncate max-w-[180px] flex items-center gap-1"
                          :class="item.type === 'blocked' ? 'text-rose-800' : 'text-slate-800'">
                      <span>{{ item.title }}</span>
                      <span v-if="item.requester_name" class="text-[0.625rem] font-normal text-slate-400">({{ item.requester_name }})</span>
                    </span>
                  </div>
                </div>
              </div>

              <!-- 2. Time Selection (In form) -->
              <div class="space-y-2">
                <div class="grid grid-cols-2 gap-2.5">
                  <div class="bg-slate-50 border rounded-2xl px-3.5 py-2.5 transition-all focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-500/20"
                       :class="[timeConflictError ? 'border-rose-300 bg-rose-50/20' : 'border-slate-200 focus-within:border-indigo-500']">
                    <label class="text-[0.625rem] font-black uppercase tracking-wider block"
                           :class="[timeConflictError ? 'text-rose-400' : 'text-slate-400']">시작 시간</label>
                    <div class="relative flex items-center mt-0.5">
                      <select v-model="form.start_time" class="w-full bg-transparent border-none p-0 text-sm font-black text-slate-800 focus:ring-0 appearance-none pr-5">
                         <option v-for="t in timeSlots" :key="t" :value="t">{{ t }}</option>
                      </select>
                      <ChevronDownIcon class="w-4 h-4 text-slate-400 absolute right-0 pointer-events-none" />
                    </div>
                  </div>
                  <div class="bg-slate-50 border rounded-2xl px-3.5 py-2.5 transition-all focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-500/20"
                       :class="[timeConflictError ? 'border-rose-300 bg-rose-50/20' : 'border-slate-200 focus-within:border-indigo-500']">
                    <label class="text-[0.625rem] font-black uppercase tracking-wider block"
                           :class="[timeConflictError ? 'text-rose-400' : 'text-slate-400']">종료 시간</label>
                    <div class="relative flex items-center mt-0.5">
                      <select v-model="form.end_time" class="w-full bg-transparent border-none p-0 text-sm font-black text-slate-800 focus:ring-0 appearance-none pr-5">
                         <option v-for="t in timeSlots" :key="t" :value="t">{{ t }}</option>
                      </select>
                      <ChevronDownIcon class="w-4 h-4 text-slate-400 absolute right-0 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <!-- Immediate '예약 불가' message under time selectors -->
                <div v-if="timeConflictError" class="p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 animate-in fade-in duration-200">
                  <span class="text-[0.625rem] font-black bg-rose-500 text-white px-2 py-0.5 rounded-md shrink-0">예약 불가</span>
                  <p class="text-xs font-bold text-rose-600 leading-tight">{{ timeConflictError }}</p>
                </div>
              </div>

              <!-- Title -->
              <div class="bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 transition-all focus-within:bg-white focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20">
                <label class="text-[0.625rem] font-black text-slate-400 uppercase tracking-wider block">신청 명칭</label>
                <input v-model="form.title" type="text" placeholder="예: 청년부 모임" class="w-full bg-transparent border-none p-0 mt-0.5 text-sm font-bold text-slate-800 placeholder:text-slate-300 focus:ring-0" />
              </div>

              <!-- Reason -->
              <div class="bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 transition-all focus-within:bg-white focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20">
                <label class="text-[0.625rem] font-black text-slate-400 uppercase tracking-wider block">상세 내용 (사용 목적)</label>
                <textarea v-model="form.reason" placeholder="사용 목적을 입력하세요" class="w-full bg-transparent border-none p-0 mt-0.5 text-sm font-medium text-slate-800 placeholder:text-slate-300 h-16 resize-none focus:ring-0 leading-relaxed"></textarea>
              </div>

              <!-- 3. Recurring settings: ONLY FOR ADMIN -->
              <div v-if="auth.isAdmin" class="bg-white border border-slate-200 p-4 rounded-2xl space-y-3">
                <div class="flex items-center justify-between">
                  <label class="text-[0.6875rem] font-black text-slate-600 uppercase tracking-wider">반복 예약 설정</label>
                  <button @click="form.is_recurring = !form.is_recurring" 
                          :class="[form.is_recurring ? 'bg-indigo-600' : 'bg-slate-200']"
                          class="w-9 h-5 rounded-full relative transition-colors duration-200 focus:outline-none">
                    <div :class="[form.is_recurring ? 'translate-x-4' : 'translate-x-0.5']"
                         class="absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-200 shadow-sm"></div>
                  </button>
                </div>

                <div v-if="form.is_recurring" class="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <!-- Recurrence Type -->
                  <div class="flex gap-2">
                    <button v-for="type in [['daily', '매일'], ['weekly', '매주'], ['monthly', '매월']]" :key="type[0]"
                            @click="form.recurring_type = type[0]"
                            :class="[form.recurring_type === type[0] ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-400']"
                            class="flex-1 py-2 rounded-xl text-[0.625rem] font-black uppercase tracking-widest transition-all">
                      {{ type[1] }}
                    </button>
                  </div>

                  <!-- Weekly Days Selection -->
                  <div v-if="form.recurring_type === 'weekly'" class="space-y-2">
                    <label class="text-[0.5625rem] font-black text-slate-400 uppercase tracking-widest ml-1">요일 선택 (중복 가능)</label>
                    <div class="flex justify-between gap-1">
                      <button v-for="(day, idx) in ['일', '월', '화', '수', '목', '금', '토']" :key="idx"
                              @click="toggleRecurringDay(idx)"
                              :class="[form.recurring_days.includes(idx) ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400 border-slate-100']"
                              class="w-8 h-8 rounded-lg border text-[0.625rem] font-black transition-all">
                        {{ day }}
                      </button>
                    </div>
                  </div>

                  <!-- Monthly Options -->
                  <div v-if="form.recurring_type === 'monthly'" class="space-y-4">
                    <div class="flex gap-2">
                      <button @click="form.recurring_month_option = 'date'"
                              :class="[form.recurring_month_option === 'date' ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-white text-slate-400 border-slate-100']"
                              class="flex-1 py-3 rounded-xl border text-[0.625rem] font-black transition-all">매월 특정 일자</button>
                      <button @click="form.recurring_month_option = 'nth'"
                              :class="[form.recurring_month_option === 'nth' ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-white text-slate-400 border-slate-100']"
                              class="flex-1 py-3 rounded-xl border text-[0.625rem] font-black transition-all">매월 특정 주차</button>
                    </div>

                    <!-- Monthly by Date -->
                    <div v-if="form.recurring_month_option === 'date'" class="flex items-center gap-2">
                      <select v-model="form.recurring_month_date" class="flex-1 bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 font-black text-center text-slate-700">
                        <option v-for="d in 31" :key="d" :value="d">{{ d }}일</option>
                      </select>
                      <span class="text-[0.625rem] font-black text-slate-400 uppercase tracking-widest">에 반복</span>
                    </div>

                    <!-- Monthly by Nth Week -->
                    <div v-if="form.recurring_month_option === 'nth'" class="flex items-center gap-2">
                      <select v-model="form.recurring_month_nth_week" class="flex-1 bg-slate-50 border border-slate-200 rounded-xl py-3 px-2 font-black text-center text-slate-700">
                        <option v-for="n in 5" :key="n" :value="n">{{ n }}째주</option>
                      </select>
                      <select v-model="form.recurring_month_nth_day" class="flex-1 bg-slate-50 border border-slate-200 rounded-xl py-3 px-2 font-black text-center text-slate-700">
                        <option v-for="(d, i) in ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']" :key="i" :value="i">{{ d }}</option>
                      </select>
                      <span class="text-[0.625rem] font-black text-slate-400 uppercase tracking-widest">에 반복</span>
                    </div>
                  </div>

                  <!-- End Date Selection -->
                  <div class="space-y-2">
                     <label class="text-[0.5625rem] font-black text-slate-400 uppercase tracking-widest ml-1">반복 종료일</label>
                     <button @click="showRecurringEndCalendar = true" 
                             class="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 px-6 font-black text-slate-700 flex items-center justify-between active:scale-[0.98] transition-all">
                        <span>{{ form.recurring_end_date || '날짜 선택' }}</span>
                        <CalendarIcon class="w-5 h-5 text-slate-300" />
                     </button>
                  </div>
                </div>
              </div>

              <!-- Non-Admin Notice for Recurring Reservation -->
              <div v-else class="bg-slate-50 border border-slate-200/80 p-4 rounded-2xl flex items-center gap-2.5 text-xs font-bold text-slate-500">
                <InformationCircleIcon class="w-4 h-4 text-slate-400 shrink-0" />
                <span>반복 예약 설정은 관리자에게 문의하여 주세요.</span>
              </div>
            </div>

            <!-- Step 2: Agreement -->
            <div v-else class="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div class="bg-indigo-50/50 border border-indigo-100 p-6 rounded-[2.5rem] space-y-4">
                <div class="flex items-center gap-3 mb-2">
                  <div class="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
                    <ShieldCheckIcon class="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 ref="agreementTitleRef" id="agreement-title" tabindex="-1" class="text-lg font-black text-slate-900 tracking-tight outline-none">공간 사용 수칙 동의</h4>
                    <p class="text-[0.625rem] font-bold text-indigo-400 uppercase tracking-widest">안전하고 쾌적한 사용을 위해 꼭 읽어주세요.</p>
                  </div>
                </div>
                
                <div class="space-y-4 bg-white/60 backdrop-blur-sm p-5 rounded-2xl border border-white">
                  <div v-for="(rule, idx) in spaceRules" :key="idx" class="flex flex-col gap-2" :class="{ 'border-t border-indigo-50 pt-4': idx > 0 }">
                    <div class="flex gap-3">
                      <span class="text-indigo-600 font-black">0{{ idx + 1 }}</span>
                      <div>
                        <p class="text-sm font-black text-slate-800">{{ rule.title }}</p>
                        <p class="text-[0.8125rem] font-bold text-slate-600 mt-1 leading-relaxed">{{ rule.desc }}</p>
                      </div>
                    </div>
                    <label class="flex items-center gap-2 self-end cursor-pointer group mt-1">
                      <span class="text-[0.6875rem] font-bold text-slate-500 uppercase tracking-widest">동의:</span>
                      <div class="w-5 h-5 rounded border flex items-center justify-center transition-all"
                           :class="[ruleAgreements[idx] ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white group-hover:border-indigo-300']">
                        <CheckIcon v-if="ruleAgreements[idx]" class="w-3 h-3 text-white" />
                      </div>
                      <span class="text-xs font-bold text-slate-600">예</span>
                      <input type="checkbox" v-model="ruleAgreements[idx]" class="hidden" />
                    </label>
                  </div>
                </div>

                <div class="flex flex-col gap-3 mt-4">
                  <label class="flex items-center gap-3 p-4 bg-white rounded-2xl border-2 transition-all cursor-pointer group active:scale-95"
                         :class="[isAllAgreed ? 'border-indigo-600 bg-indigo-50/30' : 'border-slate-100']">
                    <div class="w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all"
                         :class="[isAllAgreed ? 'bg-indigo-600 border-indigo-600' : 'border-slate-200 group-hover:border-indigo-300']">
                      <CheckIcon v-if="isAllAgreed" class="w-4 h-4 text-white" />
                    </div>
                    <span class="text-sm font-black text-slate-700">전체동의</span>
                    <input type="checkbox" v-model="isAllAgreed" class="hidden" />
                  </label>

                  <label class="flex items-center gap-3 p-4 bg-white rounded-2xl border-2 transition-all cursor-pointer group active:scale-95"
                         :class="[isAgreed ? 'border-indigo-600 bg-indigo-50/30' : 'border-slate-100']">
                    <div class="w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all"
                         :class="[isAgreed ? 'bg-indigo-600 border-indigo-600' : 'border-slate-200 group-hover:border-indigo-300']">
                      <CheckIcon v-if="isAgreed" class="w-4 h-4 text-white" />
                    </div>
                    <span class="text-sm font-black text-slate-700">위 수칙을 확인했으며 이에 동의 합니다.</span>
                    <input type="checkbox" v-model="isAgreed" class="hidden" />
                  </label>
                </div>
              </div>
            </div>

            <!-- Bottom Buttons & Error Notice -->
            <div class="space-y-3 pt-4">

              <div class="grid grid-cols-2 gap-3">
                 <button @click="bookingStep === 'agreement' ? (bookingStep = 'form') : (showReservationForm = false)" 
                         class="py-4 bg-slate-100 hover:bg-slate-200 text-slate-500 font-black text-xs uppercase tracking-widest rounded-2xl transition-all">
                   {{ bookingStep === 'agreement' ? '이전으로' : '취소' }}
                 </button>
                 <button @click="submitReservation" 
                         :disabled="bookingStep === 'form' && !!timeConflictError"
                         :class="[
                           bookingStep === 'form' && timeConflictError 
                             ? 'bg-rose-100 text-rose-400 cursor-not-allowed shadow-none' 
                             : 'bg-slate-900 text-white shadow-lg shadow-slate-200 active:scale-95'
                         ]"
                         class="py-4 font-black text-xs uppercase tracking-widest rounded-2xl transition-all">
                   {{ bookingStep === 'agreement' ? '신청 완료' : (timeConflictError ? '예약 불가' : '다음 단계') }}
                 </button>
              </div>
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
                <span v-for="d in ['일','월','화','수','목','금','토']" :key="d" class="text-center text-[0.625rem] font-black text-slate-300 uppercase">{{ d }}</span>
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

    <!-- Modal: Notice Guide -->
    <Teleport to="body">
      <div v-if="showNoticeModal" class="fixed inset-0 z-[5000] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" @click="showNoticeModal = false"></div>
        <div class="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl border border-white overflow-hidden animate-in transform-gpu antialiased">
          <!-- Header -->
          <div class="bg-indigo-900 px-6 py-6 text-white relative">
            <button @click="showNoticeModal = false" class="absolute top-5 right-5 p-2 hover:bg-white/10 rounded-full transition-colors">
              <XMarkIcon class="w-4 h-4" />
            </button>
            <div class="flex items-center gap-3 mb-1">
              <div class="w-7 h-7 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <InformationCircleIcon class="w-3.5 h-3.5 text-white" />
              </div>
              <h3 class="text-base font-black tracking-tight">공간 예약 신청 안내</h3>
            </div>
            <p class="text-indigo-200 text-[0.625rem] font-bold uppercase tracking-widest">이용 수칙 및 예약 규정 안내</p>
          </div>

          <!-- Body -->
          <div class="p-6 space-y-4">
            <div class="space-y-2.5">
              <div v-if="!policySettings.allow_same_day" class="flex items-start gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span class="w-6 h-6 rounded-xl bg-rose-100 text-rose-500 flex items-center justify-center font-black text-[0.5625rem] shrink-0 mt-0.5 shadow-sm">✕</span>
                <div>
                  <h4 class="text-xs font-bold text-slate-800">당일 신청 불가</h4>
                  <p class="text-[0.625rem] text-slate-500 mt-0.5">당일 날짜에 대한 예약 신청은 허용되지 않습니다.</p>
                </div>
              </div>

              <div v-if="!policySettings.allow_monday || !policySettings.allow_holidays" class="flex items-start gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span class="w-6 h-6 rounded-xl bg-rose-100 text-rose-500 flex items-center justify-center font-black text-[0.5625rem] shrink-0 mt-0.5 shadow-sm">✕</span>
                <div>
                  <h4 class="text-xs font-bold text-slate-800">예약 신청 제한</h4>
                  <p class="text-[0.625rem] text-slate-500 mt-0.5">
                    <span v-if="!policySettings.allow_monday">매주 월요일</span>
                    <span v-if="!policySettings.allow_monday && !policySettings.allow_holidays"> 및 </span>
                    <span v-if="!policySettings.allow_holidays">법정 공휴일</span>
                    에는 예약 신청이 불가합니다.
                  </p>
                </div>
              </div>

              <div class="flex items-start gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span class="w-6 h-6 rounded-xl bg-indigo-100 text-indigo-500 flex items-center justify-center font-black text-[0.5625rem] shrink-0 mt-0.5 shadow-sm">⏰</span>
                <div>
                  <h4 class="text-xs font-bold text-slate-800">이용 시간 제한</h4>
                  <p class="text-[0.625rem] text-slate-500 mt-0.5">
                    예약 가능 시간은 **오전 {{ policySettings.start_time.slice(0, 5) }} ~ 오후 {{ policySettings.end_time.slice(0, 5) }}** 사이입니다.
                  </p>
                </div>
              </div>

              <div class="flex items-start gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <span class="w-6 h-6 rounded-xl bg-amber-100 text-amber-500 flex items-center justify-center font-black text-[0.5625rem] shrink-0 mt-0.5 shadow-sm">📅</span>
                <div>
                  <h4 class="text-xs font-bold text-slate-800">예약 기간 제약</h4>
                  <p class="text-[0.625rem] text-slate-500 mt-0.5">
                    현재월을 포함하여 +{{ policySettings.max_booking_months !== undefined ? policySettings.max_booking_months : 1 }}개월 후의 말일까지만 예약이 가능합니다.
                  </p>
                </div>
              </div>

              <div class="flex items-start gap-3 p-3 bg-indigo-50/60 rounded-2xl border border-indigo-100">
                <span class="w-6 h-6 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-[0.5625rem] shrink-0 mt-0.5 shadow-md shadow-indigo-200">📋</span>
                <div>
                  <h4 class="text-sm font-bold text-slate-900">최대 2일 소요</h4>
                  <p class="text-[0.625rem] text-slate-600 mt-0.5">예약 신청 후 관리자 승인 완료까지 **최대 2일**이 소요됩니다.</p>
                </div>
              </div>
            </div>

            <!-- Footer Toggles -->
            <div class="pt-3 border-t border-slate-100 flex items-center justify-between">
              <label class="flex items-center gap-1.5 cursor-pointer group">
                <input type="checkbox" v-model="dontShowToday" class="rounded text-indigo-600 focus:ring-indigo-500/20 border-slate-300 w-3.5 h-3.5 cursor-pointer" />
                <span class="text-[0.6875rem] font-bold text-slate-500 group-hover:text-slate-800 transition-colors">오늘 하루 보지 않기</span>
              </label>
              <button @click="closeNotice" class="px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black hover:bg-indigo-700 transition-all shadow-md active:scale-95">확인</button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
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
  ChevronDownIcon,
  ShieldCheckIcon,
  CheckIcon,
  XMarkIcon,
  InformationCircleIcon
} from '@heroicons/vue/24/outline'

import { useModalStore } from '@/stores/useModalStore'
import { getHoliday } from '@/utils/holidays'

const route = useRoute()
const modal = useModalStore()
const auth = useAuthStore()

const policySettings = ref({
  allow_same_day: 0,
  allow_monday: 0,
  allow_holidays: 0,
  start_time: '09:00:00',
  end_time: '17:00:00'
})

const fetchPolicy = async () => {
  try {
    const res = await axios.get('/api/reservations/policy')
    policySettings.value = res.data
    
    if (!auth.isAdmin) {
      let candidateDate = new Date()
      let attempts = 0
      
      while (isDateDisabledByPolicy(formatDate(candidateDate)) && attempts < 60) {
        candidateDate.setDate(candidateDate.getDate() + 1)
        attempts++
      }
      
      selectedDate.value = formatDate(candidateDate)
      currentCalDate.value = new Date(candidateDate.getTime())
    }
  } catch (e) {
    console.error("Fetch policy error:", e)
  }
}

const checkDatePolicy = (dateStr) => {
  console.log("[DEBUG Mobile checkDatePolicy] isAdmin:", auth.isAdmin, "user:", auth.user);
  if (auth.isAdmin) return null

  const todayStr = formatDate(new Date())
  const dateObj = new Date(dateStr + 'T00:00:00')
  const todayObj = new Date(todayStr + 'T00:00:00')

  if (dateObj < todayObj) {
    return '과거 일자는 예약할 수 없습니다.'
  }

  if (!policySettings.value.allow_same_day && dateStr === todayStr) {
    return '당일 예약 신청은 불가합니다.'
  }

  const dayOfWeek = dateObj.getDay()
  if (!policySettings.value.allow_monday && dayOfWeek === 1) {
    return '월요일은 예약 신청이 불가합니다.'
  }
  const holidayName = getHoliday(dateStr)
  if (!policySettings.value.allow_holidays && holidayName) {
    return `공휴일은 예약 신청이 불가합니다. (${holidayName})`
  }

  return null
}

const isDateDisabledByPolicy = (dateStr) => {
  if (auth.isAdmin) return false
  return checkDatePolicy(dateStr) !== null
}

const showNoticeModal = ref(false)
const dontShowToday = ref(false)

const closeNotice = () => {
  if (dontShowToday.value) {
    const todayStr = formatDate(new Date())
    localStorage.setItem('hide-reservation-notice', todayStr)
  }
  showNoticeModal.value = false
}

const mode = ref('room') // 'room' or 'time'
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

const bookingStep = ref('form') // 'form' or 'agreement'
const bookingModalSheetRef = ref(null)
const agreementTitleRef = ref(null)

const scrollToAgreementTop = () => {
  if (document.activeElement && typeof document.activeElement.blur === 'function') {
    document.activeElement.blur()
  }
  if (bookingModalSheetRef.value) {
    bookingModalSheetRef.value.scrollTop = 0
    if (typeof bookingModalSheetRef.value.scrollTo === 'function') {
      bookingModalSheetRef.value.scrollTo({ top: 0, behavior: 'instant' })
    }
  }
  const el = agreementTitleRef.value || document.getElementById('agreement-title')
  if (el) {
    el.focus({ preventScroll: true })
  }
  if (bookingModalSheetRef.value) {
    bookingModalSheetRef.value.scrollTop = 0
  }
}

watch(bookingStep, async (newStep) => {
  if (newStep === 'agreement') {
    await nextTick()
    scrollToAgreementTop()
    requestAnimationFrame(scrollToAgreementTop)
    setTimeout(scrollToAgreementTop, 50)
    setTimeout(scrollToAgreementTop, 150)
    setTimeout(scrollToAgreementTop, 300)
  }
})

const isAgreed = ref(false)
const ruleAgreements = ref([false, false, false, false, false])

const isAllAgreed = computed({
  get: () => ruleAgreements.value.every(v => v),
  set: (val) => {
    ruleAgreements.value = ruleAgreements.value.map(() => val)
  }
})

const spaceRules = [
  { title: '냉난방 및 전등 소등', desc: '사용 후에는 반드시 냉난방기와 전등을 모두 꺼주세요.' },
  { title: '음식물 반입 금지', desc: '쾌적한 환경을 위해 공간 내 음식물 반입은 원칙적으로 금지됩니다.' },
  { title: '비품 원위치 및 정리', desc: '사용하신 비품과 기자재는 퇴실 전 원래 자리에 정돈해 주세요.' },
  { title: '기물 파손 책임', desc: '시설 및 비품 파손에 주의해 주시고, 파손 발생 시 즉시 사무실로 알려주세요.' },
  { title: '목적 외 사용 금지 (개인 레슨 / 외부 행사 금지)', desc: '본 시설은 교회 공식 사역용 공간입니다. 사적 이익을 위한 개인 레슨이나 사전 승인되지 않은 외부 단체·개인의 행사 및 연습 목적으로는 일절 사용할 수 없습니다.' }
]

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
  for (let h = 7; h <= 23; h++) {
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
  await fetchPolicy()
  const [roomRes] = await Promise.all([
    axios.get('/api/rooms'),
    fetchReservations()
  ])
  rooms.value = roomRes.data

  const todayStr = formatDate(new Date())
  const hideUntil = localStorage.getItem('hide-reservation-notice')
  if (hideUntil !== todayStr && !route.query.reapply) {
    showNoticeModal.value = true
  }

  if (route.query.reapply) {
    showNoticeModal.value = false
    if (route.query.date) {
      selectedDate.value = String(route.query.date)
      currentCalDate.value = new Date(String(route.query.date) + 'T00:00:00')
      await fetchReservations()
    }
    const targetRoomId = Number(route.query.room_id)
    const targetRoom = rooms.value.find(r => r.id === targetRoomId)
    if (targetRoom) {
      selectedRoom.value = targetRoom
      selectedFloor.value = targetRoom.floor
      roomReservations.value = reservations.value.filter(r => r.room_id === targetRoom.id && r.status !== 'rejected' && r.status !== 'cancelled')
      currentRoomBlockedTimes.value = getBlockedForRoomAndDate(targetRoom, selectedDate.value)

      form.value.title = route.query.title ? String(route.query.title) : ''
      form.value.reason = route.query.reason ? String(route.query.reason) : ''
      form.value.start_time = route.query.start_time ? String(route.query.start_time) : '09:00'
      form.value.end_time = route.query.end_time ? String(route.query.end_time) : addOneHour(form.value.start_time)
      form.value.is_recurring = false

      bookingStep.value = 'form'
      isAgreed.value = false
      ruleAgreements.value = [false, false, false, false, false]
      showReservationForm.value = true
    }
  }
})

const fetchReservations = async () => {
  try {
    const res = await axios.get(`/api/reservations?date=${selectedDate.value}`)
    reservations.value = res.data
    if (selectedRoom.value) {
      roomReservations.value = reservations.value.filter(r => r.room_id === selectedRoom.value.id && r.status !== 'rejected' && r.status !== 'cancelled')
      currentRoomBlockedTimes.value = getBlockedForRoomAndDate(selectedRoom.value, selectedDate.value)
    }
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

const currentRoomSchedule = computed(() => {
  const items = []
  
  currentRoomBlockedTimes.value.forEach(bt => {
    items.push({
      id: `bt-${bt.id}`,
      type: 'blocked',
      title: bt.reason || '관리자 설정 예약 불가',
      requester_name: null,
      start_time: bt.start_time.slice(0, 5),
      end_time: bt.end_time.slice(0, 5)
    })
  })

  roomReservations.value.forEach(res => {
    if (res.status === 'rejected' || res.status === 'cancelled') return
    items.push({
      id: `res-${res.id}`,
      type: 'reservation',
      title: res.title || '공간 사용',
      requester_name: res.requester_name,
      start_time: res.start_time.slice(0, 5),
      end_time: res.end_time.slice(0, 5)
    })
  })

  return items.sort((a, b) => a.start_time.localeCompare(b.start_time))
})

const timeConflictError = computed(() => {
  if (!form.value.start_time || !form.value.end_time) return null

  // 1. Check end > start
  if (form.value.start_time >= form.value.end_time) {
    return '종료 시간은 시작 시간보다 늦어야 합니다.'
  }

  // 2. Policy limit check (non-admin)
  if (!auth.isAdmin && policySettings.value) {
    const startLimit = (policySettings.value.start_time || '09:00:00').slice(0, 5)
    const endLimit = (policySettings.value.end_time || '17:00:00').slice(0, 5)
    if (form.value.start_time < startLimit || form.value.end_time > endLimit) {
      return `예약 가능 시간은 오전 ${startLimit} ~ 오후 ${endLimit} 사이입니다.`
    }
  }

  // 3. Blocked times overlap
  const blockedConflict = currentRoomBlockedTimes.value.find(bt => {
    const s1 = bt.start_time.slice(0, 5)
    const e1 = bt.end_time.slice(0, 5)
    const s2 = form.value.start_time
    const e2 = form.value.end_time
    return (s1 < e2 && e1 > s2)
  })
  if (blockedConflict) {
    return `해당 시간에 예약 불가 일정이 있습니다. (${blockedConflict.reason || '관리자 설정 예약 불가'})`
  }

  // 4. Existing reservation overlap
  const resConflict = roomReservations.value.find(r => {
    if (r.status === 'rejected' || r.status === 'cancelled') return false
    const s1 = r.start_time.slice(0, 5)
    const e1 = r.end_time.slice(0, 5)
    const s2 = form.value.start_time
    const e2 = form.value.end_time
    return (s1 < e2 && e1 > s2)
  })
  if (resConflict) {
    const title = resConflict.title || '기존 예약'
    const name = resConflict.requester_name ? `(${resConflict.requester_name})` : ''
    return `이미 예약된 일정이 있어 예약이 불가능합니다. [${resConflict.start_time.slice(0, 5)}~${resConflict.end_time.slice(0, 5)} ${title} ${name}]`
  }

  return null
})

const openReservationForm = (room) => {
  if (!auth.isAdmin) {
    const policyMsg = checkDatePolicy(selectedDate.value)
    if (policyMsg) {
      modal.showAlert(policyMsg)
      return
    }
  }

  selectedRoom.value = room
  roomReservations.value = reservations.value.filter(r => r.room_id === room.id && r.status !== 'rejected' && r.status !== 'cancelled')
  currentRoomBlockedTimes.value = getBlockedForRoomAndDate(room, selectedDate.value)

  if (mode.value === 'time') {
    form.value.start_time = searchForm.value.start_time
    form.value.end_time = searchForm.value.end_time
  } else {
    form.value.start_time = '09:00'
    form.value.end_time = '10:00'
  }
  
  form.value.title = ''
  form.value.reason = ''
  form.value.is_recurring = false

  // Reset agreement state
  bookingStep.value = 'form'
  isAgreed.value = false
  ruleAgreements.value = [false, false, false, false, false]
  
  showRoomDetail.value = false
  showReservationForm.value = true
}

const openRoomDetail = openReservationForm

const searchAvailableRooms = () => {
  hasSearched.value = true
  const { start_time, end_time } = searchForm.value
  
  availableRooms.value = rooms.value.filter(room => {
    // 1. Check reservation conflicts
    const resList = reservations.value.filter(r => r.room_id === room.id && r.status !== 'rejected' && r.status !== 'cancelled')
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
  // Validate reservation policy rules (skipped for admins)
  console.log("[DEBUG Mobile submitReservation] isAdmin:", auth.isAdmin, "user:", auth.user);
  if (!auth.isAdmin) {
    const policyMsg = checkDatePolicy(selectedDate.value)
    if (policyMsg) {
      modal.showAlert(policyMsg)
      return
    }

    const startLimit = policySettings.value.start_time.slice(0, 5)
    const endLimit = policySettings.value.end_time.slice(0, 5)
    if (form.value.start_time < startLimit || form.value.end_time > endLimit) {
      modal.showAlert(`예약 가능 시간은 오전 ${startLimit}부터 오후 ${endLimit}까지입니다.`)
      return
    }
  }

  if (bookingStep.value === 'form') {
    if (timeConflictError.value) {
      modal.showAlert(timeConflictError.value)
      return
    }

    if (!form.value.title?.trim()) { modal.showAlert('신청명을 입력해주세요.'); return; }
    if (form.value.start_time >= form.value.end_time) { modal.showAlert('종료 시간은 시작 시간보다 늦어야 합니다.'); return; }
    
    // Only admin can do recurring
    if (!auth.isAdmin) {
      form.value.is_recurring = false
    }

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
    
    // Go to agreement step
    bookingStep.value = 'agreement'
    await nextTick()
    scrollToAgreementTop()
    requestAnimationFrame(scrollToAgreementTop)
    setTimeout(scrollToAgreementTop, 50)
    setTimeout(scrollToAgreementTop, 150)
    setTimeout(scrollToAgreementTop, 300)
    return
  }

  // If in agreement step
  if (!isAllAgreed.value || !isAgreed.value) {
    modal.showAlert('모든 공간 사용 수칙에 동의해 주세요.')
    return
  }

  if (timeConflictError.value) {
    modal.showAlert(timeConflictError.value)
    bookingStep.value = 'form'
    return
  }

  try {
    const payload = {
      ...form.value,
      is_recurring: auth.isAdmin ? form.value.is_recurring : false,
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

const addOneHour = (timeStr) => {
  if (!timeStr) return ''
  const [h, m] = timeStr.split(':').map(Number)
  const nextH = Math.min(23, h + 1)
  return `${String(nextH).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

watch(() => form.value.start_time, (newStart) => {
  if (newStart) {
    form.value.end_time = addOneHour(newStart)
  }
})

watch(() => searchForm.value.start_time, (newStart) => {
  if (newStart) {
    searchForm.value.end_time = addOneHour(newStart)
  }
})

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

