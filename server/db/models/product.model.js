'use strict';
//var _ = require('lodash');
var Sequelize = require('sequelize');

var db = require('../_db');

var Reviews = require('./review.model')

module.exports = db.define('product', {
    price: {
        type: Sequelize.INTEGER,
        validate: {
            isNumeric: true
        },
        allowNull: false
    },
    name: {
        type: Sequelize.STRING,
        allowNull: false

    },
    category: {
        type: Sequelize.STRING,
        validate: {
            isIn: [['paddles','balls','cases',
                    'tables','robots', '']]
        }
    },
    // Applies to shoes only
    size: {
        type: Sequelize.INTEGER,
        defaultValue: null
    },
    // Applies to ping-pong ball
    quality: {
        type: Sequelize.INTEGER,
        defaultValue: null
    },
    brand: {
        type: Sequelize.STRING
    },
    inventory: {
        type: Sequelize.INTEGER,
        allowNull: false
    }, 
    description: {
        type: Sequelize.TEXT
    },
    imageUrl: {
        type: Sequelize.TEXT,
        validate: {
            isUrl: true
        },
        defaultValue: "http://www.daaddelhi.org/imperia/md/content/newdelhi/b_no_image_icon.gif"
    },
    rating: {
        type: Sequelize.FLOAT
    }
}, {
    instanceMethods: {

        setRating : function(rating){
            this.rating = rating;
        }

        // calculateRating: function () {
        //     return Reviews.findAll({
        //         where:{
        //             productId: this.id
        //         }
        //     }).then(function(reviews){
        //         var average =0;
        //         reviews.forEach(function(review){
        //             average+=review.score;
        //         })
        //         average/=reviews.length;
          
        //         return average;
        //     })
        // }
            // return this.getReviews()
            // .then(function(reviews){
            //     console.log("Calculate rating gets reviews:", reviews);
            //     var average =0;
            //     reviews.forEach(function(review){

            //         average+=review.score;
            //     })
            //     average/=reviews.length;
          
            //     return average;
            // });
            
        //}
    }
});
