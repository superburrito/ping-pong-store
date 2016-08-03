app.controller('CheckoutCtrl', function($scope, $stateParams, Checkout, Cart, $state){

    // Let checkoutaddress default to user's address

    console.log('$stateParams:', $stateParams);

    var handler = StripeCheckout.configure({
      key: 'pk_test_vtvTJVblPL4JVm04aqLxzndr',
      image: 'https://encrypted-tbn2.gstatic.com/images?q=tbn:ANd9GcQdRHcE2vqzA8YCMfhjJsnPpkPDyhVQyrjZIeHV8NHY6OnBzx711w7wIQ',
      locale: 'auto',
      token: function(token) {
        $scope.token = token;
      }
    });

    handler.open({
      name: 'King Pong',
      description: 'Where champions are made.',
      amount: $scope.chargeAmount
    });

// handler.close();

    $scope.defaultAddress = '';
    Checkout.findAddress()
    .then(function(userAddress){
        $scope.defaultAddress = userAddress;
        $scope.typedAddress = $scope.defaultAddress;
    });

    console.log($stateParams.cartItems);
    $scope.cartItems = $stateParams.cartItems;
    $scope.chargeAmount = $stateParams.chargeAmount;

    if(!$scope.cartItems.length) $state.go('cart');

    $scope.confirm = function () {
        // Converts cartItems (array of objs) into cartIds (array of Prod ids)
        var cartIds = [];
        $scope.cartItems.forEach(function(item){
            for(var i = 0; i < item.quantity; i++){
                cartIds.push(item.product.id);
            }
        });
        $scope.cartItems = [];
        Cart.empty()
        return Checkout.confirm({
            token: $scope.token,
            address: $scope.typedAddress,
            cartIds: cartIds,
            chargeAmount: $scope.chargeAmount
        });
    };
});
