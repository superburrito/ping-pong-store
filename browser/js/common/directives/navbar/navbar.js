app.directive('navbar', function ($rootScope, AuthService, AUTH_EVENTS, $state) {

    return {
        restrict: 'E',
        scope: {},
        templateUrl: 'js/common/directives/navbar/navbar.html',
        link: function (scope) {

            scope.items = [
                { label: 'About', state: 'about' },
                { label: 'My Cart', state: 'cart' },
                { label: 'Order', state: 'order', auth: true},
                { label: 'Account', state: 'account', auth: true},
                { label: 'Create Product', state: 'createProduct', auth: true}
            ];

            scope.user = null;

            scope.isLoggedIn = function () {
                return AuthService.isAuthenticated();
            };

            

            scope.logout = function () {
                AuthService.logout().then(function () {
                   $state.go('home');
                });
            };

            var setUser = function () {
                AuthService.getLoggedInUser().then(function (user) {
                    scope.user = user;
                });
            };

           //  scope.isAdmin = function(){
           //      AuthService.getLoggedInUser().then(function (user) {
           //          if(user) return user.isAdmin;
           //          else return false;
           //      })      
           // }

            var removeUser = function () {
                scope.user = null;
            };

            setUser();

            $rootScope.$on(AUTH_EVENTS.loginSuccess, setUser);
            $rootScope.$on(AUTH_EVENTS.logoutSuccess, removeUser);
            $rootScope.$on(AUTH_EVENTS.sessionTimeout, removeUser);

        }

    };

});
