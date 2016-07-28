app.factory('Cart', function () {

    //cart = {productKey1: quantity1, productKey2: quantity2... }

    return {
        add: function (productId, quantity) {
            let number = Number(localStorage.getItem(productId)) + Number(quantity) || Number(quantity);
            localStorage.setItem(productId, number);
        },
        remove: function (productId) {
            localStorage.removeItem(productId);
        },
        empty: function () {
            localStorage.clear();
        },
        get: function () {
            return localStorage;
        }
    };
});
