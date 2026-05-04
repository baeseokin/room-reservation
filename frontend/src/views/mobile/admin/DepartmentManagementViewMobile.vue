<script setup>
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'
import DeptTreeNodeMobile from '@/components/DeptTreeNodeMobile.vue'
import { useModalStore } from '@/stores/useModalStore'
import { 
  BuildingOfficeIcon, 
  PlusIcon, 
  ArrowPathIcon,
  XMarkIcon,
  MagnifyingGlassIcon
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
  <div class="space-y-6 pb-20">
    <!-- Header -->
    <div class="flex justify-between items-center px-2">
      <div class="space-y-1">
        <h2 class="text-2xl font-black text-slate-900 tracking-tight">조직 체계 관리</h2>
        <p class="text-slate-400 text-[11px] font-black uppercase tracking-widest">부서 간의 계층 구조를 관리합니다.</p>
      </div>
      <div class="flex gap-2">
        <button @click="fetchDepartments" class="p-3 bg-white border border-slate-100 rounded-2xl shadow-sm text-slate-400 active:scale-95 transition-all">
          <ArrowPathIcon class="w-5 h-5" :class="{ 'animate-spin': loading }" />
        </button>
        <button @click="openModal()" class="p-3 bg-slate-900 text-white rounded-2xl shadow-lg shadow-slate-200 active:scale-95 transition-all">
          <PlusIcon class="w-5 h-5" />
        </button>
      </div>
    </div>

    <!-- Search Input -->
    <div class="px-2">
      <div class="relative group">
        <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <MagnifyingGlassIcon class="h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
        </div>
        <input v-model="searchQuery" type="text" placeholder="부서 이름으로 검색..." 
          class="w-full pl-11 pr-4 py-4 bg-white border border-slate-100 rounded-[2rem] text-xs font-bold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm" />
      </div>
    </div>

    <!-- Tree Structure -->
    <div v-if="loading" class="flex justify-center py-20">
      <div class="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
    </div>

    <div v-else-if="treeData.length === 0" class="text-center py-32 bg-white rounded-[2.5rem] border border-slate-100 mx-2">
      <div class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
        <BuildingOfficeIcon class="w-8 h-8 text-slate-200" />
      </div>
      <p class="text-slate-400 font-black text-[10px] uppercase tracking-widest">
        {{ searchQuery ? '"' + searchQuery + '" 검색 결과가 없습니다' : '등록된 부서가 없습니다' }}
      </p>
    </div>

    <div v-else class="space-y-3 px-2">
      <DeptTreeNodeMobile v-for="node in treeData" :key="node.id"
        :node="node" :depth="0" 
        @edit="openModal" @delete="deleteDepartment" @add-child="(id) => openModal(null, id)" />
    </div>

    <!-- Modal -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 bg-slate-900/80 backdrop-blur-xl flex items-end sm:items-center justify-center z-[100]">
        <div class="bg-white w-full max-w-lg rounded-t-[3rem] sm:rounded-[3.5rem] p-8 sm:p-12 space-y-8 animate-in slide-in-from-bottom duration-500">
          <div class="flex justify-between items-center">
            <div class="space-y-1">
              <span class="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-widest">조직 설정</span>
              <h2 class="text-2xl font-black text-slate-900 tracking-tight">{{ editingDept ? '부서 정보 수정' : '새 부서 등록' }}</h2>
            </div>
            <button @click="showModal = false" class="p-2 bg-slate-50 text-slate-400 rounded-full">
              <XMarkIcon class="w-6 h-6" />
            </button>
          </div>

          <div class="space-y-6">
            <div class="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 space-y-6">
              <div class="space-y-1.5">
                <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">부서명</label>
                <input v-model="form.dept_name" type="text" placeholder="예: 재정부, 유치부 등" class="w-full bg-white border-none rounded-2xl py-4 px-5 font-bold shadow-sm focus:ring-2 focus:ring-indigo-500 transition-all text-sm" />
              </div>

              <div class="space-y-1.5">
                <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">상위 소속</label>
                <select v-model="form.parent_dept_id" class="w-full bg-white border-none rounded-2xl py-4 px-5 font-bold shadow-sm focus:ring-2 focus:ring-indigo-500 appearance-none text-sm">
                  <option :value="null">최상위 조직</option>
                  <option v-for="d in departments.filter(d => d.id !== editingDept?.id)" :key="d.id" :value="d.id">
                    {{ d.dept_name }}
                  </option>
                </select>
              </div>
            </div>
          </div>

          <div class="flex gap-4">
            <button @click="showModal = false" class="flex-1 py-5 bg-slate-100 text-slate-400 rounded-3xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all">취소</button>
            <button @click="saveDepartment" class="flex-[2] bg-slate-900 text-white py-5 rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 active:scale-95 transition-all">저장하기</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
