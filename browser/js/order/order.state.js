app.config(function ($stateProvider) {
    $stateProvider.state('order', {
        url: '/order',
        templateUrl: 'js/order/order.html',
		controller: 'OrderCtrl'
    });

    $stateProvider.state('newReview', {
    	url: '/order/review/:productId',
    	templateUrl: 'js/order/review/review.form.html',
    	controller: 'ReviewFormCtrl'
    });
});

