app.config(function ($stateProvider) {
    $stateProvider.state('product', {
        url: '/product/:id',
        templateUrl: 'js/product/product.html',
   		controller: function($scope, Product){
   			homepage.getAllProducts().then(function(allProducts){
   				$scope.products = allProducts
   			})
   		} 
    });
});

app.factory('Product', function($http){
	var getOneProduct = function(){
		return $http.get('/api/products/'+ req.params.id).then(function(products){
			return products.data;
		})
	}
return {
	getAllProducts: getAllProducts
}	
})