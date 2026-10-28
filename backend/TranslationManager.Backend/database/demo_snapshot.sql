-- Translation Manager: schema and local demo data, 17 tables.
-- Delivery date: 2026-10-26. MariaDB/XAMPP, UTF-8.
-- Import into an empty translation_manager_demo database.
-- See README_DATABASE.md for accounts, configuration and table descriptions.


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `translation_manager_demo` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */;

USE `translation_manager_demo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `admin_audit` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `actor_id` bigint(20) unsigned DEFAULT NULL,
  `action` varchar(60) NOT NULL,
  `target_type` varchar(30) NOT NULL,
  `target_id` bigint(20) unsigned DEFAULT NULL,
  `summary` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_admin_audit_date` (`created_at`,`id`),
  KEY `fk_admin_audit_actor` (`actor_id`),
  CONSTRAINT `fk_admin_audit_actor` FOREIGN KEY (`actor_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `admin_audit` DISABLE KEYS */;
INSERT INTO `admin_audit` VALUES (1,1,'admin.bootstrapped','user',1,'Khởi tạo Admin đầu tiên bằng lệnh CLI.','2026-10-25 08:38:35'),(2,1,'user.updated','user',6,'{\"before\":{\"displayName\":\"T\\u00E0i kho\\u1EA3n kh\\u00F3a Demo\",\"systemRole\":\"user\",\"isActive\":true},\"after\":{\"displayName\":\"T\\u00E0i kho\\u1EA3n kh\\u00F3a Demo\",\"SystemRole\":\"user\",\"IsActive\":false}}','2026-10-25 08:38:35'),(8,1,'project.member_added','project',5,'Thành viên: 20; vai trò: manager','2026-10-25 08:42:33'),(11,1,'project.updated','project',5,'Updated Admin QA f76bfdf603f1 / adminqa-f76bfdf603f1','2026-10-25 08:42:33'),(12,1,'project.deleted','project',6,'Đã xóa dự án và dữ liệu nghiệp vụ trong database.','2026-10-25 08:42:33'),(13,1,'project.deleted','project',5,'Đã xóa dự án và dữ liệu nghiệp vụ trong database.','2026-10-25 08:42:33');
/*!40000 ALTER TABLE `admin_audit` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `locales` (
  `code` varchar(20) NOT NULL,
  `name` varchar(80) NOT NULL,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `locales` DISABLE KEYS */;
INSERT INTO `locales` VALUES ('de','Deutsch'),('en','English'),('es','es'),('fr','Français'),('ja','日本語'),('ko','한국어'),('pt','pt'),('ru','ru'),('th','th'),('vi','Tiếng Việt'),('zh','中文');
/*!40000 ALTER TABLE `locales` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `project_locales` (
  `project_id` bigint(20) unsigned NOT NULL,
  `locale_code` varchar(20) NOT NULL,
  `is_source` tinyint(1) NOT NULL DEFAULT 0,
  `display_name` varchar(80) DEFAULT NULL,
  PRIMARY KEY (`project_id`,`locale_code`),
  KEY `fk_pl_locale` (`locale_code`),
  CONSTRAINT `fk_pl_locale` FOREIGN KEY (`locale_code`) REFERENCES `locales` (`code`),
  CONSTRAINT `fk_pl_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `project_locales` DISABLE KEYS */;
INSERT INTO `project_locales` VALUES (1,'de',0,'Tiếng Đức (Deutsch)'),(1,'en',0,NULL),(1,'es',0,'Tiếng Tây Ban Nha (Español)'),(1,'fr',0,'Tiếng Pháp (Français)'),(1,'ja',0,'Tiếng Nhật (日本語)'),(1,'ko',0,'Tiếng Hàn (한국어)'),(1,'pt',0,'Tiếng Bồ Đào Nha (Português)'),(1,'ru',0,'Tiếng Nga (Русский)'),(1,'th',0,'Tiếng Thái (ไทย)'),(1,'vi',1,NULL),(1,'zh',0,NULL);
/*!40000 ALTER TABLE `project_locales` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `project_members` (
  `project_id` bigint(20) unsigned NOT NULL,
  `user_id` bigint(20) unsigned NOT NULL,
  `role` enum('manager','translator','reviewer') NOT NULL,
  PRIMARY KEY (`project_id`,`user_id`),
  KEY `fk_pm_user` (`user_id`),
  CONSTRAINT `fk_pm_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pm_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `project_members` DISABLE KEYS */;
INSERT INTO `project_members` VALUES (1,2,'manager'),(1,3,'translator'),(1,4,'reviewer');
/*!40000 ALTER TABLE `project_members` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `projects` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(160) NOT NULL,
  `slug` varchar(160) NOT NULL,
  `source_locale_code` varchar(20) NOT NULL,
  `created_by` bigint(20) unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`),
  KEY `fk_projects_creator` (`created_by`),
  CONSTRAINT `fk_projects_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `projects` DISABLE KEYS */;
INSERT INTO `projects` VALUES (1,'Demo · Cổng thông tin sinh viên','translation-showcase','vi',2,'2026-10-25 08:38:35');
/*!40000 ALTER TABLE `projects` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `release_files` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `release_id` bigint(20) unsigned NOT NULL,
  `locale_code` varchar(20) NOT NULL,
  `is_source` tinyint(1) NOT NULL DEFAULT 0,
  `file_name` varchar(190) NOT NULL,
  `content_json` longtext NOT NULL,
  `sha256` char(64) NOT NULL,
  `key_count` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `release_id` (`release_id`,`locale_code`),
  KEY `fk_rf_locale` (`locale_code`),
  CONSTRAINT `fk_rf_locale` FOREIGN KEY (`locale_code`) REFERENCES `locales` (`code`),
  CONSTRAINT `fk_rf_release` FOREIGN KEY (`release_id`) REFERENCES `releases` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `release_files` DISABLE KEYS */;
INSERT INTO `release_files` VALUES (1,1,'vi',1,'vi.json','{\r\n  \"actions\": {\r\n    \"cancel\": \"Hủy\",\r\n    \"save\": \"Lưu thay đổi\",\r\n    \"submit\": \"Gửi yêu cầu\"\r\n  },\r\n  \"app\": {\r\n    \"subtitle\": \"Học tập, kết nối và phát triển\",\r\n    \"title\": \"Cổng thông tin sinh viên\"\r\n  },\r\n  \"home\": {\r\n    \"courses\": \"Bạn đang học {count} môn\",\r\n    \"welcome\": \"Xin chào {name}\"\r\n  },\r\n  \"menu\": {\r\n    \"home\": \"Trang chủ\",\r\n    \"profile\": \"Hồ sơ\",\r\n    \"results\": \"Kết quả học tập\"\r\n  }\r\n}','85b6df749dea010f6d89eabb11629c37cc430d3d01e3674599306c36ebcea90f',10),(2,1,'en',0,'en.json','{\r\n  \"actions\": {\r\n    \"cancel\": \"Cancel\",\r\n    \"save\": \"Save changes\",\r\n    \"submit\": \"Submit request\"\r\n  },\r\n  \"app\": {\r\n    \"subtitle\": \"Learn, connect and grow\",\r\n    \"title\": \"Student Portal\"\r\n  },\r\n  \"home\": {\r\n    \"courses\": \"You are studying {count} courses\",\r\n    \"welcome\": \"Welcome {name}\"\r\n  },\r\n  \"menu\": {\r\n    \"home\": \"Home\",\r\n    \"profile\": \"Profile\",\r\n    \"results\": \"Academic results\"\r\n  }\r\n}','5ab7d6a89eafedc5829e9165d83945bb46769a4a22bfd6c9db177aa4d0fbe21e',10),(3,1,'zh',0,'zh.json','{\r\n  \"actions\": {\r\n    \"cancel\": \"取消\",\r\n    \"save\": \"保存更改\",\r\n    \"submit\": \"提交申请\"\r\n  },\r\n  \"app\": {\r\n    \"subtitle\": \"学习、联系与成长\",\r\n    \"title\": \"学生门户\"\r\n  },\r\n  \"home\": {\r\n    \"courses\": \"你正在学习 {count} 门课程\",\r\n    \"welcome\": \"你好 {name}\"\r\n  },\r\n  \"menu\": {\r\n    \"home\": \"首页\",\r\n    \"profile\": \"个人资料\",\r\n    \"results\": \"学习成绩\"\r\n  }\r\n}','1ee09998d914e3eadd0e6ccb23415d1592b6d169f3b97c8230d59d1259bb7fd0',10);
/*!40000 ALTER TABLE `release_files` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `releases` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `project_id` bigint(20) unsigned NOT NULL,
  `version_name` varchar(120) NOT NULL,
  `source_version_id` bigint(20) unsigned DEFAULT NULL,
  `note` text DEFAULT NULL,
  `key_count` int(11) NOT NULL DEFAULT 0,
  `published_by` bigint(20) unsigned NOT NULL,
  `published_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `project_id` (`project_id`,`version_name`),
  KEY `fk_rel_source_version` (`source_version_id`),
  KEY `fk_rel_user` (`published_by`),
  CONSTRAINT `fk_rel_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_rel_source_version` FOREIGN KEY (`source_version_id`) REFERENCES `source_versions` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_rel_user` FOREIGN KEY (`published_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `releases` DISABLE KEYS */;
INSERT INTO `releases` VALUES (1,1,'1.0.0',1,'Snapshot đã duyệt đầy đủ để demo tải JSON/ZIP.',10,2,'2026-10-25 08:38:35');
/*!40000 ALTER TABLE `releases` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `reviews` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `translation_id` bigint(20) unsigned NOT NULL,
  `reviewer_id` bigint(20) unsigned NOT NULL,
  `decision` enum('approved','rejected') NOT NULL,
  `note` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_r_translation` (`translation_id`),
  KEY `fk_r_reviewer` (`reviewer_id`),
  CONSTRAINT `fk_r_reviewer` FOREIGN KEY (`reviewer_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_r_translation` FOREIGN KEY (`translation_id`) REFERENCES `translations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=39 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `reviews` DISABLE KEYS */;
INSERT INTO `reviews` VALUES (1,1,4,'approved',NULL,'2026-10-25 08:38:35'),(2,2,4,'approved',NULL,'2026-10-25 08:38:35'),(3,3,4,'approved',NULL,'2026-10-25 08:38:35'),(4,4,4,'approved',NULL,'2026-10-25 08:38:35'),(5,5,4,'approved',NULL,'2026-10-25 08:38:35'),(6,6,4,'approved',NULL,'2026-10-25 08:38:35'),(7,7,4,'approved',NULL,'2026-10-25 08:38:35'),(8,8,4,'approved',NULL,'2026-10-25 08:38:35'),(9,9,4,'approved',NULL,'2026-10-25 08:38:35'),(10,10,4,'approved',NULL,'2026-10-25 08:38:35'),(11,11,4,'approved',NULL,'2026-10-25 08:38:35'),(12,12,4,'approved',NULL,'2026-10-25 08:38:35'),(13,13,4,'approved',NULL,'2026-10-25 08:38:35'),(14,14,4,'approved',NULL,'2026-10-25 08:38:35'),(15,15,4,'approved',NULL,'2026-10-25 08:38:35'),(16,16,4,'approved',NULL,'2026-10-25 08:38:35'),(17,17,4,'approved',NULL,'2026-10-25 08:38:35'),(18,18,4,'approved',NULL,'2026-10-25 08:38:35'),(19,19,4,'approved',NULL,'2026-10-25 08:38:35'),(20,20,4,'approved',NULL,'2026-10-25 08:38:35'),(21,9,4,'rejected','Hãy dùng thuật ngữ Student profile trước khi gửi duyệt lại.','2026-10-25 08:38:35');
/*!40000 ALTER TABLE `reviews` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `source_changes` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `source_version_id` bigint(20) unsigned NOT NULL,
  `string_id` bigint(20) unsigned NOT NULL,
  `change_type` enum('new','changed','deleted','restored') NOT NULL,
  `old_value` text DEFAULT NULL,
  `new_value` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_sc_version` (`source_version_id`),
  KEY `fk_sc_string` (`string_id`),
  CONSTRAINT `fk_sc_string` FOREIGN KEY (`string_id`) REFERENCES `source_strings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sc_version` FOREIGN KEY (`source_version_id`) REFERENCES `source_versions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=143 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `source_changes` DISABLE KEYS */;
INSERT INTO `source_changes` VALUES (1,1,1,'new',NULL,'Cổng thông tin sinh viên'),(2,1,2,'new',NULL,'Học tập, kết nối và phát triển'),(3,1,3,'new',NULL,'Xin chào {name}'),(4,1,4,'new',NULL,'Bạn đang học {count} môn'),(5,1,5,'new',NULL,'Trang chủ'),(6,1,6,'new',NULL,'Hồ sơ'),(7,1,7,'new',NULL,'Kết quả học tập'),(8,1,8,'new',NULL,'Lưu thay đổi'),(9,1,9,'new',NULL,'Hủy'),(10,1,10,'new',NULL,'Gửi yêu cầu');
/*!40000 ALTER TABLE `source_changes` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `source_string_versions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `source_version_id` bigint(20) unsigned NOT NULL,
  `string_id` bigint(20) unsigned NOT NULL,
  `key_path` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `source_text` text NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `source_version_id` (`source_version_id`,`string_id`),
  KEY `fk_ssv_string` (`string_id`),
  CONSTRAINT `fk_ssv_string` FOREIGN KEY (`string_id`) REFERENCES `source_strings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ssv_version` FOREIGN KEY (`source_version_id`) REFERENCES `source_versions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=715 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `source_string_versions` DISABLE KEYS */;
INSERT INTO `source_string_versions` VALUES (1,1,1,'app.title','Cổng thông tin sinh viên'),(2,1,2,'app.subtitle','Học tập, kết nối và phát triển'),(3,1,3,'home.welcome','Xin chào {name}'),(4,1,4,'home.courses','Bạn đang học {count} môn'),(5,1,5,'menu.home','Trang chủ'),(6,1,6,'menu.profile','Hồ sơ'),(7,1,7,'menu.results','Kết quả học tập'),(8,1,8,'actions.save','Lưu thay đổi'),(9,1,9,'actions.cancel','Hủy'),(10,1,10,'actions.submit','Gửi yêu cầu');
/*!40000 ALTER TABLE `source_string_versions` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `source_strings` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `project_id` bigint(20) unsigned NOT NULL,
  `key_path` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `source_text` text NOT NULL,
  `status` enum('active','deleted') NOT NULL DEFAULT 'active',
  `current_source_version_id` bigint(20) unsigned NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `project_id` (`project_id`,`key_path`),
  KEY `idx_source_project_status` (`project_id`,`status`),
  KEY `fk_ss_version` (`current_source_version_id`),
  CONSTRAINT `fk_ss_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ss_version` FOREIGN KEY (`current_source_version_id`) REFERENCES `source_versions` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=136 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `source_strings` DISABLE KEYS */;
INSERT INTO `source_strings` VALUES (1,1,'app.title','Cổng thông tin sinh viên','active',1,'2026-10-25 08:38:35'),(2,1,'app.subtitle','Học tập, kết nối và phát triển','active',1,'2026-10-25 08:38:35'),(3,1,'home.welcome','Xin chào {name}','active',1,'2026-10-25 08:38:35'),(4,1,'home.courses','Bạn đang học {count} môn','active',1,'2026-10-25 08:38:35'),(5,1,'menu.home','Trang chủ','active',1,'2026-10-25 08:38:35'),(6,1,'menu.profile','Hồ sơ','active',1,'2026-10-25 08:38:35'),(7,1,'menu.results','Kết quả học tập','active',1,'2026-10-25 08:38:35'),(8,1,'actions.save','Lưu thay đổi','active',1,'2026-10-25 08:38:35'),(9,1,'actions.cancel','Hủy','active',1,'2026-10-25 08:38:35'),(10,1,'actions.submit','Gửi yêu cầu','active',1,'2026-10-25 08:38:35');
/*!40000 ALTER TABLE `source_strings` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `source_versions` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `project_id` bigint(20) unsigned NOT NULL,
  `version_name` varchar(120) NOT NULL,
  `imported_by` bigint(20) unsigned NOT NULL,
  `imported_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `project_id` (`project_id`,`version_name`),
  KEY `fk_sv_user` (`imported_by`),
  CONSTRAINT `fk_sv_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sv_user` FOREIGN KEY (`imported_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `source_versions` DISABLE KEYS */;
INSERT INTO `source_versions` VALUES (1,1,'source-1.0',2,'2026-10-25 08:38:35');
/*!40000 ALTER TABLE `source_versions` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `system_admin_guard` (
  `id` tinyint(3) unsigned NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `system_admin_guard` DISABLE KEYS */;
INSERT INTO `system_admin_guard` VALUES (1);
/*!40000 ALTER TABLE `system_admin_guard` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `translation_comments` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `translation_id` bigint(20) unsigned NOT NULL,
  `user_id` bigint(20) unsigned NOT NULL,
  `body` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_tc_translation` (`translation_id`),
  KEY `fk_tc_user` (`user_id`),
  CONSTRAINT `fk_tc_translation` FOREIGN KEY (`translation_id`) REFERENCES `translations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tc_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `translation_comments` DISABLE KEYS */;
INSERT INTO `translation_comments` VALUES (1,7,3,'Giữ nguyên biến {name}; bản dịch này đang chờ Reviewer kiểm tra.','2026-10-25 08:38:35');
/*!40000 ALTER TABLE `translation_comments` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `translation_history` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `translation_id` bigint(20) unsigned NOT NULL,
  `user_id` bigint(20) unsigned NOT NULL,
  `old_value` text DEFAULT NULL,
  `new_value` text DEFAULT NULL,
  `action` varchar(40) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_th_translation` (`translation_id`),
  KEY `fk_th_user` (`user_id`),
  CONSTRAINT `fk_th_translation` FOREIGN KEY (`translation_id`) REFERENCES `translations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_th_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=111 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `translation_history` DISABLE KEYS */;
INSERT INTO `translation_history` VALUES (1,1,3,NULL,'Cancel','submitted','2026-10-25 08:38:35'),(2,1,4,NULL,NULL,'approved','2026-10-25 08:38:35'),(3,2,3,NULL,'Save changes','submitted','2026-10-25 08:38:35'),(4,2,4,NULL,NULL,'approved','2026-10-25 08:38:35'),(5,3,3,NULL,'Submit request','submitted','2026-10-25 08:38:35'),(6,3,4,NULL,NULL,'approved','2026-10-25 08:38:35'),(7,4,3,NULL,'Learn, connect and grow','submitted','2026-10-25 08:38:35'),(8,4,4,NULL,NULL,'approved','2026-10-25 08:38:35'),(9,5,3,NULL,'Student Portal','submitted','2026-10-25 08:38:35'),(10,5,4,NULL,NULL,'approved','2026-10-25 08:38:35'),(11,6,3,NULL,'You are studying {count} courses','submitted','2026-10-25 08:38:35'),(12,6,4,NULL,NULL,'approved','2026-10-25 08:38:35'),(13,7,3,NULL,'Welcome {name}','submitted','2026-10-25 08:38:35'),(14,7,4,NULL,NULL,'approved','2026-10-25 08:38:35'),(15,8,3,NULL,'Home','submitted','2026-10-25 08:38:35'),(16,8,4,NULL,NULL,'approved','2026-10-25 08:38:35'),(17,9,3,NULL,'Profile','submitted','2026-10-25 08:38:35'),(18,9,4,NULL,NULL,'approved','2026-10-25 08:38:35'),(19,10,3,NULL,'Academic results','submitted','2026-10-25 08:38:35'),(20,10,4,NULL,NULL,'approved','2026-10-25 08:38:35'),(21,1,2,NULL,'Translator Demo','assigned','2026-10-25 08:38:35'),(22,2,2,NULL,'Translator Demo','assigned','2026-10-25 08:38:35'),(23,3,2,NULL,'Translator Demo','assigned','2026-10-25 08:38:35'),(24,4,2,NULL,'Translator Demo','assigned','2026-10-25 08:38:35'),(25,5,2,NULL,'Translator Demo','assigned','2026-10-25 08:38:35'),(26,6,2,NULL,'Translator Demo','assigned','2026-10-25 08:38:35'),(27,7,2,NULL,'Translator Demo','assigned','2026-10-25 08:38:35'),(28,8,2,NULL,'Translator Demo','assigned','2026-10-25 08:38:35'),(29,9,2,NULL,'Translator Demo','assigned','2026-10-25 08:38:35'),(30,10,2,NULL,'Translator Demo','assigned','2026-10-25 08:38:35'),(31,11,3,NULL,'取消','submitted','2026-10-25 08:38:35'),(32,11,4,NULL,NULL,'approved','2026-10-25 08:38:35'),(33,12,3,NULL,'保存更改','submitted','2026-10-25 08:38:35'),(34,12,4,NULL,NULL,'approved','2026-10-25 08:38:35'),(35,13,3,NULL,'提交申请','submitted','2026-10-25 08:38:35'),(36,13,4,NULL,NULL,'approved','2026-10-25 08:38:35'),(37,14,3,NULL,'学习、联系与成长','submitted','2026-10-25 08:38:35'),(38,14,4,NULL,NULL,'approved','2026-10-25 08:38:35'),(39,15,3,NULL,'学生门户','submitted','2026-10-25 08:38:35'),(40,15,4,NULL,NULL,'approved','2026-10-25 08:38:35'),(41,16,3,NULL,'你正在学习 {count} 门课程','submitted','2026-10-25 08:38:35'),(42,16,4,NULL,NULL,'approved','2026-10-25 08:38:35'),(43,17,3,NULL,'你好 {name}','submitted','2026-10-25 08:38:35'),(44,17,4,NULL,NULL,'approved','2026-10-25 08:38:35'),(45,18,3,NULL,'首页','submitted','2026-10-25 08:38:35'),(46,18,4,NULL,NULL,'approved','2026-10-25 08:38:35'),(47,19,3,NULL,'个人资料','submitted','2026-10-25 08:38:35'),(48,19,4,NULL,NULL,'approved','2026-10-25 08:38:35'),(49,20,3,NULL,'学习成绩','submitted','2026-10-25 08:38:35'),(50,20,4,NULL,NULL,'approved','2026-10-25 08:38:35'),(51,11,2,NULL,'Translator Demo','assigned','2026-10-25 08:38:35'),(52,12,2,NULL,'Translator Demo','assigned','2026-10-25 08:38:35'),(53,13,2,NULL,'Translator Demo','assigned','2026-10-25 08:38:35'),(54,14,2,NULL,'Translator Demo','assigned','2026-10-25 08:38:35'),(55,15,2,NULL,'Translator Demo','assigned','2026-10-25 08:38:35'),(56,16,2,NULL,'Translator Demo','assigned','2026-10-25 08:38:35'),(57,17,2,NULL,'Translator Demo','assigned','2026-10-25 08:38:35'),(58,18,2,NULL,'Translator Demo','assigned','2026-10-25 08:38:35'),(59,19,2,NULL,'Translator Demo','assigned','2026-10-25 08:38:35'),(60,20,2,NULL,'Translator Demo','assigned','2026-10-25 08:38:35'),(61,4,3,'Learn, connect and grow','Learn, connect and grow','saved_draft','2026-10-25 08:38:35'),(62,7,3,'Welcome {name}','Welcome {name}','submitted','2026-10-25 08:38:35'),(63,9,3,'Profile','Profile','submitted','2026-10-25 08:38:35'),(64,9,4,NULL,'Hãy dùng thuật ngữ Student profile trước khi gửi duyệt lại.','rejected','2026-10-25 08:38:35');
/*!40000 ALTER TABLE `translation_history` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `translations` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `string_id` bigint(20) unsigned NOT NULL,
  `locale_code` varchar(20) NOT NULL,
  `value` text DEFAULT NULL,
  `status` enum('draft','translated','needs_review','approved') NOT NULL DEFAULT 'draft',
  `assigned_to` bigint(20) unsigned DEFAULT NULL,
  `row_version` int(11) NOT NULL DEFAULT 1,
  `updated_by` bigint(20) unsigned NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `string_id` (`string_id`,`locale_code`),
  KEY `idx_translation_locale_status` (`locale_code`,`status`),
  KEY `fk_t_assignee` (`assigned_to`),
  KEY `fk_t_updated_by` (`updated_by`),
  CONSTRAINT `fk_t_assignee` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_t_locale` FOREIGN KEY (`locale_code`) REFERENCES `locales` (`code`),
  CONSTRAINT `fk_t_string` FOREIGN KEY (`string_id`) REFERENCES `source_strings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_t_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=37 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `translations` DISABLE KEYS */;
INSERT INTO `translations` VALUES (1,9,'en','Cancel','approved',3,2,3,'2026-10-25 08:38:35'),(2,8,'en','Save changes','approved',3,2,3,'2026-10-25 08:38:35'),(3,10,'en','Submit request','approved',3,2,3,'2026-10-25 08:38:35'),(4,2,'en','Learn, connect and grow','draft',3,3,3,'2026-10-25 08:38:35'),(5,1,'en','Student Portal','approved',3,2,3,'2026-10-25 08:38:35'),(6,4,'en','You are studying {count} courses','approved',3,2,3,'2026-10-25 08:38:35'),(7,3,'en','Welcome {name}','translated',3,3,3,'2026-10-25 08:38:35'),(8,5,'en','Home','approved',3,2,3,'2026-10-25 08:38:35'),(9,6,'en','Profile','needs_review',3,4,3,'2026-10-25 08:38:35'),(10,7,'en','Academic results','approved',3,2,3,'2026-10-25 08:38:35'),(11,9,'zh','取消','approved',3,2,3,'2026-10-25 08:38:35'),(12,8,'zh','保存更改','approved',3,2,3,'2026-10-25 08:38:35'),(13,10,'zh','提交申请','approved',3,2,3,'2026-10-25 08:38:35'),(14,2,'zh','学习、联系与成长','approved',3,2,3,'2026-10-25 08:38:35'),(15,1,'zh','学生门户','approved',3,2,3,'2026-10-25 08:38:35'),(16,4,'zh','你正在学习 {count} 门课程','approved',3,2,3,'2026-10-25 08:38:35'),(17,3,'zh','你好 {name}','approved',3,2,3,'2026-10-25 08:38:35'),(18,5,'zh','首页','approved',3,2,3,'2026-10-25 08:38:35'),(19,6,'zh','个人资料','approved',3,2,3,'2026-10-25 08:38:35'),(20,7,'zh','学习成绩','approved',3,2,3,'2026-10-25 08:38:35');
/*!40000 ALTER TABLE `translations` ENABLE KEYS */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `email` varchar(190) NOT NULL,
  `display_name` varchar(120) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `password_salt` varchar(255) NOT NULL,
  `system_role` enum('user','admin') NOT NULL DEFAULT 'user',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `security_version` int(11) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'admin.demo@tm.local','Admin Demo','uGbgsnNfsl53kOzkyVd0yXAcbWYebrM2zSZlUfVuAII=','yNvU6bDYyr0N+jW5qs9+9g==','admin',1,1,'2026-10-25 08:38:35'),(2,'manager.demo@tm.local','Manager Demo','GQZesm9/Ew00FHU53UVrNBODRNQEIxQp/kKaXCdHNfE=','84xa9gb3HnyJmfFKhAGcrg==','user',1,1,'2026-10-25 08:38:35'),(3,'translator.demo@tm.local','Translator Demo','xsoM24j+AdUEsp+P+Hbm8dJf6fdn0uFxvEKxHkZhxt8=','80TcQTtsFrLTBkHJEaLhSA==','user',1,1,'2026-10-25 08:38:35'),(4,'reviewer.demo@tm.local','Reviewer Demo','YHZdc/bzd4U9OEpc19OL4+ObVhFLktM+k3XPCZgu3O4=','2bcObL7nc8jLHeDk5oW03g==','user',1,1,'2026-10-25 08:38:35'),(5,'user.demo@tm.local','Người dùng Demo','apGDO5+1KXvAwVvE9N2waYJQQPJKuKTD2p9hdYRMx3c=','Tmiwc0ReZmc/1uRLuM3u8A==','user',1,1,'2026-10-25 08:38:35'),(6,'locked.demo@tm.local','Tài khoản khóa Demo','vyL0bmun2vxV38ZvGW4amDkeI6qWnCkHoZlsjIdNTMM=','AakmL8IEH+s+dR1YnfBuzA==','user',0,2,'2026-10-25 08:38:35');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

