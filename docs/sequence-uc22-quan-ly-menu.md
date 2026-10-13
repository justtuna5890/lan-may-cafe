# Sequence Diagram – UC22 Quản lý menu

Người thực hiện: Chủ quán. Mọi request đi qua `verifyToken` (kiểm tra đăng nhập, 401) và `requireRole('CHU_QUAN')` (kiểm tra vai trò, 403) trước khi vào Controller. Tầng theo đúng code: Route → Controller → Service → Repository → MySQL.

Đối chiếu code: `src/routes/index.js`, `src/controllers/MenuController.js`, `src/services/MenuService.js`, `src/repositories/MonAnRepository.js`. Đối chiếu API: `docs/api-contract.md`, mục UC22.

## 1. Thêm món mới (`POST /api/menu-items`)

```mermaid
sequenceDiagram
    actor CQ as Chủ quán
    participant UI as quan-ly-menu.html
    participant MW as Middleware auth
    participant C as MenuController
    participant S as MenuService
    participant R as MonAnRepository
    participant DB as MySQL

    CQ->>UI: Nhập tên món, giá, bấm "Thêm món"
    UI->>MW: POST /api/menu-items {tenMon, gia} + Bearer token
    alt Chưa đăng nhập hoặc token hết hạn
        MW-->>UI: 401 CHUA_DANG_NHAP
    else Vai trò khác CHU_QUAN
        MW-->>UI: 403 KHONG_CO_QUYEN
    else Hợp lệ
        MW->>C: themMon(req, res)
        C->>S: themMon({tenMon, gia})
        S->>S: Chuẩn hóa tên (bỏ dấu cách thừa)
        alt Tên trống
            S-->>UI: 400 TEN_MON_TRONG
        else Tên dài hơn 100 ký tự
            S-->>UI: 400 TEN_MON_QUA_DAI
        else Giá không là số nguyên 1 đến 10.000.000
            S-->>UI: 400 GIA_KHONG_HOP_LE
        else Qua kiểm tra tên và giá
            S->>R: findAll()
            R->>DB: SELECT id, ten_mon, gia, trang_thai FROM mon_an
            DB-->>R: Danh sách món hiện có
            R-->>S: dsMon
            alt Trùng tên (không phân biệt hoa thường)
                S-->>UI: 409 TEN_MON_DA_TON_TAI
            else Chưa trùng
                S->>R: taoMoi({tenMon, gia})
                R->>DB: INSERT INTO mon_an (trang_thai mặc định CON_HANG)
                DB-->>R: OK
                R-->>S: Món mới (có id)
                S-->>C: Món mới
                C-->>UI: 201 {success, data: món mới}
                UI-->>CQ: Toast "Đã thêm tên món vào thực đơn", bảng thực đơn cập nhật
            end
        end
    end
```

## 2. Sửa giá hoặc bật/tắt bán (`PATCH /api/menu-items/:id`)

```mermaid
sequenceDiagram
    actor CQ as Chủ quán
    participant UI as quan-ly-menu.html
    participant MW as Middleware auth
    participant C as MenuController
    participant S as MenuService
    participant R as MonAnRepository
    participant DB as MySQL

    CQ->>UI: Sửa giá rồi bấm "Lưu", hoặc bấm "Tắt bán" / "Bật bán"
    UI->>MW: PATCH /api/menu-items/:id {gia?, trangThai?} + Bearer token
    alt Chưa đăng nhập hoặc không phải CHU_QUAN
        MW-->>UI: 401 CHUA_DANG_NHAP hoặc 403 KHONG_CO_QUYEN
    else Hợp lệ
        MW->>C: capNhatMon(req, res)
        C->>S: capNhatMon(id, {gia?, trangThai?})
        S->>R: findById(id)
        R->>DB: SELECT ... FROM mon_an WHERE id = ?
        DB-->>R: Món hoặc rỗng
        R-->>S: mon
        alt Không có món
            S-->>UI: 404 MON_KHONG_TON_TAI
        else Không gửi gia lẫn trangThai
            S-->>UI: 400 DU_LIEU_KHONG_HOP_LE
        else Giá sai (có gửi gia)
            S-->>UI: 400 GIA_KHONG_HOP_LE
        else Trạng thái khác CON_HANG, TAM_HET
            S-->>UI: 400 TRANG_THAI_KHONG_HOP_LE
        else Kiểm tra xong toàn bộ, mới ghi
            opt Có gửi gia
                S->>R: capNhatGia(id, gia)
                R->>DB: UPDATE mon_an SET gia = ?
            end
            opt Có gửi trangThai
                S->>R: capNhatTrangThai(id, trangThai)
                R->>DB: UPDATE mon_an SET trang_thai = ?
            end
            S->>R: findById(id) đọc lại
            R-->>S: Món sau khi sửa
            S-->>C: Món sau khi sửa
            C-->>UI: 200 {success, data: món}
            UI-->>CQ: Toast thông báo thành công, dòng món được cập nhật
        end
    end
```

Ghi chú: Service kiểm tra **hết** dữ liệu rồi mới ghi, nên không có trường hợp "sửa giá được nhưng trạng thái sai" làm dữ liệu bị sửa nửa chừng.
