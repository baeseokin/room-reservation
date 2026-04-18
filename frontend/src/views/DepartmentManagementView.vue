<script setup>
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'
import { 
  BuildingOfficeIcon, 
  PlusIcon, 
  PencilSquareIcon, 
  TrashIcon, 
  XMarkIcon,
  ChevronRightIcon
} from '@heroicons/vue/24/outline'

const departments = ref([])
const loading = ref(false)
const showModal = ref(false)
const editingDept = ref(null)

const form = ref({
  dept_name: '',
  parent_dept_id: null
})

const fetchDepartments = async () => {
  loading.value = true
  try {
    const res = await axios.get('/api/departments')
    departments.value = res.data
  } catch (error) {
    console.error('Fetch failed:', error)
  } finally {
    loading.value = false
  }
}

const openModal = (dept = null) => {
  if (dept) {
    editingDept.value = dept
    form.value = { 
      dept_name: dept.dept_name,
      parent_dept_id: dept.parent_dept_id 
    }
  } else {
    editingDept.value = null
    form.value = { dept_name: '', parent_dept_id: null }
  }
  showModal.value = true
}

const saveDepartment = async () => {
  if (!form.value.dept_name) return alert('부서명을 입력하세요.')
  
  try {
    if (editingDept.value) {
      await axios.put(`/api/departments/${editingDept.value.id}`, form.value)
      alert('부서 정보가 수정되었습니다.')
    } else {
      await axios.post('/api/departments', form.value)
      alert('새 부서가 등록되었습니다.')
    }
    showModal.value = false
    fetchDepartments()
  } catch (error) {
    alert(error.response?.data?.message || '저장 중 오류가 발생했습니다.')
  }
}

const deleteDepartment = async (id) => {
  if (confirm('이 부서를 삭제하시겠습니까? 연결된 사용자나 공간 정보에 영향을 줄 수 있습니다.')) {
    try {
      await axios.delete(`/api/departments/${id}`)
      fetchDepartments()
    } catch (error) {
      alert('삭제 중 오류가 발생했습니다.')
    }
  }
}

const getParentName = (parentId) => {
  const parent = departments.value.find(d => d.id === parentId)
  return parent ? parent.dept_name : '-'
}

onMounted(fetchDepartments)
</script>

<template>
  <div class="p-8 max-w-5xl mx-auto space-y-10 min-h-screen font-sans">
    <!-- Header -->
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b-4 border-slate-900 pb-8">
      <div class="space-y-1">
        <h1 class="text-5xl font-black text-slate-900 tracking-tighter uppercase italic">Departments</h1>
        <p class="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px]">Organizational Structure Management</p>
      </div>
      <button @click="openModal()" class="bg-slate-900 text-white px-8 py-4 rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:bg-indigo-600 transition-all active:scale-95 shadow-2xl flex items-center gap-2">
        <PlusIcon class="w-5 h-5" />
        Add Department
      </button>
    </div>

    <!-- Stats Row (Simple) -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
       <div class="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
          <div class="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center">
             <BuildingOfficeIcon class="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Depts</div>
            <div class="text-2xl font-black text-slate-900">{{ departments.length }}</div>
          </div>
       </div>
    </div>

    <!-- Table Section -->
    <div class="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl overflow-hidden">
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="bg-slate-50 border-b border-slate-100 font-black text-[10px] text-slate-400 uppercase tracking-widest">
            <th class="px-8 py-6">Dept Name</th>
            <th class="px-8 py-6">Parent Dept</th>
            <th class="px-8 py-6">Created At</th>
            <th class="px-8 py-6 text-right">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-50">
          <tr v-if="loading" v-for="i in 3" class="animate-pulse">
            <td colspan="4" class="px-8 py-10 bg-slate-50/50"></td>
          </tr>
          <tr v-for="dept in departments" :key="dept.id" class="group hover:bg-slate-50 transition-colors">
            <td class="px-8 py-6">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-xs font-black text-slate-400">
                  {{ dept.id }}
                </div>
                <span class="font-bold text-slate-800">{{ dept.dept_name }}</span>
              </div>
            </td>
            <td class="px-8 py-6">
              <div class="flex items-center gap-1.5 font-bold text-slate-400 text-sm">
                {{ getParentName(dept.parent_dept_id) }}
              </div>
            </td>
            <td class="px-8 py-6 text-xs font-bold text-slate-400">{{ new Date(dept.created_at).toLocaleDateString() }}</td>
            <td class="px-8 py-6 text-right space-x-2">
              <button @click="openModal(dept)" class="p-2.5 bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-xl shadow-sm transition-all active:scale-90">
                <PencilSquareIcon class="w-5 h-5" />
              </button>
              <button @click="deleteDepartment(dept.id)" class="p-2.5 bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-white rounded-xl shadow-sm transition-all active:scale-90">
                <TrashIcon class="w-5 h-5" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 bg-slate-900/80 backdrop-blur-xl flex items-center justify-center p-4 z-[100]">
        <div class="bg-white rounded-[3.5rem] shadow-2xl max-w-lg w-full p-12 space-y-10 animate-in fade-in zoom-in duration-300">
          <div class="space-y-1">
            <span class="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-widest">Department Setting</span>
            <h2 class="text-3xl font-black text-slate-900 font-serif italic">{{ editingDept ? 'Modify Dept' : 'Register New Dept' }}</h2>
          </div>

          <div class="space-y-6">
            <div class="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 space-y-6">
              <div>
                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Department Identity</label>
                <input v-model="form.dept_name" type="text" placeholder="Department Name (e.g. Finance)" class="w-full bg-white border-none rounded-2xl py-4 px-6 font-bold shadow-sm focus:ring-2 focus:ring-indigo-500" />
              </div>

              <div>
                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Parent Affiliation</label>
                <select v-model="form.parent_dept_id" class="w-full bg-white border-none rounded-2xl py-4 px-6 font-bold shadow-sm focus:ring-2 focus:ring-indigo-500 appearance-none">
                  <option :value="null">No Parent (Top Level)</option>
                  <option v-for="d in departments.filter(d => d.id !== editingDept?.id)" :key="d.id" :value="d.id">
                    {{ d.dept_name }}
                  </option>
                </select>
              </div>
            </div>
          </div>

          <div class="flex gap-4">
            <button @click="showModal = false" class="flex-1 py-5 border border-slate-200 rounded-3xl font-black text-xs uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all">Cancel</button>
            <button @click="saveDepartment" class="flex-1 bg-slate-900 text-white py-5 rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-indigo-600 shadow-xl transition-all active:scale-95">Confirm</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
