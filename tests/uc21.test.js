jest.mock('../src/repositories/NhanVienRepository');

const bcrypt = require('bcrypt');
const express = require('express');
const request = require('supertest');
const app = require('../src/app');
const NhanVien = require('../src/models/NhanVien');
const NhanVienRepository = require('../src/repositories/NhanVienRepository');
const { verifyToken, requireRole } = require('../src/middlewares/auth');
const { errorHandler } = require('../src/middlewares/errorHandler');

const HASH = bcrypt.hashSync('123456', 4);
const nhanVien = (thayDoi = {}) => new NhanVien({
  id: 'nv-001', username: 'phucvu01', matKhau: HASH, vaiTro: 'PHUC_VU', hoTen: 'Nguyễn Văn A', ...thayDoi,
});
const dangNhap = (body) => request(app).post('/api/auth/login').send(body);

beforeEach(() => {
  jest.resetAllMocks();
  NhanVienRepository.findByUsername.mockResolvedValue(nhanVien());
});

describe('UC21 dang nhap', () => {
  test('TC-21-01 dang nhap thanh cong bang tai khoan Phuc vu', async () => {
    const res = await dangNhap({ username: 'phucvu01', password: '123456' });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ nhanVienId: 'nv-001', hoTen: 'Nguyễn Văn A', vaiTro: 'PHUC_VU', trangChu: '/tables.html' });
    expect(res.body.data.token.length).toBeGreaterThan(20);
    expect(res.body.data.matKhau).toBeUndefined();
  });

  test.each([
    ['BARISTA', '/kitchen.html'],
    ['THU_NGAN', '/pos.html'],
    ['CHU_QUAN', '/dashboard.html'],
  ])('TC-21-02 vai tro %s chuyen den %s', async (vaiTro, trangChu) => {
    NhanVienRepository.findByUsername.mockResolvedValue(nhanVien({ vaiTro }));
    const res = await dangNhap({ username: 'phucvu01', password: '123456' });
    expect(res.body.data).toMatchObject({ vaiTro, trangChu });
  });

  test('TC-21-03 sai mat khau: 401 va tang so_lan_sai', async () => {
    const res = await dangNhap({ username: 'phucvu01', password: 'saimatkhau' });
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ success: false, data: null, maLoi: 'SAI_THONG_TIN' });
    expect(NhanVienRepository.capNhatDangNhapSai).toHaveBeenCalledWith('nv-001', 1, 'HOAT_DONG');
  });

  test('TC-21-04 username khong ton tai: cung thong bao voi sai mat khau', async () => {
    const saiMk = await dangNhap({ username: 'phucvu01', password: 'saimatkhau' });
    NhanVienRepository.findByUsername.mockResolvedValue(null);
    const res = await dangNhap({ username: 'khongtontai', password: '123456' });
    expect(res.status).toBe(401);
    expect(res.body.maLoi).toBe('SAI_THONG_TIN');
    expect(res.body.message).toBe(saiMk.body.message);
  });

  test.each([
    [{ password: '123456' }],
    [{ username: 'phucvu01' }],
    [{ username: '   ', password: '123456' }],
  ])('TC-21-05 bo trong o: 400 THIEU_THONG_TIN, khong tinh lan sai %j', async (body) => {
    const res = await dangNhap(body);
    expect(res.status).toBe(400);
    expect(res.body.maLoi).toBe('THIEU_THONG_TIN');
    expect(NhanVienRepository.capNhatDangNhapSai).not.toHaveBeenCalled();
  });

  test('TC-21-06 da sai 4 lan, dang nhap dung van vao duoc va dem lai tu 0', async () => {
    NhanVienRepository.findByUsername.mockResolvedValue(nhanVien({ soLanSai: 4 }));
    const res = await dangNhap({ username: 'phucvu01', password: '123456' });
    expect(res.status).toBe(200);
    expect(NhanVienRepository.datLaiSoLanSai).toHaveBeenCalledWith('nv-001');
  });

  test('TC-21-07 sai lan thu 5: khoa tai khoan, 423', async () => {
    NhanVienRepository.findByUsername.mockResolvedValue(nhanVien({ soLanSai: 4 }));
    const res = await dangNhap({ username: 'phucvu01', password: 'saimatkhau' });
    expect(res.status).toBe(423);
    expect(res.body.maLoi).toBe('TAI_KHOAN_BI_KHOA');
    expect(NhanVienRepository.capNhatDangNhapSai).toHaveBeenCalledWith('nv-001', 5, 'BI_KHOA');
  });

  test('TC-21-07/08 tai khoan da bi khoa: mat khau dung van 423, khong co token', async () => {
    NhanVienRepository.findByUsername.mockResolvedValue(nhanVien({ trangThai: 'BI_KHOA', soLanSai: 5 }));
    const res = await dangNhap({ username: 'phucvu01', password: '123456' });
    expect(res.status).toBe(423);
    expect(res.body).toMatchObject({ maLoi: 'TAI_KHOAN_BI_KHOA', data: null });
  });

  test('TC-21-09 tai khoan bi vo hieu hoa: 403', async () => {
    NhanVienRepository.findByUsername.mockResolvedValue(nhanVien({ trangThai: 'VO_HIEU' }));
    const res = await dangNhap({ username: 'phucvu01', password: '123456' });
    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ maLoi: 'TAI_KHOAN_VO_HIEU', data: null });
  });
});

describe('UC21 middleware verifyToken + requireRole', () => {
  // App nho chi de thu middleware, giong cach route that dung
  const appThu = express();
  appThu.get('/thu', verifyToken, requireRole('THU_NGAN'), (req, res) => res.json({ user: req.user }));
  appThu.use(errorHandler);

  const layToken = async (vaiTro) => {
    NhanVienRepository.findByUsername.mockResolvedValue(nhanVien({ vaiTro }));
    const res = await dangNhap({ username: 'phucvu01', password: '123456' });
    return res.body.data.token;
  };

  test('TC-21-10 khong co token: 401 CHUA_DANG_NHAP', async () => {
    const res = await request(appThu).get('/thu');
    expect(res.status).toBe(401);
    expect(res.body.maLoi).toBe('CHUA_DANG_NHAP');
  });

  test('token sai hoac bi sua: 401 CHUA_DANG_NHAP', async () => {
    const res = await request(appThu).get('/thu').set('Authorization', 'Bearer abc.def.ghi');
    expect(res.status).toBe(401);
    expect(res.body.maLoi).toBe('CHUA_DANG_NHAP');
  });

  test('TC-21-11 sai vai tro: 403 KHONG_CO_QUYEN', async () => {
    const token = await layToken('PHUC_VU');
    const res = await request(appThu).get('/thu').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(res.body.maLoi).toBe('KHONG_CO_QUYEN');
  });

  test('dung vai tro: di qua, req.user lay tu token', async () => {
    const token = await layToken('THU_NGAN');
    const res = await request(appThu).get('/thu').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user).toEqual({ nhanVienId: 'nv-001', hoTen: 'Nguyễn Văn A', vaiTro: 'THU_NGAN' });
  });
});
