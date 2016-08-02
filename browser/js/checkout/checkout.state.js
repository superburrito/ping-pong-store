app.config(function ($stateProvider) {
    $stateProvider.state('checkout', {
        url: '/checkout',
        templateUrl: 'js/checkout/checkout.html',
        controller: 'CheckoutCtrl',
        params: {
            cartItems: {dynamic: true},
            chargeAmount: {dynamic: true}
        }
    });
});
