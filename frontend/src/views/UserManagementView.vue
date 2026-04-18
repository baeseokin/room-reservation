<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { 
  UserPlusIcon, 
  UserGroupIcon, 
  XMarkIcon, 
  EnvelopeIcon, 
  PhoneIcon, 
  ShieldCheckIcon,
  BuildingOfficeIcon,
  KeyIcon,
  PencilSquareIcon
} from '@heroicons/vue/24/outline'

const users = ref([])
const depts = ref([])
const loading = ref(false)
const showModal = ref(false)
const editingUser = ref(null)

const userForm = ref({
  user_id: '',
  user_name: '',
  email: '',
  phone: '',
  password: '',
  dept_name: ''
})

const fetchData = async () => {
    loading.value = true
    try {
        const [uRes, dRes] = await Promise.all([
            axios.get('/api/users'),
            axios.get('/api/users/departments')
        ])
        users.value = uRes.data
        depts.value = dRes.data
    } finally {
        loading.value = false
    }
}

const openModal = (user = null) => {
    if (user) {
        editingUser.value = user
        userForm.value = { 
            user_id: user.user_id,
            user_name: user.user_name,
            email: user.email,
            phone: user.phone,
            dept_name: user.dept_name,
            password: '' // Don't show password
        }
    } else {
        editingUser.value = null
        userForm.value = { user_id: '', user_name: '', email: '', phone: '', password: '', dept_name: '' }
    }
    showModal.value = true
}

const submitForm = async () => {
    if (!userForm.value.user_id || !userForm.value.user_name) {
        return alert('아이디와 성명은 필수입니다.')
    }
    
    try {
        if (editingUser.value) {
            await axios.put(`/api/users/${editingUser.value.id}`, userForm.value)
            alert('사용자 정보가 수정되었습니다.')
        } else {
            await axios.post('/api/users', userForm.value)
            alert('새 사용자가 등록되었습니다.')
        }
        showModal.value = false
        fetchData()
    } catch (error) {
        alert(error.response?.data?.message || '처리 중 오류가 발생했습니다.')
    }
}

const deleteUser = async () => {
    if (!editingUser.value) return
    if (confirm(`정말 ${editingUser.value.user_name} 사용자를 삭제하시겠습니까?`)) {
        try {
            await axios.delete(`/api/users/${editingUser.value.id}`)
            alert('사용자가 삭제되었습니다.')
            showModal.value = false
            fetchData()
        } catch (error) {
            alert(error.response?.data?.message || '삭제 중 오류가 발생했습니다.')
        }
    }
}

onMounted(fetchData)
</script>

<template>
  <div class="p-8 max-w-6xl mx-auto space-y-10 min-h-screen font-sans">
    <!-- Header Section -->
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b-4 border-slate-900 pb-8">
      <div class="space-y-1">
        <h1 class="text-5xl font-black text-slate-900 tracking-tighter uppercase italic flex items-center gap-3">
          <UserGroupIcon class="w-12 h-12 text-indigo-600" />
          Identity
        </h1>
        <p class="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px]">User & Permission Management</p>
      </div>

      <button @click="openModal()" class="bg-slate-900 text-white px-8 py-4 rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:bg-indigo-600 transition-all active:scale-95 shadow-2xl flex items-center gap-2">
        <UserPlusIcon class="w-5 h-5" />
        New User
      </button>
    </div>

    <!-- Table Section -->
    <div class="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl overflow-hidden">
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="bg-slate-50 border-b border-slate-100 font-black text-[10px] text-slate-400 uppercase tracking-widest">
            <th class="px-8 py-6">User / Identity</th>
            <th class="px-8 py-6">Department</th>
            <th class="px-8 py-6">Permissions</th>
            <th class="px-8 py-6 text-right">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-50">
          <tr v-if="loading" v-for="i in 3" class="animate-pulse">
             <td colspan="4" class="px-8 py-10 bg-slate-50/50"></td>
          </tr>
          <tr v-for="user in users" :key="user.id" 
              @click="openModal(user)"
              class="group hover:bg-indigo-50/30 transition-colors cursor-pointer">
            <td class="px-8 py-6">
              <div class="flex items-center gap-4">
                <div class="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-sm font-black text-slate-400 border border-slate-200 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                  {{ (user.user_name || '?').charAt(0).toUpperCase() }}
                </div>
                <div class="space-y-0.5">
                   <div class="font-bold text-slate-900 flex items-center gap-2">
                     {{ user.user_name }}
                     <span v-if="user.kakao_id" class="inline-block w-3 h-3 bg-[#FEE500] rounded-full flex items-center justify-center text-[8px] text-black font-black">K</span>
                   </div>
                   <div class="text-[11px] text-slate-400 font-medium font-mono uppercase">{{ user.user_id }}</div>
                </div>
              </div>
            </td>
            <td class="px-8 py-6">
                <span class="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest">
                  {{ user.dept_name || 'Public' }}
                </span>
            </td>
            <td class="px-8 py-6">
                <div class="flex flex-wrap gap-1">
                    <span v-for="role in (user.roles || '').split(',')" :key="role" 
                          class="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter">
                        {{ role }}
                    </span>
                </div>
            </td>
            <td class="px-8 py-6 text-right">
               <button class="p-2.5 bg-slate-50 rounded-xl text-slate-300 group-hover:text-indigo-600 group-hover:bg-white transition-all">
                 <PencilSquareIcon class="w-5 h-5" />
               </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Detail/Edit Modal -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 bg-slate-900/80 backdrop-blur-xl flex items-center justify-center p-4 z-[100]">
        <div class="bg-white rounded-[3.5rem] shadow-2xl max-w-2xl w-full p-12 space-y-10 animate-in fade-in zoom-in duration-300">
          <div class="flex justify-between items-start">
            <div class="space-y-1">
              <span class="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-widest">User Management</span>
              <h2 class="text-3xl font-black text-slate-900 italic">{{ editingUser ? 'User Details' : 'Identity Creation' }}</h2>
            </div>
            <button @click="showModal = false" class="p-2 bg-slate-50 rounded-2xl text-slate-400 hover:text-slate-900 transition-all">
              <XMarkIcon class="w-6 h-6" />
            </button>
          </div>

          <form @submit.prevent="submitForm" class="space-y-8">
             <div class="grid grid-cols-2 gap-6">
                <!-- Basic Info -->
                <div class="space-y-4">
                   <div class="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 space-y-4">
                      <div>
                        <label class="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">User ID / Login</label>
                        <div class="relative">
                          <EnvelopeIcon class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                          <input v-model="userForm.user_id" type="text" placeholder="ID or Email" 
                                 :disabled="!!editingUser"
                                 class="w-full bg-white border-none rounded-xl py-3 pl-11 pr-4 font-bold text-sm shadow-sm focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-400" required />
                        </div>
                      </div>
                      <div v-if="!editingUser">
                        <label class="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Initial Password</label>
                        <div class="relative">
                          <KeyIcon class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                          <input v-model="userForm.password" type="password" placeholder="Default: 1234" class="w-full bg-white border-none rounded-xl py-3 pl-11 pr-4 font-bold text-sm shadow-sm focus:ring-2 focus:ring-indigo-500" />
                        </div>
                      </div>
                      <div v-else class="py-2">
                        <label class="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Account Type</label>
                        <span class="text-xs font-bold text-indigo-600">{{ editingUser.kakao_id ? 'Kakao SSO Linked' : 'Internal Database Account' }}</span>
                      </div>
                   </div>
                </div>

                <!-- Profile Info -->
                <div class="space-y-4">
                   <div class="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 space-y-4">
                      <div>
                        <label class="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Full Name</label>
                        <input v-model="userForm.user_name" type="text" placeholder="성함" class="w-full bg-white border-none rounded-xl py-3 px-4 font-bold text-sm shadow-sm focus:ring-2 focus:ring-indigo-500" required />
                      </div>
                      <div>
                        <label class="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Department</label>
                        <div class="relative">
                          <BuildingOfficeIcon class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none" />
                          <select v-model="userForm.dept_name" class="w-full bg-white border-none rounded-xl py-3 pl-11 pr-4 font-bold text-sm shadow-sm focus:ring-2 focus:ring-indigo-500 appearance-none">
                            <option value="">No Department</option>
                            <option v-for="dept in depts" :key="dept.id" :value="dept.dept_name">{{ dept.dept_name }}</option>
                          </select>
                        </div>
                      </div>
                   </div>
                </div>
             </div>

             <div class="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                <label class="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Contact Information</label>
                <div class="grid grid-cols-2 gap-4">
                   <div class="relative">
                     <EnvelopeIcon class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                     <input v-model="userForm.email" type="email" placeholder="Email Address" class="w-full bg-white border-none rounded-xl py-3 pl-11 pr-4 font-bold text-sm shadow-sm focus:ring-2 focus:ring-indigo-500" />
                   </div>
                   <div class="relative">
                     <PhoneIcon class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                     <input v-model="userForm.phone" type="text" placeholder="Phone Number" class="w-full bg-white border-none rounded-xl py-3 pl-11 pr-4 font-bold text-sm shadow-sm focus:ring-2 focus:ring-indigo-500" />
                   </div>
                </div>
             </div>

             <div class="flex gap-4">
                <button v-if="editingUser" type="button" @click="deleteUser" class="px-8 py-5 border border-red-100 text-red-500 rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-red-50 transition-all">Delete Account</button>
                <div class="flex-1 flex gap-4">
                   <button type="button" @click="showModal = false" class="flex-1 py-5 border border-slate-200 rounded-3xl font-black text-xs uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all">Cancel</button>
                   <button type="submit" class="flex-1 bg-slate-900 text-white py-5 rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-indigo-600 shadow-xl transition-all active:scale-95">
                     {{ editingUser ? 'Update Profile' : 'Complete Registration' }}
                   </button>
                </div>
             </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>
