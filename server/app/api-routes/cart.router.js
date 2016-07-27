'use strict';
var models = require("../../db/models");
var Product = models.Product;
var Order = models.Order;
var router = require('express').Router();

router.get('/', function(req,res,next){
	return Order.findOne({
		where: {
			sessionId: req.session.id
		}
	})
	.then(function(cart){
		return res.json(cart);
	})
	.catch(next);
});

router.post('/', function(req, res, next){
    return Order.findOrCreate({
        where: {
            sessionId: req.session.id
        }
    })
    .then(function(cart){
        return res.json(cart);
    })
    .catch(next);
});

router.put('/', function(req, res, next){
    return Order.findOne({
        where: {
            sessionId: req.session.id
        }
    })
    .then(function(cart){
        return cart.update(req.body);
    })
    .then(function(updatedCart){
        return res.json(updatedCart);
    })
    .catch(next);
});

router.delete('/', function(req, res, next){
    return Order.findOne({
        where: {
            sessionId: req.session.id
        }
    })
    .then(function(cart){
        cart.destroy();
        return cart;
    })
    .then(function(deletedCart){
        return res.json(deletedCart);
    })
    .catch(next);
});


module.exports = router;

