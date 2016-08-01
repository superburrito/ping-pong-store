app.factory('Cart', function ($state, $http, Product) {
    var CartFactory = {}
    //cart = {productKey1: quantity1, productKey2: quantity2... }

    CartFactory.add = function (productId, quantity) {
        var check = confirm('Click OK button to add this item to your cart');
        if(check){
          let number = Number(localStorage.getItem(productId)) + Number(quantity) || Number(quantity);
          localStorage.setItem(productId, number);
        }
    }

    CartFactory.remove = function (productId) {
        localStorage.removeItem(productId);
    }

    CartFactory.empty = function () {
        localStorage.clear();
    }
    
    CartFactory.get = function () {
        if(localStorage[length]) delete localStorage('length'); 
        return localStorage;
    }

    CartFactory.checkout = function (address, cartIds) {
      $state.go('home');
      return $http.post('/api/orders/checkout/' + address, cartIds);
    }

    CartFactory.checkoutAddress = function (){
      return $http.get('api/account')
      .then(function(response){
        return response.data
      })
      .then(function(user){
        if(!user) return '';
        return user.address
      })
    }

    CartFactory.updateQuantity = function(productId,quantity){
      localStorage.setItem(productId,quantity);
    }

    return CartFactory;
});
