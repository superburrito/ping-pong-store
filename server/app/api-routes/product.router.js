'use strict';
var models = require("../../db/models");
var Product = models.Product;
var User = models.User;
var Review = models.Review;
var router = require('express').Router();
var http = require('http');

// router.use('/', function(req, res, next){
//     if(!req.user){
//         User.create({
//             firstName: 'Guest',
//             lastName: 'Guester',
//             email: 'guest@kingpong.com',
//             password: 'guestp@ss',
//             address: '5 Hanover Square, NY, NY 10004'
//         })
//         .then(function(createdUser){
//             console.log('createdUser!!!!!!!!!!!!!!!!!', createdUser);
//             var req = http.request({
//                 method: 'POST',
//                 path: '/login'
//             })
//             req.write({
//                 email: createdUser.email,
//                 password: createdUser.password
//             })
//             req.end()
//             next();
//         })
//         .catch(next)
//     }
// });

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
        //get the average rating for specific product
        return product.getReviews()
        .then(function(reviews){
            var average = 0;
            reviews.forEach(function(review){
                average+=review.score;
            })
            average/=reviews.length;
            product.rating = average;
        })
        .then(function(){
            return res.json(product);
        })
        
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
    return Product.findOne({
        where: {
            id: req.params.productId
        }
    })
    .then(function(product){
        return product.getOrders();
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
    return Product.findOne({
        where: {
            id: req.params.productId
        }
    })
    .then(function(product){
        return product.getOrders();
    })
    .then(function(orders){
        return orders.filter( function(order) {
            order.status === 0;
        });
    })
    .then(function(filteredOrders){
        return res.json(filteredOrders);
    })
    .catch(next);
});


module.exports = router;

