-- 예약 변경/반려/취소 이력 테이블 생성
CREATE TABLE IF NOT EXISTS `reservation_change_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `reservation_id` int(11) NOT NULL,
  `action_type` varchar(50) NOT NULL COMMENT '이벤트 유형 (reject, modify, cancel 등)',
  `reason` text DEFAULT NULL COMMENT '사유 내용',
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `reservation_id` (`reservation_id`),
  CONSTRAINT `reservation_change_logs_ibfk_1` FOREIGN KEY (`reservation_id`) REFERENCES `reservations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (선택 사항) 만약 reservations 테이블에 reject_reason 컬럼이 없다면 추가
-- MariaDB 10.5+ / MySQL 8.0+:
ALTER TABLE `reservations` ADD COLUMN IF NOT EXISTS `reject_reason` varchar(500) DEFAULT NULL;
