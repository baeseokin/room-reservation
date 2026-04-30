<script setup>
const KAKAO_CLIENT_ID = import.meta.env.VITE_KAKAO_CLIENT_ID
const REDIRECT_URI = import.meta.env.VITE_KAKAO_REDIRECT_URI

const loginWithKakao = () => {
  const kakaoUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${KAKAO_CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code`
  window.location.href = kakaoUrl
}
</script>

<template>
  <div class="min-h-screen bg-white flex flex-col items-center justify-between p-8">
    <div class="flex-1 flex flex-col items-center justify-center space-y-6 w-full">
      <div class="w-24 h-24 bg-indigo-600 rounded-3xl flex items-center justify-center shadow-lg shadow-indigo-200">
        <span class="text-white text-4xl font-bold">R</span>
      </div>
      <div class="text-center space-y-2">
        <h1 class="text-2xl font-bold text-slate-900 tracking-tight">공간 예약 시스템</h1>
        <p class="text-slate-500 text-sm">church room reservation</p>
      </div>
    </div>
    
    <div class="w-full space-y-4 pb-8">
      <button 
        @click="loginWithKakao"
        class="w-full bg-[#FEE500] text-slate-900 font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-transform"
      >
        <img src="https://developers.kakao.com/assets/img/lib/logos/kakaotalksharing/kakaotalk_sharing_btn_medium.png" class="w-6 h-6" alt="Kakao" />
        카카오 로그인
      </button>
      <p class="text-center text-[12px] text-slate-400">
        로그인 시 이용약관 및 개인정보 처리방침에 동의하게 됩니다.
      </p>
    </div>
  </div>
</template>
