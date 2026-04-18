import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../store/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('../views/LoginView.vue')
    },
    {
      path: '/',
      component: () => import('../layouts/DefaultLayout.vue'),
      children: [
        {
          path: '',
          name: 'Home',
          component: () => import('../views/HomeView.vue')
        },
        {
          path: 'rooms',
          name: 'Rooms',
          component: () => import('../views/RoomManagementView.vue')
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
          path: 'inquiries',
          name: 'InquiryManagement',
          component: () => import('../views/InquiryManagementView.vue')
        },
        {
          path: 'admin/users',
          name: 'UserManagement',
          component: () => import('../views/UserManagementView.vue')
        },
        {
          path: 'admin/departments',
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

  if (to.name !== 'Login' && !auth.user) {
    next({ name: 'Login' })
  } else {
    next()
  }
})

export default router
