<template>
  <div id="app">
    <router-view />
    <GlobalModal />
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import GlobalModal from '@/components/GlobalModal.vue'

onMounted(() => {
  const savedSize = localStorage.getItem('app-font-size') || '14'
  document.documentElement.style.fontSize = `${savedSize}px`
  if (!localStorage.getItem('app-font-size')) {
    localStorage.setItem('app-font-size', '14')
  }
})
</script>

<style>
/* Global styles are in style.css */
</style>
