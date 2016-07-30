app.controller('ReviewFormCtrl', function($scope,ReviewFactory,AuthService,$stateParams,$state){
	$scope.newReview = {};
	$scope.state = $state.current;
	console.log($stateParams)
	$scope.createReview = function(){
		AuthService.getLoggedInUser().then(function (user) {
            $scope.newReview.userId = user.id;
            $scope.newReview.productId = $stateParams.productId;
            return $scope.newReview
        })
        .then(function(newReview){
        	ReviewFactory.setReview(newReview)
			.then(function(review){
				$state.go('order');
			})
        })
		
	}
})