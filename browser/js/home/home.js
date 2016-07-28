app.config(function ($stateProvider) {
    $stateProvider.state('home', {
        url: '/',
        templateUrl: 'js/home/home.html',
   		controller: function($scope, homepage){
   			homepage.getAllProducts().then(function(allProducts){
   				$scope.products = allProducts
   			})
   		} 
    });
});

