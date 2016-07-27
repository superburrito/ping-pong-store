'use strict';
var models = require("../../db/models");
var Product = models.Product;
var User = models.User;
var Review = models.Review;
var router = require('express').Router();


router.get('/', function(req, res, next){
    return Product.findAll({
        where: req.query
    })
    .then(function(products){
        return res.json(products);
    });
});

router.post('/', function(req, res, next){
    if(!req.user.isAdmin) res.sendStatus(403);
    return Product.create(req.body)
    .then(function(createdProduct){
        return res.json(createdProduct);
    });
});

router.get('/:productId', function(req, res, next){
    Product.findOne({
        where: {
            id: req.params.productId
        }
    })
    .then(function(product){
        return res.json(product);
    })
    .catch(next);
});

router.put('/:productId', function(req, res, next){
    if(!req.user.isAdmin) res.sendStatus(403);
    Product.findOne({
        where: {
            id: req.params.productId
        }
    })
    .then(function(product){
        return product.update(req.body);
    })
    .then(function(updatedProduct){
        return res.json(updatedProduct);
    })
    .catch(next);
});

router.delete('/:productId', function(req, res, next){
    if(!req.user.isAdmin) res.sendStatus(403);
    Product.findOne({
        where: {
            id: req.params.productId
        }
    })
    .then(function(product){
        return product.destroy(req.body);
    })
    .then(function(deletedProduct){
        return res.json(deletedProduct);
    })
    .catch(next);
});

router.get('/:productId/orders', function(req, res, next){
    if(!req.user.isAdmin) res.sendStatus(403);
    return Order.findAll({
        where: {
            //fill this in later
        }
    })
    .then(function(orders){
        return res.json(orders);
    })
    .catch(next);
});

router.get('/:productId/reviews', function(req, res, next){
    return Review.findAll({
        where: {
            productId: req.params.productId
        }
    })
    .then(function(reviews){
        return res.json(reviews);
    })
    .catch(next);
});

router.get('/:productId/carts', function(req, res, next){
    if(!req.user.isAdmin) res.sendStatus(403);
    //res.redirect
});




module.exports = router;

