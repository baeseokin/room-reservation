const { Sendon } = require("@alipeople/sendon-sdk-typescript");
const { envPick, ENV } = require("../env");

// 실제 발송이 필요한 시점에만 SDK를 초기화한다.
let sendon;
const isMock = () => envPick("MESSAGE_PROVIDER") === "mock";

async function sendAlimTalk(options) {
  if (isMock() && ENV === "production") {
    throw new Error("운영 환경에서는 MESSAGE_PROVIDER=mock을 사용할 수 없습니다.");
  }
  const profileId = envPick("SENDON_PROFILE_ID", "");

  // 1. 카카오 알림톡 발송 정보 로깅 (URL 포함, server.log에 즉시 출력)
  if (options.to && Array.isArray(options.to)) {
    options.to.forEach(recipient => {
      const targetUrl = recipient.variables?.["#{URL}"] || "없음";
      const status = recipient.variables?.["#{진행상태}"] || "";
      const requester = recipient.variables?.["#{예약자명}"] || "";
      console.log(`================================================================`);
      console.log(`📢 [카카오 알림톡 발송 요청]`);
      console.log(` ▫️ 수신번호        : ${recipient.phone}`);
      console.log(` ▫️ 예약자명        : ${requester}`);
      console.log(` ▫️ 진행상태        : ${status}`);
      console.log(` ▫️ 카카오 발송 URL : ${targetUrl}`);
      console.log(` ▫️ 템플릿 변수목록 :`, JSON.stringify(recipient.variables));
      console.log(`================================================================`);
    });
  }

  if (isMock()) {
    console.log("📨 [카카오 알림톡 mock] 실제 발송을 생략했습니다.", { templateId: options.templateId });
    return { success: true, mock: true, groupId: null, message: "Mock delivery; no message sent" };
  }

  if (!envPick("SENDON_ID") || !envPick("SENDON_APIKEY") || !profileId) {
    console.warn("⚠️  Sendon 설정이 없어 실제 알림톡 API 호출을 건너뜁니다.");
    return { success: false, message: "Sendon configuration missing" };
  }

  try {
    sendon ||= new Sendon({
      id: envPick("SENDON_ID", ""),
      apikey: envPick("SENDON_APIKEY", ""),
      debug: String(envPick("SENDON_DEBUG", "false")) === "true",
    });
    const result = await sendon.kakao.sendAlimTalk({ sendProfileId: profileId, ...options });
    console.log("📨 [카카오 알림톡 발송 결과]:", { code: result.code, message: result.message, groupId: result.data?.groupId });
    return {
      success: result.code === 200,
      groupId: result.data?.groupId || null,
      message: result.message,
    };
  } catch (err) {
    console.error("❌ sendAlimTalk SDK Error:", err);
    return { success: false, message: err.message };
  }
}

/**
 * 예약 거부 → 신청자에게 알림
 */
async function sendRejectionAlimTalk(reservation, reason, actor = null) {
  if (!actor?.roles?.includes("관리자")) return;
  console.log("✅ sendRejectionAlimTalk reservation :", reservation);
  console.log("✅ sendRejectionAlimTalk reason :", reason);

  const templateId = envPick("SENDON_TEMPLATE_REJECTED", "");
  if ((!templateId && !isMock()) || !reservation.requester_phone) {
    console.warn("⚠️  거부 알림톡 설정 미비 — 건너뜀");
    return;
  }
  const dateStr = reservation.reservation_date instanceof Date
    ? reservation.reservation_date.toISOString().split("T")[0]
    : String(reservation.reservation_date).slice(0, 10);

  return sendAlimTalk({
    templateId,
    to: [
      {
        phone: reservation.requester_phone.replace(/-/g, ""),
        variables: {
          "#{진행상태}": "거절",
          "#{예약자명}": reservation.requester_name,
          "#{예약일}": dateStr,
          "#{예약시작시간}": (reservation.start_time || "").slice(0, 5),
          "#{예약종료시간}": (reservation.end_time || "").slice(0, 5),
          "#{신청명}": reservation.title,
          "#{공간명}": reservation.room_name,
          "#{층}": reservation.floor ? `${reservation.floor}층` : "",
          "#{URL}": `home/my-reservations${reservation.id ? `?id=${reservation.id}` : ''}`,
          "#{반려사유}": reason ? "- 거절사유 : " + reason : ""
        },
      },
    ],
  });
}

