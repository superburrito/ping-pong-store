app.config(function ($stateProvider) {

    $stateProvider.state('login', {
        url: '/login',
        templateUrl: 'js/login/login.html',
        controller: 'LoginCtrl'
    });

});

app.controller('LoginCtrl', function ($scope, AuthService, $state, Login) {

    $scope.login = {};
    $scope.error = null;

    $scope.sendLogin = function (loginInfo) {

        $scope.error = null;

        Login.checkIsAdmin(loginInfo.email)
        .then(function(user){
            loginInfo.isAdmin = user.data.isAdmin;
            AuthService.login(loginInfo).then(function () {
            $state.go('home');
        }).catch(function () {
            $scope.error = 'Invalid login credentials.';
        });
        })
        

        

    };

});

app.factory('Login', function($http){
    var LoginFactory = {};
    LoginFactory.checkIsAdmin = function(email){
        return $http.get('/api/users/checkIsAdmin/' +email)
    }
    
    return LoginFactory;
})