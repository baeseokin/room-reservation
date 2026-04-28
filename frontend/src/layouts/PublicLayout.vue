<template>
  <div class="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900">
    <!-- Top Navigation Bar (Premium Bright) -->
    <header class="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 px-6 py-4 flex items-center justify-between sticky top-0 z-50 shadow-sm shadow-slate-200/20">
      <div class="flex items-center gap-8">
        <router-link to="/home" class="flex items-center group transition-transform active:scale-95">
          <img src="../assets/logo_wonchon.png" alt="원천교회" class="h-8 object-contain" />
          <div class="ml-3 h-6 w-px bg-slate-200 hidden sm:block"></div>
          <span class="ml-3 text-sm font-black text-slate-900 tracking-tighter hidden sm:block">공간 예약</span>
        </router-link>

        <nav class="hidden md:flex items-center gap-1">
          <router-link v-for="item in navItems" :key="item.path" :to="item.path"
            exact-active-class="bg-slate-900 text-white shadow-lg shadow-slate-200"
            class="px-4 py-2 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-all whitespace-nowrap">
            {{ item.name }}
          </router-link>
        </nav>
      </div>

      <div class="flex items-center gap-3">
        <!-- User Info & Logout (if logged in) -->
        <template v-if="auth.user">
          <div class="hidden lg:flex flex-col items-end mr-2">
            <span class="text-[10px] font-black text-indigo-600 uppercase tracking-widest leading-none mb-1">성도님 환영합니다</span>
            <span class="text-sm font-black text-slate-900 leading-none">{{ auth.user.userName }}님</span>
          </div>
          <div class="w-px h-8 bg-slate-200 mx-2 hidden lg:block"></div>
          <button @click="auth.logout()" class="p-2.5 bg-slate-50 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all group" title="로그아웃">
            <ArrowLeftOnRectangleIcon class="w-5 h-5" />
          </button>
        </template>

        <!-- Admin Access -->
        <template v-if="auth.isAdmin">
          <router-link to="/admin" class="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-black bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
            <ShieldCheckIcon class="w-4 h-4" />
            <span class="hidden sm:inline">관리자 모드</span>
          </router-link>
        </template>
        
        <template v-else-if="!auth.user">
          <router-link to="/" class="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black bg-slate-900 text-white hover:bg-slate-800 transition-all shadow-lg shadow-slate-200">
            로그인
          </router-link>
        </template>

        <!-- Mobile Menu Toggle -->
        <button @click="isMobileMenuOpen = !isMobileMenuOpen" class="md:hidden p-2.5 bg-slate-50 rounded-xl text-slate-600">
          <Bars3Icon class="w-6 h-6" />
        </button>
      </div>
    </header>

    <!-- Mobile Navigation Drawer -->
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0 -translate-y-4"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-4"
    >
      <div v-if="isMobileMenuOpen" class="md:hidden bg-white border-b border-slate-100 p-6 space-y-4 shadow-xl z-40 relative">
        <router-link v-for="item in navItems" :key="item.path" :to="item.path" @click="isMobileMenuOpen = false"
          class="block px-4 py-3 rounded-2xl text-base font-black text-slate-600 hover:bg-slate-50"
          exact-active-class="bg-indigo-50 text-indigo-600">
          {{ item.name }}
        </router-link>
      </div>
    </Transition>

    <!-- Main Content Area -->
    <main class="flex-1">
      <router-view v-slot="{ Component }">
        <Transition mode="out-in" enter-active-class="transition duration-300 ease-out" enter-from-class="opacity-0 translate-y-4" enter-to-class="opacity-100 translate-y-0" leave-active-class="transition duration-200 ease-in" leave-from-class="opacity-100" leave-to-class="opacity-0">
          <component :is="Component" />
        </Transition>
      </router-view>
    </main>

    <!-- Footer (Premium Clean) -->
    <footer v-if="!$route.path.startsWith('/app/reservations')" class="bg-white border-t border-slate-100 py-12 mt-auto">
      <div class="max-w-7xl mx-auto px-6 flex flex-col items-center space-y-4 text-center">
        <img src="../assets/logo_wonchon.png" alt="원천교회" class="h-6 opacity-30 grayscale" />
        <p class="text-[10px] text-slate-300 font-black uppercase tracking-[0.2em]">
          WONCHEON BAPTIST CHURCH · SPACE RESERVATION SYSTEM
        </p>
        <p class="text-[10px] text-slate-400 font-bold">© 2024 WONCHEON CHURCH. ALL RIGHTS RESERVED.</p>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../store/auth'
import { 
  CalendarIcon, 
  HomeIcon, 
  ShieldCheckIcon, 
  Bars3Icon, 
  XMarkIcon, 
  ArrowLeftOnRectangleIcon 
} from '@heroicons/vue/24/outline'

const auth = useAuthStore()
const isMobileMenuOpen = ref(false)

const navItems = [
  { name: '홈', path: '/home' },
  { name: '공간 예약', path: '/home/reservations' },
  { name: '나의 예약', path: '/home/my-reservations' },

  { name: '내 정보', path: '/home/profile' },
]
</script>
