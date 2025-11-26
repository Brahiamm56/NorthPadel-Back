const express = require('express');

const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'Notifications route placeholder' });
});

module.exports = router;
