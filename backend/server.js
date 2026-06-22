require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;
const FORECAST_URL = process.env.FORECAST_URL || 'http://localhost:8000';

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

app.get('/health', (req, res) => {
res.json({ status: 'ok', service: 'gridlock-backend' });
});

app.post('/api/forecast', async (req, res) => {
try {
const response = await axios.post(`${FORECAST_URL}/forecast`, req.body);
res.json(response.data);
} catch (err) {
res.status(502).json({ error: 'Forecasting service unavailable', detail: err.message });
}
});

app.listen(PORT, () => {
console.log(`Backend running on port ${PORT}`);
});