<script setup>
import { useAuthStore } from '../store/auth'
import { useRouter } from 'vue-router'
import { 
  HomeIcon, 
  MapIcon, 
  CalendarIcon, 
  UserGroupIcon,
  BuildingOfficeIcon,
  ArrowLeftOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/vue/24/outline'
import { ref } from 'vue'

const auth = useAuthStore()
const router = useRouter()
const isSidebarOpen = ref(false)
const isCollapsed = ref(false)

const navItems = [
  { name: '홈', icon: HomeIcon, path: '/' },
  { name: '공간 예약', icon: CalendarIcon, path: '/reservations' },
  { name: '공간 관리', icon: MapIcon, path: '/rooms', adminOnly: true },
  { name: '부서 관리', icon: BuildingOfficeIcon, path: '/admin/departments', adminOnly: true },
  { name: '사용자 관리', icon: UserGroupIcon, path: '/admin/users', adminOnly: true },
  { name: '나의 예약', icon: HomeIcon, path: '/my-reservations' },
  { name: '나의 문의 관리', icon: ChatBubbleLeftRightIcon, path: '/inquiries' },
]

const filteredNav = navItems.filter(item => {
  if (item.adminOnly) return auth.user?.roles.includes('관리자')
  return true
})

const logout = () => auth.logout()
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex">
    <!-- Desktop Sidebar -->
    <aside :class="[isCollapsed ? 'w-20 px-3' : 'w-72 px-6']" class="hidden lg:flex flex-col bg-slate-900 text-white py-6 transition-all duration-300 relative">
      <!-- Toggle Button (Top) -->
      <div :class="[isCollapsed ? 'flex-col gap-4' : 'justify-between']" class="flex items-center mb-10 px-2">
        <div v-if="!isCollapsed" class="flex items-center">
          <img src="../assets/logo_wonchon.png" alt="Logo" class="h-8 object-contain bg-white rounded-lg p-1" />
        </div>
        <img v-else src="../assets/logo_wonchon.png" alt="Logo" class="w-8 h-8 object-cover object-left bg-white rounded-lg p-1" />
        <button @click="isCollapsed = !isCollapsed" 
                class="p-2 hover:bg-slate-800 rounded-xl text-slate-400 transition-colors">
          <Bars3Icon class="w-6 h-6" />
        </button>
      </div>
      
      <nav class="flex-1 space-y-2 overflow-hidden">
        <router-link 
          v-for="item in filteredNav" 
          :key="item.name" 
          :to="item.path"
          :title="isCollapsed ? item.name : ''"
          class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold hover:bg-slate-800 whitespace-nowrap"
          exact-active-class="bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
        >
          <component :is="item.icon" class="w-6 h-6 shrink-0" />
          <span v-if="!isCollapsed">{{ item.name }}</span>
        </router-link>
      </nav>

      <div class="pt-8 border-t border-slate-800 space-y-4 overflow-hidden">
        <router-link to="/profile" class="flex items-center gap-3 px-2 py-2 rounded-2xl hover:bg-white/5 transition-all group" exact-active-class="bg-white/10 text-indigo-400">
          <div class="w-10 h-10 shrink-0 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center font-bold text-indigo-400 group-hover:border-indigo-500 transition-colors">
             {{ auth.user?.userName.charAt(0) }}
          </div>
          <div v-if="!isCollapsed" class="flex-1 overflow-hidden">
             <div class="text-sm font-bold truncate group-hover:text-indigo-400 transition-colors">{{ auth.user?.userName }}</div>
             <div class="text-[12px] text-slate-500 truncate">{{ auth.user?.deptName || '미지정' }}</div>
          </div>
        </router-link>
        <button @click="logout" 
                :title="isCollapsed ? '로그아웃' : ''"
                class="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors font-bold text-sm whitespace-nowrap">
          <ArrowLeftOnRectangleIcon class="w-5 h-5 shrink-0" />
          <span v-if="!isCollapsed">로그아웃</span>
        </button>
      </div>
    </aside>

    <!-- Mobile Header -->
    <div class="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-100 flex items-center justify-between px-6 z-40">
      <div class="flex items-center">
        <img src="../assets/logo_wonchon.png" alt="Logo" class="h-8 object-contain" />
      </div>
      <button @click="isSidebarOpen = true">
        <Bars3Icon class="w-8 h-8 text-slate-900" />
      </button>
    </div>

    <!-- Mobile Drawer -->
    <div v-if="isSidebarOpen" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 overflow-hidden" @click="isSidebarOpen = false">
      <div class="w-4/5 h-full bg-slate-900 text-white p-8 flex flex-col space-y-8" @click.stop>
        <div class="flex justify-between items-center">
          <div class="flex items-center">
            <img src="../assets/logo_wonchon.png" alt="Logo" class="h-10 object-contain bg-white rounded-lg p-1" />
          </div>
          <button @click="isSidebarOpen = false">
            <XMarkIcon class="w-8 h-8" />
          </button>
        </div>
        
        <nav class="flex-1 space-y-4">
          <router-link 
            v-for="item in filteredNav" 
            :key="item.name" 
            :to="item.path"
            @click="isSidebarOpen = false"
            class="flex items-center gap-4 text-xl font-bold"
            exact-active-class="text-indigo-400"
          >
            <component :is="item.icon" class="w-8 h-8" />
            {{ item.name }}
          </router-link>
        </nav>

        <button @click="logout" class="text-slate-500 font-bold flex items-center gap-2">
           <ArrowLeftOnRectangleIcon class="w-6 h-6" /> 로그아웃
        </button>
      </div>
    </div>

    <!-- Main Content -->
    <main class="flex-1 lg:h-screen overflow-y-auto pt-20 lg:pt-0">
      <router-view />
    </main>
  </div>
</template>
