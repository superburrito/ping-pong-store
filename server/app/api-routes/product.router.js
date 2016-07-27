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
		return res.send(products);
	})
	.catch(next);
});

router.get('/:productId', function(req,res,next){
	var productId = req.params.productId;
	return Product.findOne({
		where: {
			id: productId
		}
	})
	.then(function(foundProduct){
		return res.send(foundProduct);
	})
	.catch(next);
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






module.exports = router;

