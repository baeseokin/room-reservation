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

  if (!envPick("SENDON_ID") || !envPick("SENDON_APIKEY") || !profileId) {
    console.warn("⚠️  Sendon 설정이 없어 실제 알림톡 API 호출을 건너뜁니다.");
    return { success: false, message: "Sendon configuration missing" };
  }

  try {
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
 * 전화번호 정규화 (숫자만 추출)
 */
function cleanPhone(phone) {
  if (!phone) return "";
  return String(phone).replace(/[^0-9]/g, "");
}

/**
 * 처리자와 수신인이 동일인인지 확인
 */
function isSameUser(actor, recipient) {
  if (!actor || !recipient) return false;

  const actorId = actor.id || actor.userId;
  const recipientId = recipient.id || recipient.userId || recipient.requester_id;
  if (actorId && recipientId && String(actorId) === String(recipientId)) {
    return true;
  }

  const actorPhone = cleanPhone(actor.phone || actor.requester_phone);
  const recipientPhone = cleanPhone(recipient.phone || recipient.requester_phone);
  if (actorPhone && recipientPhone && actorPhone === recipientPhone) {
    return true;
  }

  return false;
}

/**
 * 동일인 발송 스킵 로깅 (server.log에 출력)
 */
function logSkipSelfNotification({ status, actor, recipient, reservationTitle, roomName, reservationDate }) {
  const actorName = actor?.userName || actor?.name || actor?.requester_name || "알 수 없음";
  const actorPhone = cleanPhone(actor?.phone || actor?.requester_phone) || "-";
  const actorId = actor?.id || actor?.userId || "-";

  const recipientName = recipient?.userName || recipient?.name || recipient?.requester_name || "알 수 없음";
  const recipientPhone = cleanPhone(recipient?.phone || recipient?.requester_phone) || "-";
  const recipientId = recipient?.id || recipient?.userId || recipient?.requester_id || "-";

  console.log(`================================================================`);
  console.log(`⏭️  [카카오 알림톡 발송 건너뜀 (처리자 == 수신인)]`);
  console.log(` ▫️ 진행상태        : ${status}`);
  console.log(` ▫️ 처리자(발송 주체): ${actorName} (ID: ${actorId}, ☎ ${actorPhone})`);
  console.log(` ▫️ 수신인(대상자)  : ${recipientName} (ID: ${recipientId}, ☎ ${recipientPhone})`);
  if (roomName || reservationTitle) {
    console.log(` ▫️ 예약정보        : ${reservationDate || ''} | ${roomName || ''} (${reservationTitle || ''})`);
  }
  console.log(` ▫️ 사유            : 처리자와 수신인이 동일하여 알림톡을 발송하지 않습니다.`);
  console.log(`================================================================`);
}

/**
 * 새 예약 신청 → 관리자에게 알림
 */
async function sendNewReservationToAdmin(reservation, adminPhone, actor = null) {
  console.log("✅ sendNewReservationToAdmin reservation :", reservation);
  console.log("✅ sendNewReservationToAdmin adminPhone :", adminPhone);

  const requesterActor = actor || {
    id: reservation.requester_id,
    userName: reservation.requester_name,
    phone: reservation.requester_phone
  };
  const adminRecipient = { phone: adminPhone, userName: "관리자" };

  if (isSameUser(requesterActor, adminRecipient)) {
    logSkipSelfNotification({
      status: "신청",
      actor: requesterActor,
      recipient: adminRecipient,
      reservationTitle: reservation.title,
      roomName: reservation.room_name,
      reservationDate: reservation.reservation_date
    });
    return { success: true, skipped: true, message: "Skipped: actor is recipient" };
  }

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
          "#{예약자명}": reservation.requester_name,
          "#{예약일}": reservation.reservation_date,
          "#{예약시작시간}": (reservation.start_time || "").slice(0, 5),
          "#{예약종료시간}": (reservation.end_time || "").slice(0, 5),
          "#{신청명}": reservation.title,
          "#{공간명}": reservation.room_name,
          "#{층}": reservation.floor ? `${reservation.floor}층` : "",
          "#{URL}": `admin/reservations${reservation.id ? `?id=${reservation.id}&tab=review` : '?tab=review'}`,
          "#{반려사유}": ""
        },
      },
    ],
  });
}

/**
 * 예약 승인 → 신청자에게 알림
 */
async function sendApprovalAlimTalk(reservation, actor = null) {
  console.log("✅ sendApprovalAlimTalk reservation :", reservation);

  const recipient = {
    id: reservation.requester_id,
    userName: reservation.requester_name,
    phone: reservation.requester_phone
  };

  if (actor && isSameUser(actor, recipient)) {
    logSkipSelfNotification({
      status: "승인",
      actor,
      recipient,
      reservationTitle: reservation.title,
      roomName: reservation.room_name,
      reservationDate: reservation.reservation_date
    });
    return { success: true, skipped: true, message: "Skipped: actor is recipient" };
  }

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
          "#{예약자명}": reservation.requester_name,
          "#{예약일}": reservation.reservation_date,
          "#{예약시작시간}": (reservation.start_time || "").slice(0, 5),
          "#{예약종료시간}": (reservation.end_time || "").slice(0, 5),
          "#{신청명}": reservation.title,
          "#{공간명}": reservation.room_name,
          "#{층}": reservation.floor ? `${reservation.floor}층` : "",
          "#{URL}": `home/my-reservations${reservation.id ? `?id=${reservation.id}` : ''}`,
          "#{반려사유}": ""
        },
      },
    ],
  });
}

/**
 * 예약 거부 → 신청자에게 알림
 */
async function sendRejectionAlimTalk(reservation, reason, actor = null) {
  console.log("✅ sendRejectionAlimTalk reservation :", reservation);
  console.log("✅ sendRejectionAlimTalk reason :", reason);

  const recipient = {
    id: reservation.requester_id,
    userName: reservation.requester_name,
    phone: reservation.requester_phone
  };

  if (actor && isSameUser(actor, recipient)) {
    logSkipSelfNotification({
      status: "거절",
      actor,
      recipient,
      reservationTitle: reservation.title,
      roomName: reservation.room_name,
      reservationDate: reservation.reservation_date
    });
    return { success: true, skipped: true, message: "Skipped: actor is recipient" };
  }

  const templateId = envPick("SENDON_TEMPLATE_REJECTED", "");
  if (!templateId || !reservation.requester_phone) {
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
  console.log("✅ sendCancellationAlimTalk reservation :", reservation, "reason :", reason);

  const recipient = {
    id: reservation.requester_id,
    userName: reservation.requester_name,
    phone: reservation.requester_phone
  };

  if (actor && isSameUser(actor, recipient)) {
    logSkipSelfNotification({
      status: "취소",
      actor,
      recipient,
      reservationTitle: reservation.title,
      roomName: reservation.room_name,
      reservationDate: reservation.reservation_date
    });
    return { success: true, skipped: true, message: "Skipped: actor is recipient" };
  }

  const templateId = envPick("SENDON_TEMPLATE_REJECTED", envPick("SENDON_TEMPLATE_APPROVED", ""));
  if (!templateId || !reservation.requester_phone) {
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
  console.log("✅ sendModificationAlimTalk reservation :", reservation, "reason :", reason);

  const recipient = {
    id: reservation.requester_id,
    userName: reservation.requester_name,
    phone: reservation.requester_phone
  };

  if (actor && isSameUser(actor, recipient)) {
    logSkipSelfNotification({
      status: "변경",
      actor,
      recipient,
      reservationTitle: reservation.title,
      roomName: reservation.room_name,
      reservationDate: reservation.reservation_date
    });
    return { success: true, skipped: true, message: "Skipped: actor is recipient" };
  }

  const templateId = envPick("SENDON_TEMPLATE_APPROVED", envPick("SENDON_TEMPLATE_REJECTED", ""));
  if (!templateId || !reservation.requester_phone) {
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

/**
 * 조율 요청 알림톡
 */
async function sendInquiryAlimTalk(reservation, userName, content, actor = null) {
  const recipient = {
    id: reservation.requester_id,
    userName: reservation.requester_name,
    phone: reservation.requester_phone
  };

  if (actor && isSameUser(actor, recipient)) {
    logSkipSelfNotification({
      status: "조율요청",
      actor,
      recipient,
      reservationTitle: reservation.title,
      roomName: reservation.room_name,
      reservationDate: reservation.reservation_date
    });
    return { success: true, skipped: true, message: "Skipped: actor is recipient" };
  }

  const templateId = envPick("SENDON_TEMPLATE_INQUIRY", envPick("SENDON_TEMPLATE_APPROVED", ""));
  if (!templateId || !reservation.requester_phone) return;
  const dateStr = reservation.reservation_date instanceof Date
    ? reservation.reservation_date.toISOString().split("T")[0]
    : String(reservation.reservation_date).slice(0, 10);

  return sendAlimTalk({
    templateId,
    to: [
      {
        phone: reservation.requester_phone.replace(/-/g, ""),
        variables: {
          "#{진행상태}": "조율요청",
          "#{예약자명}": reservation.requester_name,
          "#{예약일}": dateStr,
          "#{예약시작시간}": (reservation.start_time || "").slice(0, 5),
          "#{예약종료시간}": (reservation.end_time || "").slice(0, 5),
          "#{신청명}": reservation.title,
          "#{공간명}": reservation.room_name,
          "#{층}": reservation.floor ? `${reservation.floor}층` : "",
          "#{URL}": `home/my-reservations${reservation.id ? `?id=${reservation.id}` : ''}`,
          "#{반려사유}": `- ${userName}님의 조율 요청: ${content}`
        }
      }
    ]
  });
}

module.exports = {
  sendNewReservationToAdmin,
  sendApprovalAlimTalk,
  sendRejectionAlimTalk,
  sendCancellationAlimTalk,
  sendModificationAlimTalk,
  sendInquiryAlimTalk,
  sendAlimTalk,
};
