// =====================================================
// Test UC22 - Quản lý menu (chỉ chủ quán)
// -----------------------------------------------------
// Gọi thẳng 3 API /api/menu-items bằng supertest (không cần mở trình duyệt, không cần MySQL):
//   - MonAnRepository được thay bằng bản giả (jest.mock) -> không đụng CSDL thật
//   - Token đăng nhập tự tạo bằng jwt.sign với vai trò mong muốn
// Kiểm tra: luật nghiệp vụ (tên, giá, trùng tên, trạng thái) + phân quyền (401, 403)
// =====================================================

jest.mock('../src/repositories/MonAnRepository');
jest.mock('../src/config/db', () => ({ withTransaction: jest.fn(), pool: { query: jest.fn() } }));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const config = require('../src/config');
const MonAnRepository = require('../src/repositories/MonAnRepository');
const app = require('../src/app');

// Tạo header đăng nhập giả cho 1 vai trò
const token = (vaiTro) => 'Bearer ' + jwt.sign({ nhanVienId: 'nv-test', hoTen: 'Test', vaiTro }, config.jwt.secret);
const CHU_QUAN = token('CHU_QUAN');

// Thực đơn giả: 2 món có sẵn
const THUC_DON = [
  { id: 'mon-01', monId: 'mon-01', tenMon: 'Cà phê đen', gia: 25000, trangThai: 'CON_HANG' },
  { id: 'mon-03', monId: 'mon-03', tenMon: 'Bạc xỉu', gia: 35000, trangThai: 'TAM_HET' },
];

beforeEach(() => {
  jest.resetAllMocks();
  MonAnRepository.findAll.mockResolvedValue(THUC_DON.map((m) => ({ ...m })));
  MonAnRepository.findById.mockImplementation(async (id) => {
    const mon = THUC_DON.find((m) => m.monId === id);
    return mon ? { ...mon } : null;
  });
  MonAnRepository.taoMoi.mockImplementation(async (mon) => ({
    id: 'mon-moi', monId: 'mon-moi', tenMon: mon.tenMon, gia: mon.gia, trangThai: 'CON_HANG',
  }));
  MonAnRepository.capNhatGia.mockResolvedValue(true);
  MonAnRepository.capNhatTrangThai.mockResolvedValue(true);
});

describe('UC22 xem va them mon', () => {
  test('TC-22-01 chu quan xem duoc toan bo thuc don', async () => {
    const res = await request(app).get('/api/menu-items').set('Authorization', CHU_QUAN);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);
  });

  test('TC-22-02 them mon hop le: 201, ten duoc bo dau cach thua', async () => {
    const res = await request(app).post('/api/menu-items').set('Authorization', CHU_QUAN)
      .send({ tenMon: '  Cà   phê muối ', gia: 35000 });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ tenMon: 'Cà phê muối', gia: 35000, trangThai: 'CON_HANG' });
    expect(MonAnRepository.taoMoi).toHaveBeenCalledWith({ tenMon: 'Cà phê muối', gia: 35000 });
  });

  test('TC-22-03 ten mon trong hoac toan dau cach -> TEN_MON_TRONG', async () => {
    for (const tenMon of ['', '   ', undefined]) {
      const res = await request(app).post('/api/menu-items').set('Authorization', CHU_QUAN).send({ tenMon, gia: 35000 });
      expect(res.status).toBe(400);
      expect(res.body.maLoi).toBe('TEN_MON_TRONG');
    }
    expect(MonAnRepository.taoMoi).not.toHaveBeenCalled();
  });

  test('TC-22-04 ten mon qua 100 ky tu -> TEN_MON_QUA_DAI', async () => {
    const res = await request(app).post('/api/menu-items').set('Authorization', CHU_QUAN)
      .send({ tenMon: 'A'.repeat(101), gia: 35000 });
    expect(res.status).toBe(400);
    expect(res.body.maLoi).toBe('TEN_MON_QUA_DAI');
  });

  test('TC-22-05 trung ten mon da co (khong phan biet hoa thuong) -> 409', async () => {
    const res = await request(app).post('/api/menu-items').set('Authorization', CHU_QUAN)
      .send({ tenMon: 'CÀ PHÊ ĐEN', gia: 30000 });
    expect(res.status).toBe(409);
    expect(res.body.maLoi).toBe('TEN_MON_DA_TON_TAI');
    expect(MonAnRepository.taoMoi).not.toHaveBeenCalled();
  });

  test('TC-22-06 gia bien hop le: 1 dong va 10.000.000 dong', async () => {
    for (const gia of [1, 10000000]) {
      const res = await request(app).post('/api/menu-items').set('Authorization', CHU_QUAN)
        .send({ tenMon: `Mon gia ${gia}`, gia });
      expect(res.status).toBe(201);
    }
  });

  test('TC-22-07 gia sai: 0, am, qua 10 trieu, so le, chu -> GIA_KHONG_HOP_LE', async () => {
    for (const gia of [0, -1000, 10000001, 1500.5, '35000', null]) {
      const res = await request(app).post('/api/menu-items').set('Authorization', CHU_QUAN)
        .send({ tenMon: 'Mon moi', gia });
      expect(res.status).toBe(400);
      expect(res.body.maLoi).toBe('GIA_KHONG_HOP_LE');
    }
    expect(MonAnRepository.taoMoi).not.toHaveBeenCalled();
  });
});

