// Trang .html chi vao duoc khi co cookie dang nhap dung vai tro (khong chi dua vao JavaScript phia giao dien)
jest.mock('../src/config/db', () => ({ withTransaction: jest.fn(), pool: { query: jest.fn() } }));
jest.mock('../src/services/AuthService', () => {
  const that = jest.requireActual('../src/services/AuthService');
  return Object.assign(that, { dangNhap: jest.fn() });
});

const request = require('supertest');
const jwt = require('jsonwebtoken');
const config = require('../src/config');
const AuthService = require('../src/services/AuthService');
const app = require('../src/app');

const cookie = (vaiTro, secret = config.jwt.secret) =>
  `lm_token=${jwt.sign({ nhanVienId: 'nv-test', hoTen: 'Test', vaiTro }, secret, { expiresIn: '1h' })}`;

describe('bao ve trang .html', () => {
  test.each(['/tables.html', '/pos.html', '/kitchen.html', '/kho.html', '/dashboard.html'])(
    '%s: chua dang nhap -> chuyen ve trang dang nhap', async (trang) => {
      const res = await request(app).get(trang);
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/?hetPhien=1');
    },
  );

  test.each([
    ['/tables.html', 'PHUC_VU'], ['/pos.html', 'THU_NGAN'], ['/kitchen.html', 'BARISTA'],
    ['/kho.html', 'BARISTA'], ['/dashboard.html', 'CHU_QUAN'],
  ])('%s: dung vai tro %s -> 200', async (trang, vaiTro) => {
    const res = await request(app).get(trang).set('Cookie', cookie(vaiTro));
    expect(res.status).toBe(200);
  });

  test('sai vai tro -> chuyen ve trang chu cua vai tro do', async () => {
    const res = await request(app).get('/kho.html').set('Cookie', cookie('THU_NGAN'));
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/pos.html');
  });

  test('cookie gia/sai khoa ky -> bi tu choi', async () => {
    const res = await request(app).get('/kho.html').set('Cookie', cookie('BARISTA', 'khoa-gia'));
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/?hetPhien=1');
  });

  test('khong lach duoc bang chu hoa hoac ma hoa duong dan', async () => {
    for (const p of ['/KHO.HTML', '/kho%2ehtml', '/Kitchen.Html']) {
      const res = await request(app).get(p);
      expect(res.status).toBe(302);
    }
  });

  test('trang dang nhap va file tinh (css/js/anh) van mo duoc khong can dang nhap', async () => {
    expect((await request(app).get('/')).status).toBe(200);
    expect((await request(app).get('/index.html')).status).toBe(200);
    expect((await request(app).get('/css/app.css')).status).toBe(200);
    expect((await request(app).get('/js/phien.js')).status).toBe(200);
  });
});

describe('cookie dang nhap', () => {
  test('dang nhap thanh cong dat cookie HttpOnly, SameSite=Strict', async () => {
    const token = jwt.sign({ nhanVienId: 'nv-1', hoTen: 'A', vaiTro: 'PHUC_VU' }, config.jwt.secret, { expiresIn: '12h' });
    AuthService.dangNhap.mockResolvedValue({ token, nhanVienId: 'nv-1', hoTen: 'A', vaiTro: 'PHUC_VU', trangChu: '/tables.html' });
    const res = await request(app).post('/api/auth/login').send({ username: 'a', password: 'b' });
    expect(res.status).toBe(200);
    const set = res.headers['set-cookie'].join(';');
    expect(set).toMatch(/lm_token=/);
    expect(set).toMatch(/HttpOnly/i);
    expect(set).toMatch(/SameSite=Strict/i);
  });

  test('dang xuat xoa cookie', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(200);
    expect(res.headers['set-cookie'].join(';')).toMatch(/lm_token=;/);
  });
});
