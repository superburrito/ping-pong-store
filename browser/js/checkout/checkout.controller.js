app.controller('CheckoutCtrl', function($scope, $stateParams, Checkout, Cart, $state){

    // Let checkoutaddress default to user's address

    $scope.defaultAddress = '';
    Checkout.findAddress()
    .then(function(userAddress){
        $scope.defaultAddress = userAddress
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
            address: $scope.typedAddress,
            cartIds: $scope.cartIds,
            ccNumber: $scope.ccNumber,
            cvc: $scope.cvc,
            expMonth: $scope.expMonth,
            expYear: $scope.expYear,
            chargeAmount: $scope.chargeAmount
        });
    };
});
