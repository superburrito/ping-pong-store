app.controller('CheckoutCtrl', function($scope, $stateParams){

    $scope.cartItems = $stateParams.cartItems;

    $scope.checkout = function () {
        // Converts cartItems (array of objs) into cartIds (array of Prod ids)
        var cartIds = [];
        $scope.cartItems.forEach(function(item){
            for(var i = 0; i < item.quantity; i++){
                cartIds.push(item.product.id);
            }
        });
        $scope.cartItems = [];
        Cart.empty()
        $state.go('checkout');
        return Cart.checkout($scope.typedAddress, cartIds);
    };

});
