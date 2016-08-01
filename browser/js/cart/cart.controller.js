app.controller('CartCtrl', function($scope, $stateParams, Cart, Product,$window){	

	$scope.cartItems = [];
	$scope.emptyCart = true;
	var cartKeys = Object.keys(Cart.get());
	var totalPrice = 0;
	if(cartKeys.length > 0){
		$scope.emptyCart = false;
		cartKeys.forEach(function(productId){
			console.log("Current ProductId on Cart is: ", productId);
			return Product.getOneProduct(productId)
			.then(function(product){
				var quantity = localStorage[productId];
				console.log("Product found, quantity is: ", quantity, " and item is: ", product);
				totalPrice+= quantity*product.price;
				$scope.cartItems.push({
					quantity: quantity,
					product: product
				});
			})
			.then(function(){
				$scope.totalPrice = totalPrice;
			})
		});
	}
	

	// Let checkoutaddress default to user's address
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
		$scope.cartItems = [];
		Cart.empty()
		return Cart.checkout($scope.typedAddress, cartIds);
	};

	//remove item from cart
	// $timeout(function(){
	// 	$scope.removeItem = function(id){
	// 		Cart.remove(id);
	// 	}
	// });
	$scope.removeItem = function(id){
		Cart.remove(id);
		$window.location.reload();
	}
	
});

