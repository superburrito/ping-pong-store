app.controller('OrderCtrl', function($scope, Order){
	Order.show()
	.then(function(allOrders){
		console.log('all',allOrders)
		$scope.orders = allOrders;
	})
})