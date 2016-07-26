'use strict';
var models = require("../../db/models");
var Product = models.Product;
var User = models.User;
var Review = models.Review;
var Order = models.Order;
var router = require('express').Router();

router.get('/', function(req,res,next){ 
	var userId = req.session.user.id;
	return User.findOne({
		where: {
			id: userId
		}
	})
	.then(function(user){
		if(user.isAdmin){
			return User.findAll({})
			.then(function(users){
				return res.json(users);
			});
		}else{
			return res.status(403).send();
		}
	});
});


router.get('/:userId', function(req,res,next){
	var userId = req.params.userId;
	User.findOne({
		where: {
			id: userId
		}
	})
	.then(function(user){
		return res.json(user);
	})
	.catch(next);
});


router.post('/:userId/settings', function(req,res,next){
	var userId = req.session.user.id;
	return User.findOne({
		where: {
			id: userId
		}
	})
	.then(function(user){
		return user.update(req.body);
	})
	.catch(next);
});

router.get('/:userId/orders', function(req,res,next){
	var userId = req.session.user.id;
	return Order.findAll({
		where: {
			userId: userId
		}
	})
	.then(function(orders){
		return res.json(orders);
	})
	.catch(next);
});

router.get('/:userId/reviews', function(req,res,next){
	var userId = req.session.user.id;
	return Review.findAll({
		where: {
			userId: userId
		}
	})
	.then(function(reviews){
		return res.json(reviews);
	})
	.catch(next);
});






module.exports = router;

