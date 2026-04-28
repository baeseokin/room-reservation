<script setup>
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'
import { 
  BuildingOfficeIcon, 
  PlusIcon, 
  PencilSquareIcon, 
  TrashIcon, 
  XMarkIcon,
  ChevronRightIcon,
  ArrowPathIcon
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
  <div class="p-6 max-w-7xl mx-auto space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-black text-slate-900">부서 관리</h1>
        <p class="text-slate-500 text-sm font-medium mt-0.5">교회 조직 구조와 부서 정보를 관리하세요.</p>
      </div>
      <div class="flex gap-2">
        <button @click="fetchDepartments" class="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all">
          <ArrowPathIcon class="w-4 h-4" :class="{ 'animate-spin': loading }" />
          새로고침
        </button>
        <button @click="openModal()" class="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-black hover:bg-indigo-600 transition-all shadow-lg shadow-slate-200 active:scale-95">
          <PlusIcon class="w-4 h-4" />
          부서 추가
        </button>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
      <div class="bg-indigo-50 border border-indigo-100 rounded-2xl p-5">
        <div class="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">전체 부서 수</div>
        <div class="text-4xl font-black text-indigo-700">{{ departments.length }}</div>
      </div>
      <div class="bg-slate-50 border border-slate-100 rounded-2xl p-5">
        <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">최상위 조직</div>
        <div class="text-4xl font-black text-slate-600">{{ departments.filter(d => !d.parent_dept_id).length }}</div>
      </div>
    </div>

    <!-- Departments Table/List -->
    <div class="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
      <div v-if="loading" class="flex justify-center py-16">
        <div class="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>

      <div v-else-if="departments.length === 0" class="text-center py-16">
        <BuildingOfficeIcon class="w-10 h-10 text-slate-200 mx-auto mb-3" />
        <p class="text-slate-400 font-black text-sm uppercase tracking-widest">등록된 부서가 없습니다</p>
      </div>

      <div v-else class="divide-y divide-slate-100">
        <div v-for="dept in departments" :key="dept.id"
          class="p-5 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center gap-4">
          
          <!-- Icon Badge -->
          <div class="w-12 h-12 bg-slate-100 text-slate-400 rounded-xl flex items-center justify-center border border-slate-200 shrink-0">
            <BuildingOfficeIcon class="w-6 h-6" />
          </div>

          <!-- Info -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="font-black text-slate-900 text-sm">{{ dept.dept_name }}</span>
              <span v-if="dept.parent_dept_id" class="text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg">
                {{ getParentName(dept.parent_dept_id) }} 소속
              </span>
            </div>
            <div class="text-[10px] text-slate-400 font-bold mt-0.5">
              ID: #{{ dept.id }} · 등록일: {{ new Date(dept.created_at).toLocaleDateString() }}
            </div>
          </div>

          <!-- Actions -->
          <div class="flex gap-2 shrink-0">
            <button @click="openModal(dept)"
              class="p-2.5 bg-white border border-slate-200 text-slate-500 rounded-xl hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all active:scale-95">
              <PencilSquareIcon class="w-4 h-4" />
            </button>
            <button @click="deleteDepartment(dept.id)"
              class="p-2.5 bg-white border border-slate-200 text-rose-500 rounded-xl hover:bg-rose-50 hover:border-rose-200 transition-all active:scale-95">
              <TrashIcon class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 bg-slate-900/80 backdrop-blur-xl flex items-center justify-center p-4 z-[100]">
        <div class="bg-white rounded-[3.5rem] shadow-2xl max-w-lg w-full p-12 space-y-10 animate-in fade-in zoom-in duration-300">
          <div class="space-y-1">
            <span class="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-widest">부서 설정</span>
            <h2 class="text-3xl font-black text-slate-900 font-serif italic">{{ editingDept ? '부서 수정' : '새 부서 등록' }}</h2>
          </div>

          <div class="space-y-6">
            <div class="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 space-y-6">
              <div>
                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">부서명</label>
                <input v-model="form.dept_name" type="text" placeholder="부서명 입력 (예: 재정부)" class="w-full bg-white border-none rounded-2xl py-4 px-6 font-bold shadow-sm focus:ring-2 focus:ring-indigo-500" />
              </div>

              <div>
                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">상위 소속</label>
                <select v-model="form.parent_dept_id" class="w-full bg-white border-none rounded-2xl py-4 px-6 font-bold shadow-sm focus:ring-2 focus:ring-indigo-500 appearance-none">
                  <option :value="null">상위 소속 없음 (최상위)</option>
                  <option v-for="d in departments.filter(d => d.id !== editingDept?.id)" :key="d.id" :value="d.id">
                    {{ d.dept_name }}
                  </option>
                </select>
              </div>
            </div>
          </div>

          <div class="flex gap-4">
            <button @click="showModal = false" class="flex-1 py-5 border border-slate-200 rounded-3xl font-black text-xs uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all">취소</button>
            <button @click="saveDepartment" class="flex-1 bg-slate-900 text-white py-5 rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-indigo-600 shadow-xl transition-all active:scale-95">확인</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
