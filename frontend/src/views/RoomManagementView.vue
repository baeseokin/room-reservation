<script setup>
import { useDevice } from '../composables/useDevice'
import RoomManagementDesktop from '../components/RoomManagementDesktop.vue'
import RoomManagementMobile from '../components/RoomManagementMobile.vue'

const { isMobile } = useDevice()
</script>

<template>
  <RoomManagementMobile v-if="isMobile" />
  <RoomManagementDesktop v-else />
</template>
