app.factory('ReviewFactory', function($state, $http){
	var ReviewFactory = {};

	ReviewFactory.setReview = function(review){
		console.log('in factory', review)
		return $http.post('/api/reviews/', review)
		.then(function(response){
			return response.data;
		})
	}
	return ReviewFactory;
	
})