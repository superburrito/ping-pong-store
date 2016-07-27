'use strict';
var models = require("../../db/models");
var Product = models.Product;
var User = models.User;
var Review = models.Review;
var router = require('express').Router();
var Order = models.Order;


router.get('/', function(req, res, next){
    if(!req.user.isAdmin) res.sendStatus(403);
    return Order.findAll({
        where: req.query
    })
    .then(function(orders){
        return res.json(orders);
    });
});

router.post('/', function(req, res, next){
    if(!req.user.isAdmin) res.sendStatus(403);
    return Order.create(req.body)
    .then(function(createdOrder){
        return res.json(createdOrder);
    });
});

router.get('/:orderId', function(req, res, next){
    Order.findOne({
        where: {
            id: req.params.orderId
        }
    })
    .then(function(order){
        return res.json(order);
    })
    .catch(next);
});

router.put('/:orderId', function(req, res, next){
    if(!req.user.isAdmin) res.sendStatus(403);
    Order.findOne({
        where: {
            id: req.params.orderId
        }
    })
    .then(function(order){
        return order.update(req.body);
    })
    .then(function(updatedOrder){
        return res.json(updatedOrder);
    })
    .catch(next);
});

router.delete('/:orderId', function(req, res, next){
    if(!req.user.isAdmin) res.sendStatus(403);
    Order.findOne({
        where: {
            id: req.params.orderId
        }
    })
    .then(function(order){
        return order.destroy(req.body);
    })
    .then(function(deletedOrder){
        return res.json(deletedOrder);
    })
    .catch(next);
});


module.exports = router;
