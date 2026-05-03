<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="modal.isOpen" class="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" @click="handleCancel"></div>
        
        <!-- Modal Content -->
        <Transition :name="isMobile ? 'mobile-pop' : 'pop'">
          <div v-if="modal.isOpen" 
            :class="[
              isMobile 
                ? 'w-[300px] bg-white rounded-[2.5rem] shadow-2xl p-6 relative overflow-hidden' 
                : 'relative w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl shadow-slate-900/20 overflow-hidden border border-white/20'
            ]"
          >
            <!-- Mobile UI -->
            <template v-if="isMobile">
              <div class="flex flex-col items-center">
                <div :class="[
                  modal.type === 'confirm' ? 'bg-amber-50 text-amber-500' : 
                  modal.type === 'prompt' ? 'bg-indigo-50 text-indigo-600' :
                  'bg-rose-50 text-rose-500'
                ]" 
                  class="w-14 h-14 rounded-2xl flex items-center justify-center mb-5">
                  <component :is="
                    modal.type === 'confirm' ? QuestionMarkCircleIcon : 
                    modal.type === 'prompt' ? PencilSquareIcon :
                    ExclamationCircleIcon" 
                    class="w-7 h-7" 
                  />
                </div>

                <div class="text-center mb-6">
                  <h3 class="text-lg font-black text-slate-900 tracking-tight mb-2">{{ modal.title }}</h3>
                  <p class="text-slate-500 font-bold text-[13px] leading-relaxed whitespace-pre-line">{{ modal.message }}</p>
                </div>

                <!-- Prompt Input (Mobile) -->
                <div v-if="modal.type === 'prompt'" class="w-full mb-6">
                  <input 
                    v-model="modal.promptValue" 
                    type="text" 
                    :placeholder="modal.promptPlaceholder"
                    class="w-full bg-slate-50 border-none rounded-2xl py-3.5 px-5 font-bold text-sm shadow-inner focus:ring-2 focus:ring-indigo-500 transition-all text-slate-800"
                    @keyup.enter="modal.close(true)"
                    autofocus
                  />
                </div>

                <div class="flex w-full gap-2">
                  <button v-if="modal.type === 'confirm' || modal.type === 'prompt'" 
                    @click="modal.close(false)"
                    class="flex-1 bg-slate-100 text-slate-400 font-black py-4 rounded-2xl text-[10px] uppercase tracking-widest active:scale-95 transition-all">
                    취소
                  </button>
                  <button @click="modal.close(true)"
                    class="flex-1 bg-slate-900 text-white font-black py-4 rounded-2xl text-[10px] uppercase tracking-widest shadow-lg shadow-slate-200 active:scale-95 transition-all">
                    확인
                  </button>
                </div>
              </div>
            </template>

            <!-- PC UI -->
            <template v-else>
              <div class="h-2 bg-indigo-600 w-full"></div>
              <div class="p-8">
                <div class="flex items-center justify-center mb-6">
                  <div :class="[
                    modal.type === 'confirm' ? 'bg-amber-50 text-amber-500' : 
                    modal.type === 'prompt' ? 'bg-indigo-50 text-indigo-600' :
                    'bg-indigo-50 text-indigo-600'
                  ]" 
                    class="w-16 h-16 rounded-2xl flex items-center justify-center shadow-inner">
                    <component :is="
                      modal.type === 'confirm' ? QuestionMarkCircleIcon : 
                      modal.type === 'prompt' ? PencilSquareIcon :
                      ExclamationCircleIcon" 
                      class="w-8 h-8" 
                    />
                  </div>
                </div>

                <div class="text-center space-y-2 mb-6">
                  <h3 class="text-xl font-black text-slate-900 tracking-tight">{{ modal.title }}</h3>
                  <p class="text-slate-500 font-bold text-sm leading-relaxed whitespace-pre-line">{{ modal.message }}</p>
                </div>

                <div v-if="modal.type === 'prompt'" class="mb-8">
                  <input 
                    v-model="modal.promptValue" 
                    type="text" 
                    :placeholder="modal.promptPlaceholder"
                    class="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 font-bold shadow-inner focus:ring-2 focus:ring-indigo-500 transition-all text-slate-800"
                    @keyup.enter="modal.close(true)"
                    autofocus
                  />
                </div>

                <div class="flex gap-3">
                  <button v-if="modal.type === 'confirm' || modal.type === 'prompt'" 
                    @click="modal.close(false)"
                    class="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-400 font-black py-4 rounded-2xl transition-all active:scale-[0.98] text-[10px] uppercase tracking-widest">
                    취소
                  </button>
                  <button @click="modal.close(true)"
                    class="flex-1 bg-slate-900 hover:bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-slate-100 transition-all active:scale-[0.98] text-[10px] uppercase tracking-widest">
                    확인
                  </button>
                </div>
              </div>
            </template>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useModalStore } from '@/stores/useModalStore'
import { ExclamationCircleIcon, QuestionMarkCircleIcon, PencilSquareIcon } from '@heroicons/vue/24/outline'

const modal = useModalStore()
const isMobile = ref(window.innerWidth < 640)

const updateSize = () => {
  isMobile.value = window.innerWidth < 640
}

onMounted(() => window.addEventListener('resize', updateSize))
onUnmounted(() => window.removeEventListener('resize', updateSize))

const handleCancel = () => {
  if (modal.type === 'confirm') {
    modal.close(false)
  }
}
</script>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

.pop-enter-active {
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.pop-leave-active {
  transition: all 0.25s ease-in;
}
.pop-enter-from {
  opacity: 0;
  transform: scale(0.9) translateY(20px);
}
.pop-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

.mobile-pop-enter-active {
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.mobile-pop-leave-active {
  transition: all 0.2s ease-in;
}
.mobile-pop-enter-from {
  opacity: 0;
  transform: scale(0.85);
}
.mobile-pop-leave-to {
  opacity: 0;
  transform: scale(0.9);
}
</style>
