app.config(function ($stateProvider) {
    $stateProvider.state('order', {
        url: '/order',
        templateUrl: 'js/order/order.html',
		controller: 'OrderCtrl'
    });
});

