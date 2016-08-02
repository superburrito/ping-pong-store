'use strict';
var models = require("../../db/models");
var Product = models.Product;
var User = models.User;
var Review = models.Review;
var router = require('express').Router();
var Order = models.Order;
var Orderproduct = models.Orderproduct;
var Promise = require('bluebird');
var stripe = require('stripe');

router.post('/charge', function(req, res, next){
    let chargePromise = User.findOne({
        where: {
            id: req.user.id,
            customerId: {
                $ne: null
            }
        }
    })
    .then(function(user){
        if(!user) {
            return stripe.card.createToken({
                number: req.body.ccNumber,
                cvc: req.body.cvc,
                exp_month: req.body.expMonth,
                exp_year: req.body.expYear
            })
            .then(function(token){
                return stripe.customers.create({
                    source: token,
                    description: req.user.id || 'guest'
                })
            })
            .then(function(customer) {
                return user.update({
                    customerId: customer.id
                })
            })
            .then(function(updatedUser){
                return updatedUser.customerId;
            })
        }
        else{
            return user.customerId;
        }
    })


    let orderProm = Order.create({
        status: 0,
        address: req.body.address
    });

    let userProm = User.findOne({
        where: {
            id: req.user.id
        }
    });

    let createOrderPromise = Promise.all([orderProm, userProm])
    .spread(function(order,user){
        if (user){
            return order.setUser(user);
        }else{
            return order;
        }
        //console.log("passed order is: ", order);
    })
    .then(function(order){
        //console.log("Created order is: ", order);
        //console.log("Cart ids array is:", req.body);
        return Promise.each(req.body.cartIds, function(productId){
            return Orderproduct.findOrCreate({
                where: {
                    orderId: order.id,
                    productId: productId
                },
                defaults: {
                    orderId: order.id,
                    quantity: 0,
                    productId: productId
                }
            })
            .then(function(foundOrCreated){
                //findOrCreate returns an array, so
                var orderProduct = foundOrCreated[0];
                orderProduct.increment('quantity');
                console.log("ORDER CREATED");
            })
        });
    })

    return Promise.all([chargePromise, createOrderPromise])
    .spread(function(customerId, orderProducts){
        return stripe.charges.create({
            amount: req.body.chargeAmount,
            currency: 'USD',
            customer: customerId
        },
        function(err, charge) {
            if (err) {
                return next(err);
            } else {
                req.flash('message', {
                    status: 'success',
                    value: 'Thank you for shopping at King Pong! Your order will be placed shortly.'
                });
                return res.sendStatus(200);
            }
        })
    });
})

module.exports = router;
