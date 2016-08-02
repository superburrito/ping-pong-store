app.factory('Checkout', function ($state, $http) {
    var CheckoutFactory = {};

    //...
    CheckoutFactory.findAddress = function (){
      return $http.get('api/account')
      .then(function(response){
        return response.data
      })
      .then(function(user){
        if(!user) return '';
        return user.address
      })
    }

    CheckoutFactory.confirm = function (params) {
      $state.go('home');
      console.log(params);
      return $http.post('/api/charge/', params);
    }

    CheckoutFactory.cancel = function() {
        $state.go('cart');
    }

    return CheckoutFactory;
});
