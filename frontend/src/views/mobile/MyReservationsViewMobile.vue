<template>
  <div
    :class="['flex flex-col relative', displayMode === 'calendar' ? 'select-none overscroll-none' : '']"
    @touchstart="displayMode === 'calendar' && onCalendarTouchStart($event)"
    @touchmove="displayMode === 'calendar' && onCalendarTouchMove($event)"
    @touchend="displayMode === 'calendar' && onCalendarTouchEnd($event)"
    @touchcancel="displayMode === 'calendar' && onCalendarTouchEnd($event)"
    @mousedown="displayMode === 'calendar' && onCalendarMouseDown($event)"
  >
    <template v-if="displayMode === 'calendar'">
    <!-- 1. Fixed Top Header Section (상단 완전 고정: 월 네비게이터 + 요일 헤더) -->
    <div class="fixed-calendar-header sticky top-16 z-30 bg-slate-50 pt-1 pb-1 space-y-2 select-none touch-none">
      <!-- 1-1. Top Month Navigator Header -->
      <div class="px-5">
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

          <!-- Right: Status Legend -->
          <div class="flex items-center gap-1 text-[10px] font-bold" aria-label="예약 상태 범례">
            <span class="px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
              승인
            </span>
            <span class="px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700">
              대기
            </span>
          </div>
        </div>
      </div>

      <!-- 1-2. Weekday Headers (일 ~ 토) - 상단 고정 헤더 -->
      <div class="bg-white rounded-t-3xl shadow-sm border-t border-x border-slate-100/80 grid grid-cols-7 pt-3 pb-2 border-b border-slate-100 text-center text-xs font-black">
        <span class="text-rose-500">일</span>
        <span class="text-slate-600">월</span>
        <span class="text-slate-600">화</span>
        <span class="text-slate-600">수</span>
        <span class="text-slate-600">목</span>
        <span class="text-slate-600">금</span>
        <span class="text-blue-600">토</span>
      </div>
    </div>

    <!-- 2. Movable Calendar Body Card Container (터치 드래그로 위아래 움직이는 영역) -->
    <div
      class="bg-white rounded-b-3xl shadow-sm border-b border-x border-slate-100/80 overflow-hidden"
    >
      <!-- Calendar Grid Body (with Smooth Horizontal Swipe Animation) -->
      <div
        class="overflow-hidden"
        :style="calendarContainerStyle"
        @transitionend.self="updateScheduleListHeight"
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

              <!-- Event bars + overflow count -->
              <div
                class="space-y-0.5 pt-1 min-h-[2.5rem] pointer-events-none"
              >
                <div
                  v-for="item in cell.items.slice(0, 2)"
                  :key="item.id"
                  class="px-1.5 py-0.5 rounded text-[10px] font-bold truncate leading-tight"
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

      <!-- Grab Handle Bar (터치 드래그 바 - 위/아래 드래그 및 탭 지원 - 2줄 막대기 바) -->
      <div
        @click="toggleCalendarCollapse()"
        class="py-2.5 cursor-pointer flex flex-col items-center justify-center gap-1 group touch-none select-none border-t border-slate-100 bg-white hover:bg-slate-50 transition-colors"
        :title="isCalendarCollapsed ? '아래로 당기거나 터치하여 전체 캘린더 펼치기' : '위로 밀거나 터치하여 캘린더 접기'"
      >
        <div class="w-10 h-1 bg-slate-300 group-hover:bg-slate-400 rounded-full transition-colors"></div>
        <div class="w-10 h-1 bg-slate-300 group-hover:bg-slate-400 rounded-full transition-colors"></div>
      </div>

      <!-- 3. Bottom Schedule List Panel (터치 드래그에 맞춰 자연스럽게 슬라이드) -->
      <div
        v-show="effectiveCollapseProgress > 0.01"
        class="border-t border-slate-100 bg-white px-5 overflow-hidden"
        :style="schedulePanelStyle"
      >
        <div class="pt-3 pb-6 space-y-4 min-h-[15rem]">
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

          <div v-else ref="scheduleListRef" class="space-y-2.5 overflow-y-auto overscroll-contain pr-0.5 touch-pan-y" :style="{ maxHeight: scheduleListMaxHeight, WebkitOverflowScrolling: 'touch' }">
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
                  :class="item.is_blocked ? 'bg-teal-100 text-teal-800' : statusBadgeClass(item.status)"
                >
                  {{ item.is_blocked ? '고정 일정' : statusLabel(item.status) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 3. Bottom Grey Background Area (캘린더 하단 회색 배경 터치 드래그 영역) -->
    <div
      class="flex-1 min-h-[6rem] -mx-5 px-5 cursor-pointer touch-none"
      title="위/아래로 드래그하여 캘린더 접기/펼치기"
    ></div>

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

    </template>
    <section v-else class="space-y-4 pb-8">
      <div class="flex items-center justify-between gap-3">
        <div>
          <h2 class="text-xl font-black text-slate-900">나의 예약</h2>
          <p class="text-xs font-bold text-slate-500 mt-1">내가 신청한 예약을 확인하고 관리합니다.</p>
        </div>
        <button type="button" @click="fetchAll" :disabled="loading" class="shrink-0 p-3 rounded-xl border border-slate-200 bg-white text-slate-600 disabled:opacity-50" aria-label="예약 목록 새로고침">
          <ArrowPathIcon class="w-5 h-5" :class="{ 'animate-spin': loading }" />
        </button>
      </div>
      <div class="bg-white border border-slate-200 rounded-2xl p-3 space-y-3">
        <input v-model="listQuery" type="search" aria-label="내 예약 검색" placeholder="신청명, 공간명, 사용 목적 검색" class="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-indigo-500" />
        <div class="grid grid-cols-2 gap-2">
          <select v-model="listPeriod" aria-label="조회 기간" class="rounded-xl border border-slate-200 p-2.5 text-xs font-bold">
            <option value="3">최근 3개월부터</option><option value="6">최근 6개월부터</option><option value="12">최근 1년부터</option><option value="all">전체 기간</option>
          </select>
          <select v-model="listStatus" aria-label="예약 상태" class="rounded-xl border border-slate-200 p-2.5 text-xs font-bold">
            <option value="all">전체 상태</option><option value="approved">예약 확정</option><option value="cancelled">취소됨</option><option value="rejected">거부됨</option>
          </select>
        </div>
      </div>
      <div class="flex justify-between items-center">
        <span class="text-xs font-bold text-slate-500">총 {{ filteredListReservations.length }}건</span>
        <button type="button" @click="openBookingForActiveDay" class="bg-indigo-600 text-white rounded-xl px-4 py-2.5 text-xs font-black">+ 신규 예약</button>
      </div>
      <p v-if="loading" class="text-center py-12 text-sm text-slate-500">예약을 불러오는 중입니다.</p>
      <p v-else-if="!listGroups.length" class="text-center py-12 rounded-2xl bg-white border border-dashed border-slate-200 text-sm text-slate-500">조건에 맞는 예약이 없습니다.</p>
      <div v-else class="space-y-3">
        <article v-for="group in listGroups" :key="group.key" class="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <button type="button" class="w-full p-4 text-left space-y-2 hover:bg-slate-50" @click="group.recurring ? toggleListGroup(group.key) : openDetail(group.items[0])" :aria-expanded="group.recurring ? expandedListGroups.includes(group.key) : undefined">
            <div class="flex items-start justify-between gap-2">
              <span class="text-sm font-black text-slate-900 break-words">{{ group.items[0].title || '(신청명 없음)' }}</span>
              <span v-if="group.recurring" class="shrink-0 text-xs font-black text-indigo-600">반복 {{ group.items.length }}건 {{ expandedListGroups.includes(group.key) ? '▴' : '▾' }}</span>
              <span v-else class="shrink-0 rounded-lg px-2 py-1 text-[11px]" :class="statusBadgeClass(group.items[0].status)">{{ statusLabel(group.items[0].status) }}</span>
            </div>
            <p class="text-xs font-bold text-slate-600">{{ formatFloorLabel(group.items[0].floor) }} · {{ group.items[0].room_name }}</p>
            <p class="text-xs text-slate-500">{{ fmtDate(group.items[0].reservation_date) }}<template v-if="group.recurring && group.items.length > 1"> ~ {{ fmtDate(group.items[group.items.length - 1].reservation_date) }}</template></p>
            <p class="text-xs font-black text-indigo-600">{{ fmtTime(group.items[0].start_time) }} ~ {{ fmtTime(group.items[0].end_time) }}</p>
          </button>
          <div v-if="group.recurring && expandedListGroups.includes(group.key)" class="border-t border-slate-100 divide-y divide-slate-100">
            <button v-for="item in group.items" :key="item.id" type="button" @click="openDetail(item)" class="w-full flex items-center justify-between gap-2 p-4 text-left hover:bg-indigo-50">
              <span class="text-xs font-bold text-slate-700">{{ fmtDate(item.reservation_date) }} · {{ fmtTime(item.start_time) }} ~ {{ fmtTime(item.end_time) }}</span>
              <span class="shrink-0 rounded-lg px-2 py-1 text-[11px]" :class="statusBadgeClass(item.status)">{{ statusLabel(item.status) }}</span>
            </button>
          </div>
        </article>
      </div>
    </section>

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
              <h3 class="text-base font-black text-slate-900">{{ bookingStep === 'form' ? '예약 신청' : '공간 사용 수칙 동의' }}</h3>
            </div>
            <button
              @click="closeBookingModal"
              class="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-black active:scale-90"
            >
              ✕
            </button>
          </div>

          <!-- Form Body -->
          <div ref="bookingBodyRef" class="p-6 overflow-y-auto space-y-4">
            <template v-if="bookingStep === 'form'">
            <!-- 1. Room Selection -->
            <ReservationRoomCard :room="rooms.find(r => String(r.id) === String(bookingForm.room_id))">
              <select aria-label="예약할 공간"
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
            </ReservationRoomCard>

            <!-- 2. Date -->
            <div class="space-y-1.5">
              <label class="text-xs font-black text-slate-700">예약 일자 *</label>
              <input
                type="date"
                v-model="bookingForm.reservation_date"
                class="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-black text-slate-800 outline-none"
              />
            </div>

            <!-- 당일 예약 현황 (Simple Badges) -->
            <div class="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/80 space-y-2">
              <div class="flex items-center justify-between">
                <label class="flex items-center gap-1.5 text-[0.6875rem] font-black text-slate-500 uppercase tracking-wider">
                  <ClockIcon class="w-3.5 h-3.5 text-indigo-500" />
                  당일 예약 현황
                </label>
                <span class="text-[0.625rem] font-bold text-slate-400">
                  {{ bookingForm.reservation_date }}
                </span>
              </div>

              <div v-if="!selectedBookingRoom" class="py-2.5 px-3 text-center bg-indigo-50/50 rounded-xl border border-dashed border-indigo-200">
                <p class="text-xs font-bold text-indigo-600">먼저 예약할 공간을 선택해 주세요.</p>
              </div>
              <div v-else-if="currentBookingRoomSchedule.length === 0" class="py-2.5 px-3 text-center bg-white rounded-xl border border-dashed border-slate-200">
                <p class="text-xs font-bold text-slate-400">당일 예약 내역이 없습니다. (원하는 시간에 예약 가능)</p>
              </div>
              <div v-else class="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                <div
                  v-for="item in currentBookingRoomSchedule"
                  :key="item.id"
                  class="inline-flex items-center rounded-xl border overflow-hidden shadow-xs text-xs transition-all"
                  :class="item.type === 'blocked' ? 'border-teal-200 bg-teal-50/70' : 'border-slate-200 bg-white'"
                >
                  <!-- Time Badge -->
                  <span
                    class="px-2 py-0.5 font-black text-[0.6875rem] font-mono tracking-tight shrink-0 flex items-center gap-1"
                    :class="item.type === 'blocked' ? 'bg-teal-100 text-teal-800' : 'bg-slate-800 text-white'"
                  >
                    <span class="w-1.5 h-1.5 rounded-full" :class="item.type === 'blocked' ? 'bg-teal-500' : 'bg-emerald-400'"></span>
                    {{ item.start_time }} - {{ item.end_time }}
                  </span>
                  <!-- Title Badge -->
                  <span
                    class="px-2 py-0.5 font-bold text-[0.6875rem] truncate max-w-[150px] flex items-center gap-1"
                    :class="item.type === 'blocked' ? 'text-teal-900' : 'text-slate-800'"
                  >
                    <span>{{ item.title }}</span>
                    <span v-if="item.requester_name" class="text-[0.5625rem] font-normal text-slate-400">({{ item.requester_name }})</span>
                  </span>
                </div>
              </div>
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
            </template>
            <SpaceRulesAgreement v-else v-model="bookingRulesAgreed" />
          </div>

          <!-- Footer Submit Button -->
          <div class="p-4 border-t border-slate-100 bg-white flex gap-2">
            <button v-if="bookingStep === 'agreement'" type="button" @click="bookingStep = 'form'" :disabled="submitting"
                    class="flex-1 py-4 rounded-2xl bg-slate-100 text-slate-600 text-xs font-black disabled:opacity-50">이전으로</button>
            <button
              @click="submitBooking"
              :disabled="!bookingForm.room_id || submitting || !!bookingConflictError || (bookingStep === 'agreement' && !bookingRulesAgreed)"
              class="flex-[2] py-4 rounded-2xl bg-indigo-600 text-white text-xs font-black shadow-lg shadow-indigo-100 active:scale-95 disabled:opacity-50 transition-all"
            >
              {{ submitting ? '신청 처리 중...' : bookingStep === 'form' ? '다음' : '동의 및 예약 확정' }}
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
            <!-- 1. Edit Mode Header -->
            <div v-if="isEditing">
              <div class="flex items-center gap-1.5 mb-1 flex-wrap">
                <template v-if="selectedEditRoom">
                  <span class="bg-indigo-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md uppercase">
                    {{ formatFloorLabel(selectedEditRoom.floor) }}
                  </span>
                  <span class="text-xs font-black text-indigo-600">{{ roomLabel(selectedEditRoom) }}</span>
                </template>
                <span v-else class="bg-amber-100 text-amber-700 text-[10px] font-black px-2 py-0.5 rounded-md">
                  공간 미선택
                </span>
                <span class="text-slate-300 text-xs">|</span>
                <span class="text-xs font-black text-slate-600">
                  {{ editForm.reservation_date }}
                </span>
              </div>
              <h3 class="text-base font-black text-slate-900">{{ editStep === 'form' ? '예약 변경 신청' : '공간 사용 수칙 동의' }}</h3>
            </div>

            <!-- 2. Cancel Confirm Mode Header -->
            <div v-else-if="showCancelConfirm">
              <div class="flex items-center gap-1.5 mb-1 flex-wrap">
                <span class="bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md uppercase">
                  {{ formatFloorLabel(selectedRes.floor) }}
                </span>
                <span class="text-xs font-black text-rose-600">{{ selectedRes.room_name }}</span>
                <span class="text-slate-300 text-xs">|</span>
                <span class="text-xs font-black text-slate-600">{{ fmtDate(selectedRes.reservation_date) }}</span>
              </div>
              <h3 class="text-base font-black text-slate-900">예약 취소 신청</h3>
            </div>

            <!-- 3. Detail View Mode Header -->
            <div v-else class="flex items-center gap-2">
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
          <div ref="detailBodyRef" class="p-6 overflow-y-auto space-y-5">
            <!-- Normal View Mode -->
            <template v-if="!isEditing && !showCancelConfirm">
              <ReservationRoomCard :room="rooms.find(r => String(r.id) === String(selectedRes.room_id)) || selectedRes" />
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
              <SpaceRulesAgreement v-if="editStep === 'agreement'" v-model="editRulesAgreed" />
              <div v-else class="space-y-4">
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
                      :class="modifyScope === 'single' ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' : 'bg-white text-slate-600 border-slate-200'"
                    >
                      이 일정만 변경
                    </button>
                    <button
                      type="button"
                      @click="modifyScope = 'all'"
                      class="py-2.5 px-3 rounded-xl text-xs font-black transition-all border"
                      :class="modifyScope === 'all' ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' : 'bg-white text-slate-600 border-slate-200'"
                    >
                      남은 전체 반복 일정
                    </button>
                  </div>
                </div>

                <!-- 1. Room Selection -->
                <ReservationRoomCard :room="rooms.find(r => String(r.id) === String(editForm.room_id))">
                  <select aria-label="예약할 공간"
                    v-model="editForm.room_id"
                    class="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-black text-slate-800 outline-none focus:bg-white focus:border-indigo-500 transition-all"
                  >
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
                </ReservationRoomCard>

                <!-- 2. Date -->
                <div class="space-y-1.5">
                  <label class="text-xs font-black text-slate-700">예약 일자 *</label>
                  <input
                    type="date"
                    v-model="editForm.reservation_date"
                    :disabled="selectedRes.is_recurring && modifyScope === 'all'"
                    class="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-black text-slate-800 outline-none focus:bg-white focus:border-indigo-500 disabled:opacity-50 transition-all"
                  />
                </div>

                <!-- 당일 예약 현황 (Simple Badges) -->
                <div class="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/80 space-y-2">
                  <div class="flex items-center justify-between">
                    <label class="flex items-center gap-1.5 text-[0.6875rem] font-black text-slate-500 uppercase tracking-wider">
                      <ClockIcon class="w-3.5 h-3.5 text-indigo-500" />
                      당일 예약 현황
                    </label>
                    <span class="text-[0.625rem] font-bold text-slate-400">
                      {{ editForm.reservation_date }}
                    </span>
                  </div>

                  <div v-if="!selectedEditRoom" class="py-2.5 px-3 text-center bg-indigo-50/50 rounded-xl border border-dashed border-indigo-200">
                    <p class="text-xs font-bold text-indigo-600">먼저 예약할 공간을 선택해 주세요.</p>
                  </div>
                  <div v-else-if="currentEditRoomSchedule.length === 0" class="py-2.5 px-3 text-center bg-white rounded-xl border border-dashed border-slate-200">
                    <p class="text-xs font-bold text-slate-400">당일 예약 내역이 없습니다. (원하는 시간에 예약 가능)</p>
                  </div>
                  <div v-else class="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                    <div
                      v-for="item in currentEditRoomSchedule"
                      :key="item.id"
                      class="inline-flex items-center rounded-xl border overflow-hidden shadow-xs text-xs transition-all"
                      :class="item.type === 'blocked'
                        ? 'border-teal-200 bg-teal-50/70'
                        : (item.is_self ? 'border-indigo-300 bg-indigo-50/70' : 'border-slate-200 bg-white')"
                    >
                      <!-- Time Badge -->
                      <span
                        class="px-2 py-0.5 font-black text-[0.6875rem] font-mono tracking-tight shrink-0 flex items-center gap-1"
                        :class="item.type === 'blocked'
                          ? 'bg-teal-100 text-teal-800'
                          : (item.is_self ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-white')"
                      >
                        <span
                          class="w-1.5 h-1.5 rounded-full"
                          :class="item.type === 'blocked' ? 'bg-teal-500' : (item.is_self ? 'bg-white' : 'bg-emerald-400')"
                        ></span>
                        {{ item.start_time }} - {{ item.end_time }}
                      </span>
                      <!-- Title Badge -->
                      <span
                        class="px-2 py-0.5 font-bold text-[0.6875rem] truncate max-w-[150px] flex items-center gap-1"
                        :class="item.type === 'blocked'
                          ? 'text-teal-900'
                          : (item.is_self ? 'text-indigo-900 font-black' : 'text-slate-800')"
                      >
                        <span>{{ item.title }}</span>
                        <span v-if="item.requester_name && !item.is_self" class="text-[0.5625rem] font-normal text-slate-400">({{ item.requester_name }})</span>
                      </span>
                    </div>
                  </div>
                </div>

                <!-- 3. Time Range -->
                <div class="grid grid-cols-2 gap-3">
                  <div class="space-y-1.5">
                    <label class="text-xs font-black text-slate-700">시작 시간 *</label>
                    <select
                      v-model="editForm.start_time"
                      @change="handleEditStartTimeChange"
                      class="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-3 text-xs font-black text-slate-800 outline-none focus:bg-white focus:border-indigo-500 transition-all"
                    >
                      <option v-for="t in timeOptions" :key="t" :value="t">{{ t }}</option>
                    </select>
                  </div>
                  <div class="space-y-1.5">
                    <label class="text-xs font-black text-slate-700">종료 시간 *</label>
                    <select
                      v-model="editForm.end_time"
                      class="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-3 text-xs font-black text-slate-800 outline-none focus:bg-white focus:border-indigo-500 transition-all"
                    >
                      <option v-for="t in timeOptions" :key="t" :value="t">{{ t }}</option>
                    </select>
                  </div>
                </div>

                <!-- Time Conflict Warning -->
                <div
                  v-if="editTimeConflictError"
                  class="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-600 flex items-center gap-2"
                >
                  <span>⚠️</span>
                  <span>{{ editTimeConflictError }}</span>
                </div>

                <!-- 4. Title -->
                <div class="space-y-1.5">
                  <label class="text-xs font-black text-slate-700">신청명 (일정 제목) *</label>
                  <input
                    type="text"
                    v-model="editForm.title"
                    placeholder="예: 청년부 소그룹 모임"
                    class="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-black text-slate-800 outline-none focus:bg-white focus:border-indigo-500 transition-all"
                  />
                </div>

                <!-- 5. Reason -->
                <div class="space-y-1.5">
                  <label class="text-xs font-black text-slate-700">사용 목적 및 내용</label>
                  <textarea
                    v-model="editForm.reason"
                    rows="2"
                    placeholder="사용 목적을 입력해 주세요."
                    class="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs font-bold text-slate-800 outline-none resize-none focus:bg-white focus:border-indigo-500 transition-all"
                  ></textarea>
                </div>

                <!-- 6. Modify Reason for Admin Approval -->
                <div class="space-y-1.5">
                  <label class="text-xs font-black text-indigo-600">
                    변경 사유 *
                  </label>
                  <textarea
                    v-model="editForm.modify_reason"
                    rows="2"
                    placeholder="예: 회의 참석 인원 증가로 시간 연장 요청합니다."
                    class="w-full bg-slate-50 border border-indigo-200 rounded-2xl p-3.5 text-xs font-bold text-slate-800 outline-none resize-none focus:bg-white focus:border-indigo-500 transition-all"
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
                    {{ selectedRes.status === 'approved' ? '취소하면 즉시 반영됩니다.' : '예약을 취소하시겠습니까?' }}
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
                    취소 사유 *
                  </label>
                  <textarea
                    v-model="cancelReason"
                    rows="3"
                    placeholder="취소 사유를 입력해 주세요."
                    class="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs font-bold text-slate-800 outline-none resize-none focus:bg-white focus:border-rose-400 transition-all"
                  ></textarea>
                </div>
              </div>
            </template>
          </div>

          <!-- Footer Buttons -->
          <div class="p-4 border-t border-slate-100 bg-white flex gap-2 shrink-0">
            <template v-if="!isEditing && !showCancelConfirm">
              <!-- Normal Actions -->
              <template v-if="selectedRes.status !== 'cancelled' && selectedRes.status !== 'rejected'">
                <button
                  @click="startEdit"
                  class="flex-1 py-4 rounded-2xl bg-indigo-600 text-white text-xs font-black shadow-lg shadow-indigo-100 active:scale-95 transition-all"
                >
                  예약 변경
                </button>
                <button
                  @click="showCancelConfirm = true"
                  class="flex-1 py-4 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 text-xs font-black active:scale-95 transition-all"
                >
                  예약 취소
                </button>
              </template>
            </template>

            <!-- Edit Mode Buttons -->
            <template v-else-if="isEditing">
              <button
                @click="editStep === 'agreement' ? editStep = 'form' : isEditing = false"
                class="flex-1 py-4 rounded-2xl bg-slate-100 text-slate-600 text-xs font-black active:scale-95 transition-all"
              >
                {{ editStep === 'agreement' ? '이전으로' : '뒤로' }}
              </button>
              <button
                @click="submitModify"
                :disabled="submitting || !!editTimeConflictError || (editStep === 'agreement' && !editRulesAgreed)"
                class="flex-[2] py-4 rounded-2xl bg-indigo-600 text-white text-xs font-black shadow-lg shadow-indigo-100 active:scale-95 disabled:opacity-50 transition-all"
              >
                {{ submitting ? '신청 중...' : editStep === 'form' ? '다음' : '동의 및 예약 변경' }}
              </button>
            </template>

            <!-- Cancel Mode Buttons -->
            <template v-else-if="showCancelConfirm">
              <button
                @click="showCancelConfirm = false"
                class="flex-1 py-4 rounded-2xl bg-slate-100 text-slate-600 text-xs font-black active:scale-95 transition-all"
              >
                뒤로
              </button>
              <button
                @click="submitCancel"
                :disabled="submitting"
                class="flex-[2] py-4 rounded-2xl bg-rose-600 text-white text-xs font-black shadow-lg shadow-rose-100 active:scale-95 disabled:opacity-50 transition-all"
              >
                {{ submitting ? '처리 중...' : (selectedRes.status === 'approved' ? '예약 취소' : '취소 확정') }}
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
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'
import SpaceRulesAgreement from '@/components/SpaceRulesAgreement.vue'
import ReservationRoomCard from '@/components/admin/ReservationRoomCard.vue'
import { useAuthStore } from '@/store/auth'
import { useModalStore } from '@/stores/useModalStore'
import { getHoliday } from '@/utils/holidays'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  ClockIcon,
  ArrowPathIcon
} from '@heroicons/vue/24/outline'

const { displayMode } = defineProps({ displayMode: { type: String, default: 'list' } })
const route = useRoute()
const auth = useAuthStore()
const modal = useModalStore()

const loading = ref(false)
const rooms = ref([])
const myReservations = ref([])
const allActiveReservations = ref([]) // For conflict checking
const listQuery = ref('')
const listStatus = ref('all')
const listPeriod = ref('3')
const expandedListGroups = ref([])
const toggleListGroup = (key) => {
  expandedListGroups.value = expandedListGroups.value.includes(key)
    ? expandedListGroups.value.filter(value => value !== key)
    : [...expandedListGroups.value, key]
}
const filteredListReservations = computed(() => {
  const from = new Date()
  from.setMonth(from.getMonth() - Number(listPeriod.value || 0))
  const query = listQuery.value.trim().toLowerCase()
  return myReservations.value.filter(item => {
    if (listPeriod.value !== 'all' && fmtDate(item.reservation_date) < toDateStr(from)) return false
    if (listStatus.value !== 'all' && item.status !== listStatus.value) return false
    return !query || [item.title, item.room_name, item.reason, item.floor].some(value => String(value || '').toLowerCase().includes(query))
  }).sort((a, b) => fmtDate(b.reservation_date).localeCompare(fmtDate(a.reservation_date)) || fmtTime(a.start_time).localeCompare(fmtTime(b.start_time)))
})
const listGroups = computed(() => {
  const groups = new Map()
  for (const item of filteredListReservations.value) {
    const key = item.is_recurring
      ? `series-${item.recurring_id || `${item.room_id}-${item.title}-${item.start_time}-${item.end_time}`}`
      : `single-${item.id}`
    if (!groups.has(key)) groups.set(key, { key, recurring: Boolean(item.is_recurring), items: [] })
    groups.get(key).items.push(item)
  }
  return [...groups.values()].map(group => ({ ...group, items: group.items.sort((a, b) => fmtDate(a.reservation_date).localeCompare(fmtDate(b.reservation_date))) }))
})

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
  approved: '예약 확정',
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

const getCellDotColors = (cell) => {
  if (!cell.items || cell.items.length === 0) return []
  const dots = []
  for (const item of cell.items.slice(0, 3)) {
    if (item.is_blocked) dots.push('bg-teal-500')
    else if (item.status === 'cancel_requested') dots.push('bg-rose-500')
    else if (item.status === 'pending') dots.push('bg-amber-400')
    else dots.push('bg-indigo-600')
  }
  return dots
}

// Counts for header summary

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

const totalHeightDeltaPx = computed(() => {
  const rem = typeof window !== 'undefined'
    ? (parseFloat(getComputedStyle(document.documentElement).fontSize) || 16)
    : 16
  const expandedH = totalCalendarWeeks.value * 5.25
  const collapsedH = 0
  return Math.max(1, (expandedH - collapsedH) * rem)
})

const calendarContainerStyle = computed(() => {
  const p = effectiveCollapseProgress.value
  const expandedH = totalCalendarWeeks.value * 5.25
  const collapsedH = 0
  const h = Math.max(0, expandedH - p * (expandedH - collapsedH))
  return {
    height: `${h}rem`,
    transition: isDraggingY.value ? 'none' : 'height 420ms cubic-bezier(0.22, 1, 0.36, 1)'
  }
})

const cellHeightStyle = computed(() => {
  return {
    height: '5.25rem',
    minHeight: '5.25rem'
  }
})

const calendarGridTransformStyle = computed(() => {
  const x = swipeTranslateX.value
  return {
    transform: `translate3d(${x}px, 0, 0)`,
    transition: isSwipingX.value ? 'none' : 'transform 260ms cubic-bezier(0.2, 0.8, 0.2, 1)'
  }
})

const visibleCells = computed(() => calendarCells.value)

// Let the day list use the viewport space above the floating controls.
const scheduleListRef = ref(null)
const scheduleListMaxHeight = ref('none')
let scheduleResizeObserver = null
const updateScheduleListHeight = () => {
  const list = scheduleListRef.value
  if (!list) return
  const viewport = window.visualViewport
  const viewportBottom = viewport ? viewport.height + viewport.offsetTop : window.innerHeight
  const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize)
  // Reserve the bottom controls (bottom-20 + button height), panel padding and a gap.
  const bottomSpace = 10 * rootFontSize
  scheduleListMaxHeight.value = `${Math.max(0, viewportBottom - list.getBoundingClientRect().top - bottomSpace)}px`
}
watch(scheduleListRef, (list) => {
  scheduleResizeObserver?.disconnect()
  if (!list) return
  scheduleResizeObserver = new ResizeObserver(updateScheduleListHeight)
  scheduleResizeObserver.observe(list.closest('.rounded-b-3xl'))
  updateScheduleListHeight()
}, { flush: 'post' })

const schedulePanelStyle = computed(() => {
  const p = effectiveCollapseProgress.value
  return {
    opacity: Math.max(0, Math.min(1, (p - 0.1) / 0.9)),
    transform: `translate3d(0, ${(1 - p) * 16}px, 0)`,
    transition: isDraggingY.value ? 'none' : 'opacity 320ms ease, transform 420ms cubic-bezier(0.22, 1, 0.36, 1)'
  }
})

// Touch Gestures handling
let touchStartX = 0
let touchStartY = 0
let gestureMode = null
let startInScrollableList = false
let isMouseDown = false
const swipeTranslateX = ref(0)
const isSwipingX = ref(false)

const onCalendarTouchStart = (e) => {
  if (e.target.closest('button, input, select, a') || e.target.closest('.fixed-calendar-header')) {
    gestureMode = 'ignored'
    return
  }
  const t = e.touches[0]
  touchStartX = t.clientX
  touchStartY = t.clientY
  gestureMode = null
  dragDeltaY.value = 0
  swipeTranslateX.value = 0

  startInScrollableList = !!e.target.closest('.overflow-y-auto')
}

const onCalendarTouchMove = (e) => {
  if (gestureMode === 'ignored') {
    if (e.cancelable) e.preventDefault()
    return
  }
  const t = e.touches[0]
  const dx = t.clientX - touchStartX
  const dy = t.clientY - touchStartY

  // Keep list gestures native, including momentum and gestures at the top edge.
  // Calendar expansion is controlled by the grab handle and calendar area.
  if (startInScrollableList) return

  // Prevent browser window from scrolling vertically when touching outside scrollable list
  if (e.cancelable) {
    e.preventDefault()
  }

  if (!gestureMode) {
    if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
      gestureMode = 'horizontal'
      isSwipingX.value = true
    } else if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) {
      gestureMode = 'vertical'
      isDraggingY.value = true
    }
  }

  if (gestureMode === 'horizontal') {
    swipeTranslateX.value = dx * 0.75
  } else if (gestureMode === 'vertical') {
    dragDeltaY.value = dy
    const spanPx = totalHeightDeltaPx.value
    dragProgress.value = Math.max(-1, Math.min(1, -dy / spanPx))
  }
}

