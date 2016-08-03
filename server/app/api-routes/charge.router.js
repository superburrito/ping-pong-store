'use strict';
var models = require("../../db/models");
var Product = models.Product;
var User = models.User;
var Review = models.Review;
var router = require('express').Router();
var Order = models.Order;
var Orderproduct = models.Orderproduct;
var Promise = require('bluebird');
var stripe = require('stripe')('sk_test_ENKlD4f9aXhlZgQ7K8nvXRCA');

router.post('/', function(req, res, next){
    let chargePromise = User.findOne({
        where: {
            id: req.user.id
        }
    })
    .then(function(user){
        console.log('user', user);
        if(!user) return null;
        if(!user.customerId) {
            return stripe.customers.create({
                source: req.body.token.id,
                description: req.user.id || 'guest'
            })
            .then(function(customer) {
                return user.update({
                    customerId: customer.id
                })
            })
            .then(function(updatedUser){
                console.log("new customer id is:", user.customerId)
                return updatedUser.customerId;
            })
        }
        else{
            console.log("old customer id is:", user.customerId)
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
        if(!customerId) {
            return stripe.charges.create({
                amount: req.body.chargeAmount * 100,
                currency: 'USD',
                source: req.body.token.id
            })
        }
        else{
            return stripe.charges.create({
                amount: req.body.chargeAmount * 100,
                currency: 'USD',
                customer: customerId,
                //source: req.body.token.id
            })
        }
    },
    function(err, charge) {
        if (err) {
            return next(err);
        } else {
            let messageObj = {
                status: 'success',
                value: 'Thank you for shopping at King Pong! Your order will be placed shortly.'
            };
            console.log(messageObj.value);
            return res.status(200);
        }
    })
    .catch(next);
})

module.exports = router;
