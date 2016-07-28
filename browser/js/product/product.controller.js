app.controller('ProductCtrl', function($scope, Product, $stateParams, Cart){
  $scope.Cart = Cart;
	Product.getOneProduct($stateParams.id)
  .then(function(product){
		$scope.product = product;
	})
});

