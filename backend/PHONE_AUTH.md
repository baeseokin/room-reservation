# 휴대전화 알림톡 인증 배포

기존 계정의 users.id와 예약 소유권을 유지한다. 부서 관리 기능을 유지하고, 최초 OTP 인증 후 이름과 등록된 부서를 받는다. 관리자는 OTP 후 password_hash에 저장된 비밀번호를 확인한다. 전화번호는 소유 확인이며 법적 본인확인이 아니다.

## 적용 순서

1. DB를 백업하고 기존 사용자 전화번호 누락·중복을 정리한다. 번호는 하이픈·공백을 제외한 국내 휴대전화 형식이어야 한다. 중복 번호는 로그인 시 자동 선택하지 않고 차단한다.
2. `20261108_phone_auth.sql`을 대상 DB에 적용한다. 기존 사용자·예약은 변경하지 않는다.
3. 아래 프로젝트 전용 설정을 준비한다. 운영 비밀번호가 password 열에만 있다면 기존 관리자 API의 불일치 때문에 password_hash가 없을 수 있으므로 안전하게 초기화·정리한다. 해시를 평문 비밀번호처럼 재해시하지 않는다.
4. 백엔드와 프런트를 함께 배포한다. 새 쿠키 이름 room.sid.v2를 사용하므로 기존 세션으로 로그인할 수 없다.
5. 모의 발송 검증 후 승인된 OTP 템플릿으로 발송·수신을 점검한다.

```ini
SESSION_SECRET=<32자 이상의 프로젝트 전용 비밀값>
OTP_SECRET=<별도의 32자 이상 프로젝트 전용 비밀값>
CORS_ORIGIN=https://your-service.example
APP_MODE=production
MESSAGE_PROVIDER=sendon
SENDON_ID=<계정>
SENDON_APIKEY=<키>
SENDON_PROFILE_ID=<발신 프로필>
SENDON_TEMPLATE_OTP_ID=<승인된 인증 템플릿>
SENDON_VARIABLES_OTP={"#{인증번호}":"code"}
OTP_HOURLY_LIMIT=200
OTP_PHONE_HOURLY_LIMIT=5
OTP_IP_HOURLY_LIMIT=30
OTP_RESEND_INTERVAL_SECONDS=60
```

로컬은 `NODE_ENV=development`, `MESSAGE_PROVIDER=mock` 설정으로 실제 알림톡을 발송하지 않고 인증 응답의 `demoCode`를 화면에 표시한다. `APP_MODE=demo`는 필요하지 않다. 예약 신청·승인·거절·취소·변경·조율 요청 알림도 실제 발송 대신 콘솔에 mock 결과를 남긴다. mock에서는 Sendon 계정·템플릿 설정이 필요하지 않으며 OTP_SECRET 등 인증 설정은 여전히 필요하다.

백엔드 `.env`의 `MESSAGE_PROVIDER` 하나로 발송 방식을 선택하고 서버를 재시작한다. 환경별 `MESSAGE_PROVIDER__development` 설정은 사용하지 않는다.

```ini
# sendon: sendon=실제 발송, mock=모의 발송
MESSAGE_PROVIDER=mock
```

실제 발송은 `MESSAGE_PROVIDER=sendon`과 Sendon 설정을 사용한다. 운영 NODE_ENV=production에서는 mock을 허용하지 않는다. CORS_ORIGIN에는 개발 프런트 주소도 정확히 등록한다. 인증 변경 요청에 허용 Origin이 필수다. 프런트와 API는 동일 사이트 구성과 HTTPS를 전제로 SameSite=Lax를 사용한다. 다른 사이트 배치는 별도 쿠키 정책 조정이 필요하다.

OTP는 3분·5회, 일반 인증 세션은 30분, OTP 이후 등록·관리자 비밀번호 임시 단계는 5분이다. OTP 요청은 브라우저 세션에 묶이고 재발송 시 이전 코드는 무효화한다. OTP는 HMAC으로, 세션 키는 SHA-256으로 DB에 저장한다. 만료 세션·코드는 조회 시 거부된다. 만료 데이터 삭제 작업은 아직 추가하지 않았으며 요청 제한 이력 보존 시간(최소 1시간)을 고려해 운영 보존 정책에 맞춰 정리해야 한다.

발송 실패·시간 초과는 해당 코드를 무효화한다. 공급자 접수 성공은 실제 수신 완료와 다르다. OTP 경로는 기존 예약 알림의 상세 로그 함수를 사용하지 않는다.

프로필의 이름·부서는 PC·모바일에서 수정 가능하다. 인증된 전화번호는 읽기 전용이며 새 번호로 변경하는 인증 기능은 별도 구현 대상이다. 신규 가입용 user_id는 내부 난수 ID로 생성한다. 기존 관리자 사용자 관리 화면의 ID·비밀번호 관리 UX 정비, 예약 승인 절차 제거, 예약 당시 소속부서 스냅샷은 이번 로그인 화면 전환과 별도 작업이다.

검증: `node --test tests/*.test.js`, 프런트 `npm run build`. 실제 DB 마이그레이션·실발송·운영 배포는 별도로 검증한다.
