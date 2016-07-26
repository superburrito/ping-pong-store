'use strict';
var router = require('express').Router();
module.exports = router;

router.use('/products', require('./product.router.js'));
router.use('/users', require('./user.router.js'));
router.use('/cart', require('./user.router.js'));


// Make sure this is after all of
// the registered routes!
router.use(function (req, res) {
  res.status(404).end();
});
