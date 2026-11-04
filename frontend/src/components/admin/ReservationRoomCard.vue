<script setup>
import { ref, computed, watch, onUnmounted, nextTick } from 'vue'

const props = defineProps({ room: { type: Object, default: null } })
const imageFailed = ref(false)
const expanded = ref(false)
const closeButton = ref(null)
const trigger = ref(null)
const imageUrl = computed(() => props.room?.image_url || '')
watch(imageUrl, () => { imageFailed.value = false; expanded.value = false })
const floorLabel = computed(() => {
  const floor = String(props.room?.floor ?? '')
  return floor ? `${floor}${floor.includes('B') ? '' : 'F'}` : ''
})
let restoreScroll = null
watch(expanded, async (open) => {
  if (open) {
    const elements = [document.documentElement, document.body]
    const previous = elements.map(el => el.style.overflow)
    elements.forEach(el => { el.style.overflow = 'hidden' })
    restoreScroll = () => elements.forEach((el, index) => { el.style.overflow = previous[index] })
    await nextTick()
    closeButton.value?.focus()
  } else {
    restoreScroll?.()
    restoreScroll = null
    trigger.value?.focus()
  }
})
onUnmounted(() => restoreScroll?.())
</script>

<template>
  <div class="flex items-center gap-3 rounded-3xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm">
    <button v-if="imageUrl && !imageFailed" ref="trigger" type="button" @click="expanded = true"
            :aria-label="`${room?.room_name} 사진 확대`"
            class="relative shrink-0 w-[88px] h-[72px] sm:w-[120px] sm:h-[90px] rounded-xl overflow-hidden bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 group">
      <img :src="imageUrl" :alt="`${room?.room_name} 공간 사진`" @error="imageFailed = true"
           class="w-full h-full object-cover group-hover:opacity-90" />
      <span class="absolute bottom-0 inset-x-0 bg-slate-900/60 py-0.5 text-[10px] font-bold text-white">사진 확대 ↗</span>
    </button>
    <div v-else class="shrink-0 w-[88px] h-[72px] sm:w-[120px] sm:h-[90px] flex items-center justify-center rounded-xl bg-slate-100 text-[11px] text-slate-400 text-center px-2">
      {{ room ? '등록된 사진 없음' : '공간 미선택' }}
    </div>
    <div class="flex-1 min-w-0 space-y-1.5">
      <p class="text-[11px] font-black text-slate-400">예약 공간</p>
      <slot>
        <p class="text-sm font-black text-slate-900 break-words">{{ floorLabel ? `[${floorLabel}] ` : '' }}{{ room?.room_name || '공간을 선택해 주세요' }}</p>
      </slot>
      <p v-if="room?.capacity != null" class="text-xs font-bold text-slate-500">정원 {{ room.capacity }}명</p>
    </div>
  </div>
  <Teleport to="body">
    <div v-if="expanded" role="dialog" aria-modal="true" :aria-label="`${room?.room_name} 사진 확대`"
         class="fixed inset-0 z-[6000] bg-slate-950/90 flex items-center justify-center p-4 sm:p-10 overscroll-none"
         @click.self="expanded = false" @keydown.esc.stop="expanded = false" @wheel.prevent @touchmove.prevent>
      <button ref="closeButton" type="button" aria-label="확대 사진 닫기" @click="expanded = false" @keydown.tab.prevent
              class="absolute top-4 right-4 w-11 h-11 rounded-full bg-white text-slate-700 text-xl font-bold">✕</button>
      <figure class="max-w-5xl w-full text-center pointer-events-none">
        <img :src="imageUrl" :alt="`${room?.room_name} 공간 사진`" class="max-h-[80vh] max-w-full mx-auto object-contain rounded-xl" />
        <figcaption class="text-white text-sm font-bold mt-3">{{ floorLabel }} · {{ room?.room_name }}</figcaption>
      </figure>
    </div>
  </Teleport>
</template>
