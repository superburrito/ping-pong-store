var sinon = require('sinon');
var expect = require('chai').expect;

var Sequelize = require('sequelize');

var db = require('../../../server/db');

var Product = db.model('product');
var Review = db.model('review');
var User = db.model('user');

describe('Product model', function () {

    var newProduct;
    before('Sync DB', function () {
        return Product.create({
            price: 2000,
            name: "Nimbus 2000",
            category: "paddle",
            size: null,
            quality: null,
            brand: "Yonex",
            inventory: 100,
            description: "An amazing product by Yonex!",
            imageUrl: "http://bravethewoods.com/wp-content/uploads/2014/08/9__24903.1400189799.386.513.png"
        }).then(function(paddle){
            newProduct = paddle;
            return db.sync({ force: true });
        });
    })

    describe('Newly created paddle', function () {
        describe('price attribute', function () {
            it('should exist', function () {
                expect(newProduct.price).to.exist;
            })
        });
        describe('name attribute', function () {
            it('should exist', function () {
                expect(newProduct.name).to.exist;
            })
        });
        describe('category attribute', function () {
            it('should exist', function () {
                var categories = ["paddle", "ball", "case", 
                                  "shoe", "table", "robot"]
                expect(categories.indexOf(newProduct.category)).to.not.equal(-1);
            })
        });
        describe('brand attribute', function () {
            it('should exist', function () {
                expect(newProduct.brand).to.exist;
            })
        });
        describe('inventory attribute', function () {
            it('should exist', function () {
                expect(newProduct.brand).to.exist;
            })
        });
        describe('description attribute', function () {
            it('should exist', function () {
                expect(newProduct.brand).to.exist;
            })
        });
        describe('imageUrl attribute', function () {
            it('should exist', function () {
                expect(newProduct.imageUrl).to.exist;
            })
        });

    });
});
