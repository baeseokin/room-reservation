-- Target: server roomdb (MySQL/MariaDB).
-- DML: move 01023070437 from its current account to user_id='admin'.
-- Existing accounts, reservations, passwords and roles are preserved.
-- Run the whole script in one connection. Requires CREATE ROUTINE permission.
USE roomdb;

DELIMITER //
CREATE PROCEDURE migrate_admin_phone_20261108()
BEGIN
  DECLARE admin_id INT DEFAULT NULL;
  DECLARE owner_count INT DEFAULT 0;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  SELECT id INTO admin_id
  FROM users
  WHERE user_id = 'admin'
  FOR UPDATE;

  IF admin_id IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'admin account does not exist';
  END IF;

  UPDATE users
  SET phone = NULL
  WHERE id <> admin_id
    AND REPLACE(REPLACE(phone, '-', ''), ' ', '') = '01023070437';

  UPDATE users SET phone = '01023070437' WHERE id = admin_id;

  SELECT COUNT(*) INTO owner_count
  FROM users
  WHERE REPLACE(REPLACE(phone, '-', ''), ' ', '') = '01023070437';

  IF owner_count <> 1 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Phone ownership verification failed';
  END IF;

  COMMIT;
END//
DELIMITER ;

CALL migrate_admin_phone_20261108();
DROP PROCEDURE migrate_admin_phone_20261108;

SELECT id, user_id, user_name, phone
FROM users
WHERE user_id = 'admin';
