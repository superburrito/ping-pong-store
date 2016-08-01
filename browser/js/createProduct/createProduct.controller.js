app.controller('createProductCtrl', function($scope, CreateProduct,$state){
	
	$scope.categoryExist = false;
	$scope.category='';
	$scope.setCategory = function(){
		$scope.categoryExist = true;
	}

	$scope.isBall = function(){
		return $scope.category === 'Ball';
	}

	$scope.create = function(){
		CreateProduct.create($scope.newProduct, $scope.category)
		.then(function(newProduct){
			$state.go('product', {id: newProduct.id});
		})
	}
})