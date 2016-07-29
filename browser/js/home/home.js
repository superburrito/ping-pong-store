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

app.factory('homepage', function($http){
	var getAllProducts = function(){
		return $http.get('/api/products').then(function(products){
			return products.data;
		})
	}
return {
	getAllProducts: getAllProducts
}	
})