<template>
  <div class="space-y-4 pb-24 relative select-none">
    <!-- 1. Top Month Navigator Header -->
    <div class="px-5 pt-1">
      <div class="flex items-center justify-between">
        <div class="relative flex items-center gap-1 group">
          <button
            @click="prevMonth"
            class="p-2 -ml-2 text-slate-400 hover:text-slate-800 active:scale-90 transition-transform"
            title="이전 달"
          >
            <ChevronLeftIcon class="w-5 h-5 stroke-[2.5]" />
          </button>

          <!-- Click to pick year/month via native picker -->
          <button
            @click="triggerDatePicker"
            class="flex items-center gap-1.5 px-2 py-1 rounded-xl hover:bg-slate-100 active:scale-95 transition-all"
          >
            <span class="text-xl font-black text-slate-900 tracking-tight">
              {{ monthHeaderTitle }}
            </span>
            <span class="text-xs text-slate-400 font-bold group-hover:text-slate-600">▾</span>
          </button>

          <button
            @click="nextMonth"
            class="p-2 text-slate-400 hover:text-slate-800 active:scale-90 transition-transform"
            title="다음 달"
          >
            <ChevronRightIcon class="w-5 h-5 stroke-[2.5]" />
          </button>

          <!-- Hidden Native Month Picker -->
          <input
            ref="dateInputRef"
            type="month"
            class="sr-only"
            @change="onNativeMonthPick"
          />
        </div>

        <!-- Right: Status Summary Pill (승인완료 / 대기중) -->
        <div class="flex items-center gap-1 text-[11px] font-bold">
          <span class="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-black">
            승인 {{ approvedCount }}
          </span>
          <span v-if="pendingCount > 0" class="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-black">
            대기 {{ pendingCount }}
          </span>
        </div>
      </div>
    </div>

    <!-- 2. Calendar Card Container (Horizontal Swipe & Vertical Collapse Gestures) -->
    <div
      class="bg-white rounded-3xl shadow-sm border border-slate-100/80 overflow-hidden touch-pan-y"
      @touchstart="onCalendarTouchStart"
      @touchmove="onCalendarTouchMove"
      @touchend="onCalendarTouchEnd"
      @touchcancel="onCalendarTouchEnd"
      @mousedown="onCalendarMouseDown"
      @mousemove="onCalendarMouseMove"
      @mouseup="onCalendarMouseUp"
    >
      <!-- Weekday Headers (일 ~ 토) -->
      <div class="grid grid-cols-7 pt-3 pb-2 border-b border-slate-100 text-center text-xs font-black">
        <span class="text-rose-500">일</span>
        <span class="text-slate-600">월</span>
        <span class="text-slate-600">화</span>
        <span class="text-slate-600">수</span>
        <span class="text-slate-600">목</span>
        <span class="text-slate-600">금</span>
        <span class="text-blue-600">토</span>
      </div>

      <!-- Calendar Grid Body (with Smooth Horizontal Swipe Animation) -->
      <div
        class="overflow-hidden"
        :style="calendarContainerStyle"
      >
        <div
          class="grid grid-cols-7"
          :style="calendarGridTransformStyle"
        >
          <template v-for="(cell, cIdx) in visibleCells" :key="cell.dateStr || cIdx">
            <div
              v-if="!cell.day"
              class="border-b border-r border-slate-50 min-h-[5.25rem] bg-slate-50/20"
              :style="cellHeightStyle"
            ></div>

            <div
              v-else
              @click="handleDayCellClick(cell)"
              class="relative border-b border-r border-slate-100/70 p-1 flex flex-col justify-between transition-colors cursor-pointer select-none"
              :class="[
                cell.dateStr === activeDayStr ? 'bg-indigo-50/30' : 'bg-white hover:bg-slate-50/50',
                cell.isDimmed ? 'opacity-35' : ''
              ]"
              :style="cellHeightStyle"
            >
              <!-- Date Number & Indicators -->
              <div class="flex items-center justify-between">
                <!-- Date Circle Marking -->
                <span
                  class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black transition-all"
                  :class="[
                    cell.dateStr === activeDayStr
                      ? 'bg-slate-900 text-white shadow-sm ring-2 ring-slate-900/20 scale-105'
                      : (cell.isToday
                          ? 'bg-indigo-600 text-white font-black'
                          : (cell.isSunday || cell.holidayName
                              ? 'text-rose-500'
                              : (cell.isSaturday ? 'text-blue-600' : 'text-slate-800')))
                  ]"
                >
                  {{ cell.day }}
                </span>

                <!-- Holiday Name (if any) -->
                <span
                  v-if="cell.holidayName"
                  class="text-[9px] font-black text-rose-500 truncate max-w-[3rem]"
                >
                  {{ shortHolidayName(cell.holidayName) }}
                </span>
              </div>

              <!-- Collapsed Mode: Dots below Date -->
              <div
                v-if="effectiveCollapseProgress > 0.6"
                class="flex items-center justify-center gap-1 pt-1 h-3"
              >
                <span
                  v-for="(dotColor, dIdx) in getCellDotColors(cell)"
                  :key="dIdx"
                  class="w-1.5 h-1.5 rounded-full"
                  :class="dotColor"
                ></span>
              </div>

              <!-- Expanded Mode: Up to 2 event bars + overflow count -->
              <div
                v-else
                class="space-y-0.5 pt-1 min-h-[2.5rem]"
              >
                <div
                  v-for="item in cell.items.slice(0, 2)"
                  :key="item.id"
                  @click.stop="handleCellItemTap(item)"
                  class="px-1.5 py-0.5 rounded text-[10px] font-bold truncate leading-tight transition-transform active:scale-95"
                  :class="getExpandedBarClass(item)"
                  :title="`${item.title || item.room_name} (${fmtTime(item.start_time)}~${fmtTime(item.end_time)})`"
                >
                  {{ item.title || item.room_name }}
                </div>

                <div
                  v-if="cell.items.length > 2"
                  class="text-[9px] font-extrabold text-slate-500 text-center leading-tight pt-0.5"
                >
                  +{{ cell.items.length - 2 }}
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- 3. Bottom Schedule List Panel (터치 드래그에 맞춰 자연스럽게 슬라이드) -->
      <div
        v-show="effectiveCollapseProgress > 0.01"
        class="border-t border-slate-100 bg-white px-5 overflow-hidden"
        :style="schedulePanelStyle"
      >
        <div class="pt-2 pb-6 space-y-4 min-h-[15rem]">
          <!-- Grab Handle (Tap to expand/collapse) -->
          <div
            @click="toggleCalendarCollapse(false)"
            class="py-2 cursor-pointer flex flex-col items-center group touch-none"
            title="터치하거나 아래로 내려 전체 캘린더 펼치기"
          >
            <div class="w-10 h-1 bg-slate-300 group-hover:bg-slate-400 rounded-full transition-colors"></div>
          </div>

          <!-- Selected Date Title -->
          <div class="flex items-center justify-between gap-2 flex-wrap">
            <div class="flex items-center gap-2">
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
            <span class="text-xs font-bold text-slate-400">
              총 {{ selectedDayItems.length }}건
            </span>
          </div>

          <!-- Schedule Items List for Selected Day -->
          <div v-if="selectedDayItems.length === 0" class="py-4">
            <div class="flex items-center gap-3 text-slate-400">
              <span class="w-1 h-5 bg-slate-200 rounded-full"></span>
              <span class="text-sm font-bold">예약된 일정이 없습니다.</span>
            </div>
          </div>

          <div v-else class="space-y-2.5 max-h-[22rem] overflow-y-auto pr-0.5">
            <div
              v-for="item in selectedDayItems"
              :key="item.id"
              @click="handleCellItemTap(item)"
              class="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50/70 hover:bg-slate-100/80 border border-slate-100 transition-all active:scale-[0.99] cursor-pointer"
            >
              <div class="flex items-start gap-3 min-w-0 flex-1">
                <!-- Left Vertical Color Bar -->
                <span
                  class="w-1 h-10 rounded-full shrink-0 mt-0.5"
                  :class="getItemBarColor(item)"
                ></span>

                <div class="min-w-0 space-y-0.5 flex-1">
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
                    <span v-if="item.is_recurring" class="text-indigo-600 font-bold text-[11px]">(반복)</span>
                  </div>
                </div>
              </div>

              <!-- Status Badge -->
              <div class="shrink-0">
                <span
                  class="px-2.5 py-1 rounded-full text-[11px] font-black"
                  :class="statusBadgeClass(item.status)"
                >
                  {{ statusLabel(item.status) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 4. Bottom Floating Controls: [오늘 ›] + [고정일정 포함] & [돋보기 / +] FAB -->
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
          class="pointer-events-auto w-12 h-12 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-300/50 flex items-center justify-center text-2xl font-light active:scale-90 transition-all"
          :class="isPastDate(activeDayStr) ? 'opacity-40' : ''"
          title="신규 예약 신청"
        >
          +
        </button>
      </div>
    </div>

    <!-- ==========================================
         BOTTOM SHEET 1: 공간 예약 신청 모달 (showBookingModal)
    =========================================== -->
    <Teleport to="body">
      <div
        v-if="showBookingModal"
        class="fixed inset-0 z-[2000] flex flex-col justify-end bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
        @click.self="closeBookingModal"
      >
        <div class="bg-white rounded-t-[2.5rem] max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
          <!-- Header -->
          <div class="px-6 pt-5 pb-3 border-b border-slate-100 flex items-center justify-between shrink-0">
            <div>
              <div class="flex items-center gap-1.5 mb-1 flex-wrap">
                <template v-if="selectedBookingRoom">
                  <span class="bg-indigo-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md uppercase">
                    {{ formatFloorLabel(selectedBookingRoom.floor) }}
                  </span>
                  <span class="text-xs font-black text-indigo-600">{{ roomLabel(selectedBookingRoom) }}</span>
                </template>
                <span v-else class="bg-amber-100 text-amber-700 text-[10px] font-black px-2 py-0.5 rounded-md">
                  공간 미선택
                </span>
                <span class="text-slate-300 text-xs">|</span>
                <span class="text-xs font-black text-slate-600">
                  {{ bookingForm.reservation_date }}
                </span>
              </div>
              <h3 class="text-base font-black text-slate-900">예약 신청</h3>
            </div>
            <button
              @click="closeBookingModal"
              class="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-black active:scale-90"
            >
              ✕
            </button>
          </div>

          <!-- Form Body -->
          <div class="p-6 overflow-y-auto space-y-4">
            <!-- 1. Room Selection -->
            <div class="space-y-1.5">
              <label class="text-[11px] font-black text-slate-500 uppercase tracking-widest block">예약 공간 선택 *</label>
              <select
                v-model="bookingForm.room_id"
                class="w-full border rounded-2xl px-4 py-3 text-xs font-bold outline-none transition-all"
                :class="bookingForm.room_id
                  ? 'bg-slate-50 border-slate-200 text-slate-800 focus:bg-white focus:border-indigo-500'
                  : 'bg-amber-50/70 border-amber-300 text-amber-700'"
              >
                <option value="" disabled>예약할 공간을 선택해 주세요</option>
                <optgroup
                  v-for="grp in roomsByFloor"
                  :key="grp.floor"
                  :label="formatFloorLabel(grp.floor)"
                >
                  <option v-for="r in grp.rooms" :key="r.id" :value="r.id">
                    {{ roomLabel(r) }} ({{ formatFloorLabel(r.floor) }})
                  </option>
                </optgroup>
              </select>
              <p v-if="!bookingForm.room_id" class="text-[11px] font-bold text-amber-600 flex items-center gap-1">
                <span>⚠️</span> 예약을 진행할 공간을 먼저 선택해 주세요.
              </p>
            </div>

            <!-- 2. Date -->
            <div class="space-y-1.5">
              <label class="text-xs font-black text-slate-700">예약 일자 *</label>
              <input
                type="date"
                v-model="bookingForm.reservation_date"
                class="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-black text-slate-800 outline-none"
              />
            </div>

            <!-- 3. Time Range -->
            <div class="grid grid-cols-2 gap-3">
              <div class="space-y-1.5">
                <label class="text-xs font-black text-slate-700">시작 시간 *</label>
                <select
                  v-model="bookingForm.start_time"
                  @change="handleBookingStartTimeChange"
                  class="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-3 text-xs font-black text-slate-800 outline-none"
                >
                  <option v-for="t in timeOptions" :key="t" :value="t">{{ t }}</option>
                </select>
              </div>
              <div class="space-y-1.5">
                <label class="text-xs font-black text-slate-700">종료 시간 *</label>
                <select
                  v-model="bookingForm.end_time"
                  class="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-3 text-xs font-black text-slate-800 outline-none"
                >
                  <option v-for="t in timeOptions" :key="t" :value="t">{{ t }}</option>
                </select>
              </div>
            </div>

            <!-- Time Conflict Warning -->
            <div
              v-if="bookingConflictError"
              class="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-600 flex items-center gap-2"
            >
              <span>⚠️</span>
              <span>{{ bookingConflictError }}</span>
            </div>

            <!-- 4. Title -->
            <div class="space-y-1.5">
              <label class="text-xs font-black text-slate-700">신청명 (일정 제목) *</label>
              <input
                type="text"
                v-model="bookingForm.title"
                placeholder="예: 청년부 소그룹 모임"
                class="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-black text-slate-800 outline-none focus:bg-white focus:border-indigo-500"
              />
            </div>

            <!-- 5. Reason -->
            <div class="space-y-1.5">
              <label class="text-xs font-black text-slate-700">사용 목적 및 내용</label>
              <textarea
                v-model="bookingForm.reason"
                rows="2"
                placeholder="사용 목적을 입력해 주세요."
                class="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs font-bold text-slate-800 outline-none resize-none focus:bg-white focus:border-indigo-500"
              ></textarea>
            </div>
          </div>

          <!-- Footer Submit Button -->
          <div class="p-4 border-t border-slate-100 bg-white">
            <button
              @click="submitBooking"
              :disabled="!bookingForm.room_id || submitting || !!bookingConflictError"
              class="w-full py-4 rounded-2xl bg-indigo-600 text-white text-xs font-black shadow-lg shadow-indigo-100 active:scale-95 disabled:opacity-50 transition-all"
            >
              {{ submitting ? '신청 처리 중...' : '예약 신청하기 (관리자 승인 대기)' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ==========================================
         BOTTOM SHEET 2: 일정 상세 조회 & 수정/취소 모달 (showModal)
    =========================================== -->
    <Teleport to="body">
      <div
        v-if="showModal && selectedRes"
        class="fixed inset-0 z-[2100] flex flex-col justify-end bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
        @click.self="closeModal"
      >
        <div class="bg-white rounded-t-[2.5rem] max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
          <!-- Top Header -->
          <div class="px-6 pt-5 pb-3 border-b border-slate-100 flex items-center justify-between shrink-0">
            <div class="flex items-center gap-2">
              <span class="px-2.5 py-1 bg-indigo-50 text-indigo-600 text-xs font-black rounded-lg">
                {{ formatFloorLabel(selectedRes.floor) }} · {{ selectedRes.room_name }}
              </span>
              <span
                class="px-2.5 py-1 rounded-lg text-xs font-black"
                :class="statusBadgeClass(selectedRes.status)"
              >
                {{ statusLabel(selectedRes.status) }}
              </span>
            </div>
            <button
              @click="closeModal"
              class="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-black active:scale-90"
            >
              ✕
            </button>
          </div>

          <!-- Body -->
          <div class="p-6 overflow-y-auto space-y-5">
            <!-- Normal View Mode -->
            <template v-if="!isEditing && !showCancelConfirm">
              <!-- Notice if Cancel Requested -->
              <div
                v-if="selectedRes.status === 'cancel_requested'"
                class="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700 space-y-1"
              >
                <p class="font-black flex items-center gap-1.5">
                  <span>⏳</span>
                  <span>취소 승인 대기 중</span>
                </p>
                <p class="text-[11px] text-rose-600">
                  관리자가 취소 요청을 검토 중입니다. 승인 완료 시 최종 취소 처리됩니다.
                </p>
                <p v-if="selectedRes.reject_reason" class="text-[11px] text-rose-800 bg-white/60 p-2 rounded-lg mt-1 font-medium">
                  취소 사유: {{ selectedRes.reject_reason }}
                </p>
              </div>

              <!-- Notice if Pending -->
              <div
                v-else-if="selectedRes.status === 'pending'"
                class="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs font-bold text-amber-800 space-y-1"
              >
                <p class="font-black flex items-center gap-1.5">
                  <span>⏳</span>
                  <span>승인 대기 중</span>
                </p>
                <p class="text-[11px] text-amber-700">
                  관리자 승인 후 최종 확정됩니다. 승인 완료 시 알림톡이 발송됩니다.
                </p>
              </div>

              <!-- Title & Basic Info -->
              <div class="space-y-1">
                <h2 class="text-xl font-black text-slate-900 leading-snug">
                  {{ selectedRes.title || '(신청명 없음)' }}
                </h2>
                <div class="text-xs font-bold text-slate-600 flex items-center gap-2 pt-1 flex-wrap">
                  <span class="text-indigo-600 font-black">
                    {{ fmtDate(selectedRes.reservation_date) }}
                  </span>
                  <span class="text-slate-300">|</span>
                  <span class="text-slate-900 font-black">
                    {{ fmtTime(selectedRes.start_time) }} ~ {{ fmtTime(selectedRes.end_time) }}
                  </span>
                </div>
              </div>

              <!-- Reason -->
              <div v-if="selectedRes.reason" class="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <span class="text-[11px] font-black text-slate-400">신청 내용</span>
                <p class="text-xs font-bold text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {{ selectedRes.reason }}
                </p>
              </div>

              <!-- Change Logs / History -->
              <div v-if="logs.length > 0" class="space-y-2 pt-2 border-t border-slate-100">
                <h4 class="text-xs font-black text-slate-700">변경 및 승인 이력</h4>
                <div class="space-y-2">
                  <div
                    v-for="l in logs"
                    :key="l.id"
                    class="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs space-y-1"
                  >
                    <div class="flex items-center justify-between text-[11px]">
                      <span class="font-black text-indigo-600">
                        {{ formatLogAction(l.action_type) }}
                      </span>
                      <span class="text-slate-400">{{ formatDateTime(l.created_at) }}</span>
                    </div>
                    <p v-if="l.reason" class="text-slate-600 font-bold whitespace-pre-wrap">
                      {{ l.reason }}
                    </p>
                  </div>
                </div>
              </div>
            </template>

            <!-- Edit Mode -->
            <template v-else-if="isEditing">
              <div class="space-y-4">
                <!-- Recurring Scope Selector (if recurring) -->
                <div v-if="selectedRes.is_recurring" class="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-100 space-y-2">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-black text-indigo-900">반복 일정 변경 범위</span>
                    <span class="text-[10px] font-bold text-indigo-600">반복 등록 건</span>
                  </div>
                  <div class="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      @click="modifyScope = 'single'"
                      class="py-2.5 px-3 rounded-xl text-xs font-black transition-all border"
                      :class="modifyScope === 'single' ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' : 'bg-slate-50 text-slate-600 border-slate-200'"
                    >
                      이 일정만 변경
                    </button>
                    <button
                      type="button"
                      @click="modifyScope = 'all'"
                      class="py-2.5 px-3 rounded-xl text-xs font-black transition-all border"
                      :class="modifyScope === 'all' ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' : 'bg-slate-50 text-slate-600 border-slate-200'"
                    >
                      남은 전체 반복 일정
                    </button>
                  </div>
                </div>

                <!-- Room Selection -->
                <div class="space-y-1.5">
                  <label class="text-xs font-black text-slate-700">공간</label>
                  <select
                    v-model="editForm.room_id"
                    class="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-black text-slate-800 outline-none"
                  >
                    <optgroup
                      v-for="grp in roomsByFloor"
                      :key="grp.floor"
                      :label="formatFloorLabel(grp.floor)"
                    >
                      <option v-for="r in grp.rooms" :key="r.id" :value="r.id">
                        [{{ formatFloorLabel(r.floor) }}] {{ roomLabel(r) }}
                      </option>
                    </optgroup>
                  </select>
                </div>

                <!-- Date -->
                <div class="space-y-1.5">
                  <label class="text-xs font-black text-slate-700">일자</label>
                  <input
                    type="date"
                    v-model="editForm.reservation_date"
                    :disabled="selectedRes.is_recurring && modifyScope === 'all'"
                    class="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-black text-slate-800 outline-none disabled:opacity-50"
                  />
                </div>

                <!-- Time -->
                <div class="grid grid-cols-2 gap-3">
                  <div class="space-y-1.5">
                    <label class="text-xs font-black text-slate-700">시작 시간</label>
                    <select
                      v-model="editForm.start_time"
                      @change="handleEditStartTimeChange"
                      class="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-3 text-xs font-black text-slate-800 outline-none"
                    >
                      <option v-for="t in timeOptions" :key="t" :value="t">{{ t }}</option>
                    </select>
                  </div>
                  <div class="space-y-1.5">
                    <label class="text-xs font-black text-slate-700">종료 시간</label>
                    <select
                      v-model="editForm.end_time"
                      class="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-3 text-xs font-black text-slate-800 outline-none"
                    >
                      <option v-for="t in timeOptions" :key="t" :value="t">{{ t }}</option>
                    </select>
                  </div>
                </div>

                <!-- Time Conflict Warning -->
                <div
                  v-if="editTimeConflictError"
                  class="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-600"
                >
                  ⚠️ {{ editTimeConflictError }}
                </div>

                <!-- Title -->
                <div class="space-y-1.5">
                  <label class="text-xs font-black text-slate-700">신청명</label>
                  <input
                    type="text"
                    v-model="editForm.title"
                    class="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-black text-slate-800 outline-none"
                  />
                </div>

                <!-- Reason -->
                <div class="space-y-1.5">
                  <label class="text-xs font-black text-slate-700">신청 내용</label>
                  <textarea
                    v-model="editForm.reason"
                    rows="2"
                    class="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs font-bold text-slate-800 outline-none resize-none"
                  ></textarea>
                </div>

                <!-- Modify Reason for Admin Approval -->
                <div class="space-y-1.5">
                  <label class="text-xs font-black text-indigo-600">
                    변경 사유 * (관리자 승인 검토 시 안내됩니다)
                  </label>
                  <textarea
                    v-model="editForm.modify_reason"
                    rows="2"
                    placeholder="예: 회의 참석 인원 증가로 시간 연장 요청합니다."
                    class="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs font-bold text-slate-800 outline-none resize-none focus:bg-white focus:border-indigo-400"
                  ></textarea>
                </div>
              </div>
            </template>

            <!-- Cancel Confirm Mode -->
            <template v-else-if="showCancelConfirm">
              <div class="space-y-4">
                <div class="p-4 rounded-2xl bg-rose-50 border border-rose-100 text-xs text-rose-700 space-y-1.5">
                  <p class="font-black">예약 취소 신청</p>
                  <p class="text-[11px] leading-relaxed">
                    {{ selectedRes.status === 'approved' ? '취소 신청 후 관리자 승인이 완료되면 최종 취소됩니다.' : '예약을 취소하시겠습니까?' }}
                  </p>
                </div>

                <!-- Recurring Scope Selector (if recurring) -->
                <div v-if="selectedRes.is_recurring" class="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <span class="text-xs font-black text-slate-800">반복 일정 취소 범위</span>
                  <div class="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      @click="cancelScope = 'single'"
                      class="py-2.5 px-3 rounded-xl text-xs font-black transition-all border"
                      :class="cancelScope === 'single' ? 'bg-rose-600 text-white border-rose-600' : 'bg-white text-slate-600 border-slate-200'"
                    >
                      이 일정만 취소
                    </button>
                    <button
                      type="button"
                      @click="cancelScope = 'all'"
                      class="py-2.5 px-3 rounded-xl text-xs font-black transition-all border"
                      :class="cancelScope === 'all' ? 'bg-rose-600 text-white border-rose-600' : 'bg-white text-slate-600 border-slate-200'"
                    >
                      남은 전체 반복 일정
                    </button>
                  </div>
                </div>

                <div class="space-y-1.5">
                  <label class="text-xs font-black text-rose-600">
                    취소 사유 * (관리자 승인 검토 시 안내됩니다)
                  </label>
                  <textarea
                    v-model="cancelReason"
                    rows="3"
                    placeholder="취소 사유를 입력해 주세요."
                    class="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs font-bold text-slate-800 outline-none resize-none focus:bg-white focus:border-rose-400"
                  ></textarea>
                </div>
              </div>
            </template>
          </div>

          <!-- Footer Buttons -->
          <div class="p-4 border-t border-slate-100 bg-white flex gap-2 shrink-0">
            <template v-if="!isEditing && !showCancelConfirm">
              <!-- If Cancel Requested -->
              <div v-if="selectedRes.status === 'cancel_requested'" class="flex-1 text-center py-3 text-xs font-bold text-rose-500">
                취소 승인 대기 중입니다.
              </div>

              <!-- Normal Actions -->
              <template v-else-if="selectedRes.status !== 'cancelled' && selectedRes.status !== 'rejected'">
                <button
                  @click="startEdit"
                  class="flex-1 py-3.5 rounded-2xl bg-indigo-600 text-white text-xs font-black shadow-sm active:scale-95 transition-all"
                >
                  예약 변경
                </button>
                <button
                  @click="showCancelConfirm = true"
                  class="flex-1 py-3.5 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 text-xs font-black active:scale-95 transition-all"
                >
                  예약 취소
                </button>
              </template>
            </template>

            <!-- Edit Mode Buttons -->
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
                {{ submitting ? '신청 중...' : '변경 신청 (관리자 승인 대기)' }}
              </button>
            </template>

            <!-- Cancel Mode Buttons -->
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
                {{ submitting ? '처리 중...' : (selectedRes.status === 'approved' ? '취소 신청 (관리자 승인 대기)' : '취소 확정') }}
              </button>
            </template>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ==========================================
         FULL-SCREEN LAYER: 일정 검색 팝업 (showSearchModal)
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
            placeholder="신청명, 공간명, 사유 검색"
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
          <!-- Empty / No Keyword State -->
          <div v-if="!searchKeyword.trim()" class="h-full"></div>

          <!-- No Matching Results -->
          <div
            v-else-if="groupedSearchResults.length === 0"
            class="py-20 text-center text-sm font-medium text-slate-400"
          >
            검색 결과가 없습니다.
          </div>

          <!-- Grouped Search Results List -->
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
                      :class="item.status === 'pending' ? 'bg-amber-400' : (item.status === 'cancel_requested' ? 'bg-rose-500' : 'bg-yellow-400')"
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

                  <!-- Right Calendar / Status Icon Badge -->
                  <div class="shrink-0">
                    <span
                      class="px-2 py-0.5 rounded-md text-[10px] font-black"
                      :class="statusBadgeClass(item.status)"
                    >
                      {{ statusLabel(item.status) }}
                    </span>
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
import { useRoute } from 'vue-router'
import axios from 'axios'
import { useAuthStore } from '@/store/auth'
import { useModalStore } from '@/stores/useModalStore'
import { getHoliday } from '@/utils/holidays'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
  XMarkIcon
} from '@heroicons/vue/24/outline'

const route = useRoute()
const auth = useAuthStore()
const modal = useModalStore()

const loading = ref(false)
const rooms = ref([])
const myReservations = ref([])
const allActiveReservations = ref([]) // For conflict checking
const includeBlocked = ref(false)
const policy = ref(null)

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
  pending: 'bg-amber-100 text-amber-700 font-black',
  cancel_requested: 'bg-rose-100 text-rose-700 font-black',
  approved: 'bg-emerald-100 text-emerald-700 font-black',
  rejected: 'bg-rose-100 text-rose-700 font-black',
  cancelled: 'bg-slate-100 text-slate-500 font-black'
}[s] || 'bg-slate-100 text-slate-600')

const formatLogAction = (type) => {
  if (!type) return '기록'
  if (type === 'modify' || type.includes('변경')) return '변경'
  if (type === 'cancel_request' || type.includes('취소 요청')) return '취소 요청'
  if (type === 'reject_cancel') return '취소 반려'
  if (type === 'reject' || type === 'rejected' || type.includes('거부') || type.includes('반려')) return '거부'
  if (type === 'cancel' || type === 'cancelled' || type.includes('취소')) return '취소'
  if (type === 'approve') return '승인'
  return '변경'
}

const getExpandedBarClass = (item) => {
  if (item.is_blocked) return 'bg-slate-200 text-slate-700'
  if (item.status === 'cancel_requested') return 'bg-rose-100 text-rose-800'
  if (item.status === 'pending') return 'bg-amber-100 text-amber-800'
  return 'bg-indigo-600 text-white'
}

const getItemBarColor = (item) => {
  if (item.is_blocked) return 'bg-slate-500'
  if (item.status === 'cancel_requested') return 'bg-rose-500'
  if (item.status === 'pending') return 'bg-amber-400'
  return 'bg-indigo-600'
}

const getCellDotColors = (cell) => {
  if (!cell.items || cell.items.length === 0) return []
  const dots = []
  for (const item of cell.items.slice(0, 3)) {
    if (item.is_blocked) dots.push('bg-slate-500')
    else if (item.status === 'cancel_requested') dots.push('bg-rose-500')
    else if (item.status === 'pending') dots.push('bg-amber-400')
    else dots.push('bg-indigo-600')
  }
  return dots
}

// Counts for header summary
const approvedCount = computed(() => myReservations.value.filter(r => r.status === 'approved').length)
const pendingCount = computed(() => myReservations.value.filter(r => r.status === 'pending' || r.status === 'cancel_requested').length)

// Sort floors
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

// Blocked times handling
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

// Active items for my calendar: ONLY my reservations (and blocked items if toggled)
const activeCalendarItems = computed(() => {
  const userItems = myReservations.value.filter(
    (r) => r.status === 'approved' || r.status === 'pending' || r.status === 'cancel_requested'
  )
  return [...userItems, ...expandedBlockedItems.value]
})

// Month header title (e.g. "2026. 10.")
const monthHeaderTitle = computed(() => {
  const y = currentMonthDate.value.getFullYear()
  const m = String(currentMonthDate.value.getMonth() + 1).padStart(2, '0')
  return `${y}. ${m}.`
})

// Calendar cells logic
const calendarCells = computed(() => {
  const y = currentMonthDate.value.getFullYear()
  const m = currentMonthDate.value.getMonth()
  const firstDow = new Date(y, m, 1).getDay()
  const lastDate = new Date(y, m + 1, 0).getDate()

  const itemsByDate = {}
  for (const item of activeCalendarItems.value) {
    const dStr = fmtDate(item.reservation_date)
    if (!itemsByDate[dStr]) itemsByDate[dStr] = []
    itemsByDate[dStr].push(item)
  }
  Object.keys(itemsByDate).forEach((k) => {
    itemsByDate[k].sort((a, b) => fmtTime(a.start_time).localeCompare(fmtTime(b.start_time)))
  })

  const cells = []
  for (let i = 0; i < firstDow; i++) {
    cells.push({ day: null, isDimmed: true })
  }
  for (let day = 1; day <= lastDate; day++) {
    const dObj = new Date(y, m, day)
    const dateStr = toDateStr(dObj)
    const dow = dObj.getDay()
    const holiday = getHoliday(dateStr)

    cells.push({
      day,
      dateStr,
      isToday: dateStr === todayStr.value,
      isSunday: dow === 0,
      isSaturday: dow === 6,
      holidayName: holiday,
      items: itemsByDate[dateStr] || []
    })
  }

  const remainder = cells.length % 7
  if (remainder !== 0) {
    const trailing = 7 - remainder
    for (let i = 0; i < trailing; i++) {
      cells.push({ day: null, isDimmed: true })
    }
  }
  return cells
})

const totalCalendarWeeks = computed(() => Math.ceil(calendarCells.value.length / 7))

const activeWeekIndex = computed(() => {
  if (!activeDayStr.value) return 0
  const idx = calendarCells.value.findIndex((c) => c.dateStr === activeDayStr.value)
  if (idx === -1) return 0
  return Math.floor(idx / 7)
})

// ==========================================================
// GESTURES: Vertical drag collapse & Horizontal swipe
// ==========================================================
const dragProgress = ref(0)
const isDraggingY = ref(false)
const dragDeltaY = ref(0)

const effectiveCollapseProgress = computed(() => {
  if (isDraggingY.value) {
    const base = isCalendarCollapsed.value ? 1 : 0
    return Math.max(0, Math.min(1, base + dragProgress.value))
  }
  return isCalendarCollapsed.value ? 1 : 0
})

const calendarContainerStyle = computed(() => {
  const p = effectiveCollapseProgress.value
  const expandedH = totalCalendarWeeks.value * 5.25
  const collapsedH = 3.25
  const h = expandedH - p * (expandedH - collapsedH)
  return {
    height: `${h}rem`,
    transition: isDraggingY.value ? 'none' : 'height 260ms cubic-bezier(0.2, 0.8, 0.2, 1)'
  }
})

const cellHeightStyle = computed(() => {
  const p = effectiveCollapseProgress.value
  const h = 5.25 - p * (5.25 - 3.25)
  return {
    height: `${h}rem`,
    minHeight: `${h}rem`,
    transition: isDraggingY.value ? 'none' : 'height 260ms cubic-bezier(0.2, 0.8, 0.2, 1)'
  }
})

const calendarGridTransformStyle = computed(() => {
  const p = effectiveCollapseProgress.value
  const wIdx = activeWeekIndex.value
  const targetShiftRem = -wIdx * 3.25
  const curShift = p * targetShiftRem
  const x = swipeTranslateX.value
  return {
    transform: `translate3d(${x}px, ${curShift}rem, 0)`,
    transition: isSwipingX.value || isDraggingY.value ? 'none' : 'transform 260ms cubic-bezier(0.2, 0.8, 0.2, 1)'
  }
})

const visibleCells = computed(() => calendarCells.value)

const schedulePanelStyle = computed(() => {
  const p = effectiveCollapseProgress.value
  return {
    opacity: Math.max(0, Math.min(1, (p - 0.1) / 0.9)),
    transform: `translate3d(0, ${(1 - p) * 16}px, 0)`,
    transition: isDraggingY.value ? 'none' : 'opacity 220ms ease, transform 240ms cubic-bezier(0.2, 0.8, 0.2, 1)'
  }
})

// Touch Gestures handling
let touchStartX = 0
let touchStartY = 0
let gestureMode = null
const swipeTranslateX = ref(0)
const isSwipingX = ref(false)

const onCalendarTouchStart = (e) => {
  const t = e.touches[0]
  touchStartX = t.clientX
  touchStartY = t.clientY
  gestureMode = null
  dragDeltaY.value = 0
  swipeTranslateX.value = 0
}

const onCalendarTouchMove = (e) => {
  const t = e.touches[0]
  const dx = t.clientX - touchStartX
  const dy = t.clientY - touchStartY

  if (!gestureMode) {
    if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
      gestureMode = 'horizontal'
      isSwipingX.value = true
    } else if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) {
      gestureMode = 'vertical'
      isDraggingY.value = true
    }
  }

  if (gestureMode === 'horizontal') {
    swipeTranslateX.value = dx * 0.75
  } else if (gestureMode === 'vertical') {
    dragDeltaY.value = dy
    const factor = isCalendarCollapsed.value ? 160 : -160
    dragProgress.value = Math.max(-1, Math.min(1, dy / factor))
  }
}

