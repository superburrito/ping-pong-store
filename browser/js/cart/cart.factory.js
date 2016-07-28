app.factory('Cart', function (Product) {
    var CartFactory = {}
    //cart = {productKey1: quantity1, productKey2: quantity2... }

    CartFactory.add = function (productId, quantity) {
        let number = Number(localStorage.getItem(productId)) + Number(quantity) || Number(quantity);
        localStorage.setItem(productId, number);
    }

    CartFactory.remove = function (productId) {
        localStorage.removeItem(productId);
    }

    CartFactory.empty = function () {
        localStorage.clear();
    }
    
    CartFactory.get = function () {
        return localStorage;
    }

    return CartFactory;
});
