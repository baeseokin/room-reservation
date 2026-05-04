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
  <div class="space-y-2">
    <div :style="{ marginLeft: (depth * 1.5) + 'rem' }" 
         class="group flex items-center gap-3 p-4 bg-white border border-slate-100 rounded-[2rem] shadow-sm active:bg-slate-50 transition-all">
      
      <!-- Toggle Button -->
      <div class="flex items-center justify-center w-6 shrink-0">
        <button v-if="node.children && node.children.length > 0" 
                @click="isExpanded = !isExpanded"
                class="p-1 text-slate-300 transition-transform duration-200"
                :class="{ 'rotate-90': isExpanded }">
          <ChevronRightIcon class="w-4 h-4" />
        </button>
      </div>

      <!-- Node Icon -->
      <div :class="[depth === 0 ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-50 text-slate-400']"
           class="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0">
        <BuildingOfficeIcon class="w-5 h-5" />
      </div>

      <!-- Info -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <span class="font-black text-slate-900 truncate" :class="depth === 0 ? 'text-sm' : 'text-xs'">{{ node.dept_name }}</span>
          <span v-if="node.children && node.children.length > 0" class="text-[9px] font-black text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-lg">
            {{ node.children.length }}
          </span>
        </div>
        <div class="text-[9px] text-slate-300 font-bold uppercase tracking-widest leading-none mt-1">ID: {{ node.id }}</div>
      </div>

      <!-- Actions (Always visible on mobile but compact) -->
      <div class="flex gap-1 shrink-0">
        <button @click="emit('add-child', node.id)" class="p-2 text-indigo-500 bg-indigo-50/50 rounded-xl">
          <PlusIcon class="w-4 h-4" />
        </button>
        <button @click="emit('edit', node)" class="p-2 text-slate-400 bg-slate-50 rounded-xl">
          <PencilSquareIcon class="w-4 h-4" />
        </button>
        <button @click="emit('delete', node.id)" class="p-2 text-rose-300 bg-rose-50 rounded-xl">
          <TrashIcon class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Recursive Children -->
    <div v-if="isExpanded && node.children && node.children.length > 0" class="space-y-2">
      <div v-for="child in node.children" :key="child.id">
        <DeptTreeNodeMobile :node="child" :depth="depth + 1" 
          @edit="(n) => emit('edit', n)" 
          @delete="(id) => emit('delete', id)"
          @add-child="(id) => emit('add-child', id)" />
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'DeptTreeNodeMobile'
}
</script>
