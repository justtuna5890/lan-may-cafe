// Test phan quyen API theo vai tro (api-contract.md muc 2)
// Gia lap cac service va CSDL nen chi kiem tra viec cho vao hay chan o middleware
jest.mock('../src/services/OrderService');
jest.mock('../src/services/PaymentService');
jest.mock('../src/services/KitchenService');
jest.mock('../src/services/KhoHangService');
// SSE khong tu ket thuc nen gia lap: tra 200 roi dong ngay
jest.mock('../src/realtime/kds', () => ({ subscribeKDS: (req, res) => res.status(200).end() }));
jest.mock('../src/config/db', () => ({ withTransaction: jest.fn(), pool: { query: jest.fn() } }));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const config = require('../src/config');
const OrderService = require('../src/services/OrderService');
const PaymentService = require('../src/services/PaymentService');
const KitchenService = require('../src/services/KitchenService');
const KhoHangService = require('../src/services/KhoHangService');
const app = require('../src/app');

// tao token cho 1 vai tro (khong kem chu "Bearer")
function taoToken(vaiTro, tuyChon = {}) {
  return jwt.sign({ nhanVienId: 'nv-test', hoTen: 'Test', vaiTro }, config.jwt.secret, tuyChon);
}
const bearer = (vaiTro) => `Bearer ${taoToken(vaiTro)}`;

// moi nhom route chi cho cac vai tro duoc liet ke, chu quan luon duoc vao (toan quyen)
const CHU_QUAN = 'CHU_QUAN';
const NHOM_PHUC_VU = ['PHUC_VU', CHU_QUAN];
const NHOM_THU_NGAN = ['THU_NGAN', CHU_QUAN];
const NHOM_PHUC_VU_THU_NGAN = ['PHUC_VU', 'THU_NGAN', CHU_QUAN];
const NHOM_BARISTA = ['BARISTA', CHU_QUAN];
const TAT_CA_VAI_TRO = ['PHUC_VU', 'BARISTA', 'THU_NGAN', 'CHU_QUAN'];

// moi dong: [method, duong dan, nhom vai tro duoc phep]
const DS_ROUTE = [
  ['get', '/api/tables', NHOM_PHUC_VU_THU_NGAN],
  ['get', '/api/tables/ban-01/current-order', NHOM_PHUC_VU_THU_NGAN],
  ['get', '/api/orders/dh-001', NHOM_PHUC_VU_THU_NGAN],
  ['get', '/api/menu', NHOM_PHUC_VU],
  ['post', '/api/orders', NHOM_PHUC_VU],
  ['post', '/api/orders/dh-001/items', NHOM_PHUC_VU],
  ['patch', '/api/orders/dh-001/items/ct-001', NHOM_PHUC_VU],
  ['delete', '/api/orders/dh-001/items/ct-001', NHOM_PHUC_VU],
  ['get', '/api/orders/dh-001/invoice', NHOM_THU_NGAN],
  ['post', '/api/payments', NHOM_THU_NGAN],
  ['get', '/api/kitchen/items', NHOM_BARISTA],
  ['patch', '/api/kitchen/items/ct-001/status', NHOM_BARISTA],
  ['post', '/api/kitchen/items/ct-001/undo', NHOM_BARISTA],
  ['get', '/api/inventory', NHOM_BARISTA],
  ['get', '/api/inventory/kho-01', NHOM_BARISTA],
  ['patch', '/api/inventory/kho-01/out-of-stock', NHOM_BARISTA],
  ['post', '/api/inventory/kho-01/restock', NHOM_BARISTA],
  ['post', '/api/inventory/kho-01/issue', NHOM_BARISTA],
  ['get', '/api/kds/stream', NHOM_BARISTA],
];

// cho moi ham cua service tra ve {} de request di qua middleware khong bi loi
function giaLapService(service) {
  for (const ham of Object.values(service)) {
    if (jest.isMockFunction(ham)) ham.mockResolvedValue({});
  }
}

beforeEach(() => {
  jest.resetAllMocks();
  [OrderService, PaymentService, KitchenService, KhoHangService].forEach(giaLapService);
});

describe.each(DS_ROUTE)('route %s %s', (method, url, duocPhep) => {
  test('khong co token thi 401 CHUA_DANG_NHAP', async () => {
    const res = await request(app)[method](url).send({});

    expect(res.status).toBe(401);
    expect(res.body.maLoi).toBe('CHUA_DANG_NHAP');
  });

  test('token sai thi 401', async () => {
    const res = await request(app)[method](url).set('Authorization', 'Bearer abc.def.ghi').send({});
    expect(res.status).toBe(401);
  });

  test('token het han thi 401', async () => {
    const tokenHetHan = taoToken('CHU_QUAN', { expiresIn: -10 });

    const res = await request(app)[method](url).set('Authorization', `Bearer ${tokenHetHan}`).send({});

    expect(res.status).toBe(401);
  });

  test.each(TAT_CA_VAI_TRO)('vai tro %s', async (vaiTro) => {
    const res = await request(app)[method](url).set('Authorization', bearer(vaiTro)).send({});

    if (duocPhep.includes(vaiTro)) {
      // duoc phep thi khong bi chan (ket qua cuoi la gi cung duoc)
      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);
    } else {
      expect(res.status).toBe(403);
      expect(res.body.maLoi).toBe('KHONG_CO_QUYEN');
    }
  });
});

describe('/kds/stream nhan token qua query (EventSource khong gui duoc header)', () => {
  test('?token cua Barista thi vao duoc', async () => {
    const res = await request(app).get('/api/kds/stream').query({ token: taoToken('BARISTA') });
    expect(res.status).toBe(200);
  });

  test('?token cua Chu quan thi vao duoc (toan quyen)', async () => {
    const res = await request(app).get('/api/kds/stream').query({ token: taoToken('CHU_QUAN') });
    expect(res.status).toBe(200);
  });

  test('?token cua vai tro khac thi 403', async () => {
    const res = await request(app).get('/api/kds/stream').query({ token: taoToken('THU_NGAN') });
    expect(res.status).toBe(403);
  });

  test('?token sai thi 401', async () => {
    const res = await request(app).get('/api/kds/stream').query({ token: 'abc.def.ghi' });
    expect(res.status).toBe(401);
  });

  test('token tren query khong mo duoc route khac', async () => {
    // chi /kds/stream moi doc token tu query
    const res = await request(app).get('/api/inventory').query({ token: taoToken('BARISTA') });
    expect(res.status).toBe(401);
  });
});

test('health khong can token', async () => {
  const res = await request(app).get('/api/health');
  expect(res.status).toBe(200);
});