const onCalendarTouchEnd = () => {
  if (gestureMode === 'horizontal') {
    const threshold = 60
    if (swipeTranslateX.value < -threshold) {
      nextMonth()
    } else if (swipeTranslateX.value > threshold) {
      prevMonth()
    }
    swipeTranslateX.value = 0
    isSwipingX.value = false
  } else if (gestureMode === 'vertical') {
    const threshold = 35
    if (isCalendarCollapsed.value) {
      if (dragDeltaY.value > threshold) toggleCalendarCollapse(false)
    } else {
      if (dragDeltaY.value < -threshold) toggleCalendarCollapse(true)
    }
    dragProgress.value = 0
    isDraggingY.value = false
  }
  gestureMode = null
}

const onCalendarMouseDown = (e) => {
  touchStartX = e.clientX
  touchStartY = e.clientY
  gestureMode = null
}
const onCalendarMouseMove = (e) => {
  if (e.buttons !== 1) return
  const dx = e.clientX - touchStartX
  if (Math.abs(dx) > 10) {
    swipeTranslateX.value = dx * 0.6
  }
}
const onCalendarMouseUp = (e) => {
  if (swipeTranslateX.value < -50) nextMonth()
  else if (swipeTranslateX.value > 50) prevMonth()
  swipeTranslateX.value = 0
}

