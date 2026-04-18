<script setup>
const KAKAO_CLIENT_ID = import.meta.env.VITE_KAKAO_CLIENT_ID
const REDIRECT_URI = import.meta.env.VITE_KAKAO_REDIRECT_URI

const loginWithKakao = () => {
  const kakaoUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${KAKAO_CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code`
  window.location.href = kakaoUrl
}
</script>

<template>
  <div class="min-h-screen bg-slate-900 flex items-center justify-center p-4">
    <div class="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden transition-all hover:shadow-indigo-500/20">
      <div class="p-8 text-center space-y-6">
        <div class="space-y-2">
          <h1 class="text-3xl font-bold text-slate-900">공간 예약 시스템</h1>
          <p class="text-slate-500">교회 로고나 안내 문구</p>
        </div>
        
        <div class="py-8">
          <button 
            @click="loginWithKakao"
            class="w-full bg-[#FEE500] text-slate-900 font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-3 hover:bg-[#FADA00] transition-colors active:scale-95"
          >
            <img src="https://developers.kakao.com/assets/img/lib/logos/kakaotalksharing/kakaotalk_sharing_btn_medium.png" class="w-6 h-6" alt="Kakao" />
            카카오 계정으로 로그인
          </button>
        </div>

        <div class="text-xs text-slate-400">
          본 시스템은 교회 성도 및 관계자만 이용 가능합니다.
        </div>
      </div>
    </div>
  </div>
</template>
