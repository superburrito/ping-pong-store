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
      $http.get('/api/account')
      .then(function(user){
        if(user) return CheckoutFactory.sendEmail(user.email)
      })
      .then(function(){
        $state.go('home');
        //console.log(params);
        return $http.post('/api/charge/', params);
      })
    }

    CheckoutFactory.cancel = function() {
        $state.go('cart');
    }


    CheckoutFactory.sendEmail = function(email){
      return $http.get('/api/orders/confirmation/'+email);
    }

    return CheckoutFactory;
});