const toggleCalendarCollapse = (val) => {
  isCalendarCollapsed.value = typeof val === 'boolean' ? val : !isCalendarCollapsed.value
}

// Day selection and clicking
const handleDayCellClick = (cell) => {
  if (!cell || !cell.dateStr) return
  activeDayStr.value = cell.dateStr
  toggleCalendarCollapse(true)
}

const handleCellItemTap = (item) => {
  if (item.is_blocked) {
    modal.showAlert(`[고정 일정] ${item.title}\n시간: ${fmtTime(item.start_time)} ~ ${fmtTime(item.end_time)}\n(공간 관리자가 설정한 사용 불가 시간입니다)`)
    return
  }
  openDetail(item)
}

// Selected Day Schedule Items
const selectedDayItems = computed(() => {
  if (!activeDayStr.value) return []
  return activeCalendarItems.value
    .filter((item) => fmtDate(item.reservation_date) === activeDayStr.value)
    .sort((a, b) => fmtTime(a.start_time).localeCompare(fmtTime(b.start_time)))
})

const selectedDayHeaderText = computed(() => {
  if (!activeDayStr.value) return ''
  const [y, m, d] = activeDayStr.value.split('-').map(Number)
  const days = ['일', '월', '화', '수', '목', '금', '토']
  const dow = days[new Date(y, m - 1, d).getDay()]
  return `${m}.${d} ${dow}요일`
})

// Month navigation
const prevMonth = () => {
  applyMonthChange(-1)
}
const nextMonth = () => {
  applyMonthChange(1)
}

const applyMonthChange = (offset) => {
  const cur = currentMonthDate.value
  const nextDate = new Date(cur.getFullYear(), cur.getMonth() + offset, 1)
  currentMonthDate.value = nextDate

  const now = new Date()
  if (nextDate.getFullYear() === now.getFullYear() && nextDate.getMonth() === now.getMonth()) {
    activeDayStr.value = todayStr.value
  } else {
    activeDayStr.value = toDateStr(nextDate)
  }
}

const goToday = () => {
  const now = new Date()
  currentMonthDate.value = new Date(now.getFullYear(), now.getMonth(), 1)
  activeDayStr.value = todayStr.value
  toggleCalendarCollapse(true)
}

const triggerDatePicker = () => {
  dateInputRef.value?.showPicker?.() || dateInputRef.value?.click?.()
}

const onNativeMonthPick = (e) => {
  const val = e.target.value
  if (!val) return
  const [y, m] = val.split('-').map(Number)
  currentMonthDate.value = new Date(y, m - 1, 1)
  activeDayStr.value = toDateStr(new Date(y, m - 1, 1))
}

// ==========================================================
// TIME OPTIONS & AUTO +1 HOUR HELPER
// ==========================================================
const timeOptions = computed(() => {
  const list = []
  for (let h = 6; h <= 23; h++) {
    const hh = String(h).padStart(2, '0')
    list.push(`${hh}:00`, `${hh}:30`)
  }
  return list
})

