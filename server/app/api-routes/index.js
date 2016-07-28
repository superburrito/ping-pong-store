'use strict';
var router = require('express').Router();
module.exports = router;

var models = require("../../db/models");
var Product = models.Product;
var User = models.User;
var Review = models.Review;
var Order = models.Order;

router.use('/products', require('./product.router.js'));
router.use('/users', require('./user.router.js'));
router.use('/reviews', require('./review.router.js'));
router.use('/orders', require('./order.router.js'));

router.use('/account', function(req, res, next){
    res.redirect('/api/users/' + req.user.id);
})

router.use('/carts', function(req, res, next){
    if(!req.user.isAdmin) res.sendStatus(403);
    return Order.findAll({
        where: {
            status: 0
        }
    })
    .then(function(carts){
        return res.json(carts);
    })
    .catch(next);
})

router.use('/cart', function(req, res, next){
    res.redirect('/api/users/' + req.user.id + '/cart');
})

// Make sure this is after all of
// the registered routes!
router.use(function (req, res) {
  res.status(404).end();
});
