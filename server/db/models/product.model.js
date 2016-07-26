'use strict';
//var _ = require('lodash');
var Sequelize = require('sequelize');

var db = require('../_db');

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
                    'shoes','tables','robots', '']]
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
    }
}, {
    getterMethods: {
        rating: function () {
        }
    }
});
