<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import AdminReservationCalendarMobile from '@/components/admin/AdminReservationCalendarMobile.vue'
const route = useRoute()
const calendarRef = ref(null)
onMounted(() => {
  if (route.query.id) calendarRef.value?.openReservationById?.(route.query.id)
})
</script>

<template>
  <div class="p-4 space-y-4 pb-28">
    <h1 class="text-2xl font-black text-slate-900">예약 관리</h1>
    <p class="text-sm text-slate-500">예약은 즉시 확정됩니다. 캘린더에서 예약을 변경하거나 취소할 수 있습니다.</p>
    <AdminReservationCalendarMobile ref="calendarRef" />
  </div>
</template>
