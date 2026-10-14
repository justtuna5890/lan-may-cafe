// Test UC21 dang nhap: dang nhap, khoa tai khoan, verifyToken va requireRole
// Gia lap (mock) kho nhan vien nen khong can bat MySQL
jest.mock('../src/repositories/NhanVienRepository');

const bcrypt = require('bcrypt');
const express = require('express');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../src/app');
const config = require('../src/config');
const NhanVien = require('../src/models/NhanVien');
const NhanVienRepository = require('../src/repositories/NhanVienRepository');
const { verifyToken, requireRole } = require('../src/middlewares/auth');
const { errorHandler } = require('../src/middlewares/errorHandler');

// mat khau dung la 123456, hash voi cost 4 cho chay nhanh
const HASH = bcrypt.hashSync('123456', 4);

// tao 1 nhan vien mau, muon doi gi thi truyen vao (vai tro, trang thai, so lan sai...)
function taoNhanVien(doi = {}) {
  return new NhanVien({
    id: 'nv-001',
    username: 'phucvu01',
    matKhau: HASH,
    vaiTro: 'PHUC_VU',
    hoTen: 'Nguyễn Văn A',
    ...doi,
  });
}

// gui request dang nhap
function dangNhap(username, password) {
  return request(app).post('/api/auth/login').send({ username, password });
}

beforeEach(() => {
  jest.resetAllMocks();
  // mac dinh kho tra ve nhan vien phucvu01
  NhanVienRepository.findByUsername.mockResolvedValue(taoNhanVien());
});

describe('UC21 dang nhap thanh cong', () => {
  test('TC-21-01 dang nhap bang tai khoan Phuc vu', async () => {
    const res = await dangNhap('phucvu01', '123456');

    expect(res.status).toBe(200);
    expect(res.body.data.nhanVienId).toBe('nv-001');
    expect(res.body.data.hoTen).toBe('Nguyễn Văn A');
    expect(res.body.data.vaiTro).toBe('PHUC_VU');
    expect(res.body.data.trangChu).toBe('/tables.html');
    expect(res.body.data.token.length).toBeGreaterThan(20);
    // khong duoc tra mat khau ve cho client
    expect(res.body.data.matKhau).toBeUndefined();
  });

  test('TC-21-02 Barista vao trang bep', async () => {
    NhanVienRepository.findByUsername.mockResolvedValue(taoNhanVien({ vaiTro: 'BARISTA' }));
    const res = await dangNhap('phucvu01', '123456');
    expect(res.body.data.trangChu).toBe('/kitchen.html');
  });

  test('TC-21-02 Thu ngan vao trang POS', async () => {
    NhanVienRepository.findByUsername.mockResolvedValue(taoNhanVien({ vaiTro: 'THU_NGAN' }));
    const res = await dangNhap('phucvu01', '123456');
    expect(res.body.data.trangChu).toBe('/pos.html');
  });

  test('TC-21-02 Chu quan vao trang tong quan', async () => {
    NhanVienRepository.findByUsername.mockResolvedValue(taoNhanVien({ vaiTro: 'CHU_QUAN' }));
    const res = await dangNhap('phucvu01', '123456');
    expect(res.body.data.trangChu).toBe('/dashboard.html');
  });

  test('ten dang nhap co dau cach thua 2 dau van dang nhap duoc', async () => {
    const res = await dangNhap('  phucvu01  ', '123456');

    expect(res.status).toBe(200);
    // server phai cat dau cach roi moi tim trong kho
    expect(NhanVienRepository.findByUsername).toHaveBeenCalledWith('phucvu01');
  });
});

describe('UC21 dang nhap that bai', () => {
  test('TC-21-03 sai mat khau thi bao 401 va tinh 1 lan sai', async () => {
    const res = await dangNhap('phucvu01', 'saimatkhau');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.data).toBeNull();
    expect(res.body.maLoi).toBe('SAI_THONG_TIN');
    expect(NhanVienRepository.capNhatDangNhapSai).toHaveBeenCalledWith('nv-001', 1, 'HOAT_DONG');
  });

  test('TC-21-04 sai ten dang nhap thi bao giong nhu sai mat khau', async () => {
    // lay thong bao khi sai mat khau truoc
    const saiMatKhau = await dangNhap('phucvu01', 'saimatkhau');
    // roi gia lap khong tim thay ten dang nhap
    NhanVienRepository.findByUsername.mockResolvedValue(null);
    const res = await dangNhap('khongtontai', '123456');

    expect(res.status).toBe(401);
    expect(res.body.maLoi).toBe('SAI_THONG_TIN');
    expect(res.body.message).toBe(saiMatKhau.body.message);
  });

  test('TC-21-05 bo trong ten dang nhap', async () => {
    const res = await request(app).post('/api/auth/login').send({ password: '123456' });

    expect(res.status).toBe(400);
    expect(res.body.maLoi).toBe('THIEU_THONG_TIN');
    expect(NhanVienRepository.capNhatDangNhapSai).not.toHaveBeenCalled();
  });

  test('TC-21-05 bo trong mat khau', async () => {
    const res = await request(app).post('/api/auth/login').send({ username: 'phucvu01' });

    expect(res.status).toBe(400);
    expect(res.body.maLoi).toBe('THIEU_THONG_TIN');
    expect(NhanVienRepository.capNhatDangNhapSai).not.toHaveBeenCalled();
  });

  test('TC-21-05 ten dang nhap chi toan dau cach', async () => {
    const res = await dangNhap('   ', '123456');

    expect(res.status).toBe(400);
    expect(res.body.maLoi).toBe('THIEU_THONG_TIN');
    expect(NhanVienRepository.capNhatDangNhapSai).not.toHaveBeenCalled();
  });
});

