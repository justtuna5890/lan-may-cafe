jest.mock('../src/services/OrderService');
jest.mock('../src/services/PaymentService');
jest.mock('../src/services/KitchenService');
jest.mock('../src/services/KhoHangService');
// SSE khong tu dong ket thuc, nen gia lap: tra 200 va dong ngay
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

const token = (vaiTro) => 'Bearer ' + jwt.sign({ nhanVienId: 'nv-test', hoTen: 'Test', vaiTro }, config.jwt.secret);

// [method, duong dan, cac vai tro duoc phep] - theo api-contract.md muc 2
const ROUTES = [
  // Chủ quán (CHU_QUAN) có toàn quyền: được phép ở mọi route
  ['get', '/api/tables', ['PHUC_VU', 'THU_NGAN', 'CHU_QUAN']],
  ['get', '/api/menu', ['PHUC_VU', 'CHU_QUAN']],
  ['get', '/api/orders/dh-001', ['PHUC_VU', 'THU_NGAN', 'CHU_QUAN']],
  ['post', '/api/orders', ['PHUC_VU', 'CHU_QUAN']],
  ['post', '/api/orders/dh-001/items', ['PHUC_VU', 'CHU_QUAN']],
  ['patch', '/api/orders/dh-001/items/ct-001', ['PHUC_VU', 'CHU_QUAN']],
  ['delete', '/api/orders/dh-001/items/ct-001', ['PHUC_VU', 'CHU_QUAN']],
  ['get', '/api/tables/ban-01/current-order', ['PHUC_VU', 'THU_NGAN', 'CHU_QUAN']],
  ['get', '/api/orders/dh-001/invoice', ['THU_NGAN', 'CHU_QUAN']],
  ['post', '/api/payments', ['THU_NGAN', 'CHU_QUAN']],
  ['get', '/api/kitchen/items', ['BARISTA', 'CHU_QUAN']],
  ['patch', '/api/kitchen/items/ct-001/status', ['BARISTA', 'CHU_QUAN']],
  ['post', '/api/kitchen/items/ct-001/undo', ['BARISTA', 'CHU_QUAN']],
  ['get', '/api/inventory', ['BARISTA', 'CHU_QUAN']],
  ['get', '/api/inventory/kho-01', ['BARISTA', 'CHU_QUAN']],
  ['patch', '/api/inventory/kho-01/out-of-stock', ['BARISTA', 'CHU_QUAN']],
  ['post', '/api/inventory/kho-01/restock', ['BARISTA', 'CHU_QUAN']],
  ['post', '/api/inventory/kho-01/issue', ['BARISTA', 'CHU_QUAN']],
  ['get', '/api/kds/stream', ['BARISTA', 'CHU_QUAN']],
];
const TAT_CA = ['PHUC_VU', 'BARISTA', 'THU_NGAN', 'CHU_QUAN'];

beforeEach(() => {
  jest.resetAllMocks();
  for (const fn of Object.values(OrderService)) if (jest.isMockFunction(fn)) fn.mockResolvedValue({});
  for (const fn of Object.values(PaymentService)) if (jest.isMockFunction(fn)) fn.mockResolvedValue({});
  for (const fn of Object.values(KitchenService)) if (jest.isMockFunction(fn)) fn.mockResolvedValue({});
  for (const fn of Object.values(KhoHangService)) if (jest.isMockFunction(fn)) fn.mockResolvedValue({});
});

describe.each(ROUTES)('phan quyen %s %s', (method, url, duocPhep) => {
  test('khong co token -> 401 CHUA_DANG_NHAP', async () => {
    const res = await request(app)[method](url).send({});
    expect(res.status).toBe(401);
    expect(res.body.maLoi).toBe('CHUA_DANG_NHAP');
  });

  test('token sai -> 401', async () => {
    const res = await request(app)[method](url).set('Authorization', 'Bearer abc.def.ghi').send({});
    expect(res.status).toBe(401);
  });

  test.each(TAT_CA)('vai tro %s', async (vaiTro) => {
    const res = await request(app)[method](url).set('Authorization', token(vaiTro)).send({});
    if (duocPhep.includes(vaiTro)) {
      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);
    } else {
      expect(res.status).toBe(403);
      expect(res.body.maLoi).toBe('KHONG_CO_QUYEN');
    }
  });
});

describe('/kds/stream nhan token qua query (EventSource khong gui duoc header)', () => {
  test('?token hop le cua BARISTA -> vao duoc', async () => {
    const res = await request(app).get('/api/kds/stream').query({ token: token('BARISTA').slice(7) });
    expect(res.status).toBe(200);
  });
  test('?token cua vai tro khac -> 403', async () => {
    const res = await request(app).get('/api/kds/stream').query({ token: token('THU_NGAN').slice(7) });
    expect(res.status).toBe(403);
  });
  test('?token sai -> 401', async () => {
    const res = await request(app).get('/api/kds/stream').query({ token: 'abc.def.ghi' });
    expect(res.status).toBe(401);
  });
  test('token trong query khong mo duoc route khac', async () => {
    const res = await request(app).get('/api/inventory').query({ token: token('BARISTA').slice(7) });
    expect(res.status).toBe(401); // chi /kds/stream moi doc token tu query
  });
});

test('health va dang nhap khong can token', async () => {
  expect((await request(app).get('/api/health')).status).toBe(200);
});
