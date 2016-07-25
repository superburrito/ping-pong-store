'use strict';
var router = require('express').Router();
module.exports = router;

router.use('/products', require('./product.model.js'));
router.use('/users', require('./user.model.js'));
router.use('/cart', require('./user.model.js'));


// Make sure this is after all of
// the registered routes!
router.use(function (req, res) {
  res.status(404).end();
});
