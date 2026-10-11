-- Chạy một lần cho database đã tồn tại để đồng bộ charset/collation.
-- Sao lưu database trước khi chạy. Script này không sửa chuỗi đã bị lưu sai
-- encoding từ trước; nó bảo đảm dữ liệu UTF-8 mới được ghi/đọc đúng.
-- Tắt kiểm tra khóa ngoại trong lúc chuyển: id và khóa ngoại là chuỗi nên nếu không MySQL báo lỗi 3780 (bảng cha, bảng con lệch charset).
SET FOREIGN_KEY_CHECKS = 0;
ALTER DATABASE lan_may_cafe CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE lan_may_cafe;

ALTER TABLE nhan_vien CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE ban CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE khach_hang CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE don_hang CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE mon_an CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE chi_tiet_don CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE thanh_toan CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE kho_hang CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE cong_thuc_mon CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
SET FOREIGN_KEY_CHECKS = 1;
