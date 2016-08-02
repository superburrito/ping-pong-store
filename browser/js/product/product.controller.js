app.controller('ProductCtrl', function($state, $scope, Product, $stateParams, Cart, AuthService){
  
  	AuthService.getLoggedInUser()
  	.then(function (user) {
        $scope.isAdmin = false;
        if(user&&user.isAdmin) {
      		$scope.isAdmin = true;
        }
    })
    .then(function(){

	    $scope.Cart = Cart;

	    $scope.checkIsAdmin = function(){
          return $scope.isAdmin;
        }

		Product.getOneProduct($stateParams.id)
	    .then(function(product){
			$scope.product = product;
			Product.getProductReviews($stateParams.id)
			.then(function(reviews){
				$scope.reviews = reviews;
			})
		})

		$scope.returnToStore = function(){
			$state.go('home');
		}

		$scope.edit = function(){
			Product.editProduct($scope.product)
			.then(function(){
				$state.go('home');
			})
		}
	});
	
});

