import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import boardRoutes from './routes/boards.js';
import labelRoutes from './routes/labels.js';
import userRoutes from './routes/users.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: function(origin, callback) {
    callback(null, true);
  },
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/boards', boardRoutes);
app.use('/api/labels', labelRoutes);
app.use('/api/users', userRoutes);

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
