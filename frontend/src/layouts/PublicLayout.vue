<script setup>
import { useAuthStore } from '../store/auth'
import { useRouter } from 'vue-router'
import { CalendarIcon, HomeIcon, ShieldCheckIcon, SparklesIcon } from '@heroicons/vue/24/outline'

const auth = useAuthStore()
const router = useRouter()
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex flex-col">
    <!-- Top Navigation Bar -->
    <header class="bg-white border-b border-slate-100 px-6 py-3 flex items-center justify-between sticky top-0 z-30 shadow-sm">
      <router-link to="/" class="flex items-center">
        <img src="../assets/logo_wonchon.png" alt="원천교회" class="h-7 object-contain" />
      </router-link>

      <nav class="flex items-center gap-2">
        <router-link v-if="$route.path !== '/'" to="/" exact-active-class="bg-slate-100 text-slate-900" class="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-all">
          <HomeIcon class="w-4 h-4" />
          홈
        </router-link>

        <router-link v-if="!$route.path.startsWith('/reservations')" to="/reservations" active-class="bg-indigo-600 text-white" class="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-all">
          <CalendarIcon class="w-4 h-4" />
          공간 예약
        </router-link>

        <!-- User Links (if logged in) -->
        <template v-if="auth.user">
          <router-link to="/my-reservations" active-class="bg-indigo-50 text-indigo-600" class="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-all">
            나의 예약
          </router-link>
          <router-link to="/inquiries" active-class="bg-indigo-50 text-indigo-600" class="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-all">
            문의 관리
          </router-link>
          <router-link to="/profile" active-class="bg-indigo-50 text-indigo-600" class="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-all">
            내 정보
          </router-link>
        </template>

        <!-- Admin badge if logged in -->
        <template v-if="auth.isAdmin">
          <div class="w-px h-5 bg-slate-200 mx-1"></div>
          <router-link to="/admin" class="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-slate-900 text-white hover:bg-slate-800 transition-all">
            <ShieldCheckIcon class="w-4 h-4" />
            관리자
          </router-link>
        </template>
        <template v-else-if="!auth.user">
          <div class="w-px h-5 bg-slate-200 mx-1"></div>
          <router-link to="/login" class="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
            <SparklesIcon class="w-4 h-4" />
            로그인
          </router-link>
        </template>
      </nav>
    </header>

    <!-- Main Content -->
    <main class="flex-1">
      <router-view />
    </main>

    <!-- Footer -->
    <footer v-if="!$route.path.startsWith('/reservations')" class="bg-white border-t border-slate-100 py-8 mt-auto">
      <div class="max-w-7xl mx-auto px-6 text-center">
        <p class="text-[11px] text-slate-400 font-bold uppercase tracking-widest">© 원천교회 공간 예약시스템</p>
      </div>
    </footer>
  </div>
</template>
