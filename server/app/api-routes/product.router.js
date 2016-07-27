'use strict';
var models = require("../../db/models");
var Product = models.Product;
var User = models.User;
var Review = models.Review;
var router = require('express').Router();

router.get('/', function(req,res,next){
	return Product.findAll({
		where: req.query
	})
	.then(function(products){
		return res.json(products);
	})
	.catch(next);
});

router.post('/', function(req, res, next) {
    return Product.findOrCreate({
        where: req.body
    })
    .then(function(createdProduct) {
        return res.json(createdProduct);
    })
    .cath(next)
});


router.get('/:productId/reviews', function(req,res,next){
	return Review.findAll({
		where: {
			productId: req.params.productId
		}
	})
	.then(function(productReviews){
		return res.json(productReviews);
	})
	.catch(next);
});


router.get('/:productId', function(req,res,next){
	return Product.findOne({
		where: {
			id: req.params.productId
		}
	})
	.then(function(foundProduct){
		return res.json(foundProduct);
	})
	.catch(next);
});

router.put('/:productId', function(req,res,next){
    return Product.findOne({
        where: {
            id: req.params.productId
        }
    })
    .then(function(foundProduct){
        return foundProduct.update(req.body);
    })
    .then(function(updatedProduct){
        return res.json(updatedProduct);
    })
    .catch(next);
});

router.delete('/:productId', function(req,res,next){
    return Product.findOne({
        where: {
            id: req.params.productId
        }
    })
    .then(function(foundProduct){
        return foundProduct.destroy();
    })
    .then(function(deletedProduct){
        return res.json(deletedProduct);
    })
    .catch(next);
});



module.exports = router;

