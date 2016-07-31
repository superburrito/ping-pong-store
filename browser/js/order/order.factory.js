app.factory('Order', function($state, $http){
	var OrderFactory = {};

	OrderFactory.show = function(){
		return $http.get('/api/orders')
		.then(function(response){
			return response.data
		})
	}
	return OrderFactory;
	
})