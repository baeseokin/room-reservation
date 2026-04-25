import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../store/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    // ─── 공개 라우트 (로그인 불필요) ───────────────────────
    {
      path: '/',
      component: () => import('../layouts/PublicLayout.vue'),
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
        }
      ]
    },

    // ─── 관리자 로그인 ─────────────────────────────────────
    {
      path: '/admin/login',
      name: 'AdminLogin',
      component: () => import('../views/AdminLoginView.vue')
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
          path: 'admins',
          name: 'AdminManagement',
          component: () => import('../views/AdminManagementView.vue')
        },
        {
          path: 'departments',
          name: 'DepartmentManagement',
          component: () => import('../views/DepartmentManagementView.vue')
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

  // Admin login page: if already logged in, go to admin dashboard
  if (to.name === 'AdminLogin' && auth.user) {
    return next({ path: '/admin' })
  }

  // Admin-required routes
  if (to.meta.requiresAdmin) {
    if (!auth.user) return next({ name: 'AdminLogin' })
    if (!auth.isAdmin) return next({ path: '/' })
  }

  next()
})

export default router
