/*'use strict';
var models = require("../../../db/models");
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

module.exports = router;

*/