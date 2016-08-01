app.config(function ($stateProvider) {
    $stateProvider.state('signup', {
        url: '/sign-up',
        templateUrl: 'js/signup/signup.html',
        controller: 'SignUpCtrl'
    });
});

app.controller('SignUpCtrl', function($scope, SignUpFactory, AuthService, $state){

 $scope.login = {};
 $scope.error = null;

$scope.sendLogin = function (loginInfo) {

        $scope.error = null;

        AuthService.login(loginInfo).then(function () {
        	console.log("testing log-in info", loginInfo);
            $state.go('home');
        }).catch(function () {
            $scope.error = 'Invalid login credentials.';
        });

    };

$scope.newUser = {};

$scope.sendSignUp = function(){
	console.log("Checking new user object: ", $scope.newUser)
	SignUpFactory.sendSignUp($scope.newUser).then(function(account){
		return account;
	}).then(function(account){
		var logInInfo = {email: $scope.newUser.email, 
						 password: $scope.newUser.password};
		console.log(logInInfo);

		$scope.sendLogin(logInInfo);
	})
}
});

app.factory('SignUpFactory', function($http){

var sendSignUp = function(signUpInfoObj){
	console.log("about to hit post route");
	return $http.post('api/users/', signUpInfoObj).then(function(newAccount){
		console.log("finished post route")
		return newAccount.data;
	})
}

return {
	sendSignUp: sendSignUp
}

});