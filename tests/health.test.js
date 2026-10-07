const request = require('supertest');
const app = require('../src/app');

describe('khung he thong', () => {
  test('GET /api/health tra ve dung format', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { status: 'up' }, maLoi: null, message: 'OK' });
  });

  test('duong dan khong ton tai tra ve NOT_FOUND', async () => {
    const res = await request(app).get('/api/khong-co');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.maLoi).toBe('NOT_FOUND');
  });

  test('UC chua cai dat tra ve 501 dung format', async () => {
    // Repository chua cai dat (khung cho An) nen API tra 501; bo test nay khi co CSDL that
    const res = await request(app).get('/api/orders/dh-001/invoice');
    expect(res.status).toBe(501);
    expect(res.body).toMatchObject({ success: false, maLoi: 'CHUA_CAI_DAT' });
  });

  test('POST /api/auth/login dang nhap thanh cong', async () => {
    const res = await request(app).post('/api/auth/login').send({ username: 'phucvu01', password: '123456' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      nhanVienId: 'nv-001',
      hoTen: 'Nguyễn Văn A',
      vaiTro: 'PHUC_VU',
      trangChu: '/tables.html'
    });
    expect(typeof res.body.data.token).toBe('string');
    expect(res.body.data.token.length).toBeGreaterThan(20);
  });

  test('POST /api/auth/login tra ve loi khi thieu thong tin', async () => {
    const res = await request(app).post('/api/auth/login').send({ username: 'phucvu01' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.maLoi).toBe('THIEU_THONG_TIN');
  });
});
