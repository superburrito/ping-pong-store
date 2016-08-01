'use strict';
var models = require("../../db/models");
var Product = models.Product;
var User = models.User;
var Review = models.Review;
var Order = models.Order;
var router = require('express').Router();

router.get('/', function(req, res, next){
    if(!req.user.isAdmin) return res.sendStatus(403);
	return User.findAll({
        where: req.query
    })
	.then(function(users){
		return res.json(users);
	});
});

router.post('/', function(req, res, next){
    // if(!req.user.isAdmin) return res.sendStatus(403);
    console.log("in post route backend: ", req.body)
    return User.create(req.body)
    .then(function(createdUser){
        console.log("check to see if we created user", createdUser)
        return res.json(createdUser);
    });
});


router.get('/:userId', function(req, res, next){
	if(!req.user.isAdmin && req.user.id != req.params.userId) return res.sendStatus(401);
	return User.findOne({
		where: {
			id: req.params.userId
		}
	})
	.then(function(user){
		return res.json(user);
	})
	.catch(next);
});

router.put('/:userId', function(req, res, next){
    if(!req.user.isAdmin && req.user.id != req.params.userId) return res.sendStatus(403);
    return User.findOne({
        where: {
            id: req.params.userId
        }
    })
    .then(function(user){
        return user.update(req.body);
    })
    .then(function(updatedUser){
        return res.json(updatedUser);
    })
    .catch(next);
});

router.delete('/:userId', function(req, res, next){
    if(!req.user.isAdmin && req.user.id != req.params.userId) res.sendStatus(403);
    return User.findOne({
        where: {
            id: req.params.userId
        }
    })
    .then(function(user){
        return user.destroy(req.body);
    })
    .then(function(deletedUser){
        return res.json(deletedUser);
    })
    .catch(next);
});

router.get('/:userId/orders', function(req, res, next){
    if(!req.user.isAdmin && req.user.id != req.params.userId) return res.sendStatus(403);
	return Order.findAll({
		where: {
			userId: req.params.userId
		}
	})
	.then(function(orders){
		return res.json(orders);
	})
	.catch(next);
});

router.get('/:userId/reviews', function(req, res, next){
	return Review.findAll({
		where: {
			userId: req.params.userId
		}
	})
	.then(function(reviews){
		return res.json(reviews);
	})
	.catch(next);
});

router.get('/:userId/cart', function(req, res, next){
    if(!req.user.isAdmin && req.user. id != req.params.userId) return res.sendStatus(403);
    return Order.findOne({
        where: {
            userId: req.params.userId,
            status: 0
        }
    })
    .then(function(cart){
        return res.json(cart);
    })
    .catch(next)
});

module.exports = router;

