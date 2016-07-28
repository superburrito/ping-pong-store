app.controller('CartCtrl', function($scope, $stateParams, Cart, Product){	
	$scope.cartItems = [];

	// Not in factory, due to async update of $scope
	Object.keys(localStorage).forEach(function(productId){
		if(typeof productId !== 'number') return;
		Product.getOneProduct(productId)
		.then(function(product){
			var quantity = localStorage[productId];
			$scope.cartItems.push({
				quantity: quantity,
				product: product
			});
		});
	});

	
});

