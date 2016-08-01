'use strict';
var router = require('express').Router();
var stripe = require('stripe');
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

router.post('/charge', function(req, res, next){
    let stripeToken = req.body.stripeToken;
    let orderId = req.body.orderId;
    let charge = {
          amount: parseInt(req.body.chargeAmount),
          currency: 'USD',
          card: stripeToken
    };

    stripe.charges.create(charge, function(err, charge) {
        if(err) {
            return next(err);
        } else {
            req.flash('message', {
                status: 'success',
                value: 'Thank you for shopping at King Pong! Your order will be placed shortly.'
            });
            res.redirect('/home');
        }
    });
});

// router.use('/carts', function(req, res, next){
//     if(!req.user.isAdmin) res.sendStatus(403);
//     return Order.findAll({
//         where: {
//             status: 0
//         }
//     })
//     .then(function(carts){
//         return res.json(carts);
//     })
//     .catch(next);
// })

// router.use('/cart', function(req, res, next){
//     res.redirect('/api/users/' + req.user.id + '/cart');
// })

// Make sure this is after all of
// the registered routes!
router.use(function (req, res) {
  res.status(404).end();
});
