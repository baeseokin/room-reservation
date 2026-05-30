-- 예약 정책 관리를 위한 테이블 생성
CREATE TABLE IF NOT EXISTS `reservation_policies` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `allow_same_day` tinyint(1) NOT NULL DEFAULT 0,
  `allow_monday` tinyint(1) NOT NULL DEFAULT 0,
  `allow_holidays` tinyint(1) NOT NULL DEFAULT 0,
  `start_time` time NOT NULL DEFAULT '09:00:00',
  `end_time` time NOT NULL DEFAULT '17:00:00',
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 초기 기본 예약 정책 데이터 삽입
INSERT INTO `reservation_policies` (`id`, `allow_same_day`, `allow_monday`, `allow_holidays`, `start_time`, `end_time`)
VALUES (1, 0, 0, 0, '09:00:00', '17:00:00')
ON DUPLICATE KEY UPDATE id=id;
