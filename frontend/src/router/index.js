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
  if (auth.user?.mustChangePassword && to.name !== 'ChangePassword' && to.name !== 'Login') {
    return next({ name: 'ChangePassword' })
  }

  next()
})

export default router