describe('UC21 khoa va vo hieu hoa tai khoan', () => {
  test('TC-21-06 da sai 4 lan, lan nay nhap dung thi vao duoc va dem lai tu 0', async () => {
    NhanVienRepository.findByUsername.mockResolvedValue(taoNhanVien({ soLanSai: 4 }));

    const res = await dangNhap('phucvu01', '123456');

    expect(res.status).toBe(200);
    expect(NhanVienRepository.datLaiSoLanSai).toHaveBeenCalledWith('nv-001');
  });

  test('TC-21-07 sai lan thu 5 thi khoa tai khoan (423)', async () => {
    NhanVienRepository.findByUsername.mockResolvedValue(taoNhanVien({ soLanSai: 4 }));

    const res = await dangNhap('phucvu01', 'saimatkhau');

    expect(res.status).toBe(423);
    expect(res.body.maLoi).toBe('TAI_KHOAN_BI_KHOA');
    expect(NhanVienRepository.capNhatDangNhapSai).toHaveBeenCalledWith('nv-001', 5, 'BI_KHOA');
  });

  test('TC-21-07/08 tai khoan da khoa: nhap dung mat khau van bi chan, khong co token', async () => {
    NhanVienRepository.findByUsername.mockResolvedValue(taoNhanVien({ trangThai: 'BI_KHOA', soLanSai: 5 }));

    const res = await dangNhap('phucvu01', '123456');

    expect(res.status).toBe(423);
    expect(res.body.maLoi).toBe('TAI_KHOAN_BI_KHOA');
    expect(res.body.data).toBeNull();
  });

  test('TC-21-09 tai khoan bi vo hieu hoa thi bao 403', async () => {
    NhanVienRepository.findByUsername.mockResolvedValue(taoNhanVien({ trangThai: 'VO_HIEU' }));

    const res = await dangNhap('phucvu01', '123456');

    expect(res.status).toBe(403);
    expect(res.body.maLoi).toBe('TAI_KHOAN_VO_HIEU');
    expect(res.body.data).toBeNull();
  });

  test('tai khoan vo hieu hoa nhap sai mat khau: van 403 va khong tang so lan sai', async () => {
    NhanVienRepository.findByUsername.mockResolvedValue(taoNhanVien({ trangThai: 'VO_HIEU' }));

    const res = await dangNhap('phucvu01', 'saimatkhau');

    expect(res.status).toBe(403);
    expect(NhanVienRepository.capNhatDangNhapSai).not.toHaveBeenCalled();
  });
});

describe('UC21 verifyToken va requireRole', () => {
  // tao app nho chi de thu 2 middleware nay, giong cach route that dang dung
  const appThu = express();
  appThu.get('/chi-thu-ngan', verifyToken, requireRole('THU_NGAN'), (req, res) => {
    res.json({ user: req.user });
  });
  appThu.use(errorHandler);

  // dang nhap voi 1 vai tro roi lay token
  async function layToken(vaiTro) {
    NhanVienRepository.findByUsername.mockResolvedValue(taoNhanVien({ vaiTro }));
    const res = await dangNhap('phucvu01', '123456');
    return res.body.data.token;
  }

  test('TC-21-10 khong gui token thi 401', async () => {
    const res = await request(appThu).get('/chi-thu-ngan');

    expect(res.status).toBe(401);
    expect(res.body.maLoi).toBe('CHUA_DANG_NHAP');
  });

  test('token sai thi 401', async () => {
    const res = await request(appThu).get('/chi-thu-ngan').set('Authorization', 'Bearer abc.def.ghi');

    expect(res.status).toBe(401);
    expect(res.body.maLoi).toBe('CHUA_DANG_NHAP');
  });

  test('token het han thi 401', async () => {
    // tao token da het han tu 10 giay truoc
    const tokenHetHan = jwt.sign(
      { nhanVienId: 'nv-001', hoTen: 'A', vaiTro: 'THU_NGAN' },
      config.jwt.secret,
      { expiresIn: -10 },
    );

    const res = await request(appThu).get('/chi-thu-ngan').set('Authorization', `Bearer ${tokenHetHan}`);

    expect(res.status).toBe(401);
    expect(res.body.maLoi).toBe('CHUA_DANG_NHAP');
  });

  test('TC-21-11 dung token nhung sai vai tro thi 403', async () => {
    const token = await layToken('PHUC_VU');

    const res = await request(appThu).get('/chi-thu-ngan').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.maLoi).toBe('KHONG_CO_QUYEN');
  });

  test('dung vai tro thi duoc vao, req.user lay tu token', async () => {
    const token = await layToken('THU_NGAN');

    const res = await request(appThu).get('/chi-thu-ngan').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.nhanVienId).toBe('nv-001');
    expect(res.body.user.vaiTro).toBe('THU_NGAN');
  });
});
