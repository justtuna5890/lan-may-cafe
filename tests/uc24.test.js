// =====================================================
// Test UC24 - Báo cáo doanh thu (chỉ chủ quán)
// Gọi thẳng GET /api/reports/revenue bằng supertest; BaoCaoRepository là bản giả (không cần MySQL)
// =====================================================

jest.mock('../src/repositories/BaoCaoRepository'); // thay 4 câu SQL bằng hàm giả
jest.mock('../src/config/db', () => ({ withTransaction: jest.fn(), pool: { query: jest.fn() } })); // không mở kết nối MySQL

const request = require('supertest'); // gọi API như trình duyệt
const jwt = require('jsonwebtoken'); // tự tạo token đăng nhập giả
const config = require('../src/config');
const BaoCaoRepository = require('../src/repositories/BaoCaoRepository');
const app = require('../src/app');

const token = (vaiTro) => 'Bearer ' + jwt.sign({ nhanVienId: 'nv-test', hoTen: 'Test', vaiTro }, config.jwt.secret); // header đăng nhập cho 1 vai trò
const CHU_QUAN = token('CHU_QUAN');
const API = '/api/reports/revenue';

beforeEach(() => {
  jest.resetAllMocks(); // xóa dữ liệu giả của test trước
  BaoCaoRepository.tongQuan.mockResolvedValue({ soDon: 3, doanhThu: 250000 }); // 3 đơn, 250.000đ
  BaoCaoRepository.theoPhuongThuc.mockResolvedValue([{ phuongThuc: 'TIEN_MAT', soDon: 3, doanhThu: 250000 }]); // chỉ có tiền mặt
  BaoCaoRepository.theoNgay.mockResolvedValue([
    { ngay: '2026-10-10', soDon: 1, doanhThu: 60000 },
    { ngay: '2026-10-12', soDon: 2, doanhThu: 190000 },
  ]);
  BaoCaoRepository.topMon.mockResolvedValue([{ monId: 'mon-02', tenMon: 'Cà phê sữa', soLuong: 4, doanhThu: 120000 }]);
});

describe('UC24 bao cao doanh thu', () => {
  test('TC-24-01 xem khoang ngay: tong, trung binh, du 2 phuong thuc', async () => {
    const res = await request(app).get(`${API}?tuNgay=2026-10-10&denNgay=2026-10-12`).set('Authorization', CHU_QUAN);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      tuNgay: '2026-10-10', denNgay: '2026-10-12', soDon: 3, doanhThu: 250000, trungBinhDon: 83333, // 250000 / 3 làm tròn
    });
    expect(res.body.data.theoPhuongThuc).toEqual([ // QR không có giao dịch vẫn có dòng = 0
      { phuongThuc: 'TIEN_MAT', soDon: 3, doanhThu: 250000 },
      { phuongThuc: 'QR', soDon: 0, doanhThu: 0 },
    ]);
    expect(res.body.data.theoNgay).toHaveLength(2);
    expect(res.body.data.topMon[0].tenMon).toBe('Cà phê sữa');
  });

  test('TC-24-02 truy van dung moc gio: tu 00:00 den truoc 00:00 ngay sau', async () => {
    await request(app).get(`${API}?tuNgay=2026-10-10&denNgay=2026-10-12`).set('Authorization', CHU_QUAN);
    expect(BaoCaoRepository.tongQuan).toHaveBeenCalledWith('2026-10-10 00:00:00', '2026-10-13 00:00:00');
    expect(BaoCaoRepository.topMon).toHaveBeenCalledWith('2026-10-10 00:00:00', '2026-10-13 00:00:00', 5);
  });

  test('TC-24-03 bien cuoi thang / cuoi nam van cong ngay dung', async () => {
    await request(app).get(`${API}?tuNgay=2026-12-31`).set('Authorization', CHU_QUAN);
    expect(BaoCaoRepository.tongQuan).toHaveBeenCalledWith('2026-12-31 00:00:00', '2027-01-01 00:00:00');
  });

  test('TC-24-04 khong gui ngay -> mac dinh hom nay', async () => {
    const res = await request(app).get(API).set('Authorization', CHU_QUAN);
    expect(res.status).toBe(200);
    expect(res.body.data.tuNgay).toBe(res.body.data.denNgay); // xem đúng 1 ngày
    expect(res.body.data.tuNgay).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('TC-24-05 khong co don -> 0, trung binh 0 (khong chia cho 0)', async () => {
    BaoCaoRepository.tongQuan.mockResolvedValue({ soDon: 0, doanhThu: 0 });
    BaoCaoRepository.theoPhuongThuc.mockResolvedValue([]);
    BaoCaoRepository.theoNgay.mockResolvedValue([]);
    BaoCaoRepository.topMon.mockResolvedValue([]);
    const res = await request(app).get(`${API}?tuNgay=2026-10-13`).set('Authorization', CHU_QUAN);
    expect(res.body.data).toMatchObject({ soDon: 0, doanhThu: 0, trungBinhDon: 0, theoNgay: [], topMon: [] });
  });

  test('TC-24-06 ngay sai dang hoac khong co that -> NGAY_KHONG_HOP_LE', async () => {
    for (const ngay of ['10/10/2026', '2026-02-30', '2026-13-01', 'abc']) {
      const res = await request(app).get(`${API}?tuNgay=${encodeURIComponent(ngay)}`).set('Authorization', CHU_QUAN);
      expect(res.status).toBe(400);
      expect(res.body.maLoi).toBe('NGAY_KHONG_HOP_LE');
    }
    expect(BaoCaoRepository.tongQuan).not.toHaveBeenCalled(); // sai thì không truy vấn CSDL
  });

  test('TC-24-07 tu ngay sau den ngay, hoac qua 366 ngay -> KHOANG_NGAY_KHONG_HOP_LE', async () => {
    const nguoc = await request(app).get(`${API}?tuNgay=2026-10-13&denNgay=2026-10-01`).set('Authorization', CHU_QUAN);
    expect(nguoc.status).toBe(400);
    expect(nguoc.body.maLoi).toBe('KHOANG_NGAY_KHONG_HOP_LE');
    const dai = await request(app).get(`${API}?tuNgay=2025-01-01&denNgay=2026-10-13`).set('Authorization', CHU_QUAN);
    expect(dai.body.maLoi).toBe('KHOANG_NGAY_KHONG_HOP_LE');
    const bien = await request(app).get(`${API}?tuNgay=2025-10-14&denNgay=2026-10-14`).set('Authorization', CHU_QUAN); // đúng 366 ngày -> được
    expect(bien.status).toBe(200);
  });

  test('TC-24-08 phan quyen: chua dang nhap 401, vai tro khac 403', async () => {
    expect((await request(app).get(API)).status).toBe(401);
    for (const vaiTro of ['PHUC_VU', 'BARISTA', 'THU_NGAN']) {
      const res = await request(app).get(API).set('Authorization', token(vaiTro));
      expect(res.status).toBe(403);
      expect(res.body.maLoi).toBe('KHONG_CO_QUYEN');
    }
  });
});
