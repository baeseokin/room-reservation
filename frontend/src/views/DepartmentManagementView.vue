<script setup>
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'
import DeptTreeNode from '../components/DeptTreeNode.vue'
import { useModalStore } from '@/stores/useModalStore'
import { 
  BuildingOfficeIcon, 
  PlusIcon, 
  ArrowPathIcon 
} from '@heroicons/vue/24/outline'

const modal = useModalStore()

const departments = ref([])
const loading = ref(false)
const showModal = ref(false)
const editingDept = ref(null)
const searchQuery = ref('')

const filteredDepartments = computed(() => {
  if (!searchQuery.value.trim()) return departments.value
  
  const query = searchQuery.value.toLowerCase()
  const matchedIds = new Set()
  
  // Find all matches and their ancestors to preserve tree context
  departments.value.forEach(dept => {
    if (dept.dept_name.toLowerCase().includes(query)) {
      matchedIds.add(dept.id)
      
      // Trace back to root
      let parentId = dept.parent_dept_id
      while (parentId) {
        if (matchedIds.has(parentId)) break
        const parent = departments.value.find(d => d.id === parentId)
        if (parent) {
          matchedIds.add(parent.id)
          parentId = parent.parent_dept_id
        } else {
          break
        }
      }
    }
  })
  
  return departments.value.filter(d => matchedIds.has(d.id))
})

const treeData = computed(() => {
  const map = {}
  const roots = []
  const data = filteredDepartments.value
  
  data.forEach(dept => {
    map[dept.id] = { ...dept, children: [] }
  })
  
  data.forEach(dept => {
    if (dept.parent_dept_id && map[dept.parent_dept_id]) {
      map[dept.parent_dept_id].children.push(map[dept.id])
    } else {
      // Only push as root if it doesn't have a parent in the CURRENT filtered set
      // or if it truly doesn't have a parent.
      roots.push(map[dept.id])
    }
  })
  
  return roots
})

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

const openModal = (dept = null, parentId = null) => {
  if (dept) {
    editingDept.value = dept
    form.value = { 
      dept_name: dept.dept_name,
      parent_dept_id: dept.parent_dept_id 
    }
  } else {
    editingDept.value = null
    form.value = { dept_name: '', parent_dept_id: parentId }
  }
  showModal.value = true
}

const saveDepartment = async () => {
  if (!form.value.dept_name) return modal.showAlert('부서명을 입력하세요.')
  
  try {
    if (editingDept.value) {
      await axios.put(`/api/departments/${editingDept.value.id}`, form.value)
    } else {
      await axios.post('/api/departments', form.value)
    }
    showModal.value = false
    fetchDepartments()
  } catch (error) {
    modal.showAlert(error.response?.data?.message || '저장 중 오류가 발생했습니다.')
  }
}

const deleteDepartment = async (id) => {
  if (await modal.showConfirm('이 부서를 삭제하시겠습니까? 하위 부서가 있는 경우 함께 확인이 필요할 수 있습니다.')) {
    try {
      await axios.delete(`/api/departments/${id}`)
      fetchDepartments()
    } catch (error) {
      modal.showAlert('삭제 중 오류가 발생했습니다.')
    }
  }
}

onMounted(fetchDepartments)
</script>

<template>
  <div class="p-6 max-w-5xl mx-auto space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div class="flex-1">
        <h1 class="text-2xl font-black text-slate-900 tracking-tight">조직 체계 관리</h1>
        <p class="text-slate-500 text-sm font-bold mt-0.5">부서 간의 계층 구조를 트리 형태로 관리합니다.</p>
      </div>
      
      <!-- Search Input -->
      <div class="relative w-full sm:w-64 group">
        <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <svg class="h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input v-model="searchQuery" type="text" placeholder="부서 이름으로 검색..." 
          class="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm group-hover:border-slate-300" />
      </div>

      <div class="flex gap-2">
        <button @click="fetchDepartments" class="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-3 rounded-2xl text-sm font-bold hover:bg-slate-50 transition-all active:scale-95 shadow-sm">
          <ArrowPathIcon class="w-4 h-4" :class="{ 'animate-spin': loading }" />
          새로고침
        </button>
        <button @click="openModal()" class="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl text-sm font-black hover:bg-indigo-600 transition-all shadow-xl shadow-indigo-100 active:scale-95">
          <PlusIcon class="w-4 h-4" />
          추가
        </button>
      </div>
    </div>

    <!-- Tree Structure -->
    <div class="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-200/50 overflow-hidden min-h-[400px]">
      <div v-if="loading" class="flex flex-col items-center justify-center py-32 space-y-4">
        <div class="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p class="text-slate-400 font-black text-[12px] uppercase tracking-widest">조직도 불러오는 중...</p>
      </div>

      <div v-else-if="treeData.length === 0" class="text-center py-32">
        <div class="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <BuildingOfficeIcon class="w-10 h-10 text-slate-200" />
        </div>
        <template v-if="searchQuery">
          <p class="text-slate-400 font-black text-sm uppercase tracking-widest">"{{ searchQuery }}" 검색 결과가 없습니다</p>
          <button @click="searchQuery = ''" class="mt-4 text-indigo-600 font-black text-xs uppercase tracking-widest hover:underline">검색 초기화</button>
        </template>
        <template v-else>
          <p class="text-slate-400 font-black text-sm uppercase tracking-widest">등록된 부서가 없습니다</p>
          <button @click="openModal()" class="mt-4 text-indigo-600 font-black text-xs uppercase tracking-widest hover:underline">첫 부서 등록하기</button>
        </template>
      </div>

      <div v-else class="p-8">
        <div class="space-y-3">
          <DeptTreeNode v-for="node in treeData" :key="node.id"
            :node="node" :depth="0" 
            @edit="openModal" @delete="deleteDepartment" @add-child="(id) => openModal(null, id)" />
        </div>
      </div>
    </div>

    <!-- Modal -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 bg-slate-900/80 backdrop-blur-xl flex items-center justify-center p-4 z-[100]">
        <div class="bg-white rounded-[3.5rem] shadow-2xl max-w-lg w-full p-12 space-y-10 animate-in fade-in zoom-in duration-300">
          <div class="space-y-1">
            <span class="text-[12px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-widest">조직 설정</span>
            <h2 class="text-3xl font-black text-slate-900 font-serif italic">{{ editingDept ? '부서 정보 수정' : '새 부서 등록' }}</h2>
          </div>

          <div class="space-y-6">
            <div class="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 space-y-6">
              <div>
                <label class="block text-[12px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">부서명</label>
                <input v-model="form.dept_name" type="text" placeholder="예: 재정부, 유치부 등" class="w-full bg-white border-none rounded-2xl py-4 px-6 font-bold shadow-sm focus:ring-2 focus:ring-indigo-500" />
              </div>

              <div>
                <label class="block text-[12px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">상위 소속</label>
                <select v-model="form.parent_dept_id" class="w-full bg-white border-none rounded-2xl py-4 px-6 font-bold shadow-sm focus:ring-2 focus:ring-indigo-500 appearance-none">
                  <option :value="null">최상위 조직</option>
                  <option v-for="d in departments.filter(d => d.id !== editingDept?.id)" :key="d.id" :value="d.id">
                    {{ d.dept_name }}
                  </option>
                </select>
              </div>
            </div>
          </div>

          <div class="flex gap-4">
            <button @click="showModal = false" class="flex-1 py-5 border border-slate-200 rounded-3xl font-black text-xs uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all">취소</button>
            <button @click="saveDepartment" class="flex-1 bg-slate-900 text-white py-5 rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-indigo-600 shadow-xl transition-all active:scale-95">저장하기</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
