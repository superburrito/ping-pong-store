'use strict';

window.app = angular.module('FullstackGeneratedApp', ['fsaPreBuilt', 'ui.router', 'ui.bootstrap', 'ngAnimate']);

app.config(function ($urlRouterProvider, $locationProvider) {
    // This turns off hashbang urls (/#about) and changes it to something normal (/about)
    $locationProvider.html5Mode(true);
    // If we go to a URL that ui-router doesn't have registered, go to the "/" url.
    $urlRouterProvider.otherwise('/');
    // Trigger page refresh when accessing an OAuth route
    $urlRouterProvider.when('/auth/:provider', function () {
        window.location.reload();
    });
});

// This app.run is for controlling access to specific states.
app.run(function ($rootScope, AuthService, $state) {

    // The given state requires an authenticated user.
    var destinationStateRequiresAuth = function destinationStateRequiresAuth(state) {
        return state.data && state.data.authenticate;
    };

    // $stateChangeStart is an event fired
    // whenever the process of changing a state begins.
    $rootScope.$on('$stateChangeStart', function (event, toState, toParams) {

        if (!destinationStateRequiresAuth(toState)) {
            // The destination state does not require authentication
            // Short circuit with return.
            return;
        }

        if (AuthService.isAuthenticated()) {
            // The user is authenticated.
            // Short circuit with return.
            return;
        }

        // Cancel navigating to new state.
        event.preventDefault();

        AuthService.getLoggedInUser().then(function (user) {
            // If a user is retrieved, then renavigate to the destination
            // (the second time, AuthService.isAuthenticated() will work)
            // otherwise, if no user is logged in, go to "login" state.
            if (user) {
                $state.go(toState.name, toParams);
            } else {
                $state.go('login');
            }
        });
    });
});

app.config(function ($stateProvider) {

    // Register our *about* state.
    $stateProvider.state('about', {
        url: '/about',
        controller: 'AboutController',
        templateUrl: 'js/about/about.html'
    });
});

app.controller('AboutController', function ($scope, FullstackPics) {

    // Images of beautiful Fullstack people.
    $scope.images = _.shuffle(FullstackPics);
});
app.controller('CartCtrl', function ($scope, $stateParams, Cart, Product) {

    $scope.cartItems = [];
    $scope.emptyCart = true;

    var cartKeys = Object.keys(Cart.get());

    if (cartKeys.length > 0) {
        $scope.emptyCart = false;
        cartKeys.forEach(function (productId) {
            console.log("Current ProductId on Cart is: ", productId);
            return Product.getOneProduct(productId).then(function (product) {
                var quantity = localStorage[productId];
                console.log("Product found, quantity is: ", quantity, " and item is: ", product);
                $scope.cartItems.push({
                    quantity: quantity,
                    product: product
                });
            });
        });
    }

    // Let checkoutaddress default to user's address
    $scope.defaultAddress = '';
    Cart.checkoutAddress().then(function (userAddress) {
        $scope.defaultAddress = userAddress;
    });

    // checkout form has ng-model='typedAddress'
    $scope.checkout = function () {
        // Converts cartItems (array of objs) into cartIds (array of Prod ids)
        var cartIds = [];
        $scope.cartItems.forEach(function (item) {
            for (var i = 0; i < item.quantity; i++) {
                cartIds.push(item.product.id);
            }
        });
        $scope.cartItems = [];
        Cart.empty();
        return Cart.checkout($scope.typedAddress, cartIds);
    };
});

app.factory('Cart', function ($state, $http, Product) {
    var CartFactory = {};
    //cart = {productKey1: quantity1, productKey2: quantity2... }

    CartFactory.add = function (productId, quantity) {
        var number = Number(localStorage.getItem(productId)) + Number(quantity) || Number(quantity);
        localStorage.setItem(productId, number);
    };

    CartFactory.remove = function (productId) {
        localStorage.removeItem(productId);
    };

    CartFactory.empty = function () {
        localStorage.clear();
    };

    CartFactory.get = function () {
        if (localStorage[length]) delete localStorage('length');
        return localStorage;
    };

    CartFactory.checkout = function (address, cartIds) {
        $state.go('home');
        return $http.post('/api/orders/checkout/' + address, cartIds);
    };

    CartFactory.checkoutAddress = function () {
        return $http.get('api/account').then(function (response) {
            return response.data;
        }).then(function (user) {
            if (!user) return '';
            return user.address;
        });
    };

    return CartFactory;
});

app.config(function ($stateProvider) {
    $stateProvider.state('cart', {
        url: '/cart',
        templateUrl: 'js/cart/cart.html',
        controller: 'CartCtrl'
    });
});

(function () {

    'use strict';

    // Hope you didn't forget Angular! Duh-doy.

    if (!window.angular) throw new Error('I can\'t find Angular!');

    var app = angular.module('fsaPreBuilt', []);

    app.factory('Socket', function () {
        if (!window.io) throw new Error('socket.io not found!');
        return window.io(window.location.origin);
    });

    // AUTH_EVENTS is used throughout our app to
    // broadcast and listen from and to the $rootScope
    // for important events about authentication flow.
    app.constant('AUTH_EVENTS', {
        loginSuccess: 'auth-login-success',
        loginFailed: 'auth-login-failed',
        logoutSuccess: 'auth-logout-success',
        sessionTimeout: 'auth-session-timeout',
        notAuthenticated: 'auth-not-authenticated',
        notAuthorized: 'auth-not-authorized'
    });

    app.factory('AuthInterceptor', function ($rootScope, $q, AUTH_EVENTS) {
        var statusDict = {
            401: AUTH_EVENTS.notAuthenticated,
            403: AUTH_EVENTS.notAuthorized,
            419: AUTH_EVENTS.sessionTimeout,
            440: AUTH_EVENTS.sessionTimeout
        };
        return {
            responseError: function responseError(response) {
                $rootScope.$broadcast(statusDict[response.status], response);
                return $q.reject(response);
            }
        };
    });

    app.config(function ($httpProvider) {
        $httpProvider.interceptors.push(['$injector', function ($injector) {
            return $injector.get('AuthInterceptor');
        }]);
    });

    app.service('AuthService', function ($http, Session, $rootScope, AUTH_EVENTS, $q) {

        function onSuccessfulLogin(response) {
            var data = response.data;
            Session.create(data.id, data.user);
            $rootScope.$broadcast(AUTH_EVENTS.loginSuccess);
            return data.user;
        }

        // Uses the session factory to see if an
        // authenticated user is currently registered.
        this.isAuthenticated = function () {
            return !!Session.user;
        };

        this.getLoggedInUser = function (fromServer) {

            // If an authenticated session exists, we
            // return the user attached to that session
            // with a promise. This ensures that we can
            // always interface with this method asynchronously.

            // Optionally, if true is given as the fromServer parameter,
            // then this cached value will not be used.

            if (this.isAuthenticated() && fromServer !== true) {
                return $q.when(Session.user);
            }

            // Make request GET /session.
            // If it returns a user, call onSuccessfulLogin with the response.
            // If it returns a 401 response, we catch it and instead resolve to null.
            return $http.get('/session').then(onSuccessfulLogin).catch(function () {
                return null;
            });
        };

        this.login = function (credentials) {
            return $http.post('/login', credentials).then(onSuccessfulLogin).catch(function () {
                return $q.reject({ message: 'Invalid login credentials.' });
            });
        };

        this.logout = function () {
            return $http.get('/logout').then(function () {
                Session.destroy();
                $rootScope.$broadcast(AUTH_EVENTS.logoutSuccess);
            });
        };
    });

    app.service('Session', function ($rootScope, AUTH_EVENTS) {

        var self = this;

        $rootScope.$on(AUTH_EVENTS.notAuthenticated, function () {
            self.destroy();
        });

        $rootScope.$on(AUTH_EVENTS.sessionTimeout, function () {
            self.destroy();
        });

        this.id = null;
        this.user = null;

        this.create = function (sessionId, user) {
            this.id = sessionId;
            this.user = user;
        };

        this.destroy = function () {
            this.id = null;
            this.user = null;
        };
    });
})();

