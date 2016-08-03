'use strict';
var models = require("../../db/models");
var Product = models.Product;
var User = models.User;
var router = require('express').Router();
var Order = models.Order;
var Orderproduct = models.Orderproduct;
var nodemailer = require('nodemailer');
var Promise = require('bluebird');


router.get('/', function(req, res, next){
    var arr =[];
    if(!req.user.isAdmin) {
        Order.findAll({
            where:{
                userId: req.user.id
            }
        })
        .then(function(orders){
            arr = orders;
            return findOrderProduct(orders);
        })
        .then(function(orders){
            return res.json(placeAllProduct(orders,arr));
        })

    }
    else{
        return Order.findAll({
            where: req.query
        })
        .then(function(orders){
            arr = orders;
            return findOrderProduct(orders);
        })
<<<<<<< HEAD
        .then(function(orders){
            return res.json(placeAllProduct(orders));
=======
        .then(function(orders){           
            return res.json(placeAllProduct(orders,arr));
>>>>>>> master
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

function placeAllProduct(orders,arr){
    var allOrders=[];
    for(var i=0; i<orders.length; i++){
        var order = {};
        var products = [];
        order.orderDetail=arr[i];
        for(var j=0; j<orders[i].length; j++){
            var product = {};
            product.orderDetail = orders[i][j].dataValues;
            product.productDetail = orders[i][j].product;
            products.push(product);
        }
        order.products = products;
        allOrders.push(order);
    }
    return allOrders;
}

<<<<<<< HEAD
=======
router.get('/confirmation/:email', function(req,res,next){
    console.log('in router')
    var transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
            user: 'kingpong123321@gmail.com', // Your email id
            pass: 'kingpong123' // Your password
        }
    });
    var mailOptions = {
        from: '"KING KING 👥" <kingkong@kingpong.com>', // sender address
        to: req.params.email, // list of receivers
        subject: 'Comfirmation email', // Subject line
        text: 'You have order ', // plaintext body
        html: '<h1>You have made an order on KingPong.com</h1><br><button>confirm</button>' // html body
    };
    return transporter.sendMail(mailOptions, function(error, info){
        if(error){
            return console.log(error);
        }else{
            console.log('Message sent: ' + info.response);
            return res.json(info.response)
        }
        
    });
    
})

router.post('/checkout/:address', function(req,res,next){
    var orderProm = Order.create({
        status: 0,
        address: req.params.address
    });
    var userProm = User.findOne({
        where: {
            id: req.user.id
        }
    });
    Promise.all([orderProm, userProm])
    .spread(function(order,user){
        if (user){
            return order.setUser(user);
        }else{
            return order;
        }
        console.log("passed order is: ", order);
    })
    .then(function(order){
        console.log("Created order is: ", order);
        console.log("Cart ids array is:", req.body);
        Promise.each(req.body, function(productId){
            return Orderproduct.findOrCreate({
                where: {
                    orderId: order.id,
                    productId: productId
                },
                defaults: {
                    orderId: order.id,
                    quantity: 0,
                    productId: productId
                }
            })
            .then(function(foundOrCreated){
                //findOrCreate returns an array, so
                var orderProduct = foundOrCreated[0];
                orderProduct.increment('quantity');
            })
        });
    })
    .then(function(){
        res.sendStatus(200);
    })
})

>>>>>>> master
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
