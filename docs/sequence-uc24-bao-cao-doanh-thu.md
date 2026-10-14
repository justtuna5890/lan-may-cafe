# Sequence Diagram – UC24 Báo cáo doanh thu

Người thực hiện: Chủ quán. Request đi qua `verifyToken` (401) và `requireRole('CHU_QUAN')` (403) trước khi vào Controller. Tầng theo đúng code: Route → Controller → Service → Repository → MySQL.

Đối chiếu code: `src/routes/index.js`, `src/controllers/BaoCaoController.js`, `src/services/BaoCaoService.js`, `src/repositories/BaoCaoRepository.js`, `src/public/js/bao-cao.js`. Đối chiếu API: `docs/api-contract.md`, mục UC24.

## Xem báo cáo theo khoảng ngày (`GET /api/reports/revenue`)

```mermaid
sequenceDiagram
    actor CQ as Chủ quán
    participant UI as bao-cao.html
    participant MW as Middleware auth
    participant C as BaoCaoController
    participant S as BaoCaoService
    participant R as BaoCaoRepository
    participant DB as MySQL

    CQ->>UI: Chọn Từ ngày, Đến ngày rồi bấm "Xem báo cáo" (hoặc nút nhanh Hôm nay, 7 ngày qua, Tháng này)
    alt Chưa chọn "Từ ngày" hoặc "Từ ngày" sau "Đến ngày"
        UI-->>CQ: Hiện lỗi đỏ ngay trên trang, không gọi server
    else Ngày hợp lệ ở phía trình duyệt
        UI->>MW: GET /api/reports/revenue?tuNgay=...&denNgay=... + Bearer token
        alt Chưa đăng nhập hoặc token hết hạn
            MW-->>UI: 401 CHUA_DANG_NHAP
        else Vai trò khác CHU_QUAN
            MW-->>UI: 403 KHONG_CO_QUYEN
        else Hợp lệ
            MW->>C: layBaoCao(req, res)
            C->>S: layBaoCao(req.query)
            S->>S: Không gửi ngày thì lấy hôm nay, chỉ gửi 1 ngày thì xem đúng ngày đó
            alt Ngày sai dạng YYYY-MM-DD hoặc không có thật (ví dụ 30/02)
                S-->>UI: 400 NGAY_KHONG_HOP_LE
            else tuNgay sau denNgay, hoặc khoảng dài hơn 366 ngày
                S-->>UI: 400 KHOANG_NGAY_KHONG_HOP_LE
            else Khoảng ngày hợp lệ
                S->>S: Đổi thành mốc giờ: từ 0 giờ tuNgay đến trước 0 giờ ngày sau denNgay
                par 4 truy vấn chạy cùng lúc
                    S->>R: tongQuan(tuLuc, denTruoc)
                    R->>DB: COUNT, SUM so_tien FROM thanh_toan WHERE THANH_CONG
                    DB-->>R: soDon, doanhThu
                and
                    S->>R: theoPhuongThuc(tuLuc, denTruoc)
                    R->>DB: GROUP BY phuong_thuc
                    DB-->>R: Tiền mặt, QR
                and
                    S->>R: theoNgay(tuLuc, denTruoc)
                    R->>DB: GROUP BY ngày, ORDER BY ngày tăng dần
                    DB-->>R: Doanh thu từng ngày
                and
                    S->>R: topMon(tuLuc, denTruoc, 5)
                    R->>DB: JOIN thanh_toan, chi_tiet_don, mon_an, bỏ món DA_HUY, LIMIT 5
                    DB-->>R: 5 món bán chạy
                end
                R-->>S: Kết quả của 4 truy vấn
                S->>S: Tính trung bình mỗi đơn (0 nếu chưa có đơn), điền đủ TIEN_MAT và QR (0 nếu chưa có giao dịch)
                S-->>C: Báo cáo đã gộp
                C-->>UI: 200 {success, data: báo cáo}
                UI-->>CQ: Hiện 3 số lớn, bảng tiền mặt/QR, top món, doanh thu từng ngày
            end
        end
    end
```

Ghi chú:
- Chỉ tính các giao dịch `thanh_toan` có trạng thái `THANH_CONG`. Món `DA_HUY` không được tính vào top món.
- Khoảng thời gian dùng mốc `>= tuLuc` và `< denTruoc`, nên **trọn cả ngày cuối** được tính, không bị mất giao dịch lúc 23:59.
- 4 truy vấn độc lập nên chạy song song (`Promise.all`) cho nhanh.
