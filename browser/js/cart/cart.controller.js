app.controller('CartCtrl', function($scope, $stateParams, Cart, Product, $window, $state){
	$scope.cartItems = [];
	$scope.emptyCart = true;
	var cartKeys = Object.keys(Cart.get());
	var totalPrice = 0;
	if(cartKeys.length > 0){
		$scope.emptyCart = false;
		cartKeys.forEach(function(productId){
			//console.log("Current ProductId on Cart is: ", productId);
			return Product.getOneProduct(productId)
			.then(function(product){
				var quantity = localStorage[productId];
				//console.log("Product found, quantity is: ", quantity, " and item is: ", product);
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

	//remove item from cart
	$scope.removeItem = function(id){
		Cart.remove(id);
		$window.location.reload();
	}

	//update quantity in cart
	$scope.quantity = [1,2,3,4,5,6,7,8,9,10]
	$scope.updateQuantity = function(productId,quantity){
		Cart.updateQuantity(productId,quantity);
		$window.location.reload();
	}

    $scope.checkout = function() {
        console.log("***************************", $scope.cartItems, $scope.totalPrice);
        $state.go('checkout', {
            cartItems: $scope.cartItems,
            chargeAmount: $scope.totalPrice
        });
    }
});