const onCalendarTouchEnd = () => {
  if (gestureMode === 'ignored') {
    gestureMode = null
    return
  }
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
    const threshold = Math.max(64, Math.min(120, totalHeightDeltaPx.value * 0.22))
    if (isCalendarCollapsed.value) {
      if (dragDeltaY.value > threshold || effectiveCollapseProgress.value < 0.6) {
        toggleCalendarCollapse(false)
      }
    } else {
      if (dragDeltaY.value < -threshold || effectiveCollapseProgress.value > 0.4) {
        toggleCalendarCollapse(true)
      }
    }
    dragProgress.value = 0
    isDraggingY.value = false
  }
  gestureMode = null
}

const onCalendarMouseDown = (e) => {
  if (e.target.closest('button, input, select, a') || e.target.closest('.fixed-calendar-header')) {
    gestureMode = 'ignored'
    return
  }
  isMouseDown = true
  touchStartX = e.clientX
  touchStartY = e.clientY
  gestureMode = null
  dragDeltaY.value = 0
  swipeTranslateX.value = 0

  startInScrollableList = !!e.target.closest('.overflow-y-auto')

  window.addEventListener('mousemove', onCalendarMouseMove)
  window.addEventListener('mouseup', onCalendarMouseUp)
}

const onCalendarMouseMove = (e) => {
  if (!isMouseDown || e.buttons !== 1) return
  if (gestureMode === 'ignored') return
  const dx = e.clientX - touchStartX
  const dy = e.clientY - touchStartY

  if (startInScrollableList) return

  if (!gestureMode) {
    if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
      gestureMode = 'horizontal'
      isSwipingX.value = true
    } else if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) {
      gestureMode = 'vertical'
      isDraggingY.value = true
    }
  }

  if (gestureMode === 'horizontal') {
    swipeTranslateX.value = dx * 0.75
  } else if (gestureMode === 'vertical') {
    dragDeltaY.value = dy
    const spanPx = totalHeightDeltaPx.value
    dragProgress.value = Math.max(-1, Math.min(1, -dy / spanPx))
  }
}

