app.factory('Cart', function () {

    let cart = window.localstorage.cart;
    //cart = {productKey1: quantity1, productKey2: quantity2... }

    return {
        add: function (productId, quantity) {
            cart[productId] = quantity;
        },
        remove: function (productId) {
            delete cart[productId];
        },
        empty: function () {
            cart = {};
        },
        get: function () {
            return cart;
        }
    };
});