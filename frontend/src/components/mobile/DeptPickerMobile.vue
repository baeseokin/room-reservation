<template>
  <div class="fixed inset-0 bg-black/50 z-50 overflow-hidden flex items-end sm:items-center justify-center">
    <div class="bg-white w-full h-full sm:w-[500px] sm:h-[90vh] sm:rounded-2xl flex flex-col p-4 shadow-xl">
      <!-- 헤더 -->
      <div class="flex items-center justify-between py-2 border-b mb-3">
        <h3 class="text-xl font-bold text-gray-800">부서 선택</h3>
        <button class="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors" @click="$emit('close')">
          <span class="text-2xl leading-none">✕</span>
        </button>
      </div>



      <!-- 언어 토글 & 초성 필터 -->
      <div class="mb-4 flex flex-col gap-2">
        <div class="flex items-center gap-2">
          <span class="text-xs font-bold text-gray-500">언어 선택</span>
          <div class="flex bg-gray-100 rounded-lg p-0.5">
            <button class="px-3 py-1 rounded-md text-xs font-semibold transition-all" :class="filterMode === 'KO' ? 'bg-white shadow text-purple-600' : 'text-gray-500 hover:text-gray-700'" @click="filterMode = 'KO'; clearChosung()">한글</button>
            <button class="px-3 py-1 rounded-md text-xs font-semibold transition-all" :class="filterMode === 'EN' ? 'bg-white shadow text-purple-600' : 'text-gray-500 hover:text-gray-700'" @click="filterMode = 'EN'; clearChosung()">영어</button>
          </div>
        </div>

        <div class="flex flex-wrap gap-1.5 pb-1">
          <button
            class="shrink-0 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all active:scale-95"
            :class="!activeChosung ? 'bg-purple-600 border-purple-600 text-white shadow-md shadow-purple-100' : 'bg-white border-gray-200 text-gray-500 hover:border-purple-300'"
            @click="clearChosung"
          >전체</button>
          <button
            v-for="ch in currentChosungs"
            :key="ch"
            class="shrink-0 px-2 py-1.5 rounded-xl border text-xs font-semibold transition-all active:scale-95"
            :class="ch === activeChosung ? 'bg-purple-600 border-purple-600 text-white shadow-md shadow-purple-100' : 'bg-white border-gray-200 text-gray-500 hover:border-purple-300'"
            @click="toggleChosung(ch)"
          >{{ ch }}</button>
        </div>
      </div>

      <!-- 리스트 컨테이너 (남은 공간 모두 차지) -->
      <div class="relative flex-1 min-h-0">
        <!-- 스크롤 영역 -->
        <div ref="scrollArea" class="absolute inset-0 overflow-y-auto custom-scrollbar">
          <!-- ⭐🕘 상단 고정 바 (즐겨찾기/최근) -->
          <div v-if="favoriteDepts.length || recentDepts.length" class="sticky top-0 z-10 bg-white/95 backdrop-blur mb-4">
            <div class="py-2 space-y-4">
              <div v-if="favoriteDepts.length" class="space-y-2">
                <div class="flex items-center gap-1 px-1">
                  <span class="text-xs font-bold text-gray-400">⭐ 즐겨찾기</span>
                </div>
                <div class="flex flex-wrap gap-2 px-1">
                  <button
                    v-for="d in favoriteDepts"
                    :key="'fav-'+d.id"
                    :data-testid="'dept-item-' + d.dept_name"
                    class="px-3 py-1.5 rounded-xl bg-yellow-50 border border-yellow-100 text-sm font-medium text-yellow-800 active:bg-yellow-100 active:scale-95 transition-all"
                    @click="select(d)"
                  >
                    {{ d.dept_name }}
                  </button>
                </div>
              </div>

              <div v-if="recentDepts.length" class="space-y-2 border-t pt-2">
                <div class="flex items-center gap-1 px-1">
                  <span class="text-xs font-bold text-gray-400">🕘 최근 선택</span>
                </div>
                <div class="flex flex-wrap gap-2 px-1">
                  <button
                    v-for="d in recentDepts"
                    :key="'recent-'+d.id"
                    :data-testid="'dept-item-' + d.dept_name"
                    class="px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-100 text-sm font-medium text-gray-700 active:bg-gray-100 active:scale-95 transition-all"
                    @click="select(d)"
                  >
                    {{ d.dept_name }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- 섹션별 리스트 -->
          <div
            v-for="group in grouped"
            :key="group.key"
            class="mb-3"
          >
            <div class="sticky top-0 bg-white/90 backdrop-blur px-2 py-1 text-xs font-bold text-purple-600 border-b border-purple-50 z-[5]">
              {{ group.key }}
            </div>
            <div class="divide-y divide-gray-50">
              <div
                v-for="d in group.items"
                :key="d.id"
                :data-testid="'dept-item-' + d.dept_name"
                class="px-2 py-1 flex items-center justify-between hover:bg-purple-50 active:bg-purple-100 rounded-lg transition-colors cursor-pointer"
                @click="select(d)"
              >
                <div class="flex items-center gap-2 overflow-hidden">
                  <div class="text-[15px] font-medium text-gray-900 truncate">{{ d.dept_name }}</div>
                  <span class="shrink-0 px-1.5 py-0.5 bg-gray-50 border border-gray-100 rounded text-[10px] font-mono text-gray-400">{{ d.dept_cd }}</span>
                </div>
                <button
                  class="p-2 -mr-2 text-xl transition-all active:scale-125"
                  @click.stop="toggleFavorite(d)"
                  :aria-label="isFavorite(d) ? '즐겨찾기 제거' : '즐겨찾기 추가'"
                >
                  <span :class="isFavorite(d) ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-300'">{{ isFavorite(d) ? '★' : '☆' }}</span>
                </button>
              </div>
            </div>
          </div>

          <div v-if="!grouped.length" class="py-20 text-center flex flex-col items-center gap-3">
            <span class="text-4xl">🔎</span>
            <p class="text-gray-500 text-sm font-medium">부서를 찾을 수 없습니다</p>
            <button v-if="activeChosung" @click="resetFilters" class="text-purple-600 text-xs font-bold underline">필터 초기화</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from "vue";

const props = defineProps({
  departments: { type: Array, default: () => [] },
  favorites: { type: Array, default: () => [] }, // [deptId]
  recent: { type: Array, default: () => [] },    // [deptId]
});
const emit = defineEmits(["close", "select", "update:favorites"]);

const korChosungs = ["ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ","ㅅ","ㅆ","ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];
const engAlphabets = ["A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z"];
const filterMode = ref("KO");
const currentChosungs = computed(() => filterMode.value === "KO" ? korChosungs : engAlphabets);

const activeChosung = ref("");
const scrollArea = ref(null);

// 초성 추출
function getChosung(kor) {
  const base = 0xac00;
  const code = kor?.charCodeAt(0) ?? 0;
  if (code < 0xac00 || code > 0xd7a3) return "";
  const idx = Math.floor((code - base) / 588);
  return korChosungs[idx] || "";
}

// 즐겨찾기/최근 계산
const favoriteDepts = computed(() => props.favorites.map(id => props.departments.find(d => d.id === id)).filter(Boolean));
const recentDepts   = computed(() => props.recent.map(id => props.departments.find(d => d.id === id)).filter(Boolean));

function isFavorite(d) { return props.favorites.includes(d.id); }
function toggleFavorite(d) {
  const next = isFavorite(d) ? props.favorites.filter(x => x !== d.id) : [d.id, ...props.favorites];
  emit("update:favorites", next.slice(0,50));
}

function select(d) {
  emit("select", d);
}

// 초성 토글
function toggleChosung(ch) {
  activeChosung.value = (activeChosung.value === ch) ? "" : ch;
}
function clearChosung() { activeChosung.value = ""; }

function resetFilters() {
  activeChosung.value = "";
}

// 그룹핑
const grouped = computed(() => {
  let list = props.departments;
  
  // 2. 초성 필터링
  if (activeChosung.value) {
    list = list.filter(d => {
      const first = (d.dept_name || d.dept_cd || "").charAt(0);
      const key = /^[A-Za-z]$/.test(first) ? first.toUpperCase() : getChosung(first);
      return key === activeChosung.value;
    });
  }
  const map = new Map();
  for (const d of list) {
    const first = (d.dept_name || d.dept_cd || "").charAt(0);
    const key = /^[A-Za-z]$/.test(first) ? first.toUpperCase() : getChosung(first) || "기타";
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(d);
  }
  const arr = Array.from(map.entries()).map(([key, items]) => ({
    key,
    items: items.sort((a,b) => a.dept_name.localeCompare(b.dept_name, "ko"))
  }));
  const order = (k) => {
    const i = korChosungs.indexOf(k);
    if (i >= 0) return i;
    if (/^[A-Z]$/.test(k)) return 100 + k.charCodeAt(0);
    return 1000;
  };
  return arr.sort((a,b) => order(a.key)-order(b.key));
});


</script>

<style scoped>
/* 모바일 터치 UX에 최적화된 기본 스타일 */
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #e5e7eb;
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #d1d5db;
}

/* 터치 타겟 확보 및 활성 상태 시각화 */
input, button {
  -webkit-tap-highlight-color: transparent;
}
</style>