const onCalendarMouseUp = () => {
  if (!isMouseDown) return
  isMouseDown = false
  window.removeEventListener('mousemove', onCalendarMouseMove)
  window.removeEventListener('mouseup', onCalendarMouseUp)
  onCalendarTouchEnd()
}

const toggleCalendarCollapse = (val) => {
  isCalendarCollapsed.value = typeof val === 'boolean' ? val : !isCalendarCollapsed.value
}

// Day selection and clicking
const handleDayCellClick = (cell) => {
  if (Math.abs(dragDeltaY.value) > 10 || Math.abs(swipeTranslateX.value) > 10) return
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
const bookingStep = ref('form')
const editStep = ref('form')
const bookingBodyRef = ref(null)
const detailBodyRef = ref(null)
const bookingRulesAgreed = ref(false)
const editRulesAgreed = ref(false)
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

const currentBookingRoomSchedule = computed(() => {
  if (!selectedBookingRoom.value || !bookingForm.value.reservation_date) return []
  const items = []
  const dateStr = bookingForm.value.reservation_date

  // 1. Blocked times
  const blockedList = getBlockedForRoomAndDate(selectedBookingRoom.value, dateStr)
  for (const bt of blockedList) {
    items.push({
      id: `bt-${bt.id}`,
      type: 'blocked',
      is_blocked: true,
      title: bt.reason || '관리자 설정 고정 일정',
      requester_name: null,
      start_time: fmtTime(bt.start_time),
      end_time: fmtTime(bt.end_time)
    })
  }

  // 2. Existing active reservations
  for (const r of allActiveReservations.value) {
    if (r.status === 'cancelled' || r.status === 'rejected') continue
    if (Number(r.room_id) === Number(selectedBookingRoom.value.id) && fmtDate(r.reservation_date) === dateStr) {
      items.push({
        id: `res-${r.id}`,
        type: 'reservation',
        is_blocked: false,
        title: r.title || '공간 사용',
        requester_name: r.requester_name,
        start_time: fmtTime(r.start_time),
        end_time: fmtTime(r.end_time),
        status: r.status
      })
    }
  }

  return items.sort((a, b) => a.start_time.localeCompare(b.start_time))
})

const openBookingForActiveDay = () => {
  const targetDate = displayMode === 'list' ? todayStr.value : (activeDayStr.value || todayStr.value)
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
  bookingStep.value = 'form'
  bookingRulesAgreed.value = false
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
  if (submitting.value) return
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

  if (bookingStep.value === 'form') {
    bookingRulesAgreed.value = false
    bookingStep.value = 'agreement'
    await nextTick()
    if (bookingBodyRef.value) {
      bookingBodyRef.value.scrollTop = 0
      bookingBodyRef.value.querySelector('input[type="checkbox"]')?.focus({ preventScroll: true })
    }
    return
  }

  if (!bookingRulesAgreed.value) {
    await modal.showAlert('모든 공간 사용 수칙에 동의해 주세요.')
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
    await modal.showAlert('예약이 확정되었습니다.')
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

const selectedEditRoom = computed(() => {
  if (!editForm.value.room_id) return null
  return rooms.value.find((r) => Number(r.id) === Number(editForm.value.room_id)) || null
})

const currentEditRoomSchedule = computed(() => {
  if (!selectedEditRoom.value || !editForm.value.reservation_date) return []
  const items = []
  const dateStr = editForm.value.reservation_date

  // 1. Blocked times
  const blockedList = getBlockedForRoomAndDate(selectedEditRoom.value, dateStr)
  for (const bt of blockedList) {
    items.push({
      id: `bt-${bt.id}`,
      type: 'blocked',
      is_blocked: true,
      title: bt.reason || '관리자 설정 고정 일정',
      requester_name: null,
      start_time: fmtTime(bt.start_time),
      end_time: fmtTime(bt.end_time)
    })
  }

  // 2. Existing active reservations
  for (const r of allActiveReservations.value) {
    if (r.status === 'cancelled' || r.status === 'rejected') continue
    if (Number(r.room_id) === Number(selectedEditRoom.value.id) && fmtDate(r.reservation_date) === dateStr) {
      const isSelf = selectedRes.value && Number(r.id) === Number(selectedRes.value.id)
      items.push({
        id: `res-${r.id}`,
        type: isSelf ? 'self' : 'reservation',
        is_self: isSelf,
        is_blocked: false,
        title: isSelf ? `${r.title || '공간 사용'} (현재 건)` : (r.title || '공간 사용'),
        requester_name: r.requester_name,
        start_time: fmtTime(r.start_time),
        end_time: fmtTime(r.end_time),
        status: r.status
      })
    }
  }

  return items.sort((a, b) => a.start_time.localeCompare(b.start_time))
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
  editStep.value = 'form'
  editRulesAgreed.value = false
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
  if (submitting.value) return
  if (!editForm.value.title.trim()) {
    await modal.showAlert('신청명을 입력해 주세요.')
    return
  }
  if (!editForm.value.modify_reason.trim()) {
    await modal.showAlert('변경 사유를 입력해 주세요.')
    return
  }
  if (editTimeConflictError.value) {
    await modal.showAlert(editTimeConflictError.value)
    return
  }

  if (editStep.value === 'form') {
    editRulesAgreed.value = false
    editStep.value = 'agreement'
    await nextTick()
    if (detailBodyRef.value) {
      detailBodyRef.value.scrollTop = 0
      detailBodyRef.value.querySelector('input[type="checkbox"]')?.focus({ preventScroll: true })
    }
    return
  }

  if (!editRulesAgreed.value) {
    await modal.showAlert('모든 공간 사용 수칙에 동의해 주세요.')
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
        ? `총 ${count}건의 예약 변경이 완료되었습니다.`
        : '예약 변경이 완료되었습니다.'
    )
  } catch (err) {
    await modal.showAlert(err.response?.data?.message || '예약 변경 신청에 실패했습니다.')
  } finally {
    submitting.value = false
  }
}

const submitCancel = async () => {
  if (!cancelReason.value.trim()) {
    await modal.showAlert('취소 사유를 입력해 주세요.')
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

watch(() => displayMode === 'list' && Boolean(showBookingModal.value || showModal.value || showSearchModal.value), (open, _, onCleanup) => {
  if (!open) return
  const elements = [document.documentElement, document.body]
  const overflow = elements.map(element => element.style.overflow)
  elements.forEach(element => { element.style.overflow = 'hidden' })
  onCleanup(() => elements.forEach((element, index) => { element.style.overflow = overflow[index] }))
})

let previousPageOverflow = null
onMounted(() => {
  if (displayMode === 'calendar') {
    window.addEventListener('resize', updateScheduleListHeight)
    window.visualViewport?.addEventListener('resize', updateScheduleListHeight)
    previousPageOverflow = [document.documentElement.style.overflow, document.body.style.overflow]
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
  }
  fetchAll()
})

onUnmounted(() => {
  scheduleResizeObserver?.disconnect()
  window.removeEventListener('resize', updateScheduleListHeight)
  window.visualViewport?.removeEventListener('resize', updateScheduleListHeight)
  if (previousPageOverflow) {
    document.documentElement.style.overflow = previousPageOverflow[0]
    document.body.style.overflow = previousPageOverflow[1]
  }
  window.removeEventListener('mousemove', onCalendarMouseMove)
  window.removeEventListener('mouseup', onCalendarMouseUp)
})
</script>
