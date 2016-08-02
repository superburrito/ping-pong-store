'use strict';
var models = require("../../db/models");
var Product = models.Product;
var User = models.User;
var Review = models.Review;
var router = require('express').Router();
var Order = models.Order;
var Orderproduct = models.Orderproduct;
var Promise = require('bluebird');


router.get('/', function(req, res, next){
    if(!req.user.isAdmin) {
        Order.findAll({
            where:{
                userId: req.user.id
            }
        })
        .then(function(orders){
            return findOrderProduct(orders);
        })
        .then(function(orders){
            return res.json(placeAllProduct(orders));
        })

    }
    else{
        return Order.findAll({
            where: req.query
        })
        .then(function(orders){
            return findOrderProduct(orders);
        })
        .then(function(orders){
            return res.json(placeAllProduct(orders));
        })
    }
});

function findOrderProduct(orders){
    return Promise.all(orders.map(function(order){
        return Orderproduct.findAll({
            where: {
                orderId: order.id
            }
        })
        .then(function(orderProducts){
            return Promise.all(orderProducts.map(function(orderProduct){
                return Product.findById(orderProduct.productId)
                .then(function(product){
                    orderProduct.product = product;
                    return orderProduct;
                })
            }))
        })
    }))
}

function placeAllProduct(orders){
    var allOrders=[];
    for(var i=0; i<orders.length; i++){
        var order = [];
        for(var j=0; j<orders[i].length; j++){
            var obj={};
            obj.orderDetail = orders[i][j].dataValues;
            obj.productDetail = orders[i][j].product;
            order.push(obj)
        }
        allOrders.push(order);
    }
    return allOrders;
}

/*router.post('/', function(req, res, next){
    if(!req.user.isAdmin) res.sendStatus(403);
    return Order.create(req.body)
    .then(function(createdOrder){
        return res.json(createdOrder);
    });
});*/

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

/*router.put('/:orderId', function(req, res, next){
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
*/

module.exports = router;
