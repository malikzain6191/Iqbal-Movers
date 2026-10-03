require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { notFound, errorHandler } = require('./middlewares/errorHandler');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const cityRoutes = require('./routes/cityRoutes');
const terminalRoutes = require('./routes/terminalRoutes');
const vehicleRoutes = require('./routes/vehicleRoutes');
const driverRoutes = require('./routes/driverRoutes');
const routeRoutes = require('./routes/routeRoutes');
const scheduleRoutes = require('./routes/scheduleRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const reportRoutes = require('./routes/reportRoutes');
const auditRoutes = require('./routes/auditRoutes');

const app = express();
const allowedOrigins = new Set(
	(process.env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
		.split(',')
		.map((origin) => origin.trim())
		.filter(Boolean)
);
app.use(cors({
	origin: (origin, callback) => callback(null, !origin || allowedOrigins.has(origin))
}));
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/cities', cityRoutes);
app.use('/api/v1/terminals', terminalRoutes);
app.use('/api/v1/vehicles', vehicleRoutes);
app.use('/api/v1/drivers', driverRoutes);
app.use('/api/v1/routes', routeRoutes);
app.use('/api/v1/schedules', scheduleRoutes);
app.use('/api/v1/bookings', bookingRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/audit-logs', auditRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Iqbal Travels TMS API running on port ${PORT}`));
