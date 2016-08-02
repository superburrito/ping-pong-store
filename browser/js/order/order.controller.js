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
			$scope.orders = allOrders.map(function(order){
				if(order.orderDetail.status == '0'){
					order.orderDetail.status = "Pending"
				}else if(order.orderDetail.status == '1'){
					order.orderDetail.status = "Confirmed"
				}else if(order.orderDetail.status == '2'){
					order.orderDetail.status = "Shipped"
				}else if(order.orderDetail.status == '3'){
					order.orderDetail.status = "Delivered"
				}else{
					order.orderDetail.status = "Null";
				}
				return order;
			});
		})
		$scope.checkAdmin = function(){
			return $scope.isAdmin;
		}
	})
	

})