# API Contract – Lan May Cafe (Nhóm 5)

Phiên bản nháp v0.1 – Tuấn, 03/10/2026. An và Hậu đọc xong nhắn xác nhận lên nhóm; cần sửa thì báo Tuấn trước 21:00 04/10.

## 1. Quy ước chung

Base URL: `http://localhost:3000/api`. Body gửi và nhận đều là JSON. Id là chuỗi (VARCHAR(36)). Tiền là số (VND, DECIMAL(12,2)). Thời gian theo ISO 8601.

Mọi response dùng chung một format (khớp DTO `KetQuaThanhToan`):

```json
{ "success": true, "data": { }, "maLoi": null, "message": "OK" }
```

Khi lỗi: `success=false`, `data=null`, `maLoi` là mã lỗi (frontend dựa vào đây), `message` là câu hiện cho người dùng.

Xác thực (đề xuất, Hậu chốt ở UC21): sau khi đăng nhập, gọi API bằng header `Authorization: Bearer <token>`. Server lấy `nhanVienId` và `vaiTro` từ token, client không gửi.

Mã lỗi chung:

| maLoi | HTTP | Ý nghĩa |
|---|---|---|
| `JSON_KHONG_HOP_LE` | 400 | Body không phải JSON hợp lệ |
| `DU_LIEU_KHONG_HOP_LE` | 400 | Thiếu trường hoặc sai kiểu dữ liệu |
| `CHUA_DANG_NHAP` | 401 | Chưa đăng nhập hoặc token hết hạn |
| `KHONG_CO_QUYEN` | 403 | Vai trò không được dùng chức năng này |
| `NOT_FOUND` | 404 | Sai đường dẫn |
| `LOI_HE_THONG` | 500 | Lỗi không lường trước |
| `CHUA_CAI_DAT` | 501 | UC chưa cài đặt (chỉ có ở bản khung) |

Giá trị enum (khớp Class Diagram):

| Enum | Giá trị |
|---|---|
| `vaiTro` | `PHUC_VU`, `BARISTA`, `THU_NGAN`, `CHU_QUAN` |
| `TrangThaiBan` | `TRONG`, `DANG_PHUC_VU`, `CAN_DON`, và trạng thái thứ 4 theo ERD (đã có trong sơ đồ bàn, An chốt tên) |
| `TrangThaiDon` | `DANG_PHUC_VU`, `HOAN_THANH`, `DA_THANH_TOAN` |
| `TrangThaiCheBien` | `CHO_PHA_CHE`, `DANG_LAM`, `DA_XONG`, `DA_HUY` |
| `TrangThaiMon` | `CON_HANG`, `TAM_HET` |
| `PhuongThucThanhToan` | `TIEN_MAT`, `QR` |

## 2. Tổng hợp endpoint

| UC | Endpoint | Vai trò | Người làm BE | Người làm FE |
|---|---|---|---|---|
| UC21 | `POST /auth/login` | Tất cả | Hậu | Hậu |
| (hỗ trợ) | `GET /tables` | PHUC_VU, THU_NGAN | Tuấn | Hậu |
| (hỗ trợ) | `GET /tables/:id/current-order` | PHUC_VU, THU_NGAN | Tuấn | Hậu |
| (hỗ trợ) | `GET /menu` | PHUC_VU | Tuấn | Hậu |
| UC01 | `POST /orders` | PHUC_VU | Tuấn | Hậu |
| (hỗ trợ) | `GET /orders/:id` | PHUC_VU, THU_NGAN | Tuấn | Hậu |
| UC04 | `POST /orders/:id/items` | PHUC_VU | Tuấn | Hậu |
| UC04 | `PATCH /orders/:id/items/:chiTietId` | PHUC_VU | Tuấn | Hậu |
| UC04 | `DELETE /orders/:id/items/:chiTietId` | PHUC_VU | Tuấn | Hậu |
| UC15 | `GET /kitchen/items` | BARISTA | An | An |
| UC16 | `PATCH /kitchen/items/:chiTietId/status` | BARISTA | An | An |
| UC16 | `POST /kitchen/items/:chiTietId/undo` | BARISTA | An | An |
| UC18 | `POST /kitchen/ingredients/:id/out-of-stock` | BARISTA | An | An |
| UC18 | `POST /kitchen/ingredients/:id/restock` | BARISTA | An | An |
| UC08 | `GET /orders/:id/invoice` | THU_NGAN | Tuấn | Hậu |
| UC10 | `POST /payments` | THU_NGAN | Tuấn | Hậu |

## 3. Chi tiết

### UC21 – Đăng nhập

`POST /auth/login` (không cần token)

Request: `{ "username": "phucvu01", "password": "123456" }`

Response `data`:

```json
{ "token": "…", "nhanVienId": "nv-001", "hoTen": "Nguyễn Văn A", "vaiTro": "PHUC_VU", "trangChu": "/tables.html" }
```

`trangChu` theo vai trò: PHUC_VU → sơ đồ bàn, BARISTA → màn bếp, THU_NGAN → POS, CHU_QUAN → tổng quan.

| maLoi | HTTP | Khi nào |
|---|---|---|
| `THIEU_THONG_TIN` | 400 | Bỏ trống username hoặc password |
| `SAI_THONG_TIN` | 401 | Sai username hoặc mật khẩu (không tiết lộ sai ô nào) |
| `TAI_KHOAN_BI_KHOA` | 423 | Sai 5 lần liên tiếp (EF-1) |
| `TAI_KHOAN_VO_HIEU` | 403 | Tài khoản bị vô hiệu hóa (EF-2) |

### Hỗ trợ cho màn Phục vụ và Thu ngân

`GET /tables` → `data`: mảng `{ "banId", "tenBan", "trangThai" }`.

`GET /tables/:id/current-order` → `data`: `{ "donHangId": "dh-001" }`. Lỗi: `BAN_KHONG_TON_TAI` (404), `BAN_KHONG_CO_DON` (404).

`GET /menu` → `data`: mảng `{ "monId", "tenMon", "gia", "trangThai" }`. Món `TAM_HET` vẫn có trong danh sách để giao diện làm xám.

`GET /orders/:id` → `data`: đơn đầy đủ (cùng cấu trúc `donHang` ở UC01), dùng để hiện trạng thái từng món. Lỗi: `DON_KHONG_TON_TAI` (404).

### UC01 – Tạo và gửi order

`POST /orders`

Request:

```json
{ "banId": "ban-05", "dsMon": [ { "monId": "mon-01", "soLuong": 2, "ghiChu": "ít đá" } ] }
```

Response `data` (HTTP 201):

```json
{
  "donHangId": "dh-001", "banId": "ban-05", "trangThai": "DANG_PHUC_VU",
  "tongTien": 90000, "isSynced": true,
  "dsMon": [ { "chiTietId": "ct-001", "monId": "mon-01", "tenMon": "Bạc xỉu", "soLuong": 2, "donGia": 45000, "ghiChu": "ít đá", "trangThaiCheBien": "CHO_PHA_CHE" } ]
}
```

`isSynced=false` khi bếp không phản hồi sau 5 giây; order vẫn được lưu.

| maLoi | HTTP | Khi nào |
|---|---|---|
| `DS_MON_RONG` | 400 | `dsMon` rỗng |
| `SO_LUONG_KHONG_HOP_LE` | 400 | `soLuong` ngoài khoảng 1–99 (kiểm tra ở server) |
| `BAN_KHONG_TON_TAI` | 404 | Sai `banId` |
| `BAN_CAN_DON` | 409 | Bàn đang `CAN_DON` |
| `MON_KHONG_TON_TAI` | 404 | Sai `monId` |
| `MON_TAM_HET` | 409 | Món `TAM_HET`, message: "Món … đã hết nguyên liệu" |

### UC04 – Cập nhật order

Chỉ thao tác được trên món đang `CHO_PHA_CHE`. Món `DANG_LAM` hoặc `DA_XONG` trả `MON_DA_CHE_BIEN`.

`POST /orders/:id/items` – gọi thêm. Request: `{ "dsMon": [ { "monId", "soLuong", "ghiChu" } ] }`. Chỉ phần món mới được gửi xuống bếp; `tongTien` tính lại. Response `data`: đơn đầy đủ như UC01.

`PATCH /orders/:id/items/:chiTietId` – sửa số lượng. Request: `{ "soLuong": 3 }`. Response `data`: đơn đầy đủ.

`DELETE /orders/:id/items/:chiTietId` – hủy món (món chuyển `DA_HUY`, trừ khỏi tổng tiền). Response `data`: đơn đầy đủ.

| maLoi | HTTP | Khi nào |
|---|---|---|
| `DON_KHONG_TON_TAI` | 404 | Sai id đơn |
| `MON_TRONG_DON_KHONG_TON_TAI` | 404 | Sai `chiTietId` |
| `DON_DA_THANH_TOAN` | 409 | Đơn đã thanh toán |
| `MON_DA_CHE_BIEN` | 409 | Món `DANG_LAM` hoặc `DA_XONG` |
| `SO_LUONG_KHONG_HOP_LE`, `MON_TAM_HET` | 400, 409 | Như UC01 |

### UC15 – Hiển thị danh sách đơn cho bếp

`GET /kitchen/items`. Trả các món chưa `DA_XONG` và chưa `DA_HUY`, sắp xếp FIFO theo `ngayTao`. Màn bếp tự gọi lại mỗi 3 giây. Không có món nào thì `data` là `[]`.

Response `data`:

```json
[ { "chiTietId": "ct-001", "donHangId": "dh-001", "soBan": "05", "tenMon": "Bạc xỉu", "soLuong": 2, "ghiChu": "ít đá", "trangThaiCheBien": "CHO_PHA_CHE", "ngayTao": "2026-10-05T09:15:00Z" } ]
```

### UC16 – Cập nhật trạng thái chế biến

`PATCH /kitchen/items/:chiTietId/status`. Request: `{ "trangThai": "DANG_LAM" }`. Chỉ đi tiến `CHO_PHA_CHE → DANG_LAM → DA_XONG`. Khi mọi món của đơn `DA_XONG` thì đơn chuyển `HOAN_THANH`. Response `data`: `{ "chiTietId", "trangThaiCheBien", "trangThaiDon" }`.

`POST /kitchen/items/:chiTietId/undo` – lùi 1 bước khi bấm nhầm. Không cần body. Response giống trên.

| maLoi | HTTP | Khi nào |
|---|---|---|
| `MON_TRONG_DON_KHONG_TON_TAI` | 404 | Sai `chiTietId` |
| `CHUYEN_TRANG_THAI_KHONG_HOP_LE` | 409 | Nhảy cóc hoặc lùi trái phép |
| `MON_DA_HUY` | 409 | Món `DA_HUY` |
| `KHONG_THE_HOAN_TAC` | 409 | Món đang ở `CHO_PHA_CHE` |

### UC18 – Đánh dấu hết nguyên liệu

`POST /kitchen/ingredients/:id/out-of-stock` – đặt tồn kho về 0; mọi món dùng nguyên liệu này chuyển `TAM_HET`. Response `data`: `{ "nguyenLieuId", "tonKho": 0, "dsMonBiKhoa": [ "mon-01" ] }`.

`POST /kitchen/ingredients/:id/restock`. Request: `{ "soLuong": 20 }`. Món dùng nguyên liệu này mở lại (`CON_HANG`) nếu đủ nguyên liệu. Response `data`: `{ "nguyenLieuId", "tonKho": 20, "dsMonMoKhoa": [ "mon-01" ] }`.

| maLoi | HTTP | Khi nào |
|---|---|---|
| `NGUYEN_LIEU_KHONG_TON_TAI` | 404 | Sai id |
| `SO_LUONG_AM` | 400 | `soLuong` nhỏ hơn hoặc bằng 0 khi nhập |

### UC08 – Lập hóa đơn

`GET /orders/:id/invoice`. Response `data` (`HoaDonDTO`):

```json
{ "donHangId": "dh-001", "soBan": "05", "dsMon": [ { "tenMon": "Bạc xỉu", "soLuong": 2, "donGia": 45000, "thanhTien": 90000 } ], "tongTien": 90000, "tienGiamGia": 0, "canThanhToan": 90000 }
```

Món `DA_HUY` không có trong hóa đơn.

| maLoi | HTTP | Khi nào |
|---|---|---|
| `DON_KHONG_TON_TAI` | 404 | Sai id đơn |
| `DON_CHUA_GUI_BEP` | 409 | Còn món chưa gửi bếp (`isSynced=false`) |
| `DON_DA_THANH_TOAN` | 409 | Đơn đã thanh toán |

### UC10 – Thanh toán hóa đơn

`POST /payments`. `maGiaoDich` do frontend tạo **một lần cho mỗi lượt thanh toán**. Gửi lại cùng mã thì server trả kết quả cũ (HTTP 200, `daXuLyTruoc=true`), không thu lần hai.

Request:

```json
{ "donHangId": "dh-001", "phuongThuc": "TIEN_MAT", "tienKhachDua": 100000, "maGiaoDich": "gd-20261005-0001" }
```

`tienKhachDua` bắt buộc khi `TIEN_MAT`. Với `QR` (giả lập) bỏ qua trường này.

Response `data` (`KetQuaThanhToan`):

```json
{ "thanhCong": true, "maGiaoDich": "gd-20261005-0001", "donHangId": "dh-001", "phuongThuc": "TIEN_MAT", "soTienThanhToan": 90000, "tienThoi": 10000, "trangThaiDon": "DA_THANH_TOAN", "trangThaiBan": "CAN_DON", "daXuLyTruoc": false }
```

Ba thao tác ghi (lưu `thanh_toan`, đơn `DA_THANH_TOAN`, bàn `CAN_DON`) chạy trong một transaction.

| maLoi | HTTP | Khi nào |
|---|---|---|
| `PHUONG_THUC_KHONG_HOP_LE` | 400 | Sai `phuongThuc` |
| `TIEN_KHONG_DU` | 400 | `tienKhachDua` nhỏ hơn số cần thanh toán, message: "Số tiền khách đưa chưa đủ" |
| `DON_KHONG_TON_TAI` | 404 | Sai `donHangId` |
| `DON_DA_THANH_TOAN` | 409 | Đơn đã thanh toán (mã giao dịch khác) |
| `DON_CHUA_GUI_BEP` | 409 | Còn món chưa gửi bếp |

## 4. Điểm cần chốt

1. **Bàn đã có đơn:** theo quy tắc đề xuất, `DANG_PHUC_VU` được gọi món, nhưng `POST /orders` sẽ tạo đơn thứ hai cho cùng bàn. Đề xuất: bàn đang có đơn thì client dùng `POST /orders/:id/items` (UC04), và `POST /orders` trả `BAN_DA_CO_DON` (409). Tuấn và Kiệt chốt.
2. **Trạng thái bàn thứ 4:** An cho biết tên đúng theo ERD để cập nhật enum.
3. **Token:** Hậu xác nhận cách làm (JWT hoặc session) khi làm UC21.
