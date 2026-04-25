<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { PlusIcon, PencilIcon, TrashIcon, ShieldCheckIcon, XMarkIcon } from '@heroicons/vue/24/outline'

const admins = ref([])
const showModal = ref(false)
const isEditing = ref(false)
const isLoading = ref(false)
const form = ref({ id: null, user_id: '', user_name: '', email: '', phone: '', password: '' })
const errorMsg = ref('')

const fetchAdmins = async () => {
  const { data } = await axios.get('/api/admins')
  admins.value = data
}

const openCreate = () => {
  isEditing.value = false
  form.value = { id: null, user_id: '', user_name: '', email: '', phone: '', password: '' }
  errorMsg.value = ''
  showModal.value = true
}

const openEdit = (admin) => {
  isEditing.value = true
  form.value = { id: admin.id, user_id: admin.user_id, user_name: admin.user_name, email: admin.email || '', phone: admin.phone || '', password: '' }
  errorMsg.value = ''
  showModal.value = true
}

const save = async () => {
  errorMsg.value = ''
  if (!form.value.user_name) { errorMsg.value = '이름을 입력하세요.'; return }
  if (!isEditing.value && !form.value.password) { errorMsg.value = '비밀번호를 입력하세요.'; return }

  isLoading.value = true
  try {
    if (isEditing.value) {
      await axios.put(`/api/admins/${form.value.id}`, form.value)
    } else {
      if (!form.value.user_id) { errorMsg.value = 'ID를 입력하세요.'; isLoading.value = false; return }
      await axios.post('/api/admins', form.value)
    }
    showModal.value = false
    await fetchAdmins()
  } catch (e) {
    errorMsg.value = e.response?.data?.message || '저장 중 오류가 발생했습니다.'
  } finally {
    isLoading.value = false
  }
}

const deleteAdmin = async (admin) => {
  if (!confirm(`'${admin.user_name}' 관리자를 삭제하시겠습니까?`)) return
  try {
    await axios.delete(`/api/admins/${admin.id}`)
    await fetchAdmins()
  } catch (e) {
    alert(e.response?.data?.message || '삭제 실패')
  }
}

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('ko-KR') : '-'
onMounted(fetchAdmins)
</script>

<template>
  <div class="p-6 max-w-4xl mx-auto space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-black text-slate-900">관리자 관리</h1>
        <p class="text-slate-500 text-sm font-medium mt-0.5">시스템에 접근할 수 있는 관리자 계정을 관리합니다.</p>
      </div>
      <button @click="openCreate"
        class="flex items-center gap-2 bg-slate-900 text-white px-5 py-3 rounded-2xl text-sm font-black hover:bg-slate-800 transition-all active:scale-[0.98] shadow-lg">
        <PlusIcon class="w-4 h-4" />
        관리자 추가
      </button>
    </div>

    <!-- Admin List -->
    <div class="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
      <div v-if="admins.length === 0" class="text-center py-16">
        <ShieldCheckIcon class="w-10 h-10 text-slate-200 mx-auto mb-3" />
        <p class="text-slate-400 font-black text-sm uppercase tracking-widest">관리자가 없습니다</p>
      </div>

      <div v-else class="divide-y divide-slate-100">
        <div v-for="admin in admins" :key="admin.id" class="flex items-center gap-4 p-5 hover:bg-slate-50 transition-colors">
          <!-- Avatar -->
          <div class="w-12 h-12 shrink-0 bg-indigo-100 rounded-2xl flex items-center justify-center">
            <span class="text-indigo-600 font-black text-lg">{{ admin.user_name?.charAt(0) }}</span>
          </div>

          <!-- Info -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="font-black text-slate-900">{{ admin.user_name }}</span>
              <span class="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">{{ admin.user_id }}</span>
              <span class="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100 flex items-center gap-1">
                <ShieldCheckIcon class="w-3 h-3" /> 관리자
              </span>
            </div>
            <div class="text-xs text-slate-400 font-bold mt-0.5 space-x-3">
              <span v-if="admin.email">{{ admin.email }}</span>
              <span v-if="admin.phone">{{ admin.phone }}</span>
              <span>등록일: {{ fmtDate(admin.created_at) }}</span>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex gap-2 shrink-0">
            <button @click="openEdit(admin)"
              class="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all">
              <PencilIcon class="w-4 h-4" />
            </button>
            <button @click="deleteAdmin(admin)"
              class="p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-xl transition-all">
              <TrashIcon class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Add/Edit Modal -->
  <div v-if="showModal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full space-y-5">
      <div class="flex justify-between items-center">
        <h3 class="text-lg font-black text-slate-900">{{ isEditing ? '관리자 수정' : '관리자 추가' }}</h3>
        <button @click="showModal = false" class="p-2 hover:bg-slate-100 rounded-xl transition-colors">
          <XMarkIcon class="w-5 h-5 text-slate-500" />
        </button>
      </div>

      <div v-if="errorMsg" class="bg-rose-50 border border-rose-200 text-rose-600 text-sm font-bold px-4 py-3 rounded-2xl">{{ errorMsg }}</div>

      <div class="space-y-4">
        <div v-if="!isEditing">
          <label class="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">아이디 *</label>
          <input v-model="form.user_id" type="text" placeholder="로그인에 사용할 ID"
            class="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
        </div>
        <div>
          <label class="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">이름 *</label>
          <input v-model="form.user_name" type="text" placeholder="관리자 이름"
            class="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">이메일</label>
            <input v-model="form.email" type="email" placeholder="이메일 (선택)"
              class="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
          </div>
          <div>
            <label class="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">연락처</label>
            <input v-model="form.phone" type="tel" placeholder="010-0000-0000"
              class="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
          </div>
        </div>
        <div>
          <label class="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">
            비밀번호 {{ isEditing ? '(변경 시에만 입력)' : '*' }}
          </label>
          <input v-model="form.password" type="password" :placeholder="isEditing ? '변경하지 않으면 비워두세요' : '비밀번호 설정'"
            class="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
        </div>
      </div>

      <div class="flex gap-3 pt-2">
        <button @click="showModal = false" class="flex-1 bg-slate-100 text-slate-700 py-3 rounded-2xl font-black text-sm hover:bg-slate-200 transition-all">취소</button>
        <button @click="save" :disabled="isLoading" class="flex-1 bg-slate-900 text-white py-3 rounded-2xl font-black text-sm hover:bg-slate-800 transition-all active:scale-[0.98] disabled:opacity-50">
          {{ isLoading ? '저장 중...' : (isEditing ? '수정하기' : '추가하기') }}
        </button>
      </div>
    </div>
  </div>
</template>
