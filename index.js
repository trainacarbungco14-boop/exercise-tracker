const express = require('express');
const app = express();
const cors = require('cors');
const mongoose = require('mongoose');
const dns = require('dns');
const User = require('./models/user');

require('dotenv').config();

dns.setServers(['1.1.1.1']);

app.use(cors());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
  });

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});

app.post('/api/users', async (req, res) => {
  try {
    const username = req.body.username;

    const newUser = new User({
      username: username
    });

    const savedUser = await newUser.save();

    res.json({
      username: savedUser.username,
      _id: savedUser._id
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, 'username');

    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users/:_id/exercises', async (req, res) => {
  try {
    const user = await User.findById(req.params._id);

    if (!user) {
      return res.json({ error: 'User not found' });
    }

    const exercise = {
      description: req.body.description,
      duration: Number(req.body.duration),
      date: req.body.date ? new Date(req.body.date) : new Date()
    };

    user.exercises.push(exercise);

    await user.save();

    const savedExercise = user.exercises[user.exercises.length - 1];

    res.json({
      _id: user._id,
      username: user.username,
      date: savedExercise.date.toDateString(),
      duration: savedExercise.duration,
      description: savedExercise.description
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    const user = await User.findById(req.params._id);

    if (!user) {
      return res.json({ error: 'User not found' });
    }

    let exercises = user.exercises;

    // Filter by "from" date
    if (req.query.from) {
      const fromDate = new Date(req.query.from);
      exercises = exercises.filter(exercise => exercise.date >= fromDate);
    }

    // Filter by "to" date
    if (req.query.to) {
      const toDate = new Date(req.query.to);
      toDate.setDate(toDate.getDate() + 1);

      exercises = exercises.filter(exercise => exercise.date < toDate);
    }

    // Limit number of results
    if (req.query.limit) {
      exercises = exercises.slice(0, Number(req.query.limit));
    }

    const log = exercises.map(exercise => ({
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString()
    }));

    res.json({
      username: user.username,
      count: log.length,
      _id: user._id,
      log: log
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});