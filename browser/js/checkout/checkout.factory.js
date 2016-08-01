app.factory('Checkout', function ($state, $http) {
    var CheckoutFactory = {};

    //...
    CheckoutFactory.defaultCheckoutAddress = function (){
      return $http.get('api/account')
      .then(function(response){
        return response.data
      })
      .then(function(user){
        if(!user) return '';
        return user.address
      })
    }

    CheckoutFactory.confirm = function (address, cartIds) {
      $state.go('home');
      return $http.post('/api/orders/checkout/' + address, cartIds);
    }

    CheckoutFactory.cancel = function() {
        $state.go('cart');
    }

    return CheckoutFactory;
});
