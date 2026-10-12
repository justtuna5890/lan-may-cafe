const path = require('path');
const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const { baoVeTrang } = require('./middlewares/trangTinh');
const { notFound, errorHandler } = require('./middlewares/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());
app.use(baoVeTrang);
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
