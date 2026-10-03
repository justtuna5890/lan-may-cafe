const app = require('./app');
const config = require('./config');

app.listen(config.port, () => {
  console.log(`Lan May Cafe chay tai http://localhost:${config.port} (${config.env})`);
});
