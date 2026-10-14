# Kịch bản demo (khoảng 5 phút)

Hệ thống quản lý quán cà phê Làn Mây, Nhóm 5. Một luồng chính và hai luồng lỗi, theo thứ tự.

## Chuẩn bị trước giờ demo
1. Bật MySQL (`E:\MySQL\bat-mysql.bat`, để nguyên cửa sổ).
2. Đưa dữ liệu về như ban đầu: chạy `docs\reset_db.ps1` (xóa dữ liệu thử, tạo lại dữ liệu mẫu).
3. Bật app: `npm.cmd run dev`, mở `http://localhost:3000`.
4. Mở sẵn 2 tab trình duyệt để chuyển vai trò nhanh. Trước khi đổi tài khoản, bấm **Đăng xuất**.

Tài khoản (mật khẩu đều là `123456`): `phucvu01`, `barista01`, `thungan01`, `chutquan01`.

## Luồng chính: gọi món, bếp, thanh toán

| Bước | Ai làm | Thao tác | Kết quả cần thấy |
|---|---|---|---|
| 1 | Phục vụ (`phucvu01`) | Đăng nhập, vào Sơ đồ bàn, bấm một bàn Trống, ví dụ **B01** | Mở màn tạo đơn của bàn B01 |
| 2 | Phục vụ | Chọn tab **Cà phê**, bấm **+ Thêm** vào Cà phê sữa 2 lần, rồi tab **Bánh** thêm Bánh Croissant | Giỏ "Món mới" có 2 dòng, tổng tạm tính tự tính |
| 3 | Phục vụ | Bấm **Gửi bếp** | Thông báo "Đã gửi order bàn B01 xuống bếp", bàn chuyển Đang phục vụ |
| 4 | Barista (`barista01`) | Đăng nhập, vào Màn bếp, tìm món của Bàn B01 | Thấy 2 món ở trạng thái Chờ pha chế |
| 5 | Barista | Bấm **Bắt đầu pha**, rồi **Hoàn thành** cho từng món | Món chuyển Đang pha chế rồi Hoàn thành |
| 6 | Thu ngân (`thungan01`) | Đăng nhập, vào Thu ngân, bấm bàn B01 | Thấy hóa đơn: các món, tổng tiền, "Bếp đã pha chế xong tất cả món" |
| 7 | Thu ngân | Bấm **Thanh toán**, chọn **Tiền mặt**, bấm nút **Đúng ...**, rồi **Xác nhận thanh toán** | Màn "Thanh toán thành công" có phiếu hóa đơn |
| 8 | Chủ quán (`chutquan01`) | Đăng nhập, vào **Báo cáo doanh thu**, chọn **Hôm nay** | Doanh thu và số đơn tăng thêm đơn vừa thanh toán |

## Luồng lỗi 1: gọi món đã hết
1. Đăng nhập `phucvu01`, mở một bàn Trống.
2. Ở tab **Cà phê**, thấy món **Bạc xỉu** bị xám và có nhãn "Tạm hết".
3. Bấm vào nút của Bạc xỉu: nút bị khóa, hiện thông báo "Món Bạc xỉu đã hết nguyên liệu". Không thể thêm vào giỏ.

## Luồng lỗi 2: đăng nhập sai, tài khoản bị khóa
1. Ở màn đăng nhập nhập `phucvu01` với mật khẩu sai: báo "Sai tên đăng nhập hoặc mật khẩu" (không cho biết sai ô nào).
2. Đăng nhập `blocked01`: báo "Tài khoản đã bị khóa do nhập sai mật khẩu 5 lần".

## Điểm nên nói khi demo
- Mỗi vai trò chỉ thấy chức năng của mình. Chủ quán có toàn quyền.
- Gõ thẳng địa chỉ trang của vai trò khác (ví dụ Phục vụ vào `/kitchen.html`) thì bị đưa về trang của mình.
- Giao diện theo Figma của nhóm, ảnh món thật có ghi nguồn ở `docs/nguon-anh.md`.
- Thông báo lỗi hiện ngay dưới ô nhập, có kiểm tra số lượng, tiền khách đưa.

## Nếu có sự cố khi demo
| Hiện tượng | Cách xử lý |
|---|---|
| "Hệ thống đang gặp sự cố" khi đăng nhập | MySQL chưa bật, mở lại `bat-mysql.bat` |
| Không vào được `localhost:3000` | App chưa chạy, chạy `npm.cmd run dev` |
| Bàn B01 không còn Trống | Đã demo rồi (hoặc chọn bàn Trống khác như B02, B09, B10), chạy lại `docs\reset_db.ps1` |