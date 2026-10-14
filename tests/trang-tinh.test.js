// Test bao ve trang .html o phia server:
// chi vao duoc trang khi co cookie dang nhap dung vai tro (khong chi dua vao JavaScript o trinh duyet)
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

// tao cookie dang nhap cho 1 vai tro; truyen khoa khac de thu cookie gia
function taoCookie(vaiTro, khoa = config.jwt.secret) {
  const token = jwt.sign({ nhanVienId: 'nv-test', hoTen: 'Test', vaiTro }, khoa, { expiresIn: '1h' });
  return `lm_token=${token}`;
}

describe('chua dang nhap', () => {
  const dsTrang = ['/tables.html', '/pos.html', '/kitchen.html', '/kho.html', '/dashboard.html', '/quan-ly-menu.html', '/bao-cao.html'];

  test.each(dsTrang)('%s: khong co cookie thi ve trang dang nhap', async (trang) => {
    const res = await request(app).get(trang);

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/?hetPhien=1');
  });

  test('request HEAD cung bi chan', async () => {
    const res = await request(app).head('/kho.html');
    expect(res.status).toBe(302);
  });

  test('cookie ky bang khoa sai (gia mao) bi tu choi', async () => {
    const res = await request(app).get('/kho.html').set('Cookie', taoCookie('BARISTA', 'khoa-gia'));

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/?hetPhien=1');
  });

  test('cookie khong phai token cung bi tu choi', async () => {
    const res = await request(app).get('/tables.html').set('Cookie', 'lm_token=khong-phai-token');

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/?hetPhien=1');
  });
});

describe('dung vai tro thi vao duoc (200)', () => {
  test('Phuc vu vao so do ban', async () => {
    const res = await request(app).get('/tables.html').set('Cookie', taoCookie('PHUC_VU'));
    expect(res.status).toBe(200);
  });

  test('Thu ngan vao POS', async () => {
    const res = await request(app).get('/pos.html').set('Cookie', taoCookie('THU_NGAN'));
    expect(res.status).toBe(200);
  });

  test('Barista vao man bep', async () => {
    const res = await request(app).get('/kitchen.html').set('Cookie', taoCookie('BARISTA'));
    expect(res.status).toBe(200);
  });

  test('Barista vao kho', async () => {
    const res = await request(app).get('/kho.html').set('Cookie', taoCookie('BARISTA'));
    expect(res.status).toBe(200);
  });

  test('Chu quan vao duoc tat ca cac trang (toan quyen)', async () => {
    const dsTrang = ['/tables.html', '/pos.html', '/kitchen.html', '/kho.html', '/dashboard.html', '/quan-ly-menu.html', '/bao-cao.html'];

    for (const trang of dsTrang) {
      const res = await request(app).get(trang).set('Cookie', taoCookie('CHU_QUAN'));
      expect(res.status).toBe(200);
    }
  });
});

describe('sai vai tro thi bi dua ve trang chu cua vai tro do', () => {
  test('Thu ngan vao kho -> ve POS', async () => {
    const res = await request(app).get('/kho.html').set('Cookie', taoCookie('THU_NGAN'));

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/pos.html');
  });

  test('Phuc vu vao man bep -> ve so do ban', async () => {
    const res = await request(app).get('/kitchen.html').set('Cookie', taoCookie('PHUC_VU'));

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/tables.html');
  });

  test('Barista vao POS -> ve man bep', async () => {
    const res = await request(app).get('/pos.html').set('Cookie', taoCookie('BARISTA'));

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/kitchen.html');
  });

  test('chi chu quan vao duoc quan ly menu: Phuc vu bi chan', async () => {
    const res = await request(app).get('/quan-ly-menu.html').set('Cookie', taoCookie('PHUC_VU'));

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/tables.html');
  });

  test('chi chu quan vao duoc bao cao: Thu ngan bi chan', async () => {
    const res = await request(app).get('/bao-cao.html').set('Cookie', taoCookie('THU_NGAN'));

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/pos.html');
  });

  test('chi chu quan vao duoc tong quan: Barista bi chan', async () => {
    const res = await request(app).get('/dashboard.html').set('Cookie', taoCookie('BARISTA'));

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/kitchen.html');
  });
});

describe('duong dan bien the', () => {
  test.each(['/KHO.HTML', '/kho%2ehtml', '/Kitchen.Html', '/%4Bho.html'])(
    'khong lach duoc bang chu hoa hoac ma hoa: %s', async (duongDan) => {
      const res = await request(app).get(duongDan);
      expect(res.status).toBe(302);
    },
  );

  test('duong dan ma hoa loi khong lam sap server, ve trang dang nhap', async () => {
    const res = await request(app).get('/%E0%A4%A.html');

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/?hetPhien=1');
  });

  test('chi chan viec xem trang, request POST khong bi chuyen huong', async () => {
    const res = await request(app).post('/kho.html');
    expect(res.status).not.toBe(302);
  });
});

describe('trang cong khai', () => {
  test.each(['/', '/index.html', '/css/app.css', '/js/phien.js'])('%s mo duoc khong can dang nhap', async (duongDan) => {
    const res = await request(app).get(duongDan);
    expect(res.status).toBe(200);
  });
});

describe('cookie dang nhap va dang xuat', () => {
  test('dang nhap thanh cong thi dat cookie HttpOnly, SameSite=Strict', async () => {
    const token = jwt.sign({ nhanVienId: 'nv-1', hoTen: 'A', vaiTro: 'PHUC_VU' }, config.jwt.secret, { expiresIn: '12h' });
    AuthService.dangNhap.mockResolvedValue({ token, nhanVienId: 'nv-1', hoTen: 'A', vaiTro: 'PHUC_VU', trangChu: '/tables.html' });

    const res = await request(app).post('/api/auth/login').send({ username: 'a', password: 'b' });

    expect(res.status).toBe(200);
    const cookie = res.headers['set-cookie'].join(';');
    expect(cookie).toMatch(/lm_token=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Strict/i);
  });

  test('dang xuat thi xoa cookie', async () => {
    const res = await request(app).post('/api/auth/logout');

    expect(res.status).toBe(200);
    expect(res.headers['set-cookie'].join(';')).toMatch(/lm_token=;/);
  });
});
