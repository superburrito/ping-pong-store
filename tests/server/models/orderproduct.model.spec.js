var sinon = require('sinon');
var expect = require('chai').expect;

var Sequelize = require('sequelize');
var Promise = require('bluebird');
var db = require('../../../server/db');

var Product = db.model('product');
var Order = db.model('order');
var Orderproduct = db.model('orderproduct');


describe('Orderproduct model', function () {

    var testPromise;
    beforeEach('Sync DB', function (done) {
        var productProm = Product.create({
            price: 2000,
            name: "Nimbus 2000",
            category: "paddle",
            size: null,
            quality: null,
            brand: "Yonex",
            inventory: 100,
            description: "An amazing product by Yonex!",
            imageUrl: "http://bravethewoods.com/wp-content/uploads/2014/08/9__24903.1400189799.386.513.png"
        });
        var orderProm = Order.create({
            status: 1,
            address: 'wall street'
        });
        var orderproductProm = Orderproduct.create({
            quantity: 2
        })
        testPromise = Promise.all([productProm,orderProm,orderproductProm])
        .spread(function(product,order,orderproduct){
            return orderproduct.setOrder(order).then(function(){
                return orderproduct.setProduct(product)
            }).then(function(){
                console.log(orderproduct);
                return [product,order,orderproduct];
            });
        })
        done();
    });

    describe('when the user makes an order', function () {
        it('the orderproducts should be associated to the correct order', function (done) {
            testPromise.spread(function(product,order,orderproduct){
                expect(orderproduct.quantity).to.be.equal(2);
                expect(orderproduct.orderId).to.be.equal(order.id);
                done();
            })
        });


        it('the orderproducts should be associated to the correct product', function (done) {
            testPromise.spread(function(product,order,orderproduct){
                expect(orderproduct.productId).to.be.equal(product.id);
                done();
            })
        });

    });


});
