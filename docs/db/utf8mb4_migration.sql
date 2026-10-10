-- Chạy một lần cho database đã tồn tại để đồng bộ charset/collation.
-- Sao lưu database trước khi chạy. Script này không sửa chuỗi đã bị lưu sai
-- encoding từ trước; nó bảo đảm dữ liệu UTF-8 mới được ghi/đọc đúng.
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