describe('UC22 sua gia va bat/tat ban', () => {
  test('TC-22-08 sua gia mon co san', async () => {
    const res = await request(app).patch('/api/menu-items/mon-01').set('Authorization', CHU_QUAN).send({ gia: 28000 });
    expect(res.status).toBe(200);
    expect(MonAnRepository.capNhatGia).toHaveBeenCalledWith('mon-01', 28000);
    expect(MonAnRepository.capNhatTrangThai).not.toHaveBeenCalled();
  });

  test('TC-22-09 tat ban (TAM_HET) va bat ban lai (CON_HANG)', async () => {
    await request(app).patch('/api/menu-items/mon-01').set('Authorization', CHU_QUAN).send({ trangThai: 'TAM_HET' });
    expect(MonAnRepository.capNhatTrangThai).toHaveBeenLastCalledWith('mon-01', 'TAM_HET');
    const res = await request(app).patch('/api/menu-items/mon-03').set('Authorization', CHU_QUAN).send({ trangThai: 'CON_HANG' });
    expect(res.status).toBe(200);
    expect(MonAnRepository.capNhatTrangThai).toHaveBeenLastCalledWith('mon-03', 'CON_HANG');
  });

  test('TC-22-10 mon khong ton tai -> 404 MON_KHONG_TON_TAI', async () => {
    const res = await request(app).patch('/api/menu-items/mon-99').set('Authorization', CHU_QUAN).send({ gia: 28000 });
    expect(res.status).toBe(404);
    expect(res.body.maLoi).toBe('MON_KHONG_TON_TAI');
  });

  test('TC-22-11 trang thai sai hoac khong gui gi de sua -> 400, khong ghi CSDL', async () => {
    const sai = await request(app).patch('/api/menu-items/mon-01').set('Authorization', CHU_QUAN)
      .send({ gia: 28000, trangThai: 'HET_HANG' });
    expect(sai.status).toBe(400);
    expect(sai.body.maLoi).toBe('TRANG_THAI_KHONG_HOP_LE');
    // Kiểm tra hết trước khi ghi: giá hợp lệ nhưng trạng thái sai thì giá cũng KHÔNG bị sửa
    expect(MonAnRepository.capNhatGia).not.toHaveBeenCalled();

    const rong = await request(app).patch('/api/menu-items/mon-01').set('Authorization', CHU_QUAN).send({});
    expect(rong.status).toBe(400);
    expect(rong.body.maLoi).toBe('DU_LIEU_KHONG_HOP_LE');
  });
});

describe('UC22 phan quyen: chi chu quan duoc dung', () => {
  const API = [
    ['get', '/api/menu-items'],
    ['post', '/api/menu-items'],
    ['patch', '/api/menu-items/mon-01'],
  ];

  test.each(API)('TC-22-12 %s %s khong co token -> 401', async (method, url) => {
    const res = await request(app)[method](url).send({});
    expect(res.status).toBe(401);
    expect(res.body.maLoi).toBe('CHUA_DANG_NHAP');
  });

  test.each(API)('TC-22-13 %s %s vai tro khac chu quan -> 403', async (method, url) => {
    for (const vaiTro of ['PHUC_VU', 'BARISTA', 'THU_NGAN']) {
      const res = await request(app)[method](url).set('Authorization', token(vaiTro)).send({ tenMon: 'X', gia: 1000 });
      expect(res.status).toBe(403);
      expect(res.body.maLoi).toBe('KHONG_CO_QUYEN');
    }
    expect(MonAnRepository.taoMoi).not.toHaveBeenCalled();
  });
});
