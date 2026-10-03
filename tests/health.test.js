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
    const res = await request(app).post('/api/orders').send({});
    expect(res.status).toBe(501);
    expect(res.body).toMatchObject({ success: false, maLoi: 'CHUA_CAI_DAT' });
  });
});
