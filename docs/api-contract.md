# API Contract – Lan May Cafe (Nhóm 5)

Phiên bản nháp v0.1 – Tuấn, 03/10/2026. An và Hậu đọc xong nhắn xác nhận lên nhóm; cần sửa thì báo Tuấn trước 21:00 04/10.

v0.2 – Hậu, 13/10/2026: cập nhật cho khớp code đã merge: thêm UC22 (quản lý menu), UC24 (báo cáo doanh thu), `POST /auth/logout`, `GET /pos/stream`; vai trò `CHU_QUAN` được dùng mọi màn; chốt cách xác thực (JWT + cookie giữ trang).

## 1. Quy ước chung

Base URL: `http://localhost:3000/api`. Body gửi và nhận đều là JSON. Id là chuỗi (VARCHAR(36)). Tiền là số (VND, DECIMAL(12,2)). Thời gian theo ISO 8601.

Mọi response dùng chung một format (khớp DTO `KetQuaThanhToan`):

```json
{ "success": true, "data": { }, "maLoi": null, "message": "OK" }
```

Khi lỗi: `success=false`, `data=null`, `maLoi` là mã lỗi (frontend dựa vào đây), `message` là câu hiện cho người dùng.

Xác thực (đã chốt ở UC21): token là JWT. Sau khi đăng nhập, gọi API bằng header `Authorization: Bearer <token>`. Server lấy `nhanVienId` và `vaiTro` từ token, client không gửi. Ngoài ra, lúc đăng nhập server đặt thêm cookie `lm_token` (HttpOnly, SameSite=Strict) chỉ để chặn truy cập trực tiếp vào trang `.html` khi chưa đăng nhập hoặc sai vai trò; các API vẫn chỉ đọc header `Bearer`.

Phân quyền: `CHU_QUAN` có toàn quyền, dùng được mọi endpoint của `PHUC_VU`, `THU_NGAN`, `BARISTA`. Cột *Vai trò* ở mục 2 ghi rõ từng endpoint.

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
| UC21 | `POST /auth/login` | Không cần token | Hậu | Hậu |
| UC21 | `POST /auth/logout` | Không cần token | Hậu | Hậu |
| (hỗ trợ) | `GET /tables` | PHUC_VU, THU_NGAN, CHU_QUAN | Tuấn | Hậu |
| (hỗ trợ) | `GET /tables/:id/current-order` | PHUC_VU, THU_NGAN, CHU_QUAN | Tuấn | Hậu |
| (hỗ trợ) | `GET /menu` | PHUC_VU, CHU_QUAN | Tuấn | Hậu |
| UC01 | `POST /orders` | PHUC_VU, CHU_QUAN | Tuấn | Hậu |
| (hỗ trợ) | `GET /orders/:id` | PHUC_VU, THU_NGAN, CHU_QUAN | Tuấn | Hậu |
| UC04 | `POST /orders/:id/items` | PHUC_VU, CHU_QUAN | Tuấn | Hậu |
| UC04 | `PATCH /orders/:id/items/:chiTietId` | PHUC_VU, CHU_QUAN | Tuấn | Hậu |
| UC04 | `DELETE /orders/:id/items/:chiTietId` | PHUC_VU, CHU_QUAN | Tuấn | Hậu |
| UC15 | `GET /kitchen/items` | BARISTA, CHU_QUAN | An | An |
| UC16 | `PATCH /kitchen/items/:chiTietId/status` | BARISTA, CHU_QUAN | An | An |
| UC16 | `POST /kitchen/items/:chiTietId/undo` | BARISTA, CHU_QUAN | An | An |
| (hỗ trợ) | `GET /kds/stream` (SSE, token qua `?token=`) | BARISTA, CHU_QUAN | An | An |
| (hỗ trợ) | `GET /inventory`, `GET /inventory/:id` | BARISTA, CHU_QUAN | An | An |
| UC18 | `PATCH /inventory/:id/out-of-stock` | BARISTA, CHU_QUAN | An | An |
| UC18 | `POST /inventory/:id/restock` | BARISTA, CHU_QUAN | An | An |
| UC18 | `POST /inventory/:id/issue` | BARISTA, CHU_QUAN | An | An |
| UC08 | `GET /orders/:id/invoice` | THU_NGAN, CHU_QUAN | Tuấn | Hậu |
| UC10 | `POST /payments` | THU_NGAN, CHU_QUAN | Tuấn | Hậu |
| (hỗ trợ) | `GET /pos/stream` (SSE, token qua `?token=`) | THU_NGAN, PHUC_VU, CHU_QUAN | Tuấn | Hậu |
| UC22 | `GET /menu-items` | CHU_QUAN | Hậu | Hậu |
| UC22 | `POST /menu-items` | CHU_QUAN | Hậu | Hậu |
| UC22 | `PATCH /menu-items/:id` | CHU_QUAN | Hậu | Hậu |
| UC24 | `GET /reports/revenue` | CHU_QUAN | Hậu | Hậu |

## 3. Chi tiết

### UC21 – Đăng nhập

`POST /auth/login` (không cần token)

Request: `{ "username": "phucvu01", "password": "123456" }`

Response `data`:

```json
{ "token": "…", "nhanVienId": "nv-001", "hoTen": "Nguyễn Văn A", "vaiTro": "PHUC_VU", "trangChu": "/tables.html" }
```

`trangChu` theo vai trò: PHUC_VU → sơ đồ bàn, BARISTA → màn bếp, THU_NGAN → POS, CHU_QUAN → tổng quan.

Đăng nhập thành công còn đặt cookie `lm_token` (HttpOnly, SameSite=Strict, sống cùng thời gian với token).

`POST /auth/logout` (không cần token, không cần body): xóa cookie `lm_token`. Response `data` là `null`, message "Đã đăng xuất". JWT không lưu ở server nên client tự xóa phiên đã lưu ở trình duyệt (`sessionStorage` hoặc `localStorage`) khi đăng xuất.

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
| `MON_DA_HUY` | 409 | Sửa hoặc hủy món đã `DA_HUY` |
| `SO_LUONG_KHONG_HOP_LE`, `MON_TAM_HET`, `DS_MON_RONG` | 400, 409, 400 | Như UC01 |

Ghi chú: `dsMon` trong response gồm cả món `DA_HUY` (để giao diện hiện trạng thái), nhưng `tongTien` chỉ tính món chưa hủy. Đơn đang `HOAN_THANH` mà gọi thêm món thì quay lại `DANG_PHUC_VU`. Bếp không phản hồi sau 5 giây khi gọi thêm: vẫn lưu, `isSynced=false`.

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

### UC18 – Quản lý kho (đường dẫn `/inventory`, khớp code)

`GET /inventory` → `data`: danh sách nguyên liệu. `GET /inventory/:id` → `data`: một nguyên liệu.

`PATCH /inventory/:id/out-of-stock` – đặt tồn kho về 0 và đồng bộ trạng thái món dùng nguyên liệu này (`TAM_HET`). Response `data`: `{ "id", "tenNguyenLieu", "tonKho": 0 }`.

`POST /inventory/:id/restock`. Request: `{ "soLuong": 20 }`. Nhập thêm, món đủ nguyên liệu mở bán lại (`CON_HANG`). Response `data`: nguyên liệu sau khi nhập.

`POST /inventory/:id/issue`. Request: `{ "soLuong": 5 }`. Xuất kho.

Mọi route bếp và kho (`/kitchen/*`, `/inventory/*`, `/kds/stream`) chỉ cho vai trò `BARISTA` và `CHU_QUAN`. `/kds/stream` dùng SSE nên không gửi được header: truyền token qua `?token=<jwt>`.

| maLoi | HTTP | Khi nào |
|---|---|---|
| `KHO_THIEU_ID` | 400 | Thiếu mã nguyên liệu |
| `KHO_KHONG_TIM_THAY` | 404 | Sai id |
| `KHO_SO_LUONG_KHONG_HOP_LE` | 400 | `soLuong` thiếu hoặc nhỏ hơn hoặc bằng 0 |

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

### UC22 – Quản lý menu (chỉ `CHU_QUAN`)

Món trả về luôn có dạng `{ "monId", "tenMon", "gia", "trangThai" }`, `trangThai` là `CON_HANG` hoặc `TAM_HET`.

`GET /menu-items` → `data`: toàn bộ thực đơn, sắp tên A → Z, gồm cả món `TAM_HET`. Khác `GET /menu` (dành cho Phục vụ gọi món).

`POST /menu-items` – thêm món mới. Request: `{ "tenMon": "Cà phê muối", "gia": 35000 }`. Response `data` (HTTP 201): món vừa thêm, `trangThai` mặc định `CON_HANG`. Server tự bỏ dấu cách thừa ở tên.

