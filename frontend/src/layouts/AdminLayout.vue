<script setup>
import { useAuthStore } from '../store/auth'
import { useRouter } from 'vue-router'
import {
  CalendarIcon, MapIcon, UserGroupIcon, BuildingOfficeIcon,
  ArrowLeftOnRectangleIcon, Bars3Icon, XMarkIcon, ShieldCheckIcon, HomeIcon, UserPlusIcon
} from '@heroicons/vue/24/outline'
import { ref } from 'vue'

const auth = useAuthStore()
const router = useRouter()
const isSidebarOpen = ref(false)
const isCollapsed = ref(false)

const navItems = [
  { name: '예약 관리', icon: CalendarIcon, path: '/admin/reservations' },
  { name: '공간 관리', icon: MapIcon, path: '/admin/rooms' },
  { name: '사용자 관리', icon: UserGroupIcon, path: '/admin/users' },
  { name: '가입 신청 관리', icon: UserPlusIcon, path: '/admin/applications' },
  { name: '부서 관리', icon: BuildingOfficeIcon, path: '/admin/departments' },
]

const logout = () => auth.logout()
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex">
    <!-- Desktop Sidebar -->
    <aside :class="[isCollapsed ? 'w-20 px-3' : 'w-64 px-5']" class="hidden lg:flex flex-col bg-slate-900 text-white py-6 transition-all duration-300 shrink-0 h-screen sticky top-0">
      <div :class="[isCollapsed ? 'justify-center' : 'justify-between']" class="flex items-center mb-8 h-10 px-2 shrink-0">
        <div v-if="!isCollapsed" class="flex items-center gap-2">
          <ShieldCheckIcon class="w-5 h-5 text-indigo-400" />
          <span class="text-base font-black tracking-tight">관리자 패널</span>
        </div>
        <button @click="isCollapsed = !isCollapsed" class="p-2 hover:bg-slate-800 rounded-xl text-slate-400 transition-colors">
          <Bars3Icon class="w-5 h-5" />
        </button>
      </div>

      <nav class="flex-1 space-y-1 overflow-y-auto scrollbar-hide pr-1">
        <router-link
          v-for="item in navItems" :key="item.name"
          :to="item.path" :title="isCollapsed ? item.name : ''"
          class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-slate-400 hover:bg-slate-800 hover:text-white whitespace-nowrap"
          active-class="bg-indigo-600 text-white shadow-lg"
        >
          <component :is="item.icon" class="w-5 h-5 shrink-0" />
          <span v-if="!isCollapsed" class="text-sm">{{ item.name }}</span>
        </router-link>

        <div class="my-3 border-t border-slate-800"></div>

        <router-link to="/" :title="isCollapsed ? '홈' : ''"
          class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-slate-500 hover:bg-slate-800 hover:text-white whitespace-nowrap text-sm">
          <HomeIcon class="w-5 h-5 shrink-0" />
          <span v-if="!isCollapsed">홈으로</span>
        </router-link>
      </nav>

      <div class="pt-6 border-t border-slate-800 space-y-3 shrink-0">
        <div v-if="!isCollapsed" class="px-2 py-2 rounded-xl bg-slate-800">
          <div class="text-xs font-black text-slate-400 uppercase tracking-widest">로그인된 관리자</div>
          <div class="text-sm font-bold text-white mt-0.5">{{ auth.user?.userName }}</div>
        </div>
        <button @click="logout" :title="isCollapsed ? '로그아웃' : ''"
          class="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors font-bold text-sm whitespace-nowrap">
          <ArrowLeftOnRectangleIcon class="w-5 h-5 shrink-0" />
          <span v-if="!isCollapsed">로그아웃</span>
        </button>
      </div>
    </aside>

    <!-- Mobile Header -->
    <div class="lg:hidden fixed top-0 left-0 right-0 h-16 bg-slate-900 text-white flex items-center justify-between px-6 z-40">
      <div class="flex items-center gap-2">
        <ShieldCheckIcon class="w-5 h-5 text-indigo-400" />
        <span class="font-black text-base">관리자 패널</span>
      </div>
      <button @click="isSidebarOpen = true"><Bars3Icon class="w-7 h-7" /></button>
    </div>

    <!-- Mobile Drawer -->
    <div v-if="isSidebarOpen" class="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50" @click="isSidebarOpen = false">
      <div class="w-4/5 max-w-xs h-full bg-slate-900 text-white p-6 flex flex-col gap-6" @click.stop>
        <div class="flex justify-between items-center">
          <span class="font-black text-lg">관리자 패널</span>
          <button @click="isSidebarOpen = false"><XMarkIcon class="w-7 h-7" /></button>
        </div>
        <nav class="flex-1 space-y-2">
          <router-link v-for="item in navItems" :key="item.name"
            :to="item.path" @click="isSidebarOpen = false"
            class="flex items-center gap-3 text-base font-bold text-slate-400 py-2"
            active-class="text-indigo-400">
            <component :is="item.icon" class="w-6 h-6" />
            {{ item.name }}
          </router-link>
          <router-link to="/" @click="isSidebarOpen = false" class="flex items-center gap-3 text-base font-bold text-slate-500 py-2">
            <HomeIcon class="w-6 h-6" />홈으로
          </router-link>
        </nav>
        <button @click="logout" class="text-slate-500 font-bold flex items-center gap-2">
          <ArrowLeftOnRectangleIcon class="w-5 h-5" /> 로그아웃
        </button>
      </div>
    </div>

    <!-- Main Content -->
    <main class="flex-1 min-h-screen overflow-y-auto pt-16 lg:pt-0">
      <router-view />
    </main>
  </div>
</template>
