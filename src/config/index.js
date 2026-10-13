require('dotenv').config(); // nạp file .env (nếu có) vào process.env

const env = process.env;

// Đọc một biến môi trường dạng số; thiếu hoặc không phải số thì dùng giá trị mặc định
const soTuEnv = (ten, macDinh) => Number(env[ten]) || macDinh;

module.exports = {
  port: soTuEnv('PORT', 3000),
  env: env.NODE_ENV || 'development',
  db: {
    host: env.DB_HOST || 'localhost',
    port: soTuEnv('DB_PORT', 3306),
    user: env.DB_USER || 'root',
    password: env.DB_PASSWORD || '123456',
    database: env.DB_NAME || 'lan_may_cafe',
    charset: 'utf8mb4',
  },
  kdsTimeoutMs: soTuEnv('KDS_TIMEOUT_MS', 5000),
  // UC21: khóa ký token đăng nhập (JWT). Máy thật phải đặt JWT_SECRET trong .env
  jwt: {
    secret: env.JWT_SECRET || 'lan-may-dev-secret',
    expiresIn: env.JWT_EXPIRES_IN || '12h',
  },
};
