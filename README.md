# Lan May Cafe - Nhom 5

He thong quan ly quan cafe, kien truc 3 tang, Node.js + Express + MySQL 8.

## Cai dat

Yeu cau: Node.js >= 18, MySQL 8.

```bash
npm install
cp .env.example .env   # sua DB_USER, DB_PASSWORD cho khop may
npm run dev            # http://localhost:3000
npm test
```

CSDL: dung script cua An (Windows PowerShell), doc cau hinh tu `.env.example`:

```powershell
powershell -ExecutionPolicy Bypass -File docs\setup_db.ps1   # tao CSDL + du lieu mau (khong xoa neu da co)
powershell -ExecutionPolicy Bypass -File docseset_db.ps1   # xoa va nap lai tu dau (truoc moi dot test)
```

Hoac chay thu cong: `docs/db/schema.sql` roi `docs/db/seed.sql` (nho dung `--default-character-set=utf8mb4`).

## Tai khoan test

Du lieu mau trong `docs/db/seed.sql`. Mat khau chung: `123456` (luu dang bcrypt).

| Tai khoan | Vai tro (`vaiTro`) | Trang sau dang nhap | Dung de test |
|---|---|---|---|
| `phucvu01` | `PHUC_VU` | `/tables.html` | Goi mon, cap nhat order (UC01, UC04) |
| `barista01` | `BARISTA` | `/kitchen.html` | Man bep, trang thai che bien, kho (UC15, UC16, UC18) |
| `thungan01` | `THU_NGAN` | `/pos.html` | Hoa don, thanh toan (UC08, UC10) |
| `chutquan01` | `CHU_QUAN` | `/dashboard.html` | Trang tong quan |
| `blocked01` | `PHUC_VU` (bi khoa) | khong dang nhap duoc | Test khoa tai khoan (UC21) |

Sai mat khau 5 lan lien tiep thi tai khoan bi khoa; chay `reset_db.ps1` de mo lai.

### Dang nhap khi goi API truc tiep (Postman, curl)

Cac API (tru `/api/health` va `/api/auth/login`) can token. Lay token roi gui kem moi request:

```bash
curl -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json"   -d '{"username":"thungan01","password":"123456"}'
# -> data.token

curl http://localhost:3000/api/orders/dh-001/invoice -H "Authorization: Bearer <token>"
```

Token het han sau 12 gio. Sai vai tro tra `403 KHONG_CO_QUYEN`, thieu token tra `401 CHUA_DANG_NHAP`.
Moi route chi cho dung vai tro, xem cot "Vai tro" trong `docs/api-contract.md`.

Don mau de thu: `dh-001` (ban B03, dang phuc vu, tong 85.000d), `dh-003` (da thanh toan). Mon `Bac xiu` dang `TAM_HET`.

## Cau truc va tang

| Thu muc | Tang |
|---|---|
| `src/public` | Giao dien (presentation) |
| `src/routes`, `src/controllers`, `src/middlewares` | Dieu phoi / API |
| `src/services`, `src/dto` | Nghiep vu (business) |
| `src/repositories`, `src/models`, `src/config/db.js` | Du lieu (data) |
| `docs` | Tai lieu, API contract, SQL |
| `tests` | Test |

## Quy uoc

- Response: `{ success, data, maLoi, message }`.
- Nhanh: `main` (chi Tuan merge), `develop`, moi UC 1 nhanh `feature/uc01-tao-order`; vao `develop` qua Pull Request.
- Commit: `feat(order): kiem tra mon het truoc khi luu #UC-01`.
- Danh so UC theo UC diagram cuoi (UC01-UC25).
