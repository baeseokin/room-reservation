<script setup>
import { ref, computed } from 'vue'
defineProps({ modelValue: Boolean })
const emit = defineEmits(['update:modelValue'])
const spaceRules = [
  { title: '냉난방 및 전등 소등', desc: '사용 후에는 반드시 냉난방기와 전등을 모두 꺼주세요.' },
  { title: '음식물 반입 금지', desc: '쾌적한 환경을 위해 공간 내 음식물 반입은 원칙적으로 금지됩니다.' },
  { title: '비품 원위치 및 정리', desc: '사용하신 비품과 기자재는 퇴실 전 원래 자리에 정돈해 주세요.' },
  { title: '기물 파손 책임', desc: '시설 및 비품 파손에 주의해 주시고, 파손 발생 시 즉시 사무실로 알려주세요.' },
  { title: '목적 외 사용 금지 (개인 레슨 / 외부 행사 금지)', desc: '본 시설은 교회 공식 사역용 공간입니다. 사적 이익을 위한 개인 레슨이나 사전 승인되지 않은 외부 단체·개인의 행사 및 연습 목적으로는 일절 사용할 수 없습니다.' }
]
const checkedRules = ref(spaceRules.map(() => false))
const confirmed = ref(false)
const allChecked = computed(() => checkedRules.value.every(Boolean))
const notify = () => emit('update:modelValue', allChecked.value && confirmed.value)
const toggleAll = (event) => {
  checkedRules.value = spaceRules.map(() => event.target.checked)
  confirmed.value = event.target.checked
  notify()
}
</script>

<template>
  <section class="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 space-y-4" aria-label="공간 사용 수칙 동의">
    <h3 class="text-sm font-black text-indigo-900">공간 사용 수칙 동의 (필수)</h3>
    <label v-for="(rule, index) in spaceRules" :key="rule.title" class="flex items-start gap-3 cursor-pointer">
      <input v-model="checkedRules[index]" type="checkbox" @change="notify" class="mt-1 w-5 h-5 shrink-0 rounded border-slate-300 text-indigo-600" />
      <span class="text-xs leading-relaxed">
        <strong class="block text-slate-800">{{ rule.title }}</strong>
        <span class="text-slate-600">{{ rule.desc }}</span>
      </span>
    </label>
    <label class="flex items-start gap-3 text-xs font-bold text-slate-700 cursor-pointer border-t border-indigo-100 pt-3">
      <input v-model="confirmed" type="checkbox" @change="notify" class="w-5 h-5 shrink-0 rounded border-slate-300 text-indigo-600" />
      위 수칙을 확인했으며 이에 동의합니다.
    </label>
    <label class="flex items-center gap-3 text-sm font-black text-indigo-800 cursor-pointer">
      <input type="checkbox" :checked="allChecked && confirmed" @change="toggleAll" class="w-5 h-5 rounded border-slate-300 text-indigo-600" />
      전체 동의
    </label>
  </section>
</template>
