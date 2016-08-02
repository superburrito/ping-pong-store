'use strict';
app.factory('User',function($state,$http){
	var UserFactory = {};

	UserFactory.getAllUser = function(){
		return $http.get('/api/users')
		.then(function(Allusers){
			console.log(Allusers)
			return Allusers.data;
		});
	};

	UserFactory.removeUser = function(id){
		return $http.delete('/api/users/'+id)
		.then(function(res){
			return res.data;
		});
	};

	UserFactory.updateUser = function(id){
		return $http.put('/api/users/admin/'+id)
		.then(function(res){
			return res.data;
		});
	};
	return UserFactory;
})