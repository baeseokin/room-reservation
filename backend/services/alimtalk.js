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
    console.error("❌ Sendon 설정이 부재합니다.");
    return { success: false, message: "Sendon configuration missing" };
  }

  try {
    const sendOptions = {
      sendProfileId: profileId,
      ...options
    };
    const result = await sendon.kakao.sendAlimTalk(sendOptions);
    return {
      success: result.code === 200,
      groupId: result.data ? result.data.groupId : null,
      message: result.message
    };
  } catch (err) {
    console.error("❌ sendAlimTalk SDK Error:", err);
    throw err;
  }
}

/**
 * 예약 완료 알림톡
 */
async function sendReservationCompleteAlimTalk(reservation) {
  const templateId = envPick("SENDON_TEMPLATE_RESERVATION_COMPLETE", "default_template");
  return sendAlimTalk({
    templateId,
    to: [
      {
        phone: reservation.requester_phone.replace(/-/g, ""),
        variables: {
          "#{공간명}": reservation.room_name,
          "#{일자}": reservation.reservation_date,
          "#{시간}": `${reservation.start_time} ~ ${reservation.end_time}`,
          "#{예약자}": reservation.requester_name,
          "#{사유}": reservation.reason || "없음"
        }
      }
    ]
  });
}

/**
 * 예약 문의 알림톡 (충돌 발생 시)
 */
async function sendInquiryAlimTalk(originalReservation, inquirerName, content) {
  const templateId = envPick("SENDON_TEMPLATE_INQUIRY", "default_template");
  return sendAlimTalk({
    templateId,
    to: [
      {
        phone: originalReservation.requester_phone.replace(/-/g, ""),
        variables: {
          "#{공간명}": originalReservation.room_name,
          "#{일자}": originalReservation.reservation_date,
          "#{시간}": `${originalReservation.start_time} ~ ${originalReservation.end_time}`,
          "#{문의자}": inquirerName,
          "#{문의내용}": content
        }
      }
    ]
  });
}

module.exports = { sendReservationCompleteAlimTalk, sendInquiryAlimTalk };
