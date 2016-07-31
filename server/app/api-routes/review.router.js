'use strict';
var models = require("../../db/models");
var Product = models.Product;
var User = models.User;
var Review = models.Review;
var router = require('express').Router();


router.get('/', function(req, res, next){
    return Review.findAll({
        where: req.query
    })
    .then(function(reviews){
        return res.json(reviews);
    });
});

router.post('/', function(req, res, next){

    Review.find({
        where:{
            userId: req.body.userId,
            productId: req.body.productId          
        }
    })
    .then(function(review){
        if(review){
            return res.send(200, {'created':true})
        }else{
            Review.create({
                where:{
                    userId: req.body.userId,
                    productId: req.body.productId,
                    title: req.body.title,
                    score: req.body.score,
                    feedback: req.body.feedback               
                }
            })
            .then(function(){
                return res.send(200, {'created':false})
            })      
        }       
    })
    
});

router.get('/:reviewId', function(req, res, next){
    Review.findOne({
        where: {
            id: req.params.reviewId
        }
    })
    .then(function(review){
        return res.json(review);
    })
    .catch(next);
});

router.put('/:reviewId', function(req, res, next){
    Order.findOne({
        where: {
            id: req.params.reviewId
        }
    })
    .then(function(review){
        if(review.userId !== req.user.id || !req.user.isAdmin) res.sendStatus(403);
        return review.update(req.body);
    })
    .then(function(updatedReview){
        return res.json(updatedReview);
    })
    .catch(next);
});

router.delete('/:reviewId', function(req, res, next){
    Order.findOne({
        where: {
            id: req.params.reviewId
        }
    })
    .then(function(review){
        if(review.userId !== req.user.id || !req.user.isAdmin) res.sendStatus(403);
        return review.destroy();
    })
    .then(function(deletedReview){
        return res.json(deletedReview);
    })
    .catch(next);
});


module.exports = router;