const calcPlusOneHour = (timeStr) => {
  if (!timeStr) return '10:00'
  const [hStr, mStr] = timeStr.split(':')
  let h = Number(hStr) + 1
  if (h > 23) h = 23
  return `${String(h).padStart(2, '0')}:${mStr || '00'}`
}

// ==========================================================
// 1. BOOKING MODAL (신규 예약 신청)
// ==========================================================
const showBookingModal = ref(false)
const submitting = ref(false)
const bookingForm = ref({
  room_id: '',
  reservation_date: '',
  start_time: '09:00',
  end_time: '10:00',
  title: '',
  reason: ''
})

const selectedBookingRoom = computed(() => {
  if (!bookingForm.value.room_id) return null
  return rooms.value.find((r) => Number(r.id) === Number(bookingForm.value.room_id)) || null
})

const openBookingForActiveDay = () => {
  const targetDate = activeDayStr.value || todayStr.value
  if (isPastDate(targetDate)) {
    modal.showAlert('과거 일자에는 예약을 신청할 수 없습니다.')
    return
  }
  bookingForm.value = {
    room_id: '',
    reservation_date: targetDate,
    start_time: '09:00',
    end_time: '10:00',
    title: '',
    reason: ''
  }
  showBookingModal.value = true
}

const closeBookingModal = () => {
  showBookingModal.value = false
}

