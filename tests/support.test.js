jest.mock('../src/repositories/BanRepository');
jest.mock('../src/repositories/MonAnRepository');
jest.mock('../src/repositories/DonHangRepository');
jest.mock('../src/config/db', () => ({ withTransaction: jest.fn() }));

const request = require('supertest');
const BanRepository = require('../src/repositories/BanRepository');
const MonAnRepository = require('../src/repositories/MonAnRepository');
const DonHangRepository = require('../src/repositories/DonHangRepository');
const jwt = require('jsonwebtoken');
const config = require('../src/config');
const app = require('../src/app');

const token = (vaiTro) => 'Bearer ' + jwt.sign({ nhanVienId: 'nv-test', hoTen: 'Test', vaiTro }, config.jwt.secret);

beforeEach(() => jest.resetAllMocks());

describe('API ho tro giao dien', () => {
  test('GET /api/tables tra ve danh sach ban', async () => {
    BanRepository.findAll.mockResolvedValue([{ banId: 'ban-01', tenBan: '01', trangThai: 'TRONG' }]);
    const res = await request(app).get('/api/tables').set('Authorization', token('PHUC_VU'));
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([{ banId: 'ban-01', tenBan: '01', trangThai: 'TRONG' }]);
  });

  test('GET /api/menu giu mon TAM_HET va chi tra 4 truong', async () => {
    MonAnRepository.findAll.mockResolvedValue([
      { id: 'mon-03', monId: 'mon-03', tenMon: 'Bac xiu', gia: 35000, trangThai: 'TAM_HET' },
    ]);
    const res = await request(app).get('/api/menu').set('Authorization', token('PHUC_VU'));
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([{ monId: 'mon-03', tenMon: 'Bac xiu', gia: 35000, trangThai: 'TAM_HET' }]);
  });

  test('GET /api/orders/:id tra ve don day du', async () => {
    DonHangRepository.findById.mockResolvedValue({
      donHangId: 'dh-001', banId: 'ban-05', trangThai: 'DANG_PHUC_VU', tongTien: 90000, isSynced: true,
    });
    DonHangRepository.findChiTietByDon.mockResolvedValue([
      { chiTietId: 'ct-001', monId: 'mon-01', tenMon: 'Bac xiu', soLuong: 2, donGia: 45000, ghiChu: null, trangThaiCheBien: 'CHO_PHA_CHE' },
    ]);
    const res = await request(app).get('/api/orders/dh-001').set('Authorization', token('PHUC_VU'));
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ donHangId: 'dh-001', tongTien: 90000, isSynced: true });
    expect(res.body.data.dsMon[0]).toMatchObject({ chiTietId: 'ct-001', trangThaiCheBien: 'CHO_PHA_CHE' });
  });

  test('GET /api/orders/:id sai id tra DON_KHONG_TON_TAI 404', async () => {
    DonHangRepository.findById.mockResolvedValue(null);
    const res = await request(app).get('/api/orders/khong-co').set('Authorization', token('PHUC_VU'));
    expect(res.status).toBe(404);
    expect(res.body.maLoi).toBe('DON_KHONG_TON_TAI');
  });
});
