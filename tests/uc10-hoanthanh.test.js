// Don da HOAN_THANH (bep lam xong het mon) van phai thanh toan duoc.
// Chay qua HTTP, dung cau SQL that cua DonHangRepository.findDangPhucVuByBan voi pool gia lap (khong can MySQL).
const store = {};

jest.mock('../src/config/db', () => ({
  withTransaction: jest.fn(async (work) => work('CONN')),
  pool: {
    // Gia lap bo loc trang_thai cua cau SQL: doc danh sach trang thai tu "trang_thai IN (...)" hoac "trang_thai = 'X'"
    query: jest.fn(async (sql, params) => {
      const m = sql.match(/trang_thai\s*(?:=\s*'([A-Z_]+)'|IN\s*\(([^)]*)\))/);
      const choPhep = m[1] ? [m[1]] : m[2].split(',').map((s) => s.trim().replace(/'/g, ''));
      const rows = Object.values(store.don)
        .filter((d) => d.banId === params[0] && choPhep.includes(d.trangThai))
        .map((d) => ({ id: d.id, donHangId: d.id, banId: d.banId, trangThai: d.trangThai, tongTien: 85000, tienGiamGia: 0, isSynced: 1 }));
      return [rows];
    }),
  },
}));
jest.mock('../src/repositories/DonHangRepository');
jest.mock('../src/repositories/BanRepository');
jest.mock('../src/repositories/ThanhToanRepository');

const request = require('supertest');
const jwt = require('jsonwebtoken');
const config = require('../src/config');
const DonHangRepository = require('../src/repositories/DonHangRepository');
const BanRepository = require('../src/repositories/BanRepository');
const ThanhToanRepository = require('../src/repositories/ThanhToanRepository');
const OrderService = require('../src/services/OrderService');
const app = require('../src/app');

const thuNgan = 'Bearer ' + jwt.sign({ nhanVienId: 'nv-3', hoTen: 'Thu ngan', vaiTro: 'THU_NGAN' }, config.jwt.secret);
const banB04 = { banId: 'ban-04', trangThai: 'DANG_PHUC_VU' };

beforeEach(() => {
  jest.clearAllMocks(); // giu nguyen pool gia lap o tren
  store.don = { 'dh-b04': { id: 'dh-b04', banId: 'ban-04', trangThai: 'HOAN_THANH' } };
  store.ban = { 'ban-04': 'DANG_PHUC_VU' };

  // chi findDangPhucVuByBan chay code that; cac ham con lai gia lap trang thai trong store
  const that = jest.requireActual('../src/repositories/DonHangRepository');
  DonHangRepository.findDangPhucVuByBan.mockImplementation((...args) => that.findDangPhucVuByBan(...args));
  DonHangRepository.findById.mockImplementation(async (id) => {
    const d = store.don[id];
    return d && { donHangId: d.id, banId: d.banId, trangThai: d.trangThai, tongTien: 85000, tienGiamGia: 0, isSynced: true };
  });
  DonHangRepository.findChiTietByDon.mockResolvedValue([
    { tenMon: 'Ca phe den', soLuong: 1, donGia: 85000, trangThaiCheBien: 'DA_XONG' },
  ]);
  DonHangRepository.capNhatTrangThai.mockImplementation(async (id, trangThai) => { store.don[id].trangThai = trangThai; });
  BanRepository.findById.mockImplementation(async (id) => ({ banId: id, tenBan: 'B04', trangThai: store.ban[id] }));
  BanRepository.capNhatTrangThai.mockImplementation(async (id, trangThai) => { store.ban[id] = trangThai; });
  ThanhToanRepository.findByMaGiaoDich.mockResolvedValue(null);
  ThanhToanRepository.save.mockResolvedValue(undefined);
});

describe('UC08/UC10 don HOAN_THANH (ban B04 trong seed)', () => {
  test('thu ngan bam ban -> hoa don -> thanh toan; sau do ban CAN_DON va het don hien tai', async () => {
    let res = await request(app).get('/api/tables/ban-04/current-order').set('Authorization', thuNgan);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ donHangId: 'dh-b04' });

    res = await request(app).get('/api/orders/dh-b04/invoice').set('Authorization', thuNgan);
    expect(res.status).toBe(200);
    expect(res.body.data.canThanhToan).toBe(85000);

    res = await request(app).post('/api/payments').set('Authorization', thuNgan)
      .send({ donHangId: 'dh-b04', phuongThuc: 'TIEN_MAT', tienKhachDua: 100000, maGiaoDich: 'gd-hoanthanh-1' });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ tienThoi: 15000, trangThaiDon: 'DA_THANH_TOAN', trangThaiBan: 'CAN_DON' });
    expect(store.don['dh-b04'].trangThai).toBe('DA_THANH_TOAN');
    expect(store.ban['ban-04']).toBe('CAN_DON');

    res = await request(app).get('/api/tables/ban-04/current-order').set('Authorization', thuNgan);
    expect(res.status).toBe(404);
    expect(res.body.maLoi).toBe('BAN_KHONG_CO_DON');
  });

  test('don DA_THANH_TOAN khong con la don hien tai cua ban', async () => {
    store.don['dh-b04'].trangThai = 'DA_THANH_TOAN';
    const res = await request(app).get('/api/tables/ban-04/current-order').set('Authorization', thuNgan);
    expect(res.status).toBe(404);
    expect(res.body.maLoi).toBe('BAN_KHONG_CO_DON');
  });

  test('ban con don HOAN_THANH chua tra tien thi khong tao them order moi', async () => {
    await expect(OrderService.kiemTraDieuKienOrder(banB04)).rejects.toMatchObject({ maLoi: 'BAN_DA_CO_DON', status: 409 });
  });
});