const handleBookingStartTimeChange = () => {
  bookingForm.value.end_time = calcPlusOneHour(bookingForm.value.start_time)
}

// Booking conflict check
const bookingConflictError = computed(() => {
  if (!showBookingModal.value) return ''
  const { room_id, reservation_date, start_time, end_time } = bookingForm.value
  if (!room_id || !reservation_date || !start_time || !end_time) return ''
  if (start_time >= end_time) return '종료 시간은 시작 시간보다 늦어야 합니다.'

  // 1. Check against active reservations (from all users)
  for (const r of allActiveReservations.value) {
    if (Number(r.room_id) === Number(room_id) && fmtDate(r.reservation_date) === reservation_date) {
      if (r.status === 'cancelled' || r.status === 'rejected') continue
      const rs = fmtTime(r.start_time)
      const re = fmtTime(r.end_time)
      if (start_time < re && end_time > rs) {
        return `해당 시간대에 이미 예약(${r.title || r.requester_name || '타 예약'})이 있습니다.`
      }
    }
  }

  // 2. Check against blocked times
  const targetRoom = rooms.value.find((r) => Number(r.id) === Number(room_id))
  if (targetRoom) {
    const blockedList = getBlockedForRoomAndDate(targetRoom, reservation_date)
    for (const bt of blockedList) {
      const bs = fmtTime(bt.start_time)
      const be = fmtTime(bt.end_time)
      if (start_time < be && end_time > bs) {
        return `해당 시간대는 고정 일정(${bt.reason || '사용 불가'})으로 예약할 수 없습니다.`
      }
    }
  }

  return ''
})

const submitBooking = async () => {
  if (!bookingForm.value.room_id) {
    await modal.showAlert('예약할 공간을 선택해 주세요.')
    return
  }
  if (!bookingForm.value.reservation_date) {
    await modal.showAlert('예약 일자를 선택해 주세요.')
    return
  }
  if (!bookingForm.value.title.trim()) {
    await modal.showAlert('신청명을 입력해 주세요.')
    return
  }
  if (bookingConflictError.value) {
    await modal.showAlert(bookingConflictError.value)
    return
  }

  submitting.value = true
  try {
    await axios.post('/api/reservations', {
      room_id: bookingForm.value.room_id,
      reservation_date: bookingForm.value.reservation_date,
      start_time: bookingForm.value.start_time,
      end_time: bookingForm.value.end_time,
      title: bookingForm.value.title,
      reason: bookingForm.value.reason,
      requester_name: auth.user?.userName || auth.user?.user_name || '신청자',
      requester_phone: auth.user?.phone || ''
    })
    closeBookingModal()
    await fetchAll()
    await modal.showAlert('예약 신청이 접수되었습니다. 관리자 승인 후 최종 확정됩니다.')
  } catch (err) {
    await modal.showAlert(err.response?.data?.message || '예약 신청에 실패했습니다.')
  } finally {
    submitting.value = false
  }
}

// ==========================================================
// 2. DETAIL MODAL (조회, 변경, 취소)
// ==========================================================
const showModal = ref(false)
const selectedRes = ref(null)
const isEditing = ref(false)
const showCancelConfirm = ref(false)
const modifyScope = ref('single')
const cancelScope = ref('single')
const cancelReason = ref('')
const logs = ref([])

const editForm = ref({
  room_id: '',
  title: '',
  reservation_date: '',
  start_time: '',
  end_time: '',
  reason: '',
  modify_reason: ''
})

const openDetail = async (item) => {
  selectedRes.value = item
  isEditing.value = false
  showCancelConfirm.value = false
  modifyScope.value = 'single'
  cancelScope.value = 'single'
  cancelReason.value = ''
  logs.value = []
  showModal.value = true

  try {
    const { data } = await axios.get(`/api/reservations/${item.id}/logs`)
    logs.value = data || []
  } catch (_) {
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
    modify_reason: ''
  }
  isEditing.value = true
}

const handleEditStartTimeChange = () => {
  editForm.value.end_time = calcPlusOneHour(editForm.value.start_time)
}

// Edit Conflict Check
const editTimeConflictError = computed(() => {
  if (!isEditing.value || !selectedRes.value) return ''
  const { room_id, reservation_date, start_time, end_time } = editForm.value
  if (!room_id || !reservation_date || !start_time || !end_time) return ''
  if (start_time >= end_time) return '종료 시간은 시작 시간보다 늦어야 합니다.'

  // Check against all active reservations (excluding self/series)
  for (const r of allActiveReservations.value) {
    if (r.id === selectedRes.value.id) continue
    if (r.status === 'cancelled' || r.status === 'rejected') continue
    if (Number(r.room_id) === Number(room_id) && fmtDate(r.reservation_date) === reservation_date) {
      const rs = fmtTime(r.start_time)
      const re = fmtTime(r.end_time)
      if (start_time < re && end_time > rs) {
        return `해당 시간대에 이미 예약(${r.title || r.requester_name})이 있습니다.`
      }
    }
  }

  // Check against blocked times
  const targetRoom = rooms.value.find((r) => Number(r.id) === Number(room_id))
  if (targetRoom) {
    const blockedList = getBlockedForRoomAndDate(targetRoom, reservation_date)
    for (const bt of blockedList) {
      const bs = fmtTime(bt.start_time)
      const be = fmtTime(bt.end_time)
      if (start_time < be && end_time > bs) {
        return `해당 시간대는 고정 일정(${bt.reason || '사용 불가'})으로 예약할 수 없습니다.`
      }
    }
  }

  return ''
})

const submitModify = async () => {
  if (!editForm.value.title.trim()) {
    await modal.showAlert('신청명을 입력해 주세요.')
    return
  }
  if (!editForm.value.modify_reason.trim()) {
    await modal.showAlert('변경 사유를 입력해 주세요. (관리자 승인 검토 시 안내됩니다)')
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
      modify_reason: editForm.value.modify_reason,
      modify_scope: selectedRes.value.is_recurring ? modifyScope.value : 'single'
    })
    closeModal()
    await fetchAll()
    const count = res.data?.count || 1
    await modal.showAlert(
      count > 1
        ? `총 ${count}건의 예약 변경 신청이 접수되었습니다. 관리자 승인 후 확정됩니다.`
        : '예약 변경 신청이 접수되었습니다. 관리자 승인 후 최종 확정됩니다.'
    )
  } catch (err) {
    await modal.showAlert(err.response?.data?.message || '예약 변경 신청에 실패했습니다.')
  } finally {
    submitting.value = false
  }
}

const submitCancel = async () => {
  if (!cancelReason.value.trim()) {
    await modal.showAlert('취소 사유를 입력해 주세요. (관리자 승인 검토 시 안내됩니다)')
    return
  }

  submitting.value = true
  try {
    const res = await axios.patch(`/api/reservations/${selectedRes.value.id}/cancel`, {
      cancel_reason: cancelReason.value,
      cancel_scope: selectedRes.value.is_recurring ? cancelScope.value : 'single'
    })
    closeModal()
    await fetchAll()
    const msg = res.data?.message || '취소 처리가 완료되었습니다.'
    await modal.showAlert(msg)
  } catch (err) {
    await modal.showAlert(err.response?.data?.message || '예약 취소 처리에 실패했습니다.')
  } finally {
    submitting.value = false
  }
}

// ==========================================================
// 3. SEARCH POPUP (일정 검색)
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
  return loc ? `${timeRange}, ${loc}` : timeRange
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

  const matched = myReservations.value
    .filter((r) => r.status === 'approved' || r.status === 'pending' || r.status === 'cancel_requested')
    .filter((r) => {
      const title = String(r.title || '').toLowerCase()
      const room = String(r.room_name || '').toLowerCase()
      const floor = String(r.floor ? formatFloorLabel(r.floor) : '').toLowerCase()
      const reason = String(r.reason || '').toLowerCase()
      return title.includes(kw) || room.includes(kw) || floor.includes(kw) || reason.includes(kw)
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

// ==========================================================
// DATA FETCHING
// ==========================================================
const fetchAll = async () => {
  loading.value = true
  try {
    const userId = auth.user?.id
    const [roomsRes, myRes, allRes, polRes] = await Promise.all([
      axios.get('/api/rooms'),
      userId ? axios.get('/api/reservations', { params: { user_id: userId, status: 'all' } }) : Promise.resolve({ data: [] }),
      axios.get('/api/reservations', { params: { status: 'all' } }),
      axios.get('/api/reservations/policy').catch(() => ({ data: null }))
    ])
    rooms.value = roomsRes.data || []
    myReservations.value = myRes.data || []
    allActiveReservations.value = allRes.data || []
    policy.value = polRes.data || null

    if (route.query.id) {
      const targetId = Number(route.query.id)
      const target = myReservations.value.find((r) => r.id === targetId)
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
  } catch (err) {
    console.error('Failed to load my reservations:', err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchAll()
})
</script>