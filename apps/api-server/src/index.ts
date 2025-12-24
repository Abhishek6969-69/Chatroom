import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import roomRoutes from './routes/room.js';

const app = express();

// Enable CORS for the frontend (adjust origin as needed)
app.use(cors());

app.use(express.json());
app.use('/auth', authRoutes);
app.use('/rooms', roomRoutes);

app.get('/', async (req, res) => {
    res.send('Hello World');
});

app.get('/health', async (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT_API ? Number(process.env.PORT_API) : 4000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});