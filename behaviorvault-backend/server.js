const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const behaviorRoutes = require('./routes/behavior');
const duressRoutes = require('./routes/duress');
const consentRoutes = require('./routes/consent');
const mlRouter = require('./routes/ml');

const app = express();

// middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// routes
app.use('/api/behavior', behaviorRoutes);
app.use('/api/duress', duressRoutes);
app.use('/api/consent', consentRoutes);
app.use('/api/ml', mlRouter);

// health check
app.get('/', (req, res) => {
  res.json({
    status: 'BehaviorVault Backend Running',
    version: '2.0',
    timestamp: new Date().toISOString()
  });
});

// connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected successfully');
    app.listen(process.env.PORT, () => {
      console.log(`Server running on port ${process.env.PORT}`);
    });
  })
  .catch(err => {
    console.log('MongoDB connection error:', err);
  });