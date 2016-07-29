app.controller('CartCtrl', function($scope, $stateParams, Cart, Product){	
	$scope.cartItems = [];

	Object.keys(localStorage).forEach(function(productId){
		console.log("Current ProductId on Cart is: ", productId);
		return Product.getOneProduct(productId)
		.then(function(product){
			var quantity = localStorage[productId];
			console.log("Product found, quantity is: ", quantity, " and item is: ", product);
			$scope.cartItems.push({
				quantity: quantity,
				product: product
			});
		});
	});

	// Set checkoutaddress default
	$scope.defaultAddress = '';
	Cart.checkoutAddress()
	.then(function(userAddress){
		$scope.defaultAddress = userAddress
	});


	// checkout form has ng-model='typedAddress'
	$scope.checkout = function () {
		// Converts cartItems (array of objs) into cartIds (array of Prod ids)
		var cartIds = [];
		$scope.cartItems.forEach(function(item){
			for(var i = 0; i < item.quantity; i++){
				cartIds.push(item.product.id);
			}
		});
		return Cart.checkout($scope.typedAddress, cartIds);
	};
	
});