app.config(function ($stateProvider) {
    $stateProvider.state('home', {
        url: '/',
        templateUrl: 'js/home/home.html',
        controller: function controller($scope, homepage) {
            homepage.getAllProducts().then(function (allProducts) {
                $scope.products = allProducts;
            });
        }
    });
});

app.factory('homepage', function ($http) {
    var getAllProducts = function getAllProducts() {
        return $http.get('/api/products').then(function (products) {
            return products.data;
        });
    };
    return {
        getAllProducts: getAllProducts
    };
});
app.config(function ($stateProvider) {

    $stateProvider.state('login', {
        url: '/login',
        templateUrl: 'js/login/login.html',
        controller: 'LoginCtrl'
    });
});

app.controller('LoginCtrl', function ($scope, AuthService, $state) {

    $scope.login = {};
    $scope.error = null;

    $scope.sendLogin = function (loginInfo) {

        $scope.error = null;

        AuthService.login(loginInfo).then(function () {
            $state.go('home');
        }).catch(function () {
            $scope.error = 'Invalid login credentials.';
        });
    };
});
app.config(function ($stateProvider) {

    $stateProvider.state('membersOnly', {
        url: '/account',
        templateUrl: 'js/members-only/members-only.html',
        controller: function controller($scope, Account, $log) {
            Account.getAccountInfo().then(function (userAccount) {
                $scope.account = userAccount;
            }).catch($log);
        }
    });
});

app.factory('Account', function ($http) {

    var getAccountInfo = function getAccountInfo() {
        return $http.get('/api/account').then(function (Account) {
            console.log("Hey what's up", Account.data);
            return Account.data;
        });
    };

    return {
        getAccountInfo: getAccountInfo
    };
});

app.controller('ProductCtrl', function ($scope, Product, $stateParams, Cart) {
    $scope.Cart = Cart;
    Product.getOneProduct($stateParams.id).then(function (product) {
        console.log(product);
        $scope.product = product;
    });
});

app.factory('Product', function ($http) {
    var getOneProduct = function getOneProduct(id) {
        return $http.get('/api/products/' + id).then(function (product) {
            return product.data;
        });
    };

    return {
        getOneProduct: getOneProduct
    };
});

app.config(function ($stateProvider) {
    $stateProvider.state('product', {
        url: '/products/:id',
        templateUrl: 'js/product/product.html',
        controller: 'ProductCtrl'
    });
});

app.config(function ($stateProvider) {
    $stateProvider.state('docs', {
        url: '/docs',
        templateUrl: 'js/docs/docs.html'
    });
});

app.controller('ProductsCtrl', function ($scope, Products) {

    $scope.categories = ['paddles', 'balls', 'cases', 'tables', 'robots'];

    $scope.categoriesFunc = Products.getProductsbyCategory;

    Products.getProductsbyCategory().then(function (productsInCategory) {
        $scope.products = productsInCategory;
    });
});

app.factory('Products', function ($http) {
    var getAllProducts = function getAllProducts() {
        return $http.get('/api/products').then(function (products) {
            return products.data;
        });
    };

    var getProductsbyCategory = function getProductsbyCategory(category) {
        category = category || 0;
        if (category === 0) {
            return $http.get('/api/products').then(function (products) {
                return products.data;
            });
        }
        return $http.get('/api/products/?category=' + category).then(function (productsInCategory) {
            return productsInCategory.data;
        });
    };

    return {
        getProductsbyCategory: getProductsbyCategory
    };
});

app.config(function ($stateProvider) {
    $stateProvider.state('products', {
        url: '/',
        templateUrl: 'js/products/products.html',
        controller: 'ProductsCtrl'
    });
});
app.factory('FullstackPics', function () {
    return ['https://pbs.twimg.com/media/B7gBXulCAAAXQcE.jpg:large', 'https://fbcdn-sphotos-c-a.akamaihd.net/hphotos-ak-xap1/t31.0-8/10862451_10205622990359241_8027168843312841137_o.jpg', 'https://pbs.twimg.com/media/B-LKUshIgAEy9SK.jpg', 'https://pbs.twimg.com/media/B79-X7oCMAAkw7y.jpg', 'https://pbs.twimg.com/media/B-Uj9COIIAIFAh0.jpg:large', 'https://pbs.twimg.com/media/B6yIyFiCEAAql12.jpg:large', 'https://pbs.twimg.com/media/CE-T75lWAAAmqqJ.jpg:large', 'https://pbs.twimg.com/media/CEvZAg-VAAAk932.jpg:large', 'https://pbs.twimg.com/media/CEgNMeOXIAIfDhK.jpg:large', 'https://pbs.twimg.com/media/CEQyIDNWgAAu60B.jpg:large', 'https://pbs.twimg.com/media/CCF3T5QW8AE2lGJ.jpg:large', 'https://pbs.twimg.com/media/CAeVw5SWoAAALsj.jpg:large', 'https://pbs.twimg.com/media/CAaJIP7UkAAlIGs.jpg:large', 'https://pbs.twimg.com/media/CAQOw9lWEAAY9Fl.jpg:large', 'https://pbs.twimg.com/media/B-OQbVrCMAANwIM.jpg:large', 'https://pbs.twimg.com/media/B9b_erwCYAAwRcJ.png:large', 'https://pbs.twimg.com/media/B5PTdvnCcAEAl4x.jpg:large', 'https://pbs.twimg.com/media/B4qwC0iCYAAlPGh.jpg:large', 'https://pbs.twimg.com/media/B2b33vRIUAA9o1D.jpg:large', 'https://pbs.twimg.com/media/BwpIwr1IUAAvO2_.jpg:large', 'https://pbs.twimg.com/media/BsSseANCYAEOhLw.jpg:large', 'https://pbs.twimg.com/media/CJ4vLfuUwAAda4L.jpg:large', 'https://pbs.twimg.com/media/CI7wzjEVEAAOPpS.jpg:large', 'https://pbs.twimg.com/media/CIdHvT2UsAAnnHV.jpg:large', 'https://pbs.twimg.com/media/CGCiP_YWYAAo75V.jpg:large', 'https://pbs.twimg.com/media/CIS4JPIWIAI37qu.jpg:large'];
});

app.factory('RandomGreetings', function () {

    var getRandomFromArray = function getRandomFromArray(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    };

    var greetings = ['Welcome to the best Ping-Pong store this side of the Atlantic', 'You look like you could use a brand spanking new paddle'];

    return {
        greetings: greetings,
        getRandomGreeting: function getRandomGreeting() {
            return getRandomFromArray(greetings);
        }
    };
});

app.directive('fullstackLogo', function () {
    return {
        restrict: 'E',
        templateUrl: 'js/common/directives/fullstack-logo/fullstack-logo.html'
    };
});
app.directive('navbar', function ($rootScope, AuthService, AUTH_EVENTS, $state) {

    return {
        restrict: 'E',
        scope: {},
        templateUrl: 'js/common/directives/navbar/navbar.html',
        link: function link(scope) {

            scope.items = [{ label: 'Home', state: 'home' }, { label: 'About', state: 'about' }, { label: 'My Cart', state: 'cart' }, { label: 'Order', state: 'order', auth: true }, { label: 'Members Only', state: 'membersOnly', auth: true }, { label: 'Account', state: 'membersOnly', auth: true }];

            scope.user = null;

            scope.isLoggedIn = function () {
                return AuthService.isAuthenticated();
            };

            scope.logout = function () {
                AuthService.logout().then(function () {
                    $state.go('home');
                });
            };

            var setUser = function setUser() {
                AuthService.getLoggedInUser().then(function (user) {
                    scope.user = user;
                });
            };

            var removeUser = function removeUser() {
                scope.user = null;
            };

            setUser();

            $rootScope.$on(AUTH_EVENTS.loginSuccess, setUser);
            $rootScope.$on(AUTH_EVENTS.logoutSuccess, removeUser);
            $rootScope.$on(AUTH_EVENTS.sessionTimeout, removeUser);
        }

    };
});

