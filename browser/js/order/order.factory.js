app.factory('Order', function($state, $http){
	var OrderFactory = {};

	OrderFactory.show = function(){
		return $http.get('/api/orders')
		.then(function(response){
			console.log('res', response)
			return response.data
		})
	}
	return OrderFactory;
	
})