<template>
  <div id="app">
    <router-view />
    <GlobalModal />
  </div>
</template>

<script setup>
import GlobalModal from '@/components/GlobalModal.vue'
</script>

<style>
/* Global styles are in style.css */
</style>