`PATCH /menu-items/:id` – sửa giá và/hoặc bật/tắt bán. Request gửi 1 hoặc cả 2 trường: `{ "gia": 30000 }` hoặc `{ "trangThai": "TAM_HET" }`. Kiểm tra hết rồi mới ghi, nên không bị sửa nửa chừng. Response `data`: món sau khi sửa.

Luật dữ liệu: tên 1–100 ký tự và không trùng tên món đã có (không phân biệt hoa thường); giá là số nguyên từ 1 đến 10.000.000.

| maLoi | HTTP | Khi nào |
|---|---|---|
| `TEN_MON_TRONG` | 400 | Tên trống |
| `TEN_MON_QUA_DAI` | 400 | Tên dài hơn 100 ký tự |
| `GIA_KHONG_HOP_LE` | 400 | Giá không phải số nguyên từ 1 đến 10.000.000 |
| `TRANG_THAI_KHONG_HOP_LE` | 400 | `trangThai` khác `CON_HANG`, `TAM_HET` |
| `DU_LIEU_KHONG_HOP_LE` | 400 | PATCH không gửi `gia` lẫn `trangThai` |
| `MON_KHONG_TON_TAI` | 404 | Sai id món |
| `TEN_MON_DA_TON_TAI` | 409 | Trùng tên món đã có |

### UC24 – Báo cáo doanh thu (chỉ `CHU_QUAN`)

`GET /reports/revenue?tuNgay=YYYY-MM-DD&denNgay=YYYY-MM-DD`. Không gửi tham số thì lấy hôm nay; chỉ gửi một ngày thì xem đúng ngày đó. Tính từ 0 giờ ngày `tuNgay` đến hết ngày `denNgay`. Chỉ tính đơn đã thanh toán. Xem tối đa 366 ngày mỗi lần.

Response `data`:

```json
{
  "tuNgay": "2026-10-01", "denNgay": "2026-10-13",
  "soDon": 12, "doanhThu": 1080000, "trungBinhDon": 90000,
  "theoPhuongThuc": [ { "phuongThuc": "TIEN_MAT", "soDon": 7, "doanhThu": 630000 }, { "phuongThuc": "QR", "soDon": 5, "doanhThu": 450000 } ],
  "theoNgay": [ { "ngay": "2026-10-12", "soDon": 5, "doanhThu": 450000 } ],
  "topMon": [ { "monId": "mon-01", "tenMon": "Bạc xỉu", "soLuong": 20, "doanhThu": 900000 } ]
}
```

`theoPhuongThuc` luôn có đủ `TIEN_MAT` và `QR` (bằng 0 nếu chưa có giao dịch). `topMon` tối đa 5 món bán chạy nhất. `trungBinhDon` bằng 0 khi chưa có đơn.

| maLoi | HTTP | Khi nào |
|---|---|---|
| `NGAY_KHONG_HOP_LE` | 400 | Sai dạng `YYYY-MM-DD` hoặc ngày không có thật (ví dụ 30/02) |
| `KHOANG_NGAY_KHONG_HOP_LE` | 400 | `tuNgay` sau `denNgay`, hoặc khoảng dài hơn 366 ngày |

## 4. Điểm cần chốt

1. **Bàn đã có đơn:** theo quy tắc đề xuất, `DANG_PHUC_VU` được gọi món, nhưng `POST /orders` sẽ tạo đơn thứ hai cho cùng bàn. Đề xuất: bàn đang có đơn thì client dùng `POST /orders/:id/items` (UC04), và `POST /orders` trả `BAN_DA_CO_DON` (409). Tuấn và Kiệt chốt.
2. **Trạng thái bàn thứ 4:** An cho biết tên đúng theo ERD để cập nhật enum.
3. ~~**Token**~~ Đã chốt: JWT qua header `Bearer`, thêm cookie `lm_token` để chặn trang `.html` (xem mục 1).
4. **Đổi tài khoản trên cùng trình duyệt:** cookie `lm_token` và `sessionStorage` có thể lệch vai trò nếu không bấm Đăng xuất trước khi đăng nhập tài khoản khác, làm trang chuyển hướng lặp. Đề xuất Tuấn xem lại cách xử lý (mục A3 trong đề xuất cải tiến).
