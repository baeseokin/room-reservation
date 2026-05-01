import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../store/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    // ─── 기본 랜딩 (로그인) ────────────────────────────────
    {
      path: '/',
      name: 'Login',
      component: () => import('../views/AdminLoginView.vue'),
      beforeEnter: (to, from, next) => {
        const auth = useAuthStore()
        if (auth.user) {
          next({ name: 'Home' })
        } else {
          next()
        }
      }
    },

    // ─── 회원가입 ──────────────────────────────────────────
    {
      path: '/register',
      name: 'Register',
      component: () => import('../views/RegisterView.vue')
    },
    {
      path: '/change-password',
      name: 'ChangePassword',
      component: () => import('../views/ChangePasswordView.vue'),
      meta: { requiresAuth: true }
    },

    // ─── 보호된 라우트 (로그인 필요) ───────────────────────
    {
      path: '/home',
      component: () => import('../layouts/PublicLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'Home',
          component: () => import('../views/HomeView.vue')
        },
        {
          path: 'reservations',
          name: 'Reservations',
          component: () => import('../views/ReservationView.vue')
        },
        {
          path: 'my-reservations',
          name: 'MyReservations',
          component: () => import('../views/MyReservationsView.vue')
        },

        {
          path: 'profile',
          name: 'Profile',
          component: () => import('../views/ProfileView.vue')
        }
      ]
    },

    // ─── 관리자 전용 (로그인 필요) ─────────────────────────
    {
      path: '/admin',
      component: () => import('../layouts/AdminLayout.vue'),
      meta: { requiresAdmin: true },
      children: [
        {
          path: '',
          redirect: '/admin/reservations'
        },
        {
          path: 'reservations',
          name: 'AdminReservations',
          component: () => import('../views/AdminReservationsView.vue')
        },
        {
          path: 'rooms',
          name: 'Rooms',
          component: () => import('../views/RoomManagementView.vue')
        },
        {
          path: 'users',
          name: 'UserManagement',
          component: () => import('../views/UserManagementView.vue')
        },
        {
          path: 'departments',
          name: 'DepartmentManagement',
          component: () => import('../views/DepartmentManagementView.vue')
        },
        {
          path: 'applications',
          name: 'AdminUserApplications',
          component: () => import('../views/AdminUserApplicationsView.vue')
        }
      ]
    },

    // ─── 모바일 전용 라우트 ( /m ) ──────────────────────────
    {
      path: '/m',
      component: () => import('../layouts/MobileLayout.vue'),
      children: [
        {
          path: 'home',
          name: 'HomeMobile',
          component: () => import('../views/mobile/HomeViewMobile.vue'),
          meta: { requiresAuth: true }
        },
        {
          path: 'reservations',
          name: 'ReservationsMobile',
          component: () => import('../views/mobile/ReservationViewMobile.vue'),
          meta: { requiresAuth: true }
        },
        {
          path: 'my-reservations',
          name: 'MyReservationsMobile',
          component: () => import('../views/mobile/MyReservationsViewMobile.vue'),
          meta: { requiresAuth: true }
        },
        {
          path: 'profile',
          name: 'ProfileMobile',
          component: () => import('../views/mobile/ProfileViewMobile.vue'),
          meta: { requiresAuth: true }
        },
        {
          path: 'change-password',
          name: 'ChangePasswordMobile',
          component: () => import('../views/mobile/ChangePasswordViewMobile.vue'),
          meta: { requiresAuth: true }
        },
        {
          path: 'admin',
          name: 'AdminHomeMobile',
          component: () => import('../views/mobile/admin/AdminHomeMobile.vue'),
          meta: { requiresAdmin: true }
        },
        {
          path: 'admin/reservations',
          name: 'AdminReservationsMobile',
          component: () => import('../views/mobile/admin/AdminReservationsViewMobile.vue'),
          meta: { requiresAdmin: true }
        },
        {
          path: 'admin/applications',
          name: 'AdminUserApplicationsMobile',
          component: () => import('../views/mobile/admin/AdminUserApplicationsViewMobile.vue'),
          meta: { requiresAdmin: true }
        },
        {
          path: 'guide',
          name: 'GuideMobile',
          component: () => import('../views/mobile/GuideViewMobile.vue'),
          meta: { requiresAuth: true }
        }
      ]
    },
    // 모바일 전용 로그인/회원가입 (레이아웃 없음)
    {
      path: '/m/login',
      name: 'LoginMobile',
      component: () => import('../views/mobile/LoginViewMobile.vue')
    },
    {
      path: '/m/register',
      name: 'RegisterMobile',
      component: () => import('../views/mobile/RegisterViewMobile.vue')
    }
  ]
})

router.beforeEach(async (to, from, next) => {
  const auth = useAuthStore()
  if (!auth.initialized) {
    await auth.checkSession()
  }

  // Already logged in? Redirect from Login page to Home
  if (to.name === 'Login' && auth.user) {
    return next({ name: 'Home' })
  }

  // Auth-required routes
  if (to.meta.requiresAuth && !auth.user) {
    return next({ name: 'Login' })
  }

  // Admin-required routes
  if (to.meta.requiresAdmin) {
    if (!auth.user) return next({ name: 'Login' })
    if (!auth.isAdmin) return next({ path: '/home' })
  }

  // Mandatory password change check
  if (auth.user?.mustChangePassword && !['ChangePassword', 'ChangePasswordMobile', 'Login', 'LoginMobile'].includes(to.name)) {
    const target = to.path.startsWith('/m') ? 'ChangePasswordMobile' : 'ChangePassword'
    return next({ name: target })
  }

  // Basic Mobile Detection Redirect
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  
  if (isMobile && !to.path.startsWith('/m')) {
    if (to.name === 'Login') return next({ name: 'LoginMobile' })
    if (to.name === 'Register') return next({ name: 'RegisterMobile' })
    if (to.name === 'ChangePassword') return next({ name: 'ChangePasswordMobile' })
    
    // For other protected routes, if user is already on /home, go to /m/home
    if (to.path.startsWith('/home')) {
      return next({ path: to.path.replace('/home', '/m/home') })
    }
    if (to.path.startsWith('/admin')) {
      return next({ path: to.path.replace('/admin', '/m/admin') })
    }
    
    // Default mobile entry
    return next({ path: '/m/home' })
  }

  next()
})

export default router
