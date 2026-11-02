<template>
  <div class="min-h-screen bg-slate-50 flex flex-col font-sans pb-24">
    <!-- Top Bar -->
    <header class="h-16 px-5 bg-white border-b border-slate-100 flex items-center justify-between sticky top-0 z-40 backdrop-blur-xl bg-white/90 shrink-0">
      <div class="flex items-center gap-4">
        <router-link to="/m/home" class="flex items-center active:scale-95 transition-all">
          <img src="../assets/logo_wonchon.png" alt="Logo" class="w-7 h-7 object-cover object-left opacity-90" />
        </router-link>
        <div class="w-px h-4 bg-slate-200"></div>
        <h1 class="text-sm font-black text-slate-800 tracking-tight uppercase">{{ pageTitle }}</h1>
      </div>
      <div class="flex items-center border border-slate-200 bg-white rounded-lg shadow-sm overflow-hidden select-none ml-auto mr-2 shrink-0">
        <button @click="decreaseFontSize" class="px-2.5 h-8 flex items-center justify-center text-[11px] font-bold text-slate-500 hover:bg-slate-50 active:bg-slate-100 transition-colors border-r border-slate-200" title="글자 축소">
          가 -
        </button>
        <button @click="increaseFontSize" class="px-2.5 h-8 flex items-center justify-center text-[11px] font-bold text-slate-500 hover:bg-slate-50 active:bg-slate-100 transition-colors" title="글자 확대">
          가 +
        </button>
      </div>
      <button
        @click="toggleFullscreen"
        class="w-10 h-10 mr-1.5 flex items-center justify-center rounded-xl transition-all active:scale-95 shrink-0"
        :class="isFullscreen ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'"
        :title="isFullscreen ? '전체화면 종료' : '전체화면 전환'"
      >
        <ArrowsPointingInIcon v-if="isFullscreen" class="w-5 h-5" />
        <ArrowsPointingOutIcon v-else class="w-5 h-5" />
      </button>
      <button @click="logout" class="w-10 h-10 flex items-center justify-center bg-slate-50 text-slate-400 rounded-xl hover:bg-rose-50 hover:text-rose-500 transition-all active:scale-95 shrink-0" title="로그아웃">
        <ArrowRightOnRectangleIcon class="w-5 h-5" />
      </button>
    </header>

    <!-- Main Content -->
    <main class="flex-1 p-5">
      <router-view />
    </main>

    <!-- Bottom Navigation -->
    <nav class="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-6 py-3 flex justify-between items-center z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
      <router-link v-for="item in navItems" :key="item.path" :to="item.path"
        class="flex flex-col items-center gap-1 group"
        :class="[$route.path === item.path ? 'text-indigo-600' : 'text-slate-400']">
        <component :is="item.icon" class="w-6 h-6 transition-transform group-active:scale-90" />
        <span class="text-[0.625rem] font-black uppercase tracking-widest">{{ item.label }}</span>
      </router-link>
    </nav>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../store/auth'
import { useModalStore } from '@/stores/useModalStore'
import { 
  HomeIcon, 
  CalendarIcon, 
  ClockIcon, 
  UserIcon,
  ArrowRightOnRectangleIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  ShieldCheckIcon
} from '@heroicons/vue/24/outline'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const modal = useModalStore()
const isFontMenuOpen = ref(false)
const isFullscreen = ref(false)

const syncFullscreenState = () => {
  isFullscreen.value = !!(
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement
  )
}

const toggleFullscreen = async () => {
  const docEl = document.documentElement
  const isCurrentlyFullscreen = !!(
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement
  )

  try {
    if (!isCurrentlyFullscreen) {
      if (docEl.requestFullscreen) {
        await docEl.requestFullscreen()
      } else if (docEl.webkitRequestFullscreen) {
        await docEl.webkitRequestFullscreen()
      } else {
        modal.showAlert(
          '현재 브라우저(iPhone Safari 등)에서는 전체화면 API가 제한됩니다.\n브라우저 메뉴의 "홈 화면에 추가"를 이용하시면 상단 주소창 없이 전체화면으로 사용하실 수 있습니다.',
          '전체화면 안내'
        )
      }
    } else {
      if (document.exitFullscreen) {
        await document.exitFullscreen()
      } else if (document.webkitExitFullscreen) {
        await document.webkitExitFullscreen()
      }
    }
  } catch (err) {
    console.warn('Fullscreen toggle failed:', err)
  } finally {
    syncFullscreenState()
  }
}

onMounted(() => {
  syncFullscreenState()
  document.addEventListener('fullscreenchange', syncFullscreenState)
  document.addEventListener('webkitfullscreenchange', syncFullscreenState)
})

onUnmounted(() => {
  document.removeEventListener('fullscreenchange', syncFullscreenState)
  document.removeEventListener('webkitfullscreenchange', syncFullscreenState)
})

const pageTitle = computed(() => {
  if (route.path.includes('/m/admin/reservations')) return '예약 관리'
  if (route.path.includes('/m/admin/users')) return '사용자 관리'
  if (route.path.includes('/m/admin/rooms')) return '공간 관리'
  if (route.path.includes('/m/admin/departments')) return '부서 관리'
  if (route.path.includes('/m/admin/policy')) return '예약 정책 설정'
  if (route.path.includes('/m/admin')) return '관리자 센터'
  if (route.path.includes('/m/reservations')) return '공간 예약'
  if (route.path.includes('/m/my-reservations')) return '나의 예약'
  if (route.path.includes('/m/profile')) return '프로필 설정'
  if (route.path.includes('/m/change-password')) return '비밀번호 변경'
  if (route.path.includes('/m/guide')) return '이용 가이드'
  return '홈'
})

const navItems = computed(() => {
  const items = [
    { path: '/m/home', icon: HomeIcon, label: '홈' },
    { path: '/m/reservations', icon: CalendarIcon, label: '예약' },
    { path: '/m/my-reservations', icon: ClockIcon, label: '내 예약' },
    { path: '/m/profile', icon: UserIcon, label: '정보' }
  ]
  
  if (auth.isAdmin) {
    items.push({ path: '/m/admin', icon: ShieldCheckIcon, label: '관리' })
  }
  
  return items
})

const logout = () => {
  auth.logout()
}

const getRootFontSize = () => {
  const saved = localStorage.getItem('app-font-size')
  return saved ? parseInt(saved) : 14
}

const fontSize = ref(getRootFontSize())

const increaseFontSize = () => {
  if (fontSize.value < 20) {
    fontSize.value += 2
    document.documentElement.style.fontSize = `${fontSize.value}px`
    localStorage.setItem('app-font-size', fontSize.value)
  }
}

const decreaseFontSize = () => {
  if (fontSize.value > 12) {
    fontSize.value -= 2
    document.documentElement.style.fontSize = `${fontSize.value}px`
    localStorage.setItem('app-font-size', fontSize.value)
  }
}
</script>

<style scoped>
.router-link-active {
  @apply text-indigo-600;
}
</style>
