<script setup>
import { ref } from 'vue'
import { 
  BuildingOfficeIcon, 
  PencilSquareIcon, 
  TrashIcon, 
  PlusIcon, 
  ChevronRightIcon 
} from '@heroicons/vue/24/outline'

const props = defineProps({
  node: {
    type: Object,
    required: true
  },
  depth: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(['edit', 'delete', 'add-child'])

const isExpanded = ref(true)
</script>

<template>
  <div class="space-y-1">
    <div :style="{ paddingLeft: (depth * 2) + 'rem' }" 
         class="group flex items-center gap-4 p-3 hover:bg-slate-50 rounded-2xl transition-all relative">
      
      <!-- Toggle Button (Indented based on depth) -->
      <div class="flex items-center justify-center w-6 shrink-0">
        <button v-if="node.children && node.children.length > 0" 
                @click="isExpanded = !isExpanded"
                class="p-1 text-slate-300 hover:text-slate-900 transition-transform duration-200"
                :class="{ 'rotate-90': isExpanded }">
          <ChevronRightIcon class="w-4 h-4" />
        </button>
      </div>

      <!-- Node Icon -->
      <div :class="[depth === 0 ? 'bg-slate-900 text-white shadow-lg' : 'bg-white border border-slate-200 text-slate-400']"
           class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105">
        <BuildingOfficeIcon class="w-5 h-5" />
      </div>

      <!-- Info -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <span class="font-black text-slate-900" :class="depth === 0 ? 'text-base' : 'text-sm'">{{ node.dept_name }}</span>
          <span v-if="node.children && node.children.length > 0" class="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">
            {{ node.children.length }}
          </span>
        </div>
        <div class="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">#{{ node.id }}</div>
      </div>

      <!-- Actions -->
      <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
        <button @click="emit('add-child', node.id)" title="하위 부서 추가"
          class="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-all">
          <PlusIcon class="w-4 h-4" />
        </button>
        <button @click="emit('edit', node)" title="수정"
          class="p-2 text-slate-400 hover:text-slate-900 hover:bg-white rounded-lg transition-all shadow-sm border border-transparent hover:border-slate-100">
          <PencilSquareIcon class="w-4 h-4" />
        </button>
        <button @click="emit('delete', node.id)" title="삭제"
          class="p-2 text-rose-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all">
          <TrashIcon class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Recursive Children -->
    <div v-if="isExpanded && node.children && node.children.length > 0" class="relative">
      <!-- Vertical Line for Hierarchy -->
      <div class="absolute left-[1.25rem] top-0 bottom-4 w-px bg-slate-100" 
           :style="{ left: (depth * 2 + 0.75) + 'rem' }"></div>
      
      <div v-for="child in node.children" :key="child.id">
        <DeptTreeNode :node="child" :depth="depth + 1" 
          @edit="(n) => emit('edit', n)" 
          @delete="(id) => emit('delete', id)"
          @add-child="(id) => emit('add-child', id)" />
      </div>
    </div>
  </div>
</template>

<script>
// This is needed for recursive components in some Vue 3 setups if not using unplugin-vue-components
export default {
  name: 'DeptTreeNode'
}
</script>
