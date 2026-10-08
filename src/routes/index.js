const express = require('express');
const OrderController = require('../controllers/OrderController');
const PaymentController = require('../controllers/PaymentController');
const AuthController = require('../controllers/AuthController');
const { ok } = require('../utils/response');

const router = express.Router();

router.get('/health', (req, res) => ok(res, { status: 'up' }));

// UC21 (khong can token)
router.post('/auth/login', AuthController.dangNhap);

// UC01
router.post('/orders', OrderController.taoOrder);

// UC08, UC10
router.get('/orders/:id/invoice', PaymentController.layHoaDon);
router.post('/payments', PaymentController.thanhToan);

// TODO: UC04 PATCH /orders/:id/items, UC15/16/18 (bep)

module.exports = router;
