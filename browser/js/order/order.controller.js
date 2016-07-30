app.controller('OrderCtrl', function($scope, Order){
	Order.show()
	.then(function(allOrders){
		$scope.orders = allOrders;
	})
})