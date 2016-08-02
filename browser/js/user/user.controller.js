'use strict';
app.controller('UserCtrl', function($scope,User,$window){
	User.getAllUser()
	.then(function(allUsers){
		$scope.users = allUsers;
	})

	$scope.removeUser = function(id){
		User.removeUser(id)
		.then(function(){
			$window.location.reload();
		})
	}
})