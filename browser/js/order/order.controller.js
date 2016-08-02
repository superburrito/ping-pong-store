app.controller('OrderCtrl', function($scope, Order,AuthService){
	AuthService.getLoggedInUser().then(function (user) {
		$scope.isAdmin = false;	
		if(user.isAdmin) {
			$scope.isAdmin = true;
		}
	})
	.then(function(){
		Order.show()
		.then(function(allOrders){
			console.log(allOrders)
			$scope.orders = allOrders;
		})
		$scope.checkAdmin = function(){
			return $scope.isAdmin;
		}
	})
	

})