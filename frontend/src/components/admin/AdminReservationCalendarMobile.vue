<template>
  <div class="relative select-none pb-16">
    <!-- Main Calendar + Schedule Container -->
    <div class="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
      <!-- 1. Top Calendar Header (2026. 10. ▾ Style) -->
      <div class="px-4 pt-3.5 pb-1.5 flex items-center justify-center">
        <!-- Center: < 2026. 10. ▾ > -->
        <div class="flex items-center gap-1">
          <button
            @click="navigateMonth(-1)"
            class="w-7 h-7 rounded-full hover:bg-slate-100 active:scale-90 flex items-center justify-center text-slate-400 hover:text-slate-700 font-black transition-all"
          >
            ‹
          </button>

          <div
            class="relative px-2 py-0.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-1"
            @click="openDatePicker"
          >
            <span class="text-lg font-black text-slate-900 tracking-tight">{{ headerMonthTitle }}</span>
            <span class="text-slate-700 text-xs">▾</span>
            <input
              ref="dateInputRef"
              type="date"
              :value="activeDayStr"
              @change="onDatePicked"
              class="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
            />
          </div>

          <button
            @click="navigateMonth(1)"
            class="w-7 h-7 rounded-full hover:bg-slate-100 active:scale-90 flex items-center justify-center text-slate-400 hover:text-slate-700 font-black transition-all"
          >
            ›
          </button>
        </div>
      </div>

      <!-- 2. Weekday Header (일 ~ 토) -->
      <div class="grid grid-cols-7 border-b border-slate-100 pt-1">
        <div
          v-for="(d, idx) in ['일', '월', '화', '수', '목', '금', '토']"
          :key="d"
          class="py-2 text-center text-[11px] font-bold"
          :class="idx === 0 ? 'text-rose-500' : idx === 6 ? 'text-blue-500' : 'text-slate-500'"
        >
          {{ d }}
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="p-12 text-center space-y-3">
        <div class="w-7 h-7 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p class="text-xs font-bold text-slate-400">일정을 불러오는 중...</p>
      </div>

      <!-- 3. Month Grid (Interactive Finger-Following Height & Smooth Spring Animation) -->
      <div
        v-else
        class="grid grid-cols-7 touch-none will-change-transform"
        :class="effectiveCollapseProgress > 0.6 ? 'divide-y divide-transparent' : 'divide-y divide-slate-100'"
        :style="calendarGridStyle"
        @touchstart="onCalendarTouchStart"
        @touchmove="onCalendarTouchMove"
        @touchend="onCalendarTouchEnd"
        @touchcancel="onCalendarTouchEnd"
        @mousedown="onCalendarMouseDown"
        @mousemove="onCalendarMouseMove"
        @mouseup="onCalendarMouseUp"
        @mouseleave="onCalendarMouseLeave"
      >
        <div
          v-for="cell in monthCells"
          :key="cell.dateStr"
          @click="handleDayTap(cell)"
          class="flex flex-col items-center justify-start p-1 relative overflow-hidden"
          :class="cell.isCurrentMonth ? 'cursor-pointer active:bg-slate-50/80' : 'cursor-default pointer-events-none'"
          :style="calendarCellStyle"
        >
          <template v-if="cell.isCurrentMonth">
            <!-- Day Number Circle -->
            <div
              class="w-7 h-7 rounded-full flex items-center justify-center text-xs transition-colors duration-200 shrink-0 z-10"
              :class="[
                cell.dateStr === activeDayStr
                  ? 'bg-slate-900 text-white font-black shadow-xs'
                  : cell.dayOfWeek === 0 || cell.holiday
                    ? 'text-rose-500 font-bold'
                    : cell.dayOfWeek === 6
                      ? 'text-blue-500 font-bold'
                      : 'text-slate-800 font-bold'
              ]"
            >
              {{ cell.day }}
            </div>

            <!-- A. 축소 상태용 작은 점(dot) (터치 진행률에 따라 부드럽게 페이드인/스케일업) -->
            <div
              class="flex items-center justify-center gap-0.5 mt-1 h-2 pointer-events-none"
              :style="compactDotsStyle"
            >
              <span
                v-for="(dotColor, dIdx) in getCellDotColors(cell)"
                :key="dIdx"
                class="w-1.5 h-1.5 rounded-full"
                :class="dotColor"
              ></span>
            </div>

            <!-- B. 펼침 상태용 공휴일 배지 및 일정 바 (터치 진행률에 따라 부드럽게 페이드아웃/슬라이드) -->
            <div
              class="w-full -mt-2 space-y-0.5 overflow-hidden px-0.5 pointer-events-none origin-top"
              :style="expandedBarsStyle"
            >
              <!-- 공휴일 표시 -->
              <div
                v-if="cell.holiday"
                class="px-1 py-0.2 rounded bg-rose-50 text-rose-500 text-[9px] font-bold truncate text-center leading-tight"
              >
                {{ shortHolidayName(cell.holiday) }}
              </div>

              <!-- 예약/고정 일정 바 (최대 2건 표시) -->
              <div
                v-for="item in cell.items.slice(0, 2)"
                :key="item.id"
                class="px-1 py-0.5 rounded text-[9px] font-bold truncate leading-tight"
                :class="getExpandedBarClass(item)"
              >
                {{ item.title || item.room_name }}
              </div>

              <!-- 초과 건수 표기 (예: +3) -->
              <div
                v-if="cell.items.length > 2"
                class="text-[9px] font-extrabold text-slate-500 text-center leading-tight pt-0.5"
              >
                +{{ cell.items.length - 2 }}
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- 4. Bottom Schedule List Panel (터치 드래그에 맞춰 자연스럽게 슬라이드/오픈) -->
      <div
        v-show="effectiveCollapseProgress > 0.01"
        class="border-t border-slate-100 bg-white px-5 overflow-hidden"
        :style="schedulePanelStyle"
      >
        <div class="pt-2 pb-6 space-y-4 min-h-[15rem]">
          <!-- Top Grab Handle (Tap or Drag Down to expand calendar back) -->
          <div
            @click="toggleCalendarCollapse(false)"
            @touchstart="onCalendarTouchStart"
            @touchmove="onCalendarTouchMove"
            @touchend="onCalendarTouchEnd"
            @mousedown="onCalendarMouseDown"
            @mousemove="onCalendarMouseMove"
            @mouseup="onCalendarMouseUp"
            class="py-2 cursor-pointer flex flex-col items-center group touch-none"
            title="터치하거나 아래로 내려 전체 캘린더 펼치기"
          >
            <div class="w-10 h-1 bg-slate-300 group-hover:bg-slate-400 rounded-full transition-colors"></div>
          </div>

          <!-- Selected Date Title -->
          <div class="flex items-center gap-2 flex-wrap">
            <h4 class="text-base font-black text-slate-900 tracking-tight">
              {{ selectedDayHeaderText }}
            </h4>
            <span
              v-if="getHoliday(activeDayStr)"
              class="px-2 py-0.5 rounded-md bg-rose-50 text-rose-500 text-[11px] font-black"
            >
              {{ getHoliday(activeDayStr) }}
            </span>
          </div>

          <!-- Schedule Items List for Selected Day -->
          <div v-if="selectedDayItems.length === 0" class="py-3">
            <div class="flex items-center gap-3 text-slate-400">
              <span class="w-1 h-5 bg-slate-200 rounded-full"></span>
              <span class="text-sm font-bold">일정이 없습니다.</span>
            </div>
          </div>

          <div v-else class="space-y-2.5 max-h-[22rem] overflow-y-auto pr-0.5">
            <div
              v-for="item in selectedDayItems"
              :key="item.id"
              @click="handleCellItemTap(item)"
              class="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50/70 hover:bg-slate-100/80 border border-slate-100 transition-all active:scale-[0.99] cursor-pointer"
            >
              <div class="flex items-start gap-3 min-w-0">
                <!-- Left Vertical Color Bar -->
                <span
                  class="w-1 h-10 rounded-full shrink-0 mt-0.5"
                  :class="getItemBarColor(item)"
                ></span>

                <div class="min-w-0 space-y-0.5">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="text-sm font-black text-slate-900 truncate">
                      {{ item.title || '(신청명 없음)' }}
                    </span>
                    <span class="px-2 py-0.5 rounded-md bg-white border border-slate-200/80 text-[10px] font-black text-indigo-600">
                      {{ formatFloorLabel(item.floor) }} · {{ item.room_name }}
                    </span>
                  </div>

                  <div class="text-xs font-bold text-slate-500 flex items-center gap-2">
                    <span class="text-slate-700 font-black">{{ fmtTime(item.start_time) }} ~ {{ fmtTime(item.end_time) }}</span>
                    <span class="text-slate-300">·</span>
                    <span>{{ item.requester_name }}</span>
                  </div>
                </div>
              </div>

              <!-- Status Pill -->
              <span
                class="px-2.5 py-1 rounded-full text-[10px] font-black shrink-0"
                :class="item.is_blocked ? 'bg-teal-100 text-teal-800' : statusBadgeClass(item.status)"
              >
                {{ item.is_blocked ? '고정 일정' : statusLabel(item.status) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 5. Bottom Floating Controls: [오늘 ›] + [고정일정 포함] & [돋보기 / +] FAB -->
    <div class="fixed bottom-20 inset-x-0 pointer-events-none z-40 px-6 flex items-end justify-between">
      <div class="w-12"></div>

      <!-- Center: 오늘 › & 고정일정 포함 Pill Buttons -->
      <div class="flex items-center gap-2 pb-0.5">
        <button
          @click="goToday"
          class="pointer-events-auto bg-white border border-slate-200 shadow-lg shadow-slate-200/70 px-4 py-2 rounded-full text-xs font-black text-slate-700 flex items-center gap-1 active:scale-95 transition-all"
        >
          <span>오늘</span>
          <span class="text-slate-400">›</span>
        </button>

        <button
          @click="includeBlocked = !includeBlocked"
          type="button"
          :aria-pressed="includeBlocked"
          class="pointer-events-auto px-3.5 py-2 rounded-full text-xs font-black border shadow-lg transition-all active:scale-95 flex items-center gap-1.5"
          :class="includeBlocked
            ? 'bg-slate-700 text-white border-slate-700 shadow-slate-300/70'
            : 'bg-white text-slate-600 border-slate-200 shadow-slate-200/70'"
        >
          <span
            class="w-1.5 h-1.5 rounded-full"
            :class="includeBlocked ? 'bg-white' : 'bg-slate-300'"
          ></span>
          <span>고정일정 포함</span>
        </button>
      </div>

      <!-- Right: Search Floating Button + New Reservation Floating Button -->
      <div class="flex flex-col items-center gap-2.5">
        <button
          @click="openSearchModal"
          type="button"
          class="pointer-events-auto w-11 h-11 rounded-full bg-white border border-slate-200 text-slate-700 shadow-lg shadow-slate-300/50 flex items-center justify-center active:scale-90 transition-all hover:bg-slate-50"
          title="일정 검색"
        >
          <MagnifyingGlassIcon class="w-5 h-5 stroke-[2.2]" />
        </button>

        <button
          @click="openBookingForActiveDay"
          class="pointer-events-auto w-12 h-12 rounded-full bg-slate-800 hover:bg-indigo-600 text-white shadow-xl shadow-slate-400/40 flex items-center justify-center text-2xl font-light active:scale-90 transition-all"
          :class="isPastDate(activeDayStr) ? 'opacity-40' : ''"
          title="신규 예약 추가"
        >
          +
        </button>
      </div>
    </div>

    <!-- ==========================================
         BOTTOM SHEET 1: 관리자 공간 예약 신청 모달 (showBookingModal)
    =========================================== -->
    <Teleport to="body">
      <div
        v-if="showBookingModal"
        class="fixed inset-0 z-[2100] bg-slate-900/60 backdrop-blur-sm flex flex-col justify-end"
        @click.self="showBookingModal = false"
      >
        <div class="bg-white rounded-t-[2.5rem] max-h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-200">
          <!-- Sheet Header -->
          <div class="px-6 pt-5 pb-4 border-b border-slate-100 flex items-center justify-between shrink-0">
            <div>
              <div class="flex items-center gap-1.5 mb-1 flex-wrap">
                <template v-if="selectedRoom">
                  <span class="bg-indigo-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md uppercase">
                    {{ formatFloorLabel(selectedRoom.floor) }}
                  </span>
                  <span class="text-xs font-black text-indigo-600">{{ roomLabel(selectedRoom) }}</span>
                </template>
                <span v-else class="bg-amber-100 text-amber-700 text-[10px] font-black px-2 py-0.5 rounded-md">
                  공간 미선택
                </span>
                <span class="text-slate-300 text-xs">|</span>
                <span class="text-xs font-black text-slate-600">
                  {{ bookingEndDate && bookingEndDate > bookingDate
                    ? `${bookingDate} ~ ${bookingEndDate} (${bookingDatesInRange.length}일간)`
                    : bookingDate }}
                </span>
              </div>
              <h3 class="text-lg font-black text-slate-900 tracking-tight">
                공간 예약 신청
              </h3>
            </div>
            <button
              @click="showBookingModal = false"
              class="w-9 h-9 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-black"
            >
              ✕
            </button>
          </div>

          <!-- STEP 1: 예약 정보 입력 -->
            <div class="p-6 overflow-y-auto space-y-4 flex-1">
              <!-- 공간 선택 -->
              <ReservationRoomCard :room="selectedRoom">
                <select aria-label="예약할 공간"
                  :value="selectedRoom?.id || ''"
                  @change="onBookingRoomChange"
                  class="w-full border rounded-2xl px-4 py-3 text-xs font-bold outline-none transition-all"
                  :class="selectedRoom
                    ? 'bg-slate-50 border-slate-200 text-slate-800'
                    : 'bg-amber-50/70 border-amber-300 text-amber-700'"
                >
                  <option value="" disabled>예약할 공간을 선택해 주세요</option>
                  <optgroup v-for="fg in roomsByFloor" :key="fg.floor" :label="formatFloorLabel(fg.floor)">
                    <option v-for="rm in fg.rooms" :key="rm.id" :value="rm.id">
                      {{ roomLabel(rm) }} ({{ formatFloorLabel(rm.floor) }})
                    </option>
                  </optgroup>
                </select>
              </ReservationRoomCard>

              <!-- 예약 일자 (시작일 ~ 종료일 연속 기간) -->
              <div class="space-y-1.5">
                <div class="flex items-center justify-between">
                  <label class="text-[11px] font-black text-slate-500 uppercase tracking-widest block">
                    예약 일자 (연속 기간 선택 가능)
                  </label>
                  <button
                    v-if="bookingEndDate && bookingEndDate !== bookingDate"
                    type="button"
                    @click="bookingEndDate = bookingDate"
                    class="text-[10px] font-black text-slate-400 hover:text-indigo-600 underline"
                  >
                    당일 예약으로 초기화
                  </button>
                </div>
                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <span class="text-[10px] font-bold text-slate-400 block mb-1">시작 일자</span>
                    <input
                      type="date"
                      v-model="bookingDate"
                      :min="todayStr"
                      @change="onBookingStartDateChange"
                      class="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-indigo-400"
                    />
                  </div>
                  <div>
                    <div class="flex items-center justify-between mb-1">
                      <span class="text-[10px] font-bold text-slate-400">종료 일자</span>
                      <span
                        v-if="bookingDatesInRange.length > 1"
                        class="text-[10px] font-black text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded"
                      >
                        연속 {{ bookingDatesInRange.length }}일
                      </span>
                    </div>
                    <input
                      type="date"
                      v-model="bookingEndDate"
                      :min="bookingDate || todayStr"
                      class="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-indigo-400"
                    />
                  </div>
                </div>
              </div>

              <!-- 선택 기간 예약 현황 -->
              <div class="bg-slate-50 rounded-2xl p-3.5 border border-slate-100 space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    {{ bookingDatesInRange.length > 1 ? `선택 기간(${bookingDatesInRange.length}일) 예약 현황` : '당일 예약 현황' }}
                  </span>
                  <span class="text-[10px] font-bold text-slate-400">겹치는 시간은 예약 불가</span>
                </div>
                <div v-if="!selectedRoom" class="text-[11px] font-bold text-amber-600 py-1">
                  위에서 예약할 공간을 먼저 선택하시면 해당 공간의 예약 현황이 표시됩니다.
                </div>
                <div v-else-if="currentRoomSchedule.length === 0" class="text-[11px] font-bold text-emerald-600 py-1">
                  등록된 예약이 없습니다. 원하시는 시간을 선택하세요.
                </div>
                <div v-else class="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  <div
                    v-for="item in currentRoomSchedule"
                    :key="item.id"
                    class="px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 border"
                    :class="item.is_blocked
                      ? 'bg-teal-50 text-teal-800 border-teal-200'
                      : 'bg-white text-slate-700 border-slate-200'"
                  >
                    <span v-if="bookingDatesInRange.length > 1" class="text-indigo-600 font-black">
                      [{{ item.reservation_date.slice(5) }}]
                    </span>
                    <span class="font-black">{{ fmtTime(item.start_time) }}~{{ fmtTime(item.end_time) }}</span>
                    <span class="text-slate-400">|</span>
                    <span class="truncate max-w-[110px]">{{ item.title || item.requester_name }}</span>
                  </div>
                </div>
              </div>

              <!-- 시작/종료 시간 -->
              <div class="grid grid-cols-2 gap-2">
                <div class="space-y-1">
                  <label class="text-[11px] font-black text-slate-500 block">시작 시간</label>
                  <ReservationTimeSelect v-model="bookingForm.start_time" label="시작 시간" @change="bookingForm.end_time = addOneHour($event)" />
                </div>
                <div class="space-y-1">
                  <label class="text-[11px] font-black text-slate-500 block">종료 시간</label>
                  <ReservationTimeSelect v-model="bookingForm.end_time" label="종료 시간" end-of-day />
                </div>
              </div>

              <!-- 시간 충돌 경고 -->
              <div
                v-if="timeConflictError"
                class="bg-rose-50 border border-rose-200 text-rose-600 rounded-2xl px-3.5 py-2.5 text-[11px] font-black flex items-center gap-2"
              >
                <span>⚠️</span>
                <span>{{ timeConflictError }}</span>
              </div>

              <!-- 신청명 -->
              <div class="space-y-1">
                <label class="text-[11px] font-black text-slate-500 block">신청명 (모임/행사명)</label>
                <input
                  v-model="bookingForm.title"
                  type="text"
                  placeholder="예: 청년부 소그룹 모임"
                  class="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-indigo-400"
                />
              </div>

              <!-- 사용 목적 -->
              <div class="space-y-1">
                <label class="text-[11px] font-black text-slate-500 block">사유 및 목적</label>
                <textarea
                  v-model="bookingForm.reason"
                  rows="2"
                  placeholder="사용 목적 및 인원 등을 간략히 입력해 주세요."
                  class="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs font-bold text-slate-800 outline-none resize-none"
                ></textarea>
              </div>

              <!-- 반복 예약 설정 (/m/reservations와 동일한 UI/UX) -->
              <div class="bg-white border border-slate-200 p-4 rounded-2xl space-y-3">
                <div class="flex items-center justify-between">
                  <label class="text-[0.6875rem] font-black text-slate-600 uppercase tracking-wider">반복 예약 설정</label>
                  <span v-if="bookingDatesInRange.length > 1" class="text-[10px] font-bold text-indigo-600">
                    연속 기간({{ bookingDatesInRange.length }}일) 적용됨
                  </span>
                  <button
                    v-else
                    type="button"
                    @click="bookingForm.is_recurring = !bookingForm.is_recurring"
                    :class="[bookingForm.is_recurring ? 'bg-indigo-600' : 'bg-slate-200']"
                    class="w-9 h-5 rounded-full relative transition-colors duration-200 focus:outline-none"
                  >
                    <div
                      :class="[bookingForm.is_recurring ? 'translate-x-4' : 'translate-x-0.5']"
                      class="absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-200 shadow-sm"
                    ></div>
                  </button>
                </div>

                <div
                  v-if="bookingForm.is_recurring && bookingDatesInRange.length === 1"
                  class="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300"
                >
                  <!-- Recurrence Type -->
                  <div class="flex gap-2">
                    <button
                      v-for="type in [['daily', '매일'], ['weekly', '매주'], ['monthly', '매월']]"
                      :key="type[0]"
                      type="button"
                      @click="bookingForm.recurring_type = type[0]"
                      :class="[bookingForm.recurring_type === type[0] ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-400']"
                      class="flex-1 py-2 rounded-xl text-[0.625rem] font-black uppercase tracking-widest transition-all"
                    >
                      {{ type[1] }}
                    </button>
                  </div>

                  <!-- Weekly Days Selection -->
                  <div v-if="bookingForm.recurring_type === 'weekly'" class="space-y-2">
                    <label class="text-[0.5625rem] font-black text-slate-400 uppercase tracking-widest ml-1">요일 선택 (중복 가능)</label>
                    <div class="flex justify-between gap-1">
                      <button
                        v-for="(day, idx) in ['일', '월', '화', '수', '목', '금', '토']"
                        :key="idx"
                        type="button"
                        @click="toggleRecurringDay(idx)"
                        :class="[bookingForm.recurring_days.includes(idx) ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400 border-slate-100']"
                        class="w-8 h-8 rounded-lg border text-[0.625rem] font-black transition-all"
                      >
                        {{ day }}
                      </button>
                    </div>
                  </div>

                  <!-- Monthly Options -->
                  <div v-if="bookingForm.recurring_type === 'monthly'" class="space-y-4">
                    <div class="flex gap-2">
                      <button
                        type="button"
                        @click="bookingForm.recurring_month_option = 'date'"
                        :class="[bookingForm.recurring_month_option === 'date' ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-white text-slate-400 border-slate-100']"
                        class="flex-1 py-3 rounded-xl border text-[0.625rem] font-black transition-all"
                      >
                        매월 특정 일자
                      </button>
                      <button
                        type="button"
                        @click="bookingForm.recurring_month_option = 'nth'"
                        :class="[bookingForm.recurring_month_option === 'nth' ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-white text-slate-400 border-slate-100']"
                        class="flex-1 py-3 rounded-xl border text-[0.625rem] font-black transition-all"
                      >
                        매월 특정 주차
                      </button>
                    </div>

                    <!-- Monthly by Date -->
                    <div v-if="bookingForm.recurring_month_option === 'date'" class="flex items-center gap-2">
                      <select
                        v-model="bookingForm.recurring_month_date"
                        class="flex-1 bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 font-black text-center text-slate-700 text-xs"
                      >
                        <option v-for="d in 31" :key="d" :value="d">{{ d }}일</option>
                      </select>
                      <span class="text-[0.625rem] font-black text-slate-400 uppercase tracking-widest">에 반복</span>
                    </div>

                    <!-- Monthly by Nth Week -->
                    <div v-if="bookingForm.recurring_month_option === 'nth'" class="flex items-center gap-2">
                      <select
                        v-model="bookingForm.recurring_month_nth_week"
                        class="flex-1 bg-slate-50 border border-slate-200 rounded-xl py-3 px-2 font-black text-center text-slate-700 text-xs"
                      >
                        <option v-for="n in 5" :key="n" :value="n">{{ n }}째주</option>
                      </select>
                      <select
                        v-model="bookingForm.recurring_month_nth_day"
                        class="flex-1 bg-slate-50 border border-slate-200 rounded-xl py-3 px-2 font-black text-center text-slate-700 text-xs"
                      >
                        <option v-for="(d, i) in ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']" :key="i" :value="i">{{ d }}</option>
                      </select>
                      <span class="text-[0.625rem] font-black text-slate-400 uppercase tracking-widest">에 반복</span>
                    </div>
                  </div>

                  <!-- End Date Selection -->
                  <div class="space-y-2">
                    <label class="text-[0.5625rem] font-black text-slate-400 uppercase tracking-widest ml-1">반복 종료일</label>
                    <button
                      type="button"
                      @click="openRecurringEndCalendar"
                      class="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 px-5 font-black text-xs text-slate-700 flex items-center justify-between active:scale-[0.98] transition-all"
                    >
                      <span>{{ bookingForm.recurring_end_date || '날짜 선택' }}</span>
                      <CalendarIcon class="w-5 h-5 text-slate-300" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Step 1 Footer -->
            <div class="p-4 border-t border-slate-100 bg-white flex gap-2 shrink-0">
              <button
                @click="showBookingModal = false"
                class="flex-1 py-3.5 rounded-2xl bg-slate-100 text-slate-500 text-xs font-black"
              >
                취소
              </button>
              <button
                @click="validateAndSubmitBooking"
                :disabled="!!timeConflictError || submittingBooking"
                class="flex-[2] py-3.5 rounded-2xl bg-indigo-600 text-white text-xs font-black shadow-lg shadow-indigo-100 disabled:opacity-50 active:scale-95 transition-all"
              >
                {{ submittingBooking ? '처리 중...' : '예약 신청하기' }}
              </button>
            </div>

        </div>
      </div>
    </Teleport>

    <!-- ==========================================
         BOTTOM SHEET 1-B: 반복 종료일 선택 캘린더 (showRecurringEndCalendar)
    =========================================== -->
    <Teleport to="body">
      <div v-if="showRecurringEndCalendar" class="fixed inset-0 z-[2200] flex flex-col justify-end">
        <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" @click="showRecurringEndCalendar = false"></div>
        <div class="relative bg-white rounded-t-[3rem] p-8 animate-in slide-in-from-bottom duration-300">
          <div class="w-12 h-1.5 bg-slate-100 rounded-full mx-auto mb-6"></div>

          <div class="flex justify-between items-center mb-6">
            <h3 class="text-xl font-black text-slate-900 tracking-tight">반복 종료일 선택</h3>
            <div class="flex gap-1 items-center">
              <button type="button" @click="moveRecurringMonth(-1)" class="p-2 hover:bg-slate-50 rounded-xl">
                <ChevronLeftIcon class="w-5 h-5 text-slate-400" />
              </button>
              <span class="text-sm font-black text-slate-900 w-24 text-center py-2">
                {{ recurringEndCalDate.getFullYear() }}.{{ String(recurringEndCalDate.getMonth() + 1).padStart(2, '0') }}
              </span>
              <button type="button" @click="moveRecurringMonth(1)" class="p-2 hover:bg-slate-50 rounded-xl">
                <ChevronRightIcon class="w-5 h-5 text-slate-400" />
              </button>
            </div>
          </div>

          <div class="grid grid-cols-7 gap-2 mb-2">
            <span
              v-for="d in ['일', '월', '화', '수', '목', '금', '토']"
              :key="d"
              class="text-center text-[0.625rem] font-black text-slate-300 uppercase"
            >
              {{ d }}
            </span>
          </div>
          <div class="grid grid-cols-7 gap-2">
            <button
              v-for="(day, idx) in recurringEndCalendarDays"
              :key="idx"
              type="button"
              @click="selectRecurringEndDate(day.date)"
              :disabled="!day.current || toDateStr(day.date) < bookingDate"
              :class="[
                day.current && toDateStr(day.date) >= bookingDate ? 'text-slate-700' : 'text-slate-200',
                toDateStr(day.date) === todayStr ? 'text-indigo-600' : '',
                bookingForm.recurring_end_date === toDateStr(day.date) ? 'bg-indigo-600 !text-white shadow-lg' : ''
              ]"
              class="aspect-square flex items-center justify-center text-xs font-black rounded-xl transition-all active:scale-90"
            >
              {{ day.day }}
            </button>
          </div>
          <button
            type="button"
            @click="showRecurringEndCalendar = false"
            class="w-full mt-8 py-4 bg-slate-50 text-slate-400 font-black text-xs uppercase tracking-widest rounded-3xl"
          >
            닫기
          </button>
        </div>
      </div>
    </Teleport>

    <!-- ==========================================
         BOTTOM SHEET 2: 예약 상세 / 변경 / 취소 / 승인 모달 (showModal)
    =========================================== -->
    <Teleport to="body">
      <div
        v-if="showModal && selectedRes"
        class="fixed inset-0 z-[2100] bg-slate-900/60 backdrop-blur-sm flex flex-col justify-end"
        @click.self="closeModal"
      >
        <div class="bg-white rounded-t-[2.5rem] max-h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-200">
          <!-- Header -->
          <div class="px-6 pt-5 pb-4 border-b border-slate-100 flex items-center justify-between shrink-0">
            <div>
              <div class="flex items-center gap-1.5 mb-1">
                <span class="px-2 py-0.5 rounded-md text-[10px] font-black" :class="statusBadgeClass(selectedRes.status)">
                  {{ statusLabel(selectedRes.status) }}
                </span>
                <span
                  v-if="selectedRes.is_recurring"
                  class="px-2 py-0.5 rounded-md bg-violet-50 text-violet-600 text-[10px] font-black"
                >
                  반복예약
                </span>
              </div>
              <h3 class="text-lg font-black text-slate-900 tracking-tight">
                {{ isEditing ? '예약 정보 변경' : showCancelConfirm ? '예약 취소 확인' : (selectedRes.title || '(신청명 없음)') }}
              </h3>
            </div>
            <button
              @click="closeModal"
              class="w-9 h-9 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-black"
            >
              ✕
            </button>
          </div>

          <!-- Body -->
          <div class="p-6 overflow-y-auto space-y-4 flex-1">
            <!-- A. 상세 조회 모드 -->
            <template v-if="!isEditing && !showCancelConfirm">
              <ReservationRoomCard :room="rooms.find(r => String(r.id) === String(selectedRes.room_id)) || selectedRes" />
              <div class="bg-slate-50 rounded-2xl p-4 space-y-2.5 text-xs">
                <div class="flex justify-between">
                  <span class="font-bold text-slate-400">장소</span>
                  <span class="font-black text-slate-800">{{ formatFloorLabel(selectedRes.floor) }} · {{ selectedRes.room_name }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="font-bold text-slate-400">일시</span>
                  <span class="font-black text-indigo-600">
                    {{ fmtDate(selectedRes.reservation_date) }} ({{ fmtTime(selectedRes.start_time) }} ~ {{ fmtTime(selectedRes.end_time) }})
                  </span>
                </div>
                <div class="flex justify-between">
                  <span class="font-bold text-slate-400">신청자</span>
                  <span class="font-black text-slate-800">
                    {{ selectedRes.requester_name }}
                    <a
                      v-if="selectedRes.requester_phone"
                      :href="`tel:${selectedRes.requester_phone}`"
                      class="text-indigo-600 underline ml-1"
                    >
                      ({{ selectedRes.requester_phone }})
                    </a>
                  </span>
                </div>
                <div class="flex justify-between">
                  <span class="font-bold text-slate-400">사용 목적</span>
                  <span class="font-bold text-slate-700 text-right max-w-[65%]">{{ selectedRes.reason || '-' }}</span>
                </div>
                <div v-if="selectedRes.rejection_reason" class="pt-2 border-t border-slate-200/70 flex justify-between text-rose-600">
                  <span class="font-black">거부/취소 사유</span>
                  <span class="font-bold text-right max-w-[65%]">{{ selectedRes.rejection_reason }}</span>
                </div>
              </div>

              <!-- 변경 이력 -->
              <div v-if="logs.length > 0" class="space-y-2">
                <h4 class="text-[11px] font-black text-slate-400 uppercase tracking-widest">예약 변경 이력</h4>
                <div class="space-y-1.5 max-h-36 overflow-y-auto">
                  <div
                    v-for="lg in logs"
                    :key="lg.id"
                    class="bg-slate-50 rounded-xl p-2.5 text-[11px] border border-slate-100 space-y-0.5"
                  >
                    <div class="flex justify-between font-black text-slate-700">
                      <span>{{ lg.action_type === 'MODIFIED' ? '예약 변경' : lg.action_type }}</span>
                      <span class="text-slate-400 text-[10px]">{{ formatDateTime(lg.created_at) }}</span>
                    </div>
                    <p v-if="lg.reason" class="text-slate-500 font-bold">사유: {{ lg.reason }}</p>
                  </div>
                </div>
              </div>
            </template>

            <!-- B. 예약 변경 모드 (isEditing) -->
            <template v-else-if="isEditing">
              <div class="space-y-3">
                <div v-if="selectedRes.is_recurring" class="space-y-1.5">
                  <label class="text-[11px] font-black text-slate-500 block">반복 예약 변경 범위</label>
                  <div class="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      @click="modifyScope = 'single'"
                      class="py-2.5 rounded-xl text-xs font-black border transition-all"
                      :class="modifyScope === 'single' ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' : 'bg-slate-50 text-slate-600 border-slate-200'"
                    >
                      이 일정만 변경
                    </button>
                    <button
                      type="button"
                      @click="modifyScope = 'all'"
                      class="py-2.5 rounded-xl text-xs font-black border transition-all"
                      :class="modifyScope === 'all' ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' : 'bg-slate-50 text-slate-600 border-slate-200'"
                    >
                      유효한 전체 일정 변경 ({{ validRecurringSeriesItems.length }}건)
                    </button>
                  </div>
                </div>

                <div class="space-y-1">
                  <label class="text-[11px] font-black text-slate-500 block">신청명</label>
                  <input
                    v-model="editForm.title"
                    type="text"
                    class="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-slate-800"
                  />
                </div>

                <ReservationRoomCard :room="rooms.find(r => String(r.id) === String(editForm.room_id))">
                  <select aria-label="변경할 공간"
                    v-model="editForm.room_id"
                    class="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-slate-800"
                  >
                    <optgroup v-for="fg in roomsByFloor" :key="fg.floor" :label="formatFloorLabel(fg.floor)">
                      <option v-for="rm in fg.rooms" :key="rm.id" :value="rm.id">
                        {{ roomLabel(rm) }} ({{ formatFloorLabel(rm.floor) }})
                      </option>
                    </optgroup>
                  </select>
                </ReservationRoomCard>

                <div class="space-y-1">
                  <div class="flex items-center justify-between">
                    <label class="text-[11px] font-black text-slate-500 block">변경할 날짜</label>
                    <span v-if="selectedRes.is_recurring && modifyScope === 'all'" class="text-[10px] font-bold text-indigo-600">
                      전체 변경 시 각 반복 일자 유지
                    </span>
                  </div>
                  <input
                    type="date"
                    v-model="editForm.reservation_date"
                    :disabled="selectedRes.is_recurring && modifyScope === 'all'"
                    class="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-slate-800 disabled:opacity-50"
                  />
                </div>

                <div class="grid grid-cols-2 gap-2">
                  <div class="space-y-1">
                    <label class="text-[11px] font-black text-slate-500 block">시작 시간</label>
                    <ReservationTimeSelect v-model="editForm.start_time" label="시작 시간" @change="editForm.end_time = addOneHour($event)" />
                  </div>
                  <div class="space-y-1">
                    <label class="text-[11px] font-black text-slate-500 block">종료 시간</label>
                    <ReservationTimeSelect v-model="editForm.end_time" label="종료 시간" end-of-day />
                  </div>
                </div>

                <!-- 변경 대상 공간 당일 예약 현황 및 충돌 경고 -->
                <div class="bg-slate-50 rounded-2xl p-3 border border-slate-100 space-y-1.5">
                  <span class="text-[10px] font-black text-slate-500 uppercase tracking-widest block">
                    변경 대상 공간 당일 예약 현황
                  </span>
                  <div v-if="editRoomSchedule.length === 0" class="text-[11px] font-bold text-emerald-600">
                    다른 예약이 없습니다.
                  </div>
                  <div v-else class="flex flex-wrap gap-1.5">
                    <span
                      v-for="ev in editRoomSchedule"
                      :key="ev.id"
                      class="px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-[10px] font-bold text-slate-700"
                    >
                      {{ fmtTime(ev.start_time) }}~{{ fmtTime(ev.end_time) }} ({{ ev.title || ev.requester_name }})
                    </span>
                  </div>
                </div>

                <div
                  v-if="editTimeConflictError"
                  class="bg-rose-50 border border-rose-200 text-rose-600 rounded-2xl px-3.5 py-2.5 text-[11px] font-black"
                >
                  ⚠️ {{ editTimeConflictError }}
                </div>

                <div class="space-y-1">
                  <label class="text-[11px] font-black text-indigo-600 block">변경 사유 입력 (신청자 알림톡 전송)</label>
                  <textarea
                    v-model="editForm.admin_reason"
                    rows="2"
                    placeholder="예: 교회 공식 행사 일정으로 인해 시간/장소가 조정되었습니다."
                    class="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs font-bold text-slate-800 outline-none resize-none"
                  ></textarea>
                </div>
              </div>
            </template>

            <!-- C. 예약 취소 확인 모드 (showCancelConfirm) -->
            <template v-else-if="showCancelConfirm">
              <div class="space-y-3">
                <div v-if="selectedRes.is_recurring" class="space-y-1.5">
                  <label class="text-[11px] font-black text-slate-500 block">반복 예약 취소 범위</label>
                  <div class="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      @click="cancelScope = 'single'"
                      class="py-2.5 rounded-xl text-xs font-black border transition-all"
                      :class="cancelScope === 'single' ? 'bg-rose-600 text-white border-rose-600' : 'bg-slate-50 text-slate-600 border-slate-200'"
                    >
                      이 일정만 취소
                    </button>
                    <button
                      type="button"
                      @click="cancelScope = 'all'"
                      class="py-2.5 rounded-xl text-xs font-black border transition-all"
                      :class="cancelScope === 'all' ? 'bg-rose-600 text-white border-rose-600' : 'bg-slate-50 text-slate-600 border-slate-200'"
                    >
                      반복 일정 전체 취소
                    </button>
                  </div>
                </div>

                <div class="space-y-1">
                  <label class="text-[11px] font-black text-rose-600 block">취소 사유 입력 (신청자 알림톡 전송)</label>
                  <textarea
                    v-model="cancelReason"
                    rows="3"
                    placeholder="취소 사유를 입력해 주세요."
                    class="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs font-bold text-slate-800 outline-none resize-none"
                  ></textarea>
                </div>
              </div>
            </template>
          </div>

          <!-- Footer Buttons -->
          <div class="p-4 border-t border-slate-100 bg-white flex gap-2 shrink-0">
            <template v-if="!isEditing && !showCancelConfirm">
              <template v-if="selectedRes.status === 'cancel_requested'">
                <button
                  @click="rejectFromModal"
                  :disabled="submitting"
                  class="flex-1 py-3.5 rounded-2xl bg-slate-100 text-slate-700 text-xs font-black shadow-xs active:scale-95"
                >
                  취소 반려
                </button>
                <button
                  @click="approveFromModal"
                  :disabled="submitting"
                  class="flex-1 py-3.5 rounded-2xl bg-rose-600 text-white text-xs font-black shadow-sm active:scale-95"
                >
                  취소 승인
                </button>
              </template>
              <template v-else>
                <button
                  v-if="selectedRes.status === 'pending'"
                  @click="approveFromModal"
                  :disabled="submitting"
                  class="flex-1 py-3.5 rounded-2xl bg-emerald-600 text-white text-xs font-black shadow-sm active:scale-95"
                >
                  승인하기
                </button>
                <button
                  v-if="selectedRes.status !== 'cancelled' && selectedRes.status !== 'rejected'"
                  @click="startEdit"
                  class="flex-1 py-3.5 rounded-2xl bg-indigo-600 text-white text-xs font-black shadow-sm active:scale-95"
                >
                  예약 변경
                </button>
                <button
                  v-if="selectedRes.status !== 'cancelled' && selectedRes.status !== 'rejected'"
                  @click="showCancelConfirm = true"
                  class="flex-1 py-3.5 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 text-xs font-black active:scale-95"
                >
                  예약 취소
                </button>
              </template>
            </template>

            <template v-else-if="isEditing">
              <button
                @click="isEditing = false"
                class="flex-1 py-3.5 rounded-2xl bg-slate-100 text-slate-500 text-xs font-black"
              >
                뒤로
              </button>
              <button
                @click="submitModify"
                :disabled="submitting || !!editTimeConflictError"
                class="flex-[2] py-3.5 rounded-2xl bg-indigo-600 text-white text-xs font-black shadow-lg shadow-indigo-100 disabled:opacity-50"
              >
                {{ submitting ? '저장 중...' : '변경 확정 및 알림톡 발송' }}
              </button>
            </template>

            <template v-else-if="showCancelConfirm">
              <button
                @click="showCancelConfirm = false"
                class="flex-1 py-3.5 rounded-2xl bg-slate-100 text-slate-500 text-xs font-black"
              >
                뒤로
              </button>
              <button
                @click="submitCancel"
                :disabled="submitting"
                class="flex-[2] py-3.5 rounded-2xl bg-rose-600 text-white text-xs font-black shadow-lg shadow-rose-100 disabled:opacity-50"
              >
                {{ submitting ? '취소 중...' : '취소 확정 및 알림톡 발송' }}
              </button>
            </template>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ==========================================
         FULL-SCREEN LAYER: 예약 일정 검색 팝업 (showSearchModal)
    =========================================== -->
    <Teleport to="body">
      <div
        v-if="showSearchModal"
        class="fixed inset-0 z-[2150] bg-slate-50 flex flex-col animate-in slide-in-from-bottom duration-300"
      >
        <!-- Top Search Header -->
        <div class="bg-white border-b border-slate-200/80 px-3 py-3 flex items-center gap-2 shrink-0">
          <button
            @click="closeSearchModal"
            type="button"
            class="w-9 h-9 rounded-full flex items-center justify-center text-slate-800 hover:bg-slate-100 active:scale-95 transition-all shrink-0"
            title="닫기"
          >
            <ChevronLeftIcon class="w-6 h-6 stroke-[2]" />
          </button>

          <input
            ref="searchInputRef"
            v-model="searchKeyword"
            type="text"
            placeholder="일정, 공간, 신청자 검색"
            class="flex-1 min-w-0 bg-transparent text-base font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />

          <button
            v-if="searchKeyword"
            @click="clearSearchKeyword"
            type="button"
            class="w-6 h-6 rounded-full bg-slate-300/90 text-white flex items-center justify-center active:scale-90 transition-all shrink-0 mr-1"
            title="검색어 지우기"
          >
            <XMarkIcon class="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        <!-- Search Results Body -->
        <div
          class="flex-1 overflow-y-auto"
          :class="searchKeyword.trim() ? 'bg-slate-50 px-4 py-4' : 'bg-white'"
        >
          <!-- Empty / No Keyword State (Image 1) -->
          <div v-if="!searchKeyword.trim()" class="h-full"></div>

          <!-- No Matching Results -->
          <div
            v-else-if="groupedSearchResults.length === 0"
            class="py-20 text-center text-sm font-medium text-slate-400"
          >
            검색 결과가 없습니다.
          </div>

          <!-- Grouped Search Results List (Image 2) -->
          <div v-else class="space-y-5 pb-10">
            <div
              v-for="group in groupedSearchResults"
              :key="group.dateStr"
              class="space-y-2"
            >
              <!-- Date Header Row + Centered Year Pill -->
              <div class="relative flex items-center min-h-[24px] px-0.5">
                <span class="text-[13px] font-semibold text-slate-500">
                  {{ group.dateLabel }}
                </span>
                <span
                  v-if="group.yearBadge"
                  class="absolute left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-slate-200/75 text-slate-500 text-[11px] font-bold"
                >
                  {{ group.yearBadge }}
                </span>
              </div>

              <!-- Reservation Cards for this Date -->
              <div class="space-y-2.5">
                <div
                  v-for="item in group.items"
                  :key="item.id"
                  @click="handleSearchResultClick(item)"
                  class="bg-white rounded-2xl px-4 py-3.5 shadow-xs border border-slate-100 flex items-center justify-between gap-3 active:scale-[0.99] transition-all cursor-pointer"
                >
                  <div class="flex items-center gap-3.5 min-w-0 flex-1">
                    <!-- Left Vertical Accent Bar -->
                    <div
                      class="w-1 h-10 rounded-full shrink-0"
                      :class="item.status === 'pending' ? 'bg-amber-400' : 'bg-yellow-400'"
                    ></div>

                    <!-- Title & Time/Room Subtext -->
                    <div class="min-w-0 flex-1">
                      <p class="text-[15px] font-bold text-slate-900 truncate">
                        <template
                          v-for="(seg, sIdx) in splitHighlight(item.title || item.reason || '예약 일정', searchKeyword)"
                          :key="sIdx"
                        >
                          <mark
                            v-if="seg.match"
                            class="bg-yellow-200 text-slate-900 rounded-xs px-0.5 font-extrabold"
                          >{{ seg.text }}</mark>
                          <span v-else>{{ seg.text }}</span>
                        </template>
                      </p>
                      <p class="text-xs text-slate-500 truncate mt-0.5">
                        <template
                          v-for="(seg, sIdx) in splitHighlight(formatSearchSubtext(item), searchKeyword)"
                          :key="sIdx"
                        >
                          <mark
                            v-if="seg.match"
                            class="bg-yellow-200 text-slate-900 rounded-xs px-0.5 font-bold"
                          >{{ seg.text }}</mark>
                          <span v-else>{{ seg.text }}</span>
                        </template>
                      </p>
                    </div>
                  </div>

                  <!-- Right Calendar Check Icon Badge -->
                  <div class="shrink-0">
                    <div class="w-9 h-9 rounded-lg bg-slate-100 overflow-hidden flex flex-col items-center justify-between border border-slate-200/70">
                      <div
                        class="w-full h-2.5 flex items-center justify-around px-1.5"
                        :class="item.status === 'pending' ? 'bg-amber-500' : 'bg-emerald-500'"
                      >
                        <span class="w-0.5 h-1 rounded-full bg-white/90"></span>
                        <span class="w-0.5 h-1 rounded-full bg-white/90"></span>
                      </div>
                      <div class="flex-1 flex items-center justify-center">
                        <svg
                          class="w-4 h-4"
                          :class="item.status === 'pending' ? 'text-amber-500' : 'text-emerald-500'"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          stroke-width="3"
                        >
                          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import axios from 'axios'
import ReservationTimeSelect from './ReservationTimeSelect.vue'
import ReservationRoomCard from './ReservationRoomCard.vue'
import { addOneHour } from '@/utils/reservationTime'
import { useAuthStore } from '@/store/auth'
import { useModalStore } from '@/stores/useModalStore'
import { getHoliday } from '@/utils/holidays'
import { CalendarDaysIcon, CalendarIcon, ChevronLeftIcon, ChevronRightIcon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/vue/24/outline'

const sortFloors = (floorList) => {
  const order = ['3', '2', '1', 'B1', 'B2', 'B3']
  return [...floorList].sort((a, b) => {
    const idxA = order.indexOf(String(a))
    const idxB = order.indexOf(String(b))
    if (idxA !== -1 && idxB !== -1) return idxA - idxB
    if (idxA !== -1) return -1
    if (idxB !== -1) return 1
    return String(b).localeCompare(String(a))
  })
}

const emit = defineEmits(['updated'])
const auth = useAuthStore()
const modal = useModalStore()

const loading = ref(false)
const rooms = ref([])
const reservations = ref([])
const includeBlocked = ref(false)

const toDateStr = (d) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const todayStr = computed(() => toDateStr(new Date()))
const currentMonthDate = ref(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
const activeDayStr = ref(toDateStr(new Date()))
const isCalendarCollapsed = ref(false)
const dateInputRef = ref(null)

const isPastDate = (dateStr) => {
  if (!dateStr) return false
  return dateStr < todayStr.value
}

const roomLabel = (r) => r?.room_name || r?.name || ''

const formatFloorLabel = (f) => {
  const s = String(f || '')
  return s.includes('B') || s.includes('F') ? s : `${s}F`
}

const fmtDate = (d) => (d ? String(d).slice(0, 10) : '')
const fmtTime = (t) => (t ? String(t).slice(0, 5) : '')
const formatDateTime = (dt) => {
  if (!dt) return ''
  const d = new Date(dt)
  return d.toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const shortHolidayName = (name) => {
  if (!name) return ''
  if (name.startsWith('대체공휴일')) return '대체공휴'
  return name
}

const statusLabel = (s) => ({
  pending: '승인대기',
  cancel_requested: '취소요청',
  approved: '승인완료',
  rejected: '거부됨',
  cancelled: '취소됨'
}[s] || s)

const statusBadgeClass = (s) => ({
  pending: 'bg-amber-100 text-amber-700',
  cancel_requested: 'bg-rose-100 text-rose-700 font-black',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-rose-100 text-rose-700',
  cancelled: 'bg-slate-100 text-slate-500'
}[s] || 'bg-slate-100 text-slate-600')

const getExpandedBarClass = (item) => {
  if (item.is_blocked) return 'bg-teal-600 text-white font-bold'
  if (item.status === 'cancel_requested') return 'bg-rose-100 text-rose-800'
  if (item.status === 'pending') return 'bg-amber-100 text-amber-800'
  return 'bg-indigo-600 text-white'
}

const getItemBarColor = (item) => {
  if (item.is_blocked) return 'bg-teal-600'
  if (item.status === 'cancel_requested') return 'bg-rose-500'
  if (item.status === 'pending') return 'bg-amber-400'
  return 'bg-indigo-600'
}

// 축소된 캘린더에서 날짜 아래 표시할 작은 점(dot) 색상 배열 (최대 3개)
const getCellDotColors = (cell) => {
  if (!cell.items || cell.items.length === 0) return []
  const dots = []
  for (const item of cell.items.slice(0, 3)) {
    if (item.is_blocked) dots.push('bg-teal-500')
    else if (item.status === 'pending') dots.push('bg-amber-400')
    else dots.push('bg-indigo-600')
  }
  return dots
}

// 층별 공간 그룹핑
const roomsByFloor = computed(() => {
  const map = {}
  for (const r of rooms.value) {
    if (!map[r.floor]) map[r.floor] = []
    map[r.floor].push(r)
  }
  return sortFloors(Object.keys(map)).map((fl) => ({
    floor: fl,
    rooms: map[fl]
  }))
})

// 특정 공간과 날짜에 해당하는 고정 일정(blocked_times) 조회
const getBlockedForRoomAndDate = (room, dateStr) => {
  if (!room || !room.blocked_times || !dateStr) return []
  const d = new Date(dateStr + 'T00:00:00')
  const dow = d.getDay()
  const dom = d.getDate()
  const nth = Math.ceil(dom / 7)

  return room.blocked_times.filter((bt) => {
    if (bt.recurring_type === 'daily') return true
    if (bt.recurring_type === 'monthly_date') return Number(bt.day_of_month) === dom
    if (bt.recurring_type === 'monthly_nth') return Number(bt.nth_week) === nth && Number(bt.day_of_week) === dow
    return Number(bt.day_of_week) === dow
  })
}

// 현재 보고 있는 월의 고정 일정 인스턴스 생성
const expandedBlockedItems = computed(() => {
  if (!includeBlocked.value || !rooms.value.length) return []
  const items = []
  const baseYear = currentMonthDate.value.getFullYear()
  const baseMonth = currentMonthDate.value.getMonth()
  const rangeStart = new Date(baseYear, baseMonth, 1)
  const rangeEnd = new Date(baseYear, baseMonth + 1, 0)

  const cur = new Date(rangeStart)
  while (cur <= rangeEnd) {
    const dStr = toDateStr(cur)
    for (const rm of rooms.value) {
      const blockedList = getBlockedForRoomAndDate(rm, dStr)
      for (const bt of blockedList) {
        items.push({
          id: `blocked-${rm.id}-${bt.id}-${dStr}`,
          room_id: rm.id,
          room_name: roomLabel(rm),
          floor: rm.floor,
          reservation_date: dStr,
          start_time: bt.start_time,
          end_time: bt.end_time,
          title: bt.reason || '고정 일정',
          requester_name: '관리자',
          status: 'approved',
          is_blocked: true
        })
      }
    }
    cur.setDate(cur.getDate() + 1)
  }
  return items
})

// 캘린더에 표시할 유효 예약 (승인완료 + 승인대기 + 토글 시 고정 일정)
const activeCalendarItems = computed(() => {
  const validRes = reservations.value.filter((r) => r.status === 'approved' || r.status === 'pending')
  return [...validRes, ...expandedBlockedItems.value].sort((a, b) =>
    fmtTime(a.start_time).localeCompare(fmtTime(b.start_time))
  )
})

// 상단 헤더 타이틀 (예: 2026. 10.)
const headerMonthTitle = computed(() => {
  const y = currentMonthDate.value.getFullYear()
  const m = String(currentMonthDate.value.getMonth() + 1).padStart(2, '0')
  return `${y}. ${m}.`
})

// 선택된 일자 하단 패널 타이틀 (예: 10. 20. 화)
const selectedDayHeaderText = computed(() => {
  if (!activeDayStr.value) return ''
  const [y, m, d] = activeDayStr.value.split('-').map(Number)
  const dateObj = new Date(y, m - 1, d)
  const dayNames = ['일', '월', '화', '수', '목', '금', '토']
  return `${m}. ${d}. ${dayNames[dateObj.getDay()]}`
})

// 선택된 일자의 예약/고정 일정 목록
const selectedDayItems = computed(() => {
  if (!activeDayStr.value) return []
  return activeCalendarItems.value.filter((item) => fmtDate(item.reservation_date) === activeDayStr.value)
})

// 월 이동 (31일 오버플로 방지 + 좌우 슬라이드 전환 애니메이션)
const monthSlidePhase = ref('idle') // 'idle' | 'dragging' | 'out' | 'prep-in' | 'in'
const monthSlideOpacity = ref(1)
let isMonthAnimating = false

const applyMonthChange = (delta) => {
  const y = currentMonthDate.value.getFullYear()
  const m = currentMonthDate.value.getMonth()
  const nextMonth = new Date(y, m + delta, 1)
  currentMonthDate.value = nextMonth

  const now = new Date()
  if (nextMonth.getFullYear() === now.getFullYear() && nextMonth.getMonth() === now.getMonth()) {
    activeDayStr.value = toDateStr(now)
  } else {
    activeDayStr.value = toDateStr(nextMonth)
  }
}

const navigateMonth = (delta) => {
  if (isMonthAnimating) return
  isMonthAnimating = true

  // 1단계: 현재 달력을 진행 방향(다음 달이면 왼쪽 -240px, 이전 달이면 오른쪽 +240px)으로 부드럽게 밀어냄
  monthSlidePhase.value = 'out'
  horizontalDragOffset.value = -delta * 240
  monthSlideOpacity.value = 0

  setTimeout(() => {
    // 2단계: 월 데이터 변경 후 반대편(진입 방향)으로 즉시 배치
    applyMonthChange(delta)
    monthSlidePhase.value = 'prep-in'
    horizontalDragOffset.value = delta * 220

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // 3단계: 중앙(0px)으로 스프링 슬라이드 인
        monthSlidePhase.value = 'in'
        horizontalDragOffset.value = 0
        monthSlideOpacity.value = 1

        setTimeout(() => {
          monthSlidePhase.value = 'idle'
          isMonthAnimating = false
        }, 320)
      })
    })
  }, 150)
}

const goToday = () => {
  const now = new Date()
  currentMonthDate.value = new Date(now.getFullYear(), now.getMonth(), 1)
  activeDayStr.value = toDateStr(now)
  isCalendarCollapsed.value = true
}

const openDatePicker = () => {
  if (dateInputRef.value?.showPicker) {
    dateInputRef.value.showPicker()
  } else {
    dateInputRef.value?.click()
  }
}

const onDatePicked = (e) => {
  if (!e.target.value) return
  const [y, m, day] = e.target.value.split('-').map(Number)
  currentMonthDate.value = new Date(y, m - 1, 1)
  activeDayStr.value = toDateStr(new Date(y, m - 1, day))
  isCalendarCollapsed.value = true
}

// 월간 캘린더 셀 (해당 월이 포함된 주까지만 생성)
const monthCells = computed(() => {
  const y = currentMonthDate.value.getFullYear()
  const m = currentMonthDate.value.getMonth()
  const firstDay = new Date(y, m, 1)
  const startOffset = firstDay.getDay()
  const startDate = new Date(y, m, 1 - startOffset)
  const lastDay = new Date(y, m + 1, 0)
  const totalDaysNeeded = lastDay.getDate() + startOffset
  const rowsNeeded = Math.ceil(totalDaysNeeded / 7)
  const totalCells = rowsNeeded * 7

  const itemMap = {}
  for (const item of activeCalendarItems.value) {
    const key = fmtDate(item.reservation_date)
    if (!itemMap[key]) itemMap[key] = []
    itemMap[key].push(item)
  }

  const cells = []
  for (let i = 0; i < totalCells; i++) {
    const cur = new Date(startDate)
    cur.setDate(startDate.getDate() + i)
    const dStr = toDateStr(cur)
    cells.push({
      dateStr: dStr,
      day: cur.getDate(),
      dayOfWeek: cur.getDay(),
      isCurrentMonth: cur.getMonth() === m,
      isToday: dStr === todayStr.value,
      holiday: getHoliday(dStr),
      items: itemMap[dStr] || []
    })
  }
  return cells
})

// 터치 / 마우스 드래그 진행률 기반 인터랙티브 높이 애니메이션 & 스와이프 처리
const EXPANDED_CELL_HEIGHT = 96
const COLLAPSED_CELL_HEIGHT = 48
const VERTICAL_DRAG_RANGE = 160

const swipeStartX = ref(0)
const swipeStartY = ref(0)
const isSwiping = ref(false)
const gestureAxis = ref(null) // 'x' | 'y' | null
const dragCollapseProgress = ref(null) // 드래그 중 실시간 0(펼침) ~ 1(축소) 값
const horizontalDragOffset = ref(0) // 좌우 드래그 중 수평 이동 오프셋(px)
let suppressNextTap = false

// 현재 적용되는 축소 진행률 (0: 완전 펼침, 1: 완전 축소)
const effectiveCollapseProgress = computed(() => {
  if (dragCollapseProgress.value !== null) {
    return dragCollapseProgress.value
  }
  return isCalendarCollapsed.value ? 1 : 0
})

const calendarGridStyle = computed(() => {
  const tx = horizontalDragOffset.value
  const op = monthSlideOpacity.value
  let transition = 'transform 320ms cubic-bezier(0.22, 1, 0.36, 1), opacity 260ms ease'
  if (monthSlidePhase.value === 'dragging' || monthSlidePhase.value === 'prep-in') {
    transition = 'none'
  } else if (monthSlidePhase.value === 'out') {
    transition = 'transform 150ms cubic-bezier(0.4, 0, 1, 1), opacity 150ms ease'
  }
  return {
    transform: `translate3d(${tx.toFixed(1)}px, 0, 0)`,
    opacity: op,
    transition
  }
})

const calendarCellStyle = computed(() => {
  const p = effectiveCollapseProgress.value
  const h = EXPANDED_CELL_HEIGHT - (EXPANDED_CELL_HEIGHT - COLLAPSED_CELL_HEIGHT) * p
  return {
    height: `${h.toFixed(1)}px`,
    transition: dragCollapseProgress.value !== null
      ? 'none'
      : 'height 380ms cubic-bezier(0.22, 1, 0.36, 1)'
  }
})

const compactDotsStyle = computed(() => {
  const p = effectiveCollapseProgress.value
  const opacity = Math.max(0, Math.min(1, (p - 0.25) / 0.75))
  const scale = 0.5 + 0.5 * p
  return {
    opacity,
    transform: `scale(${scale.toFixed(2)})`,
    transition: dragCollapseProgress.value !== null
      ? 'none'
      : 'opacity 280ms ease, transform 340ms cubic-bezier(0.22, 1, 0.36, 1)'
  }
})

const expandedBarsStyle = computed(() => {
  const p = effectiveCollapseProgress.value
  const opacity = Math.max(0, Math.min(1, 1 - p * 1.6))
  const translateY = -p * 6
  const scale = 1 - p * 0.06
  return {
    opacity,
    transform: `translate3d(0, ${translateY.toFixed(1)}px, 0) scale(${scale.toFixed(2)})`,
    transition: dragCollapseProgress.value !== null
      ? 'none'
      : 'opacity 260ms ease, transform 340ms cubic-bezier(0.22, 1, 0.36, 1)'
  }
})

const schedulePanelStyle = computed(() => {
  const p = effectiveCollapseProgress.value
  const maxH = Math.round(p * 520)
  const opacity = Math.max(0, Math.min(1, p * 1.25))
  const translateY = Math.round((1 - p) * 16)
  return {
    maxHeight: `${maxH}px`,
    opacity,
    transform: `translate3d(0, ${translateY}px, 0)`,
    transition: dragCollapseProgress.value !== null
      ? 'none'
      : 'max-height 380ms cubic-bezier(0.22, 1, 0.36, 1), opacity 300ms ease, transform 380ms cubic-bezier(0.22, 1, 0.36, 1)'
  }
})

const toggleCalendarCollapse = (forceState) => {
  dragCollapseProgress.value = null
  isCalendarCollapsed.value = typeof forceState === 'boolean' ? forceState : !isCalendarCollapsed.value
}

const startGesture = (clientX, clientY) => {
  swipeStartX.value = clientX
  swipeStartY.value = clientY
  isSwiping.value = true
  gestureAxis.value = null
}

const moveGesture = (clientX, clientY, event) => {
  if (!isSwiping.value || isMonthAnimating) return
  const dx = clientX - swipeStartX.value
  const dy = clientY - swipeStartY.value
  const absX = Math.abs(dx)
  const absY = Math.abs(dy)

  if (!gestureAxis.value) {
    if (Math.max(absX, absY) < 6) return
    gestureAxis.value = absY >= absX ? 'y' : 'x'
  }

  if (event?.cancelable) event.preventDefault()

  if (gestureAxis.value === 'y') {
    const base = isCalendarCollapsed.value ? 1 : 0
    // 위로 드래그(dy < 0) 시 축소 진행률(0 -> 1) 증가, 아래로 드래그(dy > 0) 시(1 -> 0) 감소
    const raw = base + (-dy / VERTICAL_DRAG_RANGE)
    dragCollapseProgress.value = Math.max(0, Math.min(1, raw))
  } else if (gestureAxis.value === 'x') {
    monthSlidePhase.value = 'dragging'
    horizontalDragOffset.value = dx * 0.85
    monthSlideOpacity.value = Math.max(0.35, 1 - absX / 320)
  }
}

const endGesture = (endX, endY) => {
  if (!isSwiping.value) return
  isSwiping.value = false
  const axis = gestureAxis.value
  gestureAxis.value = null

  const dx = endX - swipeStartX.value
  const dy = endY - swipeStartY.value
  const absX = Math.abs(dx)
  const absY = Math.abs(dy)

  if (Math.max(absX, absY) >= 12) {
    suppressNextTap = true
    setTimeout(() => {
      suppressNextTap = false
    }, 250)
  }

  if (axis === 'y') {
    const currentProgress = dragCollapseProgress.value ?? (isCalendarCollapsed.value ? 1 : 0)
    dragCollapseProgress.value = null

    // 빠른 플릭(30px 이상) 또는 절반 이상 드래그 여부에 따라 자연스럽게 스냅
    if (dy < -28) {
      isCalendarCollapsed.value = true
    } else if (dy > 28) {
      isCalendarCollapsed.value = false
    } else {
      isCalendarCollapsed.value = currentProgress >= 0.5
    }
  } else if (axis === 'x') {
    if (dx < -35) {
      navigateMonth(1)
    } else if (dx > 35) {
      navigateMonth(-1)
    } else {
      monthSlidePhase.value = 'in'
      horizontalDragOffset.value = 0
      monthSlideOpacity.value = 1
    }
  } else {
    dragCollapseProgress.value = null
    monthSlidePhase.value = 'in'
    horizontalDragOffset.value = 0
    monthSlideOpacity.value = 1
  }
}

const onCalendarTouchStart = (e) => {
  const t = e.touches?.[0]
  if (!t) return
  startGesture(t.clientX, t.clientY)
}

const onCalendarTouchMove = (e) => {
  const t = e.touches?.[0]
  if (!t) return
  moveGesture(t.clientX, t.clientY, e)
}

const onCalendarTouchEnd = (e) => {
  const t = e.changedTouches?.[0]
  if (!t) {
    dragCollapseProgress.value = null
    horizontalDragOffset.value = 0
    isSwiping.value = false
    return
  }
  endGesture(t.clientX, t.clientY)
}

const onCalendarMouseDown = (e) => {
  if (e.button !== 0) return
  startGesture(e.clientX, e.clientY)
}

const onCalendarMouseMove = (e) => {
  if (!isSwiping.value) return
  moveGesture(e.clientX, e.clientY, e)
}

const onCalendarMouseUp = (e) => {
  endGesture(e.clientX, e.clientY)
}

const onCalendarMouseLeave = (e) => {
  if (!isSwiping.value) return
  endGesture(e.clientX, e.clientY)
}

// 날짜 셀 터치 시: 해당 날짜를 선택하고 캘린더 높이를 부드럽게 줄여 하단에 예약 목록 표시
const handleDayTap = (cell) => {
  if (suppressNextTap) return
  if (!cell.isCurrentMonth) return
  dragCollapseProgress.value = null
  activeDayStr.value = cell.dateStr
  isCalendarCollapsed.value = true
}

// 하단 목록 또는 [+] 버튼에서 신규 예약 추가 오픈
const openBookingForActiveDay = () => {
  const targetDate = activeDayStr.value || todayStr.value
  if (isPastDate(targetDate)) {
    modal.showAlert('과거 일자에는 예약을 신청할 수 없습니다.')
    return
  }
  openBooking(null, targetDate, '09:00', '10:00', targetDate)
}

const handleCellItemTap = (item) => {
  if (item.is_blocked) {
    modal.showAlert(`고정 일정 안내\n\n· 공간: ${item.room_name}\n· 시간: ${fmtTime(item.start_time)} ~ ${fmtTime(item.end_time)}\n· 내용: ${item.title}`)
    return
  }
  openDetail(item)
}

// ==========================================
// 공간 예약 신청 모달 (showBookingModal)
// ==========================================
const showBookingModal = ref(false)
const submittingBooking = ref(false)
const selectedRoom = ref(null)
const bookingDate = ref('')
const bookingEndDate = ref('')
const showRecurringEndCalendar = ref(false)
const recurringEndCalDate = ref(new Date())

const bookingForm = ref({
  title: '',
  requester_name: '',
  requester_phone: '',
  start_time: '09:00',
  end_time: '10:00',
  reason: '',
  is_recurring: false,
  recurring_type: 'weekly',
  recurring_end_date: '',
  recurring_days: [],
  recurring_month_option: 'date',
  recurring_month_date: new Date().getDate(),
  recurring_month_nth_week: Math.ceil(new Date().getDate() / 7),
  recurring_month_nth_day: new Date().getDay()
})

const toggleRecurringDay = (dayIdx) => {
  const index = bookingForm.value.recurring_days.indexOf(dayIdx)
  if (index > -1) {
    bookingForm.value.recurring_days.splice(index, 1)
  } else {
    bookingForm.value.recurring_days.push(dayIdx)
  }
}

const openRecurringEndCalendar = () => {
  const baseStr = bookingForm.value.recurring_end_date || bookingDate.value || todayStr.value
  const [y, m] = baseStr.split('-').map(Number)
  recurringEndCalDate.value = new Date(y, m - 1, 1)
  showRecurringEndCalendar.value = true
}

const moveRecurringMonth = (offset) => {
  const d = new Date(recurringEndCalDate.value)
  d.setDate(1)
  d.setMonth(d.getMonth() + offset)
  recurringEndCalDate.value = d
}

const selectRecurringEndDate = (date) => {
  const dStr = toDateStr(date)
  if (bookingDate.value && dStr < bookingDate.value) return
  bookingForm.value.recurring_end_date = dStr
  showRecurringEndCalendar.value = false
}

const recurringEndCalendarDays = computed(() => {
  const year = recurringEndCalDate.value.getFullYear()
  const month = recurringEndCalDate.value.getMonth()
  const firstDay = new Date(year, month, 1)
  const startDate = new Date(firstDay)
  startDate.setDate(1 - firstDay.getDay())

  const days = []
  const tempDate = new Date(startDate)
  const lastDay = new Date(year, month + 1, 0)
  const totalDaysNeeded = lastDay.getDate() + firstDay.getDay()
  const rowsNeeded = Math.ceil(totalDaysNeeded / 7)
  const totalCells = rowsNeeded * 7

  for (let i = 0; i < totalCells; i++) {
    days.push({
      date: new Date(tempDate),
      current: tempDate.getMonth() === month,
      day: tempDate.getDate()
    })
    tempDate.setDate(tempDate.getDate() + 1)
  }
  return days
})

const bookingDatesInRange = computed(() => {
  if (!bookingDate.value) return []
  const start = bookingDate.value
  const end = bookingEndDate.value && bookingEndDate.value >= start ? bookingEndDate.value : start
  const dates = []
  const [sy, sm, sd] = start.split('-').map(Number)
  const [ey, em, ed] = end.split('-').map(Number)
  const cur = new Date(sy, sm - 1, sd)
  const last = new Date(ey, em - 1, ed)
  while (cur <= last && dates.length < 90) {
    dates.push(toDateStr(cur))
    cur.setDate(cur.getDate() + 1)
  }
  return dates
})

// 예약 모달 내 선택된 공간과 기간의 기존 예약 + 고정 일정 조회
const currentRoomSchedule = computed(() => {
  if (!selectedRoom.value || bookingDatesInRange.value.length === 0) return []
  const items = []
  for (const dStr of bookingDatesInRange.value) {
    const blocked = getBlockedForRoomAndDate(selectedRoom.value, dStr)
    for (const bt of blocked) {
      items.push({
        id: `bt-${dStr}-${bt.id}`,
        reservation_date: dStr,
        start_time: bt.start_time,
        end_time: bt.end_time,
        title: bt.reason || '고정 일정',
        requester_name: '관리자',
        is_blocked: true
      })
    }
    const roomRes = reservations.value.filter(
      (r) =>
        Number(r.room_id) === Number(selectedRoom.value.id) &&
        fmtDate(r.reservation_date) === dStr &&
        r.status !== 'cancelled' &&
        r.status !== 'rejected'
    )
    for (const r of roomRes) {
      items.push(r)
    }
  }
  return items.sort((a, b) => {
    const dCmp = fmtDate(a.reservation_date).localeCompare(fmtDate(b.reservation_date))
    if (dCmp !== 0) return dCmp
    return fmtTime(a.start_time).localeCompare(fmtTime(b.start_time))
  })
})

const timeConflictError = computed(() => {
  const start = bookingForm.value.start_time
  const end = bookingForm.value.end_time
  if (!start || !end) return ''
  if (start >= end) return '종료 시간은 시작 시간보다 이후여야 합니다.'
  for (const item of currentRoomSchedule.value) {
    if (item.is_blocked) continue // 관리자는 고정일정과 겹쳐도 예약 가능
    const s = fmtTime(item.start_time)
    const e = fmtTime(item.end_time)
    if (start < e && end > s) {
      const datePrefix = bookingDatesInRange.value.length > 1 ? `[${fmtDate(item.reservation_date).slice(5)}] ` : ''
      const label = `기존 예약(${item.title || item.requester_name})`
      return `${datePrefix}${s}~${e} 시간대에 이미 ${label}이(가) 존재합니다.`
    }
  }
  return ''
})

const openBooking = (room, dateStr, startTime = '09:00', endTime = '10:00', endDateStr = null) => {
  const targetDate = dateStr || activeDayStr.value || todayStr.value
  if (isPastDate(targetDate)) return
  const targetEndDate = endDateStr && endDateStr >= targetDate ? endDateStr : targetDate

  selectedRoom.value = room || null
  bookingDate.value = targetDate
  bookingEndDate.value = targetEndDate

  let finalStart = startTime
  let finalEnd = endTime
  if (selectedRoom.value) {
    const existing = reservations.value.filter(
      (r) =>
        Number(r.room_id) === Number(selectedRoom.value.id) &&
        fmtDate(r.reservation_date) === targetDate &&
        r.status !== 'cancelled' &&
        r.status !== 'rejected'
    )
    const hasOverlap = (s, e) => existing.some((item) => s < fmtTime(item.end_time) && e > fmtTime(item.start_time))
    if (hasOverlap(finalStart, finalEnd)) {
      for (let h = 9; h <= 21; h++) {
        const candS = `${String(h).padStart(2, '0')}:00`
        const candE = `${String(h + 1).padStart(2, '0')}:00`
        if (!hasOverlap(candS, candE)) {
          finalStart = candS
          finalEnd = candE
          break
        }
      }
    }
  }

  const dObj = new Date(targetDate + 'T00:00:00')
  const defaultEndDate = new Date(dObj)
  defaultEndDate.setDate(1)
  defaultEndDate.setMonth(defaultEndDate.getMonth() + 1)
  const lastDayOfNextMonth = new Date(defaultEndDate.getFullYear(), defaultEndDate.getMonth() + 1, 0).getDate()
  defaultEndDate.setDate(Math.min(dObj.getDate(), lastDayOfNextMonth))

  bookingForm.value = {
    title: '',
    requester_name: auth.user?.userName || auth.user?.name || '',
    requester_phone: auth.user?.phone || '',
    start_time: finalStart,
    end_time: finalEnd,
    reason: '',
    is_recurring: false,
    recurring_type: 'weekly',
    recurring_end_date: toDateStr(defaultEndDate),
    recurring_days: [],
    recurring_month_option: 'date',
    recurring_month_date: dObj.getDate(),
    recurring_month_nth_week: Math.ceil(dObj.getDate() / 7),
    recurring_month_nth_day: dObj.getDay()
  }
  showBookingModal.value = true
}

const onBookingRoomChange = (e) => {
  const roomId = Number(e.target.value)
  const found = rooms.value.find((r) => Number(r.id) === roomId)
  if (found) selectedRoom.value = found
}

const onBookingStartDateChange = () => {
  if (!bookingEndDate.value || bookingEndDate.value < bookingDate.value) {
    bookingEndDate.value = bookingDate.value
  }
  if (bookingDate.value) {
    const dObj = new Date(bookingDate.value + 'T00:00:00')
    bookingForm.value.recurring_month_date = dObj.getDate()
    bookingForm.value.recurring_month_nth_week = Math.ceil(dObj.getDate() / 7)
    bookingForm.value.recurring_month_nth_day = dObj.getDay()
  }
}

const handlePhoneInput = (e) => {
  let val = e.target.value.replace(/[^0-9]/g, '')
  if (val.length > 3 && val.length <= 7) {
    val = `${val.slice(0, 3)}-${val.slice(3)}`
  } else if (val.length > 7) {
    val = `${val.slice(0, 3)}-${val.slice(3, 7)}-${val.slice(7, 11)}`
  }
  bookingForm.value.requester_phone = val
}

const validateAndSubmitBooking = async () => {
  if (submittingBooking.value) return
  if (!selectedRoom.value) {
    await modal.showAlert('예약할 공간을 선택해 주세요.')
    return
  }
  if (!bookingDate.value) {
    await modal.showAlert('예약 시작 일자를 선택해 주세요.')
    return
  }
  if (bookingEndDate.value && bookingEndDate.value < bookingDate.value) {
    await modal.showAlert('예약 종료 일자는 시작 일자보다 이전일 수 없습니다.')
    return
  }
  if (timeConflictError.value) {
    await modal.showAlert(timeConflictError.value)
    return
  }
  if (!bookingForm.value.title.trim()) {
    await modal.showAlert('신청명(모임/행사명)을 입력해 주세요.')
    return
  }
  if (!bookingForm.value.reason.trim()) {
    await modal.showAlert('사용 목적 및 사유를 입력해 주세요.')
    return
  }
  const isMultiDay = bookingDatesInRange.value.length > 1
  if (!isMultiDay && bookingForm.value.is_recurring) {
    if (!bookingForm.value.recurring_end_date) {
      await modal.showAlert('반복 종료일을 선택해 주세요.')
      return
    }
    if (bookingForm.value.recurring_type === 'weekly' && bookingForm.value.recurring_days.length === 0) {
      await modal.showAlert('반복할 요일을 하나 이상 선택해 주세요.')
      return
    }
  }
  await submitBooking()
}

const submitBooking = async () => {
  submittingBooking.value = true
  try {
    const isMultiDay = bookingDatesInRange.value.length > 1
    await axios.post('/api/reservations', {
      room_id: selectedRoom.value.id,
      user_id: auth.user?.id || null,
      title: bookingForm.value.title,
      requester_name: bookingForm.value.requester_name || auth.user?.userName || auth.user?.name || '관리자',
      requester_phone: bookingForm.value.requester_phone || auth.user?.phone || '',
      reservation_date: bookingDate.value,
      start_time: bookingForm.value.start_time,
      end_time: bookingForm.value.end_time,
      reason: bookingForm.value.reason,
      is_recurring: isMultiDay ? true : bookingForm.value.is_recurring,
      recurring_type: isMultiDay ? 'daily' : (bookingForm.value.is_recurring ? bookingForm.value.recurring_type : null),
      recurring_end_date: isMultiDay
        ? bookingEndDate.value
        : (bookingForm.value.is_recurring ? bookingForm.value.recurring_end_date : null),
      recurring_days: bookingForm.value.recurring_days,
      recurring_month_option: bookingForm.value.recurring_month_option,
      recurring_month_date: bookingForm.value.recurring_month_date,
      recurring_month_nth_week: bookingForm.value.recurring_month_nth_week,
      recurring_month_nth_day: bookingForm.value.recurring_month_nth_day
    })
    showBookingModal.value = false
    activeDayStr.value = bookingDate.value
    isCalendarCollapsed.value = true
    await fetchAll()
    emit('updated')
    await modal.showAlert(
      isMultiDay
        ? `${bookingDate.value} ~ ${bookingEndDate.value} (${bookingDatesInRange.length}일간) 예약 신청이 완료되었습니다.`
        : '예약 신청이 완료되었습니다.'
    )
  } catch (err) {
    await modal.showAlert(err.response?.data?.message || err.response?.data?.error || '예약 신청에 실패했습니다.')
  } finally {
    submittingBooking.value = false
  }
}

// ==========================================
// 예약 상세 / 변경 / 취소 모달 (showModal)
// ==========================================
const showModal = ref(false)
const selectedRes = ref(null)
const logs = ref([])
const isEditing = ref(false)
const showCancelConfirm = ref(false)
const submitting = ref(false)
const modifyScope = ref('single')
const cancelScope = ref('single')
const cancelReason = ref('')

const validRecurringSeriesItems = computed(() => {
  const cur = selectedRes.value
  if (!cur || !cur.is_recurring) return cur ? [cur] : []
  const parentId = cur.parent_reservation_id || cur.id
  return reservations.value.filter((r) => {
    if (r.status !== 'approved' && r.status !== 'pending') return false
    const dStr = fmtDate(r.reservation_date)
    if (String(r.id) !== String(cur.id) && dStr < todayStr.value) return false
    if (r.parent_reservation_id !== null && r.parent_reservation_id !== undefined) {
      return Number(r.parent_reservation_id) === Number(parentId) || Number(r.id) === Number(parentId)
    }
    return (
      Boolean(r.is_recurring) &&
      Number(r.room_id) === Number(cur.room_id) &&
      r.title === cur.title &&
      fmtTime(r.start_time) === fmtTime(cur.start_time) &&
      fmtTime(r.end_time) === fmtTime(cur.end_time) &&
      fmtDate(r.recurring_end_date) === fmtDate(cur.recurring_end_date) &&
      (r.requester_phone || '') === (cur.requester_phone || '')
    )
  })
})

const editForm = ref({
  room_id: null,
  title: '',
  reservation_date: '',
  start_time: '09:00',
  end_time: '10:00',
  reason: '',
  admin_reason: ''
})

const editRoomSchedule = computed(() => {
  if (!editForm.value.room_id || !editForm.value.reservation_date) return []
  const rm = rooms.value.find((r) => Number(r.id) === Number(editForm.value.room_id))
  const blocked = getBlockedForRoomAndDate(rm, editForm.value.reservation_date).map((bt) => ({
    id: `bt-edit-${bt.id}`,
    start_time: bt.start_time,
    end_time: bt.end_time,
    title: bt.reason || '고정 일정',
    requester_name: '관리자',
    is_blocked: true
  }))
  const resItems = reservations.value.filter(
    (item) =>
      Number(item.room_id) === Number(editForm.value.room_id) &&
      fmtDate(item.reservation_date) === editForm.value.reservation_date &&
      item.status !== 'cancelled' &&
      item.status !== 'rejected' &&
      String(item.id) !== String(selectedRes.value?.id)
  )
  return [...blocked, ...resItems]
})

const editTimeConflictError = computed(() => {
  const s = editForm.value.start_time
  const e = editForm.value.end_time
  if (!s || !e) return ''
  if (s >= e) return '종료 시간은 시작 시간보다 이후여야 합니다.'

  if (selectedRes.value?.is_recurring && modifyScope.value === 'all') {
    const seriesIds = new Set(validRecurringSeriesItems.value.map((r) => String(r.id)))
    for (const sItem of validRecurringSeriesItems.value) {
      const targetDateStr = fmtDate(sItem.reservation_date)
      const dayConflicts = reservations.value.filter(
        (item) =>
          Number(item.room_id) === Number(editForm.value.room_id) &&
          fmtDate(item.reservation_date) === targetDateStr &&
          item.status !== 'cancelled' &&
          item.status !== 'rejected' &&
          !seriesIds.has(String(item.id))
      )
      for (const ev of dayConflicts) {
        const es = fmtTime(ev.start_time)
        const ee = fmtTime(ev.end_time)
        if (s < ee && e > es) {
          return `[${targetDateStr.slice(5)}] ${es}~${ee} 시간대에 이미 다른 예약(${ev.title || ev.requester_name})이 있습니다.`
        }
      }
    }
    return ''
  }

  for (const ev of editRoomSchedule.value) {
    if (ev.is_blocked) continue // 관리자는 고정일정과 겹쳐도 변경 가능
    const es = fmtTime(ev.start_time)
    const ee = fmtTime(ev.end_time)
    if (s < ee && e > es) {
      return `${es}~${ee} 시간대에 이미 다른 예약(${ev.title || ev.requester_name})이 있습니다.`
    }
  }
  return ''
})

const openDetail = async (resItem) => {
  selectedRes.value = resItem
  isEditing.value = false
  showCancelConfirm.value = false
  modifyScope.value = 'single'
  cancelScope.value = 'single'
  cancelReason.value = ''
  logs.value = []
  showModal.value = true

  try {
    const { data } = await axios.get(`/api/reservations/${resItem.id}/logs`)
    logs.value = data
  } catch (e) {
    logs.value = []
  }
}

const closeModal = () => {
  showModal.value = false
  selectedRes.value = null
  isEditing.value = false
  showCancelConfirm.value = false
}

const startEdit = () => {
  if (!selectedRes.value) return
  modifyScope.value = 'single'
  editForm.value = {
    room_id: selectedRes.value.room_id,
    title: selectedRes.value.title || '',
    reservation_date: fmtDate(selectedRes.value.reservation_date),
    start_time: fmtTime(selectedRes.value.start_time),
    end_time: fmtTime(selectedRes.value.end_time),
    reason: selectedRes.value.reason || '',
    admin_reason: ''
  }
  isEditing.value = true
}

const approveFromModal = async () => {
  if (!selectedRes.value) return
  if (!(await modal.showConfirm('이 예약을 승인하시겠습니까? 신청자에게 알림톡이 발송됩니다.'))) return
  submitting.value = true
  try {
    await axios.patch(`/api/reservations/${selectedRes.value.id}/approve`)
    closeModal()
    await fetchAll()
    emit('updated')
    await modal.showAlert('예약이 승인되었습니다.')
  } catch (err) {
    await modal.showAlert(err.response?.data?.message || '승인 처리에 실패했습니다.')
  } finally {
    submitting.value = false
  }
}

const submitModify = async () => {
  if (!editForm.value.title?.trim()) {
    await modal.showAlert('신청명을 입력해 주세요.')
    return
  }
  if (!editForm.value.admin_reason.trim()) {
    await modal.showAlert('변경 사유를 입력해 주세요. (신청자에게 알림톡으로 안내됩니다)')
    return
  }
  if (editTimeConflictError.value) {
    await modal.showAlert(editTimeConflictError.value)
    return
  }
  submitting.value = true
  try {
    const res = await axios.put(`/api/reservations/${selectedRes.value.id}`, {
      room_id: editForm.value.room_id,
      title: editForm.value.title,
      reservation_date: editForm.value.reservation_date,
      start_time: editForm.value.start_time,
      end_time: editForm.value.end_time,
      reason: editForm.value.reason,
      admin_reason: editForm.value.admin_reason,
      modify_scope: selectedRes.value.is_recurring ? modifyScope.value : 'single'
    })
    closeModal()
    await fetchAll()
    emit('updated')
    const updatedCount = res.data?.count || 1
    await modal.showAlert(
      updatedCount > 1
        ? `총 ${updatedCount}건의 반복 예약 정보가 변경되었으며 신청자에게 알림톡이 발송되었습니다.`
        : '예약 정보가 변경되었으며 신청자에게 알림톡이 발송되었습니다.'
    )
  } catch (err) {
    await modal.showAlert(err.response?.data?.message || '예약 변경에 실패했습니다.')
  } finally {
    submitting.value = false
  }
}

const submitCancel = async () => {
  if (!cancelReason.value.trim()) {
    await modal.showAlert('취소 사유를 입력해 주세요. (신청자에게 알림톡으로 안내됩니다)')
    return
  }
  submitting.value = true
  try {
    await axios.patch(`/api/reservations/${selectedRes.value.id}/cancel`, {
      cancel_reason: cancelReason.value,
      cancel_scope: selectedRes.value.is_recurring ? cancelScope.value : 'single'
    })
    closeModal()
    await fetchAll()
    emit('updated')
    await modal.showAlert('예약이 취소되었으며 신청자에게 알림톡이 발송되었습니다.')
  } catch (err) {
    await modal.showAlert(err.response?.data?.message || '예약 취소에 실패했습니다.')
  } finally {
    submitting.value = false
  }
}

// ==========================================================
// SEARCH LAYER POPUP LOGIC (일정 검색)
// ==========================================================
const showSearchModal = ref(false)
const searchKeyword = ref('')
const searchInputRef = ref(null)

const openSearchModal = async () => {
  searchKeyword.value = ''
  showSearchModal.value = true
  await nextTick()
  searchInputRef.value?.focus()
}

const closeSearchModal = () => {
  showSearchModal.value = false
  searchKeyword.value = ''
}

const clearSearchKeyword = async () => {
  searchKeyword.value = ''
  await nextTick()
  searchInputRef.value?.focus()
}

const formatKoreanTime = (t) => {
  const hm = fmtTime(t)
  if (!hm) return ''
  const [hStr, mStr] = hm.split(':')
  const h = Number(hStr)
  const m = Number(mStr)
  const period = h < 12 ? '오전' : '오후'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  if (m === 0) return `${period} ${hour12}시`
  return `${period} ${hour12}:${String(m).padStart(2, '0')}`
}

const formatSearchSubtext = (item) => {
  const timeRange = `${formatKoreanTime(item.start_time)} - ${formatKoreanTime(item.end_time)}`
  const loc = [item.floor ? formatFloorLabel(item.floor) : '', item.room_name || ''].filter(Boolean).join(' ')
  const who = item.requester_name || ''
  const meta = [loc, who].filter(Boolean).join(' · ')
  return meta ? `${timeRange}, ${meta}` : timeRange
}

const splitHighlight = (text, kw) => {
  const str = String(text || '')
  const q = String(kw || '').trim()
  if (!q) return [{ text: str, match: false }]
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escaped})`, 'gi')
  const parts = str.split(regex)
  return parts
    .filter((p) => p !== '')
    .map((p) => ({
      text: p,
      match: p.toLowerCase() === q.toLowerCase()
    }))
}

const groupedSearchResults = computed(() => {
  const kw = searchKeyword.value.trim().toLowerCase()
  if (!kw) return []

  const matched = reservations.value
    .filter((r) => r.status === 'approved' || r.status === 'pending')
    .filter((r) => {
      const title = String(r.title || '').toLowerCase()
      const room = String(r.room_name || '').toLowerCase()
      const floor = String(r.floor ? formatFloorLabel(r.floor) : '').toLowerCase()
      const requester = String(r.requester_name || '').toLowerCase()
      const reason = String(r.reason || '').toLowerCase()
      const dept = String(r.department_name || '').toLowerCase()
      return (
        title.includes(kw) ||
        room.includes(kw) ||
        floor.includes(kw) ||
        requester.includes(kw) ||
        reason.includes(kw) ||
        dept.includes(kw)
      )
    })
    .sort((a, b) => {
      const da = fmtDate(a.reservation_date)
      const db = fmtDate(b.reservation_date)
      if (da !== db) return da.localeCompare(db)
      return fmtTime(a.start_time).localeCompare(fmtTime(b.start_time))
    })

  const dayNames = ['일', '월', '화', '수', '목', '금', '토']
  const groups = []
  let lastYear = ''

  for (const item of matched) {
    const dStr = fmtDate(item.reservation_date)
    if (!dStr) continue
    let grp = groups[groups.length - 1]
    if (!grp || grp.dateStr !== dStr) {
      const [y, m, d] = dStr.split('-')
      const dateObj = new Date(Number(y), Number(m) - 1, Number(d))
      const dow = dayNames[dateObj.getDay()]
      const yearBadge = y !== lastYear ? y : ''
      lastYear = y
      grp = {
        dateStr: dStr,
        dateLabel: `${m}.${d}. ${dow}`,
        yearBadge,
        items: []
      }
      groups.push(grp)
    }
    grp.items.push(item)
  }

  return groups
})

const handleSearchResultClick = (item) => {
  closeSearchModal()
  const dStr = fmtDate(item.reservation_date)
  if (dStr) {
    const [y, m] = dStr.split('-').map(Number)
    currentMonthDate.value = new Date(y, m - 1, 1)
    activeDayStr.value = dStr
    isCalendarCollapsed.value = true
  }
  openDetail(item)
}

const fetchAll = async () => {
  loading.value = true
  try {
    const [roomsRes, resList] = await Promise.all([
      axios.get('/api/rooms'),
      axios.get('/api/reservations', { params: { status: 'all' } })
    ])
    rooms.value = roomsRes.data || []
    reservations.value = resList.data || []
  } catch (err) {
    console.error('Failed to load mobile admin calendar data:', err)
  } finally {
    loading.value = false
  }
}

const openReservationById = async (id) => {
  if (!reservations.value.length) {
    await fetchAll()
  }
  const target = reservations.value.find((r) => String(r.id) === String(id))
  if (target) {
    const dStr = fmtDate(target.reservation_date)
    if (dStr) {
      const [y, m] = dStr.split('-').map(Number)
      currentMonthDate.value = new Date(y, m - 1, 1)
      activeDayStr.value = dStr
      isCalendarCollapsed.value = true
    }
    openDetail(target)
  }
}

defineExpose({
  fetchAll,
  fetchData: fetchAll,
  openReservationById
})

onMounted(() => {
  fetchAll()
})
</script>
