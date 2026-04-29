const { Sendon } = require("@alipeople/sendon-sdk-typescript");
const { envPick } = require("../env");

// Sendon SDK 초기화
const sendon = new Sendon({
  id: envPick("SENDON_ID", ""),
  apikey: envPick("SENDON_APIKEY", ""),
  debug: String(envPick("SENDON_DEBUG", "false")) === "true",
});

async function sendAlimTalk(options) {
  const profileId = envPick("SENDON_PROFILE_ID", "");

  if (!envPick("SENDON_ID") || !envPick("SENDON_APIKEY") || !profileId) {
    console.warn("⚠️  Sendon 설정이 없어 알림톡 발송을 건너뜁니다.");
    return { success: false, message: "Sendon configuration missing" };
  }

  try {
    const result = await sendon.kakao.sendAlimTalk({ sendProfileId: profileId, ...options });
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
 * 새 예약 신청 → 관리자에게 알림
 */
async function sendNewReservationToAdmin(reservation, adminPhone) {
  const templateId = envPick("SENDON_TEMPLATE_NEW_RESERVATION", "");
  if (!templateId) {
    console.warn("⚠️  SENDON_TEMPLATE_NEW_RESERVATION 미설정 — 알림톡 건너뜀");
    return;
  }
  return sendAlimTalk({
    templateId,
    to: [
      {
        phone: adminPhone.replace(/-/g, ""),
        variables: {
          "#{진행상태}": "신청",
          "#{예약일}": reservation.reservation_date,
          "#{예약시작시간}": reservation.start_time,
          "#{예약종료시간}": reservation.end_time,
          "#{공간명}": reservation.room_name,
          "#{층}": reservation.floor || "",
        },
      },
    ],
  });
}

/**
 * 예약 승인 → 신청자에게 알림
 */
async function sendApprovalAlimTalk(reservation) {
  const templateId = envPick("SENDON_TEMPLATE_APPROVED", "");
  if (!templateId || !reservation.requester_phone) {
    console.warn("⚠️  승인 알림톡 설정 미비 — 건너뜀");
    return;
  }
  return sendAlimTalk({
    templateId,
    to: [
      {
        phone: reservation.requester_phone.replace(/-/g, ""),
        variables: {
          "#{진행상태}": "승인",
          "#{예약일}": reservation.reservation_date,
          "#{예약시작시간}": reservation.start_time,
          "#{예약종료시간}": reservation.end_time,
          "#{공간명}": reservation.room_name,
          "#{층}": reservation.floor || "",
        },
      },
    ],
  });
}

/**
 * 예약 거부 → 신청자에게 알림
 */
async function sendRejectionAlimTalk(reservation, reason) {
  const templateId = envPick("SENDON_TEMPLATE_REJECTED", "");
  if (!templateId || !reservation.requester_phone) {
    console.warn("⚠️  거부 알림톡 설정 미비 — 건너뜀");
    return;
  }
  return sendAlimTalk({
    templateId,
    to: [
      {
        phone: reservation.requester_phone.replace(/-/g, ""),
        variables: {
          "#{진행상태}": "거절",
          "#{예약일}": reservation.reservation_date,
          "#{예약시작시간}": reservation.start_time,
          "#{예약종료시간}": reservation.end_time,
          "#{공간명}": reservation.room_name,
          "#{층}": reservation.floor || "",
        },
      },
    ],
  });
}

module.exports = {
  sendNewReservationToAdmin,
  sendApprovalAlimTalk,
  sendRejectionAlimTalk,
  sendAlimTalk,
};
