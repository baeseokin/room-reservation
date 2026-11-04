<script setup>
import { computed } from 'vue'
import { changeTimePart } from '@/utils/reservationTime'

const props = defineProps({
  modelValue: { type: String, default: '09:00' },
  label: { type: String, required: true },
  endOfDay: Boolean
})
const emit = defineEmits(['update:modelValue', 'change'])
const hour = computed(() => Number(props.modelValue.split(':')[0]) || 0)
const update = (part, value) => {
  const time = changeTimePart(props.modelValue, part, value, props.endOfDay)
  emit('update:modelValue', time)
  emit('change', time)
}
</script>

<template>
  <div class="flex items-center gap-1">
    <select :aria-label="`${label} 오전/오후`" :value="hour % 24 >= 12 ? 'PM' : 'AM'" @change="update('period', $event.target.value)"
            class="flex-1 min-w-0 bg-slate-50 border-none rounded-lg py-2 px-1 font-bold text-xs text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500">
      <option value="AM">오전</option>
      <option value="PM">오후</option>
    </select>
    <select :aria-label="`${label} 시`" :value="hour % 12 || 12" @change="update('hour', $event.target.value)"
            class="flex-1 min-w-0 bg-slate-50 border-none rounded-lg py-2 px-1 font-bold text-xs text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500">
      <option v-for="h in 12" :key="h" :value="h">{{ h }}시</option>
    </select>
    <select :aria-label="`${label} 분`" :value="modelValue.slice(3, 5)" @change="update('minute', $event.target.value)"
            class="flex-1 min-w-0 bg-slate-50 border-none rounded-lg py-2 px-1 font-bold text-xs text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500">
      <option value="00">00분</option>
      <option value="30">30분</option>
    </select>
  </div>
</template>
