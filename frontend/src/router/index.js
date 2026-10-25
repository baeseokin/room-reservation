import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../store/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    // ─── 기본 랜딩 (사용자 로그인) ────────────────────────────────
    {
      path: '/',
      name: 'Login',
      component: () => import('../views/UserLoginView.vue'),
      beforeEnter: (to, from, next) => {
        const auth = useAuthStore()
        if (auth.user) {
          next({ name: 'Home' })
        } else {
          next()
        }
      }
    },
    {
      path: '/admin-login',
      name: 'AdminLogin',
      component: () => import('../views/AdminLoginView.vue'),
      beforeEnter: (to, from, next) => {
        const auth = useAuthStore()
        if (auth.user) {
          next({ name: 'AdminReservations' })
        } else {
          next()
        }
      }
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
          path: 'policy',
          name: 'AdminPolicy',
          component: () => import('../views/AdminPolicyView.vue')
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
          path: 'admin/users',
          name: 'UserManagementMobile',
          component: () => import('../views/mobile/admin/UserManagementViewMobile.vue'),
          meta: { requiresAdmin: true }
        },
        {
          path: 'admin/rooms',
          name: 'RoomManagementMobileView',
          component: () => import('../views/mobile/admin/RoomManagementViewMobile.vue'),
          meta: { requiresAdmin: true }
        },
        {
          path: 'admin/departments',
          name: 'DepartmentManagementMobile',
          component: () => import('../views/mobile/admin/DepartmentManagementViewMobile.vue'),
          meta: { requiresAdmin: true }
        },
        {
          path: 'admin/policy',
          name: 'AdminPolicyMobile',
          component: () => import('../views/mobile/admin/AdminPolicyViewMobile.vue'),
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
    // 모바일 전용 로그인
    {
      path: '/m/login',
      name: 'LoginMobile',
      component: () => import('../views/mobile/UserLoginViewMobile.vue')
    },
    {
      path: '/m/admin-login',
      name: 'AdminLoginMobile',
      component: () => import('../views/mobile/AdminLoginViewMobile.vue')
    }
  ]
})

function mapPcToMobile(path) {
  if (path === '/' || path === '') return '/m/login'
  if (path === '/admin-login') return '/m/admin-login'
  if (path === '/change-password') return '/m/change-password'
  if (path === '/home' || path === '/home/') return '/m/home'
  if (path.startsWith('/home/')) return path.replace('/home/', '/m/')
  if (path === '/admin' || path === '/admin/') return '/m/admin/reservations'
  if (path.startsWith('/admin/')) return path.replace('/admin/', '/m/admin/')
  return '/m/home'
}

function mapMobileToPc(path) {
  if (path === '/m/login' || path === '/m/login/') return '/'
  if (path === '/m/admin-login' || path === '/m/admin-login/') return '/admin-login'
  if (path === '/m/change-password' || path === '/m/change-password/') return '/change-password'
  if (path === '/m/home' || path === '/m/home/') return '/home'
  if (path === '/m/reservations') return '/home/reservations'
  if (path === '/m/my-reservations') return '/home/my-reservations'
  if (path === '/m/profile') return '/home/profile'
  if (path === '/m/admin' || path === '/m/admin/') return '/admin/reservations'
  if (path.startsWith('/m/admin/')) return path.replace('/m/admin/', '/admin/')
  if (path.startsWith('/m/')) return path.replace('/m/', '/home/')
  return '/home'
}

router.beforeEach(async (to, from, next) => {
  const auth = useAuthStore()
  if (!auth.initialized) {
    await auth.checkSession()
  }

  // 1. Device Detection (Mobile phones only, not tablets/desktops)
  const isMobile = /iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                   (/Android/i.test(navigator.userAgent) && /Mobile/i.test(navigator.userAgent))

  // 2. Device-based URL Normalization
  if (isMobile && !to.path.startsWith('/m')) {
    const targetPath = mapPcToMobile(to.path)
    return next({ path: targetPath, query: to.query, hash: to.hash })
  }
  if (!isMobile && to.path.startsWith('/m')) {
    const targetPath = mapMobileToPc(to.path)
    return next({ path: targetPath, query: to.query, hash: to.hash })
  }

  // 3. Already logged in? Redirect from Login page to target or Home
  const isLoginPage = ['Login', 'LoginMobile', 'AdminLogin', 'AdminLoginMobile'].includes(to.name)
  if (isLoginPage && auth.user) {
    if (to.query?.redirect) {
      return next({ path: to.query.redirect })
    }
    if ((to.name === 'AdminLogin' || to.name === 'AdminLoginMobile') && auth.isAdmin) {
      return next({ path: isMobile ? '/m/admin/reservations' : '/admin/reservations' })
    }
    return next({ path: isMobile ? '/m/home' : '/home' })
  }

  // 4. Auth-required routes
  if (to.meta.requiresAuth && !auth.user) {
    const loginTarget = isMobile ? '/m/login' : '/'
    return next({ path: loginTarget, query: { redirect: to.fullPath } })
  }

  // 5. Admin-required routes
  if (to.meta.requiresAdmin) {
    if (!auth.user) {
      const adminLoginTarget = isMobile ? '/m/admin-login' : '/admin-login'
      return next({ path: adminLoginTarget, query: { redirect: to.fullPath } })
    }
    if (!auth.isAdmin) {
      return next({ path: isMobile ? '/m/home' : '/home' })
    }
  }

  // 6. Mandatory password change check
  if (auth.user?.mustChangePassword && !['ChangePassword', 'ChangePasswordMobile', 'Login', 'LoginMobile', 'AdminLogin', 'AdminLoginMobile'].includes(to.name)) {
    const target = isMobile ? 'ChangePasswordMobile' : 'ChangePassword'
    return next({ name: target })
  }

  next()
})

export default router