app.directive('randoGreeting', function (RandomGreetings) {

    return {
        restrict: 'E',
        templateUrl: 'js/common/directives/rando-greeting/rando-greeting.html',
        link: function link(scope) {
            console.log("randoGreeting link function hit");
            scope.greeting = RandomGreetings.getRandomGreeting();
        }
    };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImFib3V0L2Fib3V0LmpzIiwiY2FydC9jYXJ0LmNvbnRyb2xsZXIuanMiLCJjYXJ0L2NhcnQuZmFjdG9yeS5qcyIsImNhcnQvY2FydC5zdGF0ZS5qcyIsImZzYS9mc2EtcHJlLWJ1aWx0LmpzIiwiaG9tZS9ob21lLmpzIiwibG9naW4vbG9naW4uanMiLCJtZW1iZXJzLW9ubHkvbWVtYmVycy1vbmx5LmpzIiwicHJvZHVjdC9wcm9kdWN0LmNvbnRyb2xsZXIuanMiLCJwcm9kdWN0L3Byb2R1Y3QuZmFjdG9yeS5qcyIsInByb2R1Y3QvcHJvZHVjdC5zdGF0ZS5qcyIsInNpZ251cC9kb2NzLmpzIiwicHJvZHVjdHMvcHJvZHVjdHMuY29udHJvbGxlci5qcyIsInByb2R1Y3RzL3Byb2R1Y3RzLmZhY3RvcnkuanMiLCJwcm9kdWN0cy9wcm9kdWN0cy5zdGF0ZS5qcyIsImNvbW1vbi9mYWN0b3JpZXMvRnVsbHN0YWNrUGljcy5qcyIsImNvbW1vbi9mYWN0b3JpZXMvUmFuZG9tR3JlZXRpbmdzLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvZnVsbHN0YWNrLWxvZ28vZnVsbHN0YWNrLWxvZ28uanMiLCJjb21tb24vZGlyZWN0aXZlcy9uYXZiYXIvbmF2YmFyLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvcmFuZG8tZ3JlZXRpbmcvcmFuZG8tZ3JlZXRpbmcuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7O0FBQ0EsT0FBQSxHQUFBLEdBQUEsUUFBQSxNQUFBLENBQUEsdUJBQUEsRUFBQSxDQUFBLGFBQUEsRUFBQSxXQUFBLEVBQUEsY0FBQSxFQUFBLFdBQUEsQ0FBQSxDQUFBOztBQUVBLElBQUEsTUFBQSxDQUFBLFVBQUEsa0JBQUEsRUFBQSxpQkFBQSxFQUFBO0FBQ0E7QUFDQSxzQkFBQSxTQUFBLENBQUEsSUFBQTtBQUNBO0FBQ0EsdUJBQUEsU0FBQSxDQUFBLEdBQUE7QUFDQTtBQUNBLHVCQUFBLElBQUEsQ0FBQSxpQkFBQSxFQUFBLFlBQUE7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QUNBLHVCQUFBLEdBQUEsTUFBQSxDQUFBLFFBQUEsQ0FBQTtBQUNBO0FBSkEsU0FBQTtBQU1BLEtBYkE7O0FBZUEsUUFBQSxNQUFBLENBQUEsVUFBQSxhQUFBLEVBQUE7QUFDQSxzQkFBQSxZQUFBLENBQUEsSUFBQSxDQUFBLENBQ0EsV0FEQSxFQUVBLFVBQUEsU0FBQSxFQUFBO0FBQ0EsbUJBQUEsVUFBQSxHQUFBLENBQUEsaUJBQUEsQ0FBQTtBQUNBLFNBSkEsQ0FBQTtBQU1BLEtBUEE7O0FBU0EsUUFBQSxPQUFBLENBQUEsYUFBQSxFQUFBLFVBQUEsS0FBQSxFQUFBLE9BQUEsRUFBQSxVQUFBLEVBQUEsV0FBQSxFQUFBLEVBQUEsRUFBQTs7QUFFQSxpQkFBQSxpQkFBQSxDQUFBLFFBQUEsRUFBQTtBQUNBLGdCQUFBLE9BQUEsU0FBQSxJQUFBO0FBQ0Esb0JBQUEsTUFBQSxDQUFBLEtBQUEsRUFBQSxFQUFBLEtBQUEsSUFBQTtBQUNBLHVCQUFBLFVBQUEsQ0FBQSxZQUFBLFlBQUE7QUFDQSxtQkFBQSxLQUFBLElBQUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0EsYUFBQSxlQUFBLEdBQUEsWUFBQTtBQUNBLG1CQUFBLENBQUEsQ0FBQSxRQUFBLElBQUE7QUFDQSxTQUZBOztBQUlBLGFBQUEsZUFBQSxHQUFBLFVBQUEsVUFBQSxFQUFBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUEsZ0JBQUEsS0FBQSxlQUFBLE1BQUEsZUFBQSxJQUFBLEVBQUE7QUFDQSx1QkFBQSxHQUFBLElBQUEsQ0FBQSxRQUFBLElBQUEsQ0FBQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLG1CQUFBLE1BQUEsR0FBQSxDQUFBLFVBQUEsRUFBQSxJQUFBLENBQUEsaUJBQUEsRUFBQSxLQUFBLENBQUEsWUFBQTtBQUNBLHVCQUFBLElBQUE7QUFDQSxhQUZBLENBQUE7QUFJQSxTQXJCQTs7QUF1QkEsYUFBQSxLQUFBLEdBQUEsVUFBQSxXQUFBLEVBQUE7QUFDQSxtQkFBQSxNQUFBLElBQUEsQ0FBQSxRQUFBLEVB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QUEsSUFBQSxHQUFBLElBQUE7QUFDQSxpQkFGQTtBQUdBLGFBSkE7O0FBTUEsZ0JBQUEsYUFBQSxTQUFBLFVBQUEsR0FBQTtBQUNBLHNCQUFBLElBQUEsR0FBQSxJQUFBO0FBQ0EsYUFGQTs7QUFJQTs7QUFFQSx1QkFBQSxHQUFBLENBQUEsWUFBQSxZQUFBLEVBQUEsT0FBQTtBQUNBLHVCQUFBLEdBQUEsQ0FBQSxZQUFBLGFBQUEsRUFBQSxVQUFBO0FBQ0EsdUJBQUEsR0FBQSxDQUFBLFlBQUEsY0FBQSxFQUFBLFVBQUE7QUFFQTs7QUEzQ0EsS0FBQTtBQStDQSxDQWpEQTs7QUNBQSxJQUFBLFNBQUEsQ0FBQSxlQUFBLEVBQUEsVUFBQSxlQUFBLEVBQUE7O0FBRUEsV0FBQTtBQUNBLGtCQUFBLEdBREE7QUFFQSxxQkFBQSx5REFGQTtBQUdBLGNBQUEsY0FBQSxLQUFBLEVBQUE7QUFDQSxvQkFBQSxHQUFBLENBQUEsaUNBQUE7QUFDQSxrQkFBQSxRQUFBLEdBQUEsZ0JBQUEsaUJBQUEsRUFBQTtBQUNBO0FBTkEsS0FBQTtBQVNBLENBWEEiLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0JztcbndpbmRvdy5hcHAgPSBhbmd1bGFyLm1vZHVsZSgnRnVsbHN0YWNrR2VuZXJhdGVkQXBwJywgWydmc2FQcmVCdWlsdCcsICd1aS5yb3V0ZXInLCAndWkuYm9vdHN0cmFwJywgJ25nQW5pbWF0ZSddKTtcblxuYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHVybFJvdXRlclByb3ZpZGVyLCAkbG9jYXRpb25Qcm92aWRlcikge1xuICAgIC8vIFRoaXMgdHVybnMgb2ZmIGhhc2hiYW5nIHVybHMgKC8jYWJvdXQpIGFuZCBjaGFuZ2VzIGl0IHRvIHNvbWV0aGluZyBub3JtYWwgKC9hYm91dClcbiAgICAkbG9jYXRpb25Qcm92aWRlci5odG1sNU1vZGUodHJ1ZSk7XG4gICAgLy8gSWYgd2UgZ28gdG8gYSBVUkwgdGhhdCB1aS1yb3V0ZXIgZG9lc24ndCBoYXZlIHJlZ2lzdGVyZWQsIGdvIHRvIHRoZSBcIi9cIiB1cmwuXG4gICAgJHVybFJvdXRlclByb3ZpZGVyLm90aGVyd2lzZSgnLycpO1xuICAgIC8vIFRyaWdnZXIgcGFnZSByZWZyZXNoIHdoZW4gYWNjZXNzaW5nIGFuIE9BdXRoIHJvdXRlXG4gICAgJHVybFJvdXRlclByb3ZpZGVyLndoZW4oJy9hdXRoLzpwcm92aWRlcicsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgd2luZG93LmxvY2F0aW9uLnJlbG9hZCgpO1xuICAgIH0pO1xufSk7XG5cbi8vIFRoaXMgYXBwLnJ1biBpcyBmb3IgY29udHJvbGxpbmcgYWNjZXNzIHRvIHNwZWNpZmljIHN0YXRlcy5cbmFwcC5ydW4oZnVuY3Rpb24gKCRyb290U2NvcGUsIEF1dGhTZXJ2aWNlLCAkc3RhdGUpIHtcblxuICAgIC8vIFRoZSBnaXZlbiBzdGF0ZSByZXF1aXJlcyBhbiBhdXRoZW50aWNhdGVkIHVzZXIuXG4gICAgdmFyIGRlc3RpbmF0aW9uU3RhdGVSZXF1aXJlc0F1dGggPSBmdW5jdGlvbiAoc3RhdGUpIHtcbiAgICAgICAgcmV0dXJuIHN0YXRlLmRhdGEgJiYgc3RhdGUuZGF0YS5hdXRoZW50aWNhdGU7XG4gICAgfTtcblxuICAgIC8vICRzdGF0ZUNoYW5nZVN0YXJ0IGlzIGFuIGV2ZW50IGZpcmVkXG4gICAgLy8gd2hlbmV2ZXIgdGhlIHByb2Nlc3Mgb2YgY2hhbmdpbmcgYSBzdGF0ZSBiZWdpbnMuXG4gICAgJHJvb3RTY29wZS4kb24oJyRzdGF0ZUNoYW5nZVN0YXJ0JywgZnVuY3Rpb24gKGV2ZW50LCB0b1N0YXRlLCB0b1BhcmFtcykge1xuXG4gICAgICAgIGlmICghZGVzdGluYXRpb25TdGF0ZVJlcXVpcmVzQXV0aCh0b1N0YXRlKSkge1xuICAgICAgICAgICAgLy8gVGhlIGRlc3RpbmF0aW9uIHN0YXRlIGRvZXMgbm90IHJlcXVpcmUgYXV0aGVudGljYXRpb25cbiAgICAgICAgICAgIC8vIFNob3J0IGNpcmN1aXQgd2l0aCByZXR1cm4uXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoQXV0aFNlcnZpY2UuaXNBdXRoZW50aWNhdGVkKCkpIHtcbiAgICAgICAgICAgIC8vIFRoZSB1c2VyIGlzIGF1dGhlbnRpY2F0ZWQuXG4gICAgICAgICAgICAvLyBTaG9ydCBjaXJjdWl0IHdpdGggcmV0dXJuLlxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2FuY2VsIG5hdmlnYXRpbmcgdG8gbmV3IHN0YXRlLlxuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICAgIEF1dGhTZXJ2aWNlLmdldExvZ2dlZEluVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgICAgIC8vIElmIGEgdXNlciBpcyByZXRyaWV2ZWQsIHRoZW4gcmVuYXZpZ2F0ZSB0byB0aGUgZGVzdGluYXRpb25cbiAgICAgICAgICAgIC8vICh0aGUgc2Vjb25kIHRpbWUsIEF1dGhTZXJ2aWNlLmlzQXV0aGVudGljYXRlZCgpIHdpbGwgd29yaylcbiAgICAgICAgICAgIC8vIG90aGVyd2lzZSwgaWYgbm8gdXNlciBpcyBsb2dnZWQgaW4sIGdvIHRvIFwibG9naW5cIiBzdGF0ZS5cbiAgICAgICAgICAgIGlmICh1c2VyKSB7XG4gICAgICAgICAgICAgICAgJHN0YXRlLmdvKHRvU3RhdGUubmFtZSwgdG9QYXJhbXMpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAkc3RhdGUuZ28oJ2xvZ2luJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgfSk7XG5cbn0pO1xuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcblxuICAgIC8vIFJlZ2lzdGVyIG91ciAqYWJvdXQqIHN0YXRlLlxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdhYm91dCcsIHtcbiAgICAgICAgdXJsOiAnL2Fib3V0JyxcbiAgICAgICAgY29udHJvbGxlcjogJ0Fib3V0Q29udHJvbGxlcicsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvYWJvdXQvYWJvdXQuaHRtbCdcbiAgICB9KTtcblxufSk7XG5cbmFwcC5jb250cm9sbGVyKCdBYm91dENvbnRyb2xsZXInLCBmdW5jdGlvbiAoJHNjb3BlLCBGdWxsc3RhY2tQaWNzKSB7XG5cbiAgICAvLyBJbWFnZXMgb2YgYmVhdXRpZnVsIEZ1bGxzdGFjayBwZW9wbGUuXG4gICAgJHNjb3BlLmltYWdlcyA9IF8uc2h1ZmZsZShGdWxsc3RhY2tQaWNzKTtcblxufSk7IiwiYXBwLmNvbnRyb2xsZXIoJ0NhcnRDdHJsJywgZnVuY3Rpb24oJHNjb3BlLCAkc3RhdGVQYXJhbXMsIENhcnQsIFByb2R1Y3Qpe1x0XG5cblx0JHNjb3BlLmNhcnRJdGVtcyA9IFtdO1xuXHQkc2NvcGUuZW1wdHlDYXJ0ID0gdHJ1ZTtcblxuXHR2YXIgY2FydEtleXMgPSBPYmplY3Qua2V5cyhDYXJ0LmdldCgpKTtcblxuXHRpZihjYXJ0S2V5cy5sZW5ndGggPiAwKXtcblx0XHQkc2NvcGUuZW1wdHlDYXJ0ID0gZmFsc2U7XG5cdFx0Y2FydEtleXMuZm9yRWFjaChmdW5jdGlvbihwcm9kdWN0SWQpe1xuXHRcdFx0Y29uc29sZS5sb2coXCJDdXJyZW50IFByb2R1Y3RJZCBvbiBDYXJ0IGlzOiBcIiwgcHJvZHVjdElkKTtcblx0XHRcdHJldHVybiBQcm9kdWN0LmdldE9uZVByb2R1Y3QocHJvZHVjdElkKVxuXHRcdFx0LnRoZW4oZnVuY3Rpb24ocHJvZHVjdCl7XG5cdFx0XHRcdHZhciBxdWFudGl0eSA9IGxvY2FsU3RvcmFnZVtwcm9kdWN0SWRdO1xuXHRcdFx0XHRjb25zb2xlLmxvZyhcIlByb2R1Y3QgZm91bmQsIHF1YW50aXR5IGlzOiBcIiwgcXVhbnRpdHksIFwiIGFuZCBpdGVtIGlzOiBcIiwgcHJvZHVjdCk7XG5cdFx0XHRcdCRzY29wZS5jYXJ0SXRlbXMucHVzaCh7XG5cdFx0XHRcdFx0cXVhbnRpdHk6IHF1YW50aXR5LFxuXHRcdFx0XHRcdHByb2R1Y3Q6IHByb2R1Y3Rcblx0XHRcdFx0fSk7XG5cdFx0XHR9KTtcblx0XHR9KTtcblx0fVxuXG5cdC8vIExldCBjaGVja291dGFkZHJlc3MgZGVmYXVsdCB0byB1c2VyJ3MgYWRkcmVzc1xuXHQkc2NvcGUuZGVmYXVsdEFkZHJlc3MgPSAnJztcblx0Q2FydC5jaGVja291dEFkZHJlc3MoKVxuXHQudGhlbihmdW5jdGlvbih1c2VyQWRkcmVzcyl7XG5cdFx0JHNjb3BlLmRlZmF1bHRBZGRyZXNzID0gdXNlckFkZHJlc3Ncblx0fSk7XG5cblxuXHQvLyBjaGVja291dCBmb3JtIGhhcyBuZy1tb2RlbD0ndHlwZWRBZGRyZXNzJ1xuXHQkc2NvcGUuY2hlY2tvdXQgPSBmdW5jdGlvbiAoKSB7XG5cdFx0Ly8gQ29udmVydHMgY2FydEl0ZW1zIChhcnJheSBvZiBvYmpzKSBpbnRvIGNhcnRJZHMgKGFycmF5IG9mIFByb2QgaWRzKVxuXHRcdHZhciBjYXJ0SWRzID0gW107XG5cdFx0JHNjb3BlLmNhcnRJdGVtcy5mb3JFYWNoKGZ1bmN0aW9uKGl0ZW0pe1xuXHRcdFx0Zm9yKHZhciBpID0gMDsgaSA8IGl0ZW0ucXVhbnRpdHk7IGkrKyl7XG5cdFx0XHRcdGNhcnRJZHMucHVzaChpdGVtLnByb2R1Y3QuaWQpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHRcdCRzY29wZS5jYXJ0SXRlbXMgPSBbXTtcblx0XHRDYXJ0LmVtcHR5KClcblx0XHRyZXR1cm4gQ2FydC5jaGVja291dCgkc2NvcGUudHlwZWRBZGRyZXNzLCBjYXJ0SWRzKTtcblx0fTtcblx0XG59KTtcblxuIiwiYXBwLmZhY3RvcnkoJ0NhcnQnLCBmdW5jdGlvbiAoJHN0YXRlLCAkaHR0cCwgUHJvZHVjdCkge1xuICAgIHZhciBDYXJ0RmFjdG9yeSA9IHt9XG4gICAgLy9jYXJ0ID0ge3Byb2R1Y3RLZXkxOiBxdWFudGl0eTEsIHByb2R1Y3RLZXkyOiBxdWFudGl0eTIuLi4gfVxuXG4gICAgQ2FydEZhY3RvcnkuYWRkID0gZnVuY3Rpb24gKHByb2R1Y3RJZCwgcXVhbnRpdHkpIHtcbiAgICAgICAgbGV0IG51bWJlciA9IE51bWJlcihsb2NhbFN0b3JhZ2UuZ2V0SXRlbShwcm9kdWN0SWQpKSArIE51bWJlcihxdWFudGl0eSkgfHwgTnVtYmVyKHF1YW50aXR5KTtcbiAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0ocHJvZHVjdElkLCBudW1iZXIpO1xuICAgIH1cblxuICAgIENhcnRGYWN0b3J5LnJlbW92ZSA9IGZ1bmN0aW9uIChwcm9kdWN0SWQpIHtcbiAgICAgICAgbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0ocHJvZHVjdElkKTtcbiAgICB9XG5cbiAgICBDYXJ0RmFjdG9yeS5lbXB0eSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgbG9jYWxTdG9yYWdlLmNsZWFyKCk7XG4gICAgfVxuICAgIFxuICAgIENhcnRGYWN0b3J5LmdldCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYobG9jYWxTdG9yYWdlW2xlbmd0aF0pIGRlbGV0ZSBsb2NhbFN0b3JhZ2UoJ2xlbmd0aCcpOyBcbiAgICAgICAgcmV0dXJuIGxvY2FsU3RvcmFnZTtcbiAgICB9XG5cbiAgICBDYXJ0RmFjdG9yeS5jaGVja291dCA9IGZ1bmN0aW9uIChhZGRyZXNzLCBjYXJ0SWRzKSB7XG4gICAgICAkc3RhdGUuZ28oJ2hvbWUnKTtcbiAgICAgIHJldHVybiAkaHR0cC5wb3N0KCcvYXBpL29yZGVycy9jaGVja291dC8nICsgYWRkcmVzcywgY2FydElkcyk7XG4gICAgfVxuXG4gICAgQ2FydEZhY3RvcnkuY2hlY2tvdXRBZGRyZXNzID0gZnVuY3Rpb24gKCl7XG4gICAgICByZXR1cm4gJGh0dHAuZ2V0KCdhcGkvYWNjb3VudCcpXG4gICAgICAudGhlbihmdW5jdGlvbihyZXNwb25zZSl7XG4gICAgICAgIHJldHVybiByZXNwb25zZS5kYXRhXG4gICAgICB9KVxuICAgICAgLnRoZW4oZnVuY3Rpb24odXNlcil7XG4gICAgICAgIGlmKCF1c2VyKSByZXR1cm4gJyc7XG4gICAgICAgIHJldHVybiB1c2VyLmFkZHJlc3NcbiAgICAgIH0pXG4gICAgfVxuXG4gICAgcmV0dXJuIENhcnRGYWN0b3J5O1xufSk7XG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdjYXJ0Jywge1xuICAgICAgICB1cmw6ICcvY2FydCcsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY2FydC9jYXJ0Lmh0bWwnLFxuICAgXHRcdCAgY29udHJvbGxlcjogJ0NhcnRDdHJsJ1xuICAgIH0pO1xufSk7XG5cbiIsIihmdW5jdGlvbiAoKSB7XG5cbiAgICAndXNlIHN0cmljdCc7XG5cbiAgICAvLyBIb3BlIHlvdSBkaWRuJ3QgZm9yZ2V0IEFuZ3VsYXIhIER1aC1kb3kuXG4gICAgaWYgKCF3aW5kb3cuYW5ndWxhcikgdGhyb3cgbmV3IEVycm9yKCdJIGNhblxcJ3QgZmluZCBBbmd1bGFyIScpO1xuXG4gICAgdmFyIGFwcCA9IGFuZ3VsYXIubW9kdWxlKCdmc2FQcmVCdWlsdCcsIFtdKTtcblxuICAgIGFwcC5mYWN0b3J5KCdTb2NrZXQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICghd2luZG93LmlvKSB0aHJvdyBuZXcgRXJyb3IoJ3NvY2tldC5pbyBub3QgZm91bmQhJyk7XG4gICAgICAgIHJldHVybiB3aW5kb3cuaW8od2luZG93LmxvY2F0aW9uLm9yaWdpbik7XG4gICAgfSk7XG5cbiAgICAvLyBBVVRIX0VWRU5UUyBpcyB1c2VkIHRocm91Z2hvdXQgb3VyIGFwcCB0b1xuICAgIC8vIGJyb2FkY2FzdCBhbmQgbGlzdGVuIGZyb20gYW5kIHRvIHRoZSAkcm9vdFNjb3BlXG4gICAgLy8gZm9yIGltcG9ydGFudCBldmVudHMgYWJvdXQgYXV0aGVudGljYXRpb24gZmxvdy5cbiAgICBhcHAuY29uc3RhbnQoJ0FVVEhfRVZFTlRTJywge1xuICAgICAgICBsb2dpblN1Y2Nlc3M6ICdhdXRoLWxvZ2luLXN1Y2Nlc3MnLFxuICAgICAgICBsb2dpbkZhaWxlZDogJ2F1dGgtbG9naW4tZmFpbGVkJyxcbiAgICAgICAgbG9nb3V0U3VjY2VzczogJ2F1dGgtbG9nb3V0LXN1Y2Nlc3MnLFxuICAgICAgICBzZXNzaW9uVGltZW91dDogJ2F1dGgtc2Vzc2lvbi10aW1lb3V0JyxcbiAgICAgICAgbm90QXV0aGVudGljYXRlZDogJ2F1dGgtbm90LWF1dGhlbnRpY2F0ZWQnLFxuICAgICAgICBub3RBdXRob3JpemVkOiAnYXV0aC1ub3QtYXV0aG9yaXplZCdcbiAgICB9KTtcblxuICAgIGFwcC5mYWN0b3J5KCdBdXRoSW50ZXJjZXB0b3InLCBmdW5jdGlvbiAoJHJvb3RTY29wZSwgJHEsIEFVVEhfRVZFTlRTKSB7XG4gICAgICAgIHZhciBzdGF0dXNEaWN0ID0ge1xuICAgICAgICAgICAgNDAxOiBBVVRIX0VWRU5UUy5ub3RBdXRoZW50aWNhdGVkLFxuICAgICAgICAgICAgNDAzOiBBVVRIX0VWRU5UUy5ub3RBdXRob3JpemVkLFxuICAgICAgICAgICAgNDE5OiBBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dCxcbiAgICAgICAgICAgIDQ0MDogQVVUSF9FVkVOVFMuc2Vzc2lvblRpbWVvdXRcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJlc3BvbnNlRXJyb3I6IGZ1bmN0aW9uIChyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdChzdGF0dXNEaWN0W3Jlc3BvbnNlLnN0YXR1c10sIHJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gJHEucmVqZWN0KHJlc3BvbnNlKVxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH0pO1xuXG4gICAgYXBwLmNvbmZpZyhmdW5jdGlvbiAoJGh0dHBQcm92aWRlcikge1xuICAgICAgICAkaHR0cFByb3ZpZGVyLmludGVyY2VwdG9ycy5wdXNoKFtcbiAgICAgICAgICAgICckaW5qZWN0b3InLFxuICAgICAgICAgICAgZnVuY3Rpb24gKCRpbmplY3Rvcikge1xuICAgICAgICAgICAgICAgIHJldHVybiAkaW5qZWN0b3IuZ2V0KCdBdXRoSW50ZXJjZXB0b3InKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgXSk7XG4gICAgfSk7XG5cbiAgICBhcHAuc2VydmljZSgnQXV0aFNlcnZpY2UnLCBmdW5jdGlvbiAoJGh0dHAsIFNlc3Npb24sICRyb290U2NvcGUsIEFVVEhfRVZFTlRTLCAkcSkge1xuXG4gICAgICAgIGZ1bmN0aW9uIG9uU3VjY2Vzc2Z1bExvZ2luKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICB2YXIgZGF0YSA9IHJlc3BvbnNlLmRhdGE7XG4gICAgICAgICAgICBTZXNzaW9uLmNyZWF0ZShkYXRhLmlkLCBkYXRhLnVzZXIpO1xuICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KEFVVEhfRVZFTlRTLmxvZ2luU3VjY2Vzcyk7XG4gICAgICAgICAgICByZXR1cm4gZGF0YS51c2VyO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXNlcyB0aGUgc2Vzc2lvbiBmYWN0b3J5IHRvIHNlZSBpZiBhblxuICAgICAgICAvLyBhdXRoZW50aWNhdGVkIHVzZXIgaXMgY3VycmVudGx5IHJlZ2lzdGVyZWQuXG4gICAgICAgIHRoaXMuaXNBdXRoZW50aWNhdGVkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuICEhU2Vzc2lvbi51c2VyO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuZ2V0TG9nZ2VkSW5Vc2VyID0gZnVuY3Rpb24gKGZyb21TZXJ2ZXIpIHtcblxuICAgICAgICAgICAgLy8gSWYgYW4gYXV0aGVudGljYXRlZCBzZXNzaW9uIGV4aXN0cywgd2VcbiAgICAgICAgICAgIC8vIHJldHVybiB0aGUgdXNlciBhdHRhY2hlZCB0byB0aGF0IHNlc3Npb25cbiAgICAgICAgICAgIC8vIHdpdGggYSBwcm9taXNlLiBUaGlzIGVuc3VyZXMgdGhhdCB3ZSBjYW5cbiAgICAgICAgICAgIC8vIGFsd2F5cyBpbnRlcmZhY2Ugd2l0aCB0aGlzIG1ldGhvZCBhc3luY2hyb25vdXNseS5cblxuICAgICAgICAgICAgLy8gT3B0aW9uYWxseSwgaWYgdHJ1ZSBpcyBnaXZlbiBhcyB0aGUgZnJvbVNlcnZlciBwYXJhbWV0ZXIsXG4gICAgICAgICAgICAvLyB0aGVuIHRoaXMgY2FjaGVkIHZhbHVlIHdpbGwgbm90IGJlIHVzZWQuXG5cbiAgICAgICAgICAgIGlmICh0aGlzLmlzQXV0aGVudGljYXRlZCgpICYmIGZyb21TZXJ2ZXIgIT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJHEud2hlbihTZXNzaW9uLnVzZXIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBNYWtlIHJlcXVlc3QgR0VUIC9zZXNzaW9uLlxuICAgICAgICAgICAgLy8gSWYgaXQgcmV0dXJucyBhIHVzZXIsIGNhbGwgb25TdWNjZXNzZnVsTG9naW4gd2l0aCB0aGUgcmVzcG9uc2UuXG4gICAgICAgICAgICAvLyBJZiBpdCByZXR1cm5zIGEgNDAxIHJlc3BvbnNlLCB3ZSBjYXRjaCBpdCBhbmQgaW5zdGVhZCByZXNvbHZlIHRvIG51bGwuXG4gICAgICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvc2Vzc2lvbicpLnRoZW4ob25TdWNjZXNzZnVsTG9naW4pLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5sb2dpbiA9IGZ1bmN0aW9uIChjcmVkZW50aWFscykge1xuICAgICAgICAgICAgcmV0dXJuICRodHRwLnBvc3QoJy9sb2dpbicsIGNyZWRlbnRpYWxzKVxuICAgICAgICAgICAgICAgIC50aGVuKG9uU3VjY2Vzc2Z1bExvZ2luKVxuICAgICAgICAgICAgICAgIC5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3QoeyBtZXNzYWdlOiAnSW52YWxpZCBsb2dpbiBjcmVkZW50aWFscy4nIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMubG9nb3V0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuICRodHRwLmdldCgnL2xvZ291dCcpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIFNlc3Npb24uZGVzdHJveSgpO1xuICAgICAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdChBVVRIX0VWRU5UUy5sb2dvdXRTdWNjZXNzKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuXG4gICAgfSk7XG5cbiAgICBhcHAuc2VydmljZSgnU2Vzc2lvbicsIGZ1bmN0aW9uICgkcm9vdFNjb3BlLCBBVVRIX0VWRU5UUykge1xuXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5ub3RBdXRoZW50aWNhdGVkLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzZWxmLmRlc3Ryb3koKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMuc2Vzc2lvblRpbWVvdXQsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNlbGYuZGVzdHJveSgpO1xuICAgICAgICB9KTtcblxuICAgICAgICB0aGlzLmlkID0gbnVsbDtcbiAgICAgICAgdGhpcy51c2VyID0gbnVsbDtcblxuICAgICAgICB0aGlzLmNyZWF0ZSA9IGZ1bmN0aW9uIChzZXNzaW9uSWQsIHVzZXIpIHtcbiAgICAgICAgICAgIHRoaXMuaWQgPSBzZXNzaW9uSWQ7XG4gICAgICAgICAgICB0aGlzLnVzZXIgPSB1c2VyO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuZGVzdHJveSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHRoaXMuaWQgPSBudWxsO1xuICAgICAgICAgICAgdGhpcy51c2VyID0gbnVsbDtcbiAgICAgICAgfTtcblxuICAgIH0pO1xuXG59KSgpO1xuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnaG9tZScsIHtcbiAgICAgIHVybDogJy8nLFxuICAgICAgdGVtcGxhdGVVcmw6ICdqcy9ob21lL2hvbWUuaHRtbCcsXG4gICBcdFx0Y29udHJvbGxlcjogZnVuY3Rpb24oJHNjb3BlLCBob21lcGFnZSl7XG4gICBcdFx0XHRob21lcGFnZS5nZXRBbGxQcm9kdWN0cygpLnRoZW4oZnVuY3Rpb24oYWxsUHJvZHVjdHMpe1xuICAgXHRcdFx0XHQkc2NvcGUucHJvZHVjdHMgPSBhbGxQcm9kdWN0c1xuICAgXHRcdFx0fSlcbiAgIFx0XHR9IFxuICAgIH0pO1xufSk7XG5cbmFwcC5mYWN0b3J5KCdob21lcGFnZScsIGZ1bmN0aW9uKCRodHRwKXtcbiAgICB2YXIgZ2V0QWxsUHJvZHVjdHMgPSBmdW5jdGlvbigpe1xuICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvYXBpL3Byb2R1Y3RzJykudGhlbihmdW5jdGlvbihwcm9kdWN0cyl7XG4gICAgICAgICAgICByZXR1cm4gcHJvZHVjdHMuZGF0YTtcbiAgICAgICAgfSlcbiAgICB9XG5cdHJldHVybiB7XG4gICAgZ2V0QWxsUHJvZHVjdHM6IGdldEFsbFByb2R1Y3RzXG5cdH0gICAgXG59KSIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnbG9naW4nLCB7XG4gICAgICAgIHVybDogJy9sb2dpbicsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvbG9naW4vbG9naW4uaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdMb2dpbkN0cmwnXG4gICAgfSk7XG5cbn0pO1xuXG5hcHAuY29udHJvbGxlcignTG9naW5DdHJsJywgZnVuY3Rpb24gKCRzY29wZSwgQXV0aFNlcnZpY2UsICRzdGF0ZSkge1xuXG4gICAgJHNjb3BlLmxvZ2luID0ge307XG4gICAgJHNjb3BlLmVycm9yID0gbnVsbDtcblxuICAgICRzY29wZS5zZW5kTG9naW4gPSBmdW5jdGlvbiAobG9naW5JbmZvKSB7XG5cbiAgICAgICAgJHNjb3BlLmVycm9yID0gbnVsbDtcblxuICAgICAgICBBdXRoU2VydmljZS5sb2dpbihsb2dpbkluZm8pLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgJHN0YXRlLmdvKCdob21lJyk7XG4gICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICRzY29wZS5lcnJvciA9ICdJbnZhbGlkIGxvZ2luIGNyZWRlbnRpYWxzLic7XG4gICAgICAgIH0pO1xuXG4gICAgfTtcblxufSk7IiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcblxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdtZW1iZXJzT25seScsIHtcbiAgICAgICAgdXJsOiAnL2FjY291bnQnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL21lbWJlcnMtb25seS9tZW1iZXJzLW9ubHkuaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6IGZ1bmN0aW9uICgkc2NvcGUsIEFjY291bnQsICRsb2cpIHtcbiAgICAgICAgICAgIEFjY291bnQuZ2V0QWNjb3VudEluZm8oKS50aGVuKGZ1bmN0aW9uICh1c2VyQWNjb3VudCkge1xuICAgICAgICAgICAgICAgICRzY29wZS5hY2NvdW50ID0gdXNlckFjY291bnQ7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLmNhdGNoKCRsb2cpO1xuICAgICAgICB9LFxuICAgICAgICAvLyBUaGUgZm9sbG93aW5nIGRhdGEuYXV0aGVudGljYXRlIGlzIHJlYWQgYnkgYW4gZXZlbnQgbGlzdGVuZXJcbiAgICAgICAgLy8gdGhhdCBjb250cm9scyBhY2Nlc3MgdG8gdGhpcyBzdGF0ZS4gUmVmZXIgdG8gYXBwLmpzLlxuICAgIH0pO1xuXG59KTtcblxuYXBwLmZhY3RvcnkoJ0FjY291bnQnLCBmdW5jdGlvbiAoJGh0dHApIHtcblxuICAgIHZhciBnZXRBY2NvdW50SW5mbyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuICRodHRwLmdldCgnL2FwaS9hY2NvdW50JykudGhlbihmdW5jdGlvbiAoQWNjb3VudCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJIZXkgd2hhdCdzIHVwXCIsIEFjY291bnQuZGF0YSk7XG4gICAgICAgICAgICByZXR1cm4gQWNjb3VudC5kYXRhO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgZ2V0QWNjb3VudEluZm86IGdldEFjY291bnRJbmZvXG4gICAgfTtcblxufSk7XG4iLCJhcHAuY29udHJvbGxlcignUHJvZHVjdEN0cmwnLCBmdW5jdGlvbigkc2NvcGUsIFByb2R1Y3QsICRzdGF0ZVBhcmFtcywgQ2FydCl7XG4gICRzY29wZS5DYXJ0ID0gQ2FydDtcblx0UHJvZHVjdC5nZXRPbmVQcm9kdWN0KCRzdGF0ZVBhcmFtcy5pZClcbiAgLnRoZW4oZnVuY3Rpb24ocHJvZHVjdCl7XG4gIFx0Y29uc29sZS5sb2cocHJvZHVjdClcblx0XHQkc2NvcGUucHJvZHVjdCA9IHByb2R1Y3Q7XG5cdH0pXG59KTtcblxuIiwiYXBwLmZhY3RvcnkoJ1Byb2R1Y3QnLCBmdW5jdGlvbigkaHR0cCl7XG5cdGxldCBnZXRPbmVQcm9kdWN0ID0gZnVuY3Rpb24oaWQpe1xuICAgIHJldHVybiAkaHR0cC5nZXQoJy9hcGkvcHJvZHVjdHMvJysgaWQpXG4gICAgLnRoZW4oZnVuY3Rpb24ocHJvZHVjdCl7XG5cdFx0ICByZXR1cm4gcHJvZHVjdC5kYXRhO1xuXHRcdH0pXG5cdH07XG5cbiAgcmV0dXJuIHtcblx0ICBnZXRPbmVQcm9kdWN0OiBnZXRPbmVQcm9kdWN0XG4gIH1cbn0pXG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdwcm9kdWN0Jywge1xuICAgICAgICB1cmw6ICcvcHJvZHVjdHMvOmlkJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9wcm9kdWN0L3Byb2R1Y3QuaHRtbCcsXG4gICBcdFx0ICBjb250cm9sbGVyOiAnUHJvZHVjdEN0cmwnXG4gICAgfSk7XG59KTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2RvY3MnLCB7XG4gICAgICAgIHVybDogJy9kb2NzJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9kb2NzL2RvY3MuaHRtbCdcbiAgICB9KTtcbn0pO1xuIiwiYXBwLmNvbnRyb2xsZXIoJ1Byb2R1Y3RzQ3RybCcsIGZ1bmN0aW9uKCRzY29wZSwgUHJvZHVjdHMpe1xuXG4gICAgJHNjb3BlLmNhdGVnb3JpZXMgPSBbJ3BhZGRsZXMnLCdiYWxscycsJ2Nhc2VzJywndGFibGVzJywncm9ib3RzJ107XG5cbiAgICAkc2NvcGUuY2F0ZWdvcmllc0Z1bmMgPSBQcm9kdWN0cy5nZXRQcm9kdWN0c2J5Q2F0ZWdvcnk7XG5cbiAgICBQcm9kdWN0cy5nZXRQcm9kdWN0c2J5Q2F0ZWdvcnkoKVxuICAgIC50aGVuKGZ1bmN0aW9uKHByb2R1Y3RzSW5DYXRlZ29yeSl7XG4gICAgICAgICRzY29wZS5wcm9kdWN0cyA9IHByb2R1Y3RzSW5DYXRlZ29yeTtcbiAgICB9KTtcbn0pO1xuIiwiYXBwLmZhY3RvcnkoJ1Byb2R1Y3RzJywgZnVuY3Rpb24oJGh0dHApe1xuICAgIHZhciBnZXRBbGxQcm9kdWN0cyA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9hcGkvcHJvZHVjdHMnKVxuICAgICAgICAudGhlbihmdW5jdGlvbihwcm9kdWN0cyl7XG4gICAgICAgICAgICByZXR1cm4gcHJvZHVjdHMuZGF0YTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIHZhciBnZXRQcm9kdWN0c2J5Q2F0ZWdvcnkgPSBmdW5jdGlvbihjYXRlZ29yeSl7XG4gICAgICAgIGNhdGVnb3J5ID0gY2F0ZWdvcnkgfHwgMDtcbiAgICAgICAgaWYoY2F0ZWdvcnkgPT09IDApe1xuICAgICAgICAgICAgcmV0dXJuICRodHRwLmdldCgnL2FwaS9wcm9kdWN0cycpXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbihwcm9kdWN0cyl7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHByb2R1Y3RzLmRhdGE7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvYXBpL3Byb2R1Y3RzLz9jYXRlZ29yeT0nICsgY2F0ZWdvcnkpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKHByb2R1Y3RzSW5DYXRlZ29yeSl7XG4gICAgICAgICAgICByZXR1cm4gcHJvZHVjdHNJbkNhdGVnb3J5LmRhdGE7XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBnZXRQcm9kdWN0c2J5Q2F0ZWdvcnk6IGdldFByb2R1Y3RzYnlDYXRlZ29yeVxuICAgIH07XG59KVxuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcbsKgwqDCoMKgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ3Byb2R1Y3RzJywge1xuwqDCoMKgwqDCoMKgwqDCoHVybDogJy8nLFxuwqDCoMKgwqDCoMKgwqDCoHRlbXBsYXRlVXJsOiAnanMvcHJvZHVjdHMvcHJvZHVjdHMuaHRtbCcsXG7CoMKgwqDCoMKgwqDCoMKgY29udHJvbGxlcjogJ1Byb2R1Y3RzQ3RybCdcbsKgwqDCoMKgfSk7XG59KTsiLCJhcHAuZmFjdG9yeSgnRnVsbHN0YWNrUGljcycsIGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gW1xuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0I3Z0JYdWxDQUFBWFFjRS5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9mYmNkbi1zcGhvdG9zLWMtYS5ha2FtYWloZC5uZXQvaHBob3Rvcy1hay14YXAxL3QzMS4wLTgvMTA4NjI0NTFfMTAyMDU2MjI5OTAzNTkyNDFfODAyNzE2ODg0MzMxMjg0MTEzN19vLmpwZycsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQi1MS1VzaElnQUV5OVNLLmpwZycsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQjc5LVg3b0NNQUFrdzd5LmpwZycsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQi1VajlDT0lJQUlGQWgwLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQjZ5SXlGaUNFQUFxbDEyLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0UtVDc1bFdBQUFtcXFKLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0V2WkFnLVZBQUFrOTMyLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0VnTk1lT1hJQUlmRGhLLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0VReUlETldnQUF1NjBCLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0NGM1Q1UVc4QUUybEdKLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0FlVnc1U1dvQUFBTHNqLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0FhSklQN1VrQUFsSUdzLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0FRT3c5bFdFQUFZOUZsLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQi1PUWJWckNNQUFOd0lNLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQjliX2Vyd0NZQUF3UmNKLnBuZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQjVQVGR2bkNjQUVBbDR4LmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQjRxd0MwaUNZQUFsUEdoLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQjJiMzN2UklVQUE5bzFELmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQndwSXdyMUlVQUF2TzJfLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQnNTc2VBTkNZQUVPaEx3LmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0o0dkxmdVV3QUFkYTRMLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0k3d3pqRVZFQUFPUHBTLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0lkSHZUMlVzQUFubkhWLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0dDaVBfWVdZQUFvNzVWLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0lTNEpQSVdJQUkzN3F1LmpwZzpsYXJnZSdcbiAgICBdO1xufSk7XG4iLCJhcHAuZmFjdG9yeSgnUmFuZG9tR3JlZXRpbmdzJywgZnVuY3Rpb24gKCkge1xuXG4gICAgdmFyIGdldFJhbmRvbUZyb21BcnJheSA9IGZ1bmN0aW9uIChhcnIpIHtcbiAgICAgICAgcmV0dXJuIGFycltNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBhcnIubGVuZ3RoKV07XG4gICAgfTtcblxuICAgIHZhciBncmVldGluZ3MgPSBbXG4gICAgICAgICdXZWxjb21lIHRvIHRoZSBiZXN0IFBpbmctUG9uZyBzdG9yZSB0aGlzIHNpZGUgb2YgdGhlIEF0bGFudGljJyxcbiAgICAgICAgJ1lvdSBsb29rIGxpa2UgeW91IGNvdWxkIHVzZSBhIGJyYW5kIHNwYW5raW5nIG5ldyBwYWRkbGUnXG4gICAgXTtcblxuICAgIHJldHVybiB7XG4gICAgICAgIGdyZWV0aW5nczogZ3JlZXRpbmdzLFxuICAgICAgICBnZXRSYW5kb21HcmVldGluZzogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIGdldFJhbmRvbUZyb21BcnJheShncmVldGluZ3MpO1xuICAgICAgICB9XG4gICAgfTtcblxufSk7XG4iLCJhcHAuZGlyZWN0aXZlKCdmdWxsc3RhY2tMb2dvJywgZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvZnVsbHN0YWNrLWxvZ28vZnVsbHN0YWNrLWxvZ28uaHRtbCdcbiAgICB9O1xufSk7IiwiYXBwLmRpcmVjdGl2ZSgnbmF2YmFyJywgZnVuY3Rpb24gKCRyb290U2NvcGUsIEF1dGhTZXJ2aWNlLCBBVVRIX0VWRU5UUywgJHN0YXRlKSB7XG5cbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICBzY29wZToge30sXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvbmF2YmFyL25hdmJhci5odG1sJyxcbiAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlKSB7XG5cbiAgICAgICAgICAgIHNjb3BlLml0ZW1zID0gW1xuICAgICAgICAgICAgICAgIHsgbGFiZWw6ICdIb21lJywgc3RhdGU6ICdob21lJyB9LFxuICAgICAgICAgICAgICAgIHsgbGFiZWw6ICdBYm91dCcsIHN0YXRlOiAnYWJvdXQnIH0sXG4gICAgICAgICAgICAgICAgeyBsYWJlbDogJ015IENhcnQnLCBzdGF0ZTogJ2NhcnQnIH0sXG4gICAgICAgICAgICAgICAgeyBsYWJlbDogJ09yZGVyJywgc3RhdGU6ICdvcmRlcicsIGF1dGg6IHRydWV9LFxuICAgICAgICAgICAgICAgIHsgbGFiZWw6ICdNZW1iZXJzIE9ubHknLCBzdGF0ZTogJ21lbWJlcnNPbmx5JywgYXV0aDogdHJ1ZSB9LFxuICAgICAgICAgICAgICAgIHsgbGFiZWw6ICdBY2NvdW50Jywgc3RhdGU6ICdtZW1iZXJzT25seScsIGF1dGg6IHRydWV9XG4gICAgICAgICAgICBdO1xuXG4gICAgICAgICAgICBzY29wZS51c2VyID0gbnVsbDtcblxuICAgICAgICAgICAgc2NvcGUuaXNMb2dnZWRJbiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gQXV0aFNlcnZpY2UuaXNBdXRoZW50aWNhdGVkKCk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBzY29wZS5sb2dvdXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgQXV0aFNlcnZpY2UubG9nb3V0KCkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgJHN0YXRlLmdvKCdob21lJyk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB2YXIgc2V0VXNlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLnVzZXIgPSB1c2VyO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdmFyIHJlbW92ZVVzZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgc2NvcGUudXNlciA9IG51bGw7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBzZXRVc2VyKCk7XG5cbiAgICAgICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLmxvZ2luU3VjY2Vzcywgc2V0VXNlcik7XG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5sb2dvdXRTdWNjZXNzLCByZW1vdmVVc2VyKTtcbiAgICAgICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0LCByZW1vdmVVc2VyKTtcblxuICAgICAgICB9XG5cbiAgICB9O1xuXG59KTtcbiIsImFwcC5kaXJlY3RpdmUoJ3JhbmRvR3JlZXRpbmcnLCBmdW5jdGlvbiAoUmFuZG9tR3JlZXRpbmdzKSB7XG5cbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NvbW1vbi9kaXJlY3RpdmVzL3JhbmRvLWdyZWV0aW5nL3JhbmRvLWdyZWV0aW5nLmh0bWwnLFxuICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUpIHtcbiAgICAgICAgXHRcdGNvbnNvbGUubG9nKFwicmFuZG9HcmVldGluZyBsaW5rIGZ1bmN0aW9uIGhpdFwiKTtcbiAgICAgICAgICAgIHNjb3BlLmdyZWV0aW5nID0gUmFuZG9tR3JlZXRpbmdzLmdldFJhbmRvbUdyZWV0aW5nKCk7XG4gICAgICAgIH1cbiAgICB9O1xuXG59KTsiXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