/**
 * 예약 취소 → 신청자에게 알림 (관리자 취소 사유 포함)
 */
async function sendCancellationAlimTalk(reservation, reason, actor = null) {
  if (!actor?.roles?.includes("관리자")) return;
  console.log("✅ sendCancellationAlimTalk reservation :", reservation, "reason :", reason);

  const templateId = envPick("SENDON_TEMPLATE_REJECTED", envPick("SENDON_TEMPLATE_APPROVED", ""));
  if ((!templateId && !isMock()) || !reservation.requester_phone) {
    console.warn("⚠️  취소 알림톡 설정 미비 — 건너뜀");
    return;
  }
  const dateStr = reservation.reservation_date instanceof Date
    ? reservation.reservation_date.toISOString().split("T")[0]
    : String(reservation.reservation_date).slice(0, 10);

  return sendAlimTalk({
    templateId,
    to: [
      {
        phone: reservation.requester_phone.replace(/-/g, ""),
        variables: {
          "#{진행상태}": "취소",
          "#{예약자명}": reservation.requester_name,
          "#{예약일}": dateStr,
          "#{예약시작시간}": (reservation.start_time || "").slice(0, 5),
          "#{예약종료시간}": (reservation.end_time || "").slice(0, 5),
          "#{신청명}": reservation.title,
          "#{공간명}": reservation.room_name,
          "#{층}": reservation.floor ? `${reservation.floor}층` : "",
          "#{URL}": `home/my-reservations${reservation.id ? `?id=${reservation.id}` : ''}`,
          "#{반려사유}": reason ? "- 취소사유 : " + reason : ""
        },
      },
    ],
  });
}

/**
 * 예약 변경 → 신청자에게 알림 (관리자 변경 사유 포함)
 */
async function sendModificationAlimTalk(reservation, reason, actor = null) {
  if (!actor?.roles?.includes("관리자")) return;
  console.log("✅ sendModificationAlimTalk reservation :", reservation, "reason :", reason);

  const templateId = envPick("SENDON_TEMPLATE_APPROVED", envPick("SENDON_TEMPLATE_REJECTED", ""));
  if ((!templateId && !isMock()) || !reservation.requester_phone) {
    console.warn("⚠️  변경 알림톡 설정 미비 — 건너뜀");
    return;
  }
  const dateStr = reservation.reservation_date instanceof Date
    ? reservation.reservation_date.toISOString().split("T")[0]
    : String(reservation.reservation_date).slice(0, 10);

  return sendAlimTalk({
    templateId,
    to: [
      {
        phone: reservation.requester_phone.replace(/-/g, ""),
        variables: {
          "#{진행상태}": "변경",
          "#{예약자명}": reservation.requester_name,
          "#{예약일}": dateStr,
          "#{예약시작시간}": (reservation.start_time || "").slice(0, 5),
          "#{예약종료시간}": (reservation.end_time || "").slice(0, 5),
          "#{신청명}": reservation.title,
          "#{공간명}": reservation.room_name,
          "#{층}": reservation.floor ? `${reservation.floor}층` : "",
          "#{URL}": `home/my-reservations${reservation.id ? `?id=${reservation.id}` : ''}`,
          "#{반려사유}": reason ? "- 변경사유 : " + reason : ""
        },
      },
    ],
  });
}

module.exports = {
  sendRejectionAlimTalk,
  sendCancellationAlimTalk,
  sendModificationAlimTalk,
  sendAlimTalk,
};
