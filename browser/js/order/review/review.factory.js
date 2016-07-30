app.factory('ReviewFactory', function($state, $http){
	var ReviewFactory = {};

	ReviewFactory.setReview = function(review){
		return $http.post('/api/reviews', review)
		.then(function(response){
			console.log('----',response)
			return response;
		})
	}
	return ReviewFactory;
	
})