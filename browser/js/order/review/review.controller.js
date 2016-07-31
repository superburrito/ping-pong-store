app.controller('ReviewFormCtrl', function($scope,ReviewFactory,AuthService,$stateParams,$state){
	$scope.newReview = {};
	$scope.state = $state.current;
	$scope.createReview = function(){
		AuthService.getLoggedInUser().then(function (user) {
            $scope.newReview.userId = user.id;
            $scope.newReview.productId = $stateParams.productId;
            return $scope.newReview
        })
        .then(function(newReview){
        	ReviewFactory.setReview(newReview)
			.then(function(review){
				if(review.created) alert('You already write a review for this order')
				else alert('Thanks for your feedback!!')
				$state.go('order');
			})
        })
		
	}
})