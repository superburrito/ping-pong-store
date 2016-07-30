app.controller('OrderCtrl', function($scope, OrderFactory){

	OrderFactory.show()
	.then(function(allOrders){
		console.log(allOrders)
		$scope.orders = allOrders;
	})

})