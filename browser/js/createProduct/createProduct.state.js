app.config(function ($stateProvider) {
    $stateProvider.state('createProduct', {
        url: '/create',
        templateUrl: 'js/createProduct/createProduct.html',
		controller: 'createProductCtrl'
    });
});