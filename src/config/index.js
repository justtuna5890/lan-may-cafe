require('dotenv').config();

module.exports = {
  port: Number(process.env.PORT) || 3000,
  env: process.env.NODE_ENV || 'development',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '123456',
    database: process.env.DB_NAME || 'lan_may_cafe',
    charset: 'utf8mb4',
  },
  kdsTimeoutMs: Number(process.env.KDS_TIMEOUT_MS) || 5000,
  // UC21: khoa ky token dang nhap (JWT). May that phai dat JWT_SECRET trong .env
  jwt: {
    secret: process.env.JWT_SECRET || 'lan-may-dev-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '12h',
  },
};
