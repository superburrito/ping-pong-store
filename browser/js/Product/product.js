app.config(function ($stateProvider) {
    $stateProvider.state('product', {
        url: '/product/:id',
        templateUrl: 'js/product/product.html',
   		controller: function($scope, Product, $stateParams, Cart){
        $scope.Cart = Cart;
   			Product.getOneProduct($stateParams.id)
        .then(function(product){
   				$scope.product = product;
   			})
   		}
    });
});

app.factory('Product', function($http){
	let getOneProduct = function(id){
    return $http.get('/api/products/'+ id)
    .then(function(product){
		  return product.data;
		})
	};

return {
	getOneProduct: getOneProduct,
}
})
