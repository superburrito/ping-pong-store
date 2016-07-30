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

app.controller('OrderCtrl', function ($scope, Order) {
    Order.show().then(function (allOrders) {
        $scope.orders = allOrders;
    });
});
app.factory('Order', function ($state, $http) {
    var OrderFactory = {};

    OrderFactory.show = function () {
        return $http.get('/api/orders').then(function (response) {
            console.log('here', response.data);
            return response.data;
        });
    };
    return OrderFactory;
});
app.config(function ($stateProvider) {
    $stateProvider.state('order', {
        url: '/order',
        templateUrl: 'js/order/order.html',
        controller: 'OrderCtrl'
    });
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
app.config(function ($stateProvider) {
    $stateProvider.state('docs', {
        url: '/docs',
        templateUrl: 'js/docs/docs.html'
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

            scope.items = [{ label: 'About', state: 'about' }, { label: 'My Cart', state: 'cart' }, { label: 'Order', state: 'order', auth: true }, { label: 'Account', state: 'membersOnly', auth: true }];

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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImFib3V0L2Fib3V0LmpzIiwiY2FydC9jYXJ0LmNvbnRyb2xsZXIuanMiLCJjYXJ0L2NhcnQuZmFjdG9yeS5qcyIsImNhcnQvY2FydC5zdGF0ZS5qcyIsImZzYS9mc2EtcHJlLWJ1aWx0LmpzIiwiaG9tZS9ob21lLmpzIiwibG9naW4vbG9naW4uanMiLCJtZW1iZXJzLW9ubHkvbWVtYmVycy1vbmx5LmpzIiwib3JkZXIvb3JkZXIuY29udHJvbGxlci5qcyIsIm9yZGVyL29yZGVyLmZhY3RvcnkuanMiLCJvcmRlci9vcmRlci5zdGF0ZS5qcyIsInByb2R1Y3QvcHJvZHVjdC5jb250cm9sbGVyLmpzIiwicHJvZHVjdC9wcm9kdWN0LmZhY3RvcnkuanMiLCJwcm9kdWN0L3Byb2R1Y3Quc3RhdGUuanMiLCJwcm9kdWN0cy9wcm9kdWN0cy5jb250cm9sbGVyLmpzIiwicHJvZHVjdHMvcHJvZHVjdHMuZmFjdG9yeS5qcyIsInByb2R1Y3RzL3Byb2R1Y3RzLnN0YXRlLmpzIiwic2lnbnVwL2RvY3MuanMiLCJjb21tb24vZmFjdG9yaWVzL0Z1bGxzdGFja1BpY3MuanMiLCJjb21tb24vZmFjdG9yaWVzL1JhbmRvbUdyZWV0aW5ncy5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL2Z1bGxzdGFjay1sb2dvL2Z1bGxzdGFjay1sb2dvLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvbmF2YmFyL25hdmJhci5qcyIsImNvbW1vbi9kaXJlY3RpdmVzL3JhbmRvLWdyZWV0aW5nL3JhbmRvLWdyZWV0aW5nLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOztBQUNBLE9BQUEsR0FBQSxHQUFBLFFBQUEsTUFBQSxDQUFBLHVCQUFBLEVBQUEsQ0FBQSxhQUFBLEVBQUEsV0FBQSxFQUFBLGNBQUEsRUFBQSxXQUFBLENBQUEsQ0FBQTs7QUFFQSxJQUFBLE1BQUEsQ0FBQSxVQUFBLGtCQUFBLEVBQUEsaUJBQUEsRUFBQTtBQUNBO0FBQ0Esc0JBQUEsU0FBQSxDQUFBLElB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QSxLQUFBLE9BQUEsQ0FBQSxFQUFBO0FBQ0E7QUFDQSxTQUpBO0FBS0EsZUFBQSxTQUFBLEdBQUEsRUFBQTtBQUNBLGFBQUEsS0FBQTtBQUNBLGVBQUEsS0FBQSxRQUFBLENBQUEsT0FBQSxZQUFBLEVBQUEsT0FBQSxDQUFBO0FBQ0EsS0FYQTtBQWFBLENBN0NBOztBQ0FBLElBQUEsT0FBQSxDQUFBLE1BQUEsRUFBQSxVQUFBLE1BQUEsRUFBQSxLQUFBLEVBQUEsT0FBQSxFQUFBO0FBQ0EsUUFBQSxjQUFBLEVBQUE7QUFDQTs7QUFFQSxnQkFBQSxHQUFBLEdBQUEsVUFBQSxTQUFBLEVBQUEsUUFBQSxFQUFBO0FBQ0EsWUFBQSxTQUFBLE9BQUEsYUFBQSxPQUFBLENBQUEsU0FBQSxDQUFBLElBQUEsT0FBQSxRQUFBLENBQUEsSUFBQSxPQUFBLFFBQUEsQ0FBQTtBQUNBLHFCQUFBLE9BQUEsQ0FBQSxTQUFBLEVBQUEsTUFBQTtBQUNBLEtBSEE7O0FBS0EsZ0JBQUEsTUFBQSxHQUFBLFVBQUEsU0FBQSxFQUFBO0FBQ0EscUJBQUEsVUFBQSxDQUFBLFNBQUE7QUFDQSxLQUZBOztBQUlBLGdCQUFBLEtBQUEsR0FBQSxZQUFBO0FBQ0EscUJBQUEsS0FBQTtBQUNBLEtBRkE7O0FBSUEsZ0JBQUEsR0FBQSxHQUFBLFlBQUE7QUFDQSxZQUFBLGFBQUEsTUFBQSxDQUFBLEVBQUEsT0FBQSxhQUFBLFFBQUEsQ0FBQTtBQUNBLGVBQUEsWUFBQTtBQUNBLEtBSEE7O0FBS0EsZ0JBQUEsUUFBQSxHQUFBLFVBQUEsT0FBQSxFQUFBLE9BQUEsRUFBQTtBQUNBLGVBQUEsRUFBQSxDQUFBLE1BQUE7QUFDQSxlQUFBLE1BQUEsSUFBQSxDQUFBLDBCQUFBLE9BQUEsRUFBQSxPQUFBLENBQUE7QUFDQSxLQUhBOztBQUtBLGdCQUFBLGVBQUEsR0FBQSxZQUFBO0FBQ0EsZUFBQSxNQUFBLEdBQUEsQ0FBQSxhQUFBLEVBQ0EsSUFEQSxDQUNBLFVBQUEsUUFBQSxFQUFBO0FBQ0EsbUJBQUEsU0FBQSxJQUFBO0FBQ0EsU0FIQSxFQUlB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QUFBLE1BQUEsRUFBQTtBQUNBLGFBQUEsR0FEQTtBQUVBLHFCQUFBLG1CQUZBO0FBR0Esb0JBQUEsb0JBQUEsTUFBQSxFQUFBLFFBQUEsRUFBQTtBQUNBLHFCQUFBLGNBQUEsR0FBQSxJQUFBLENBQUEsVUFBQSxXQUFBLEVBQUE7QUFDQSx1QkFBQSxRQUFBLEdBQUEsV0FBQTtBQUNBLGFBRkE7QUFHQTtBQVBBLEtBQUE7QUFTQSxDQVZBOztBQVlBLElBQUEsT0FBQSxDQUFBLFVBQUEsRUFBQSxVQUFBLEtBQUEsRUFBQTtBQUNBLFFBQUEsaUJBQUEsU0FBQSxjQUFBLEdBQUE7QUFDQSxlQUFBLE1BQUEsR0FBQSxDQUFBLGVBQUEsRUFBQSxJQUFBLENBQUEsVUFBQSxRQUFBLEVBQUE7QUFDQSxtQkFBQSxTQUFBLElBQUE7QUFDQSxTQUZBLENBQUE7QUFHQSxLQUpBO0FBS0EsV0FBQTtBQUNBLHdCQUFBO0FBREEsS0FBQTtBQUdBLENBVEE7QUNaQSxJQUFBLE1BQUEsQ0FBQSxVQUFBLGNBQUEsRUFBQTs7QUFFQSxtQkFBQSxLQUFBLENBQUEsT0FBQSxFQUFBO0FBQ0EsYUFBQSxRQURBO0FBRUEscUJBQUEscUJBRkE7QUFHQSxvQkFBQTtBQUhBLEtBQUE7QUFNQSxDQVJBOztBQVVBLElBQUEsVUFBQSxDQUFBLFdBQUEsRUFBQSxVQUFBLE1BQUEsRUFBQSxXQUFBLEVBQUEsTUFBQSxFQUFBOztBQUVBLFdBQUEsS0FBQSxHQUFBLEVBQUE7QUFDQSxXQUFBLEtBQUEsR0FBQSxJQUFBOztBQUVBLFdBQUEsU0FBQSxHQUFBLFVBQUEsU0FBQSxFQUFBOztBQUVBLGVBQUEsS0FBQSxHQUFBLElBQUE7O0FBRUEsb0JBQUEsS0FBQSxDQUFBLFNBQUEsRUFBQSxJQUFBLENBQUEsWUFBQTtBQUNBLG1CQUFBLEVBQUEsQ0FBQSxNQUFBO0FBQ0EsU0FGQSxFQUVBLEtBRkEsQ0FFQSxZQUFBO0FBQ0EsbUJBQUEsS0FBQSxHQUFBLDRCQUFBO0FBQ0EsU0FKQTtBQU1BLEtBVkE7QUFZQSxDQWpCQTtBQ1ZBLElBQUEsTUFBQSxD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UUFBQSxDQUFBOztBQUVBLFdBQUEsY0FBQSxHQUFBLFNBQUEscUJBQUE7O0FBRUEsYUFBQSxxQkFBQSxHQUNBLElBREEsQ0FDQSxVQUFBLGtCQUFBLEVBQUE7QUFDQSxlQUFBLFFBQUEsR0FBQSxrQkFBQTtBQUNBLEtBSEE7QUFJQSxDQVZBOztBQ0FBLElBQUEsT0FBQSxDQUFBLFVBQUEsRUFBQSxVQUFBLEtBQUEsRUFBQTtBQUNBLFFBQUEsaUJBQUEsU0FBQSxjQUFBLEdBQUE7QUFDQSxlQUFBLE1BQUEsR0FBQSxDQUFBLGVBQUEsRUFDQSxJQURBLENBQ0EsVUFBQSxRQUFBLEVBQUE7QUFDQSxtQkFBQSxTQUFBLElBQUE7QUFDQSxTQUhBLENBQUE7QUFJQSxLQUxBOztBQU9BLFFBQUEsd0JBQUEsU0FBQSxxQkFBQSxDQUFBLFFBQUEsRUFBQTtBQUNBLG1CQUFBLFlBQUEsQ0FBQTtBQUNBLFlBQUEsYUFBQSxDQUFBLEVBQUE7QUFDQSxtQkFBQSxNQUFBLEdBQUEsQ0FBQSxlQUFBLEVBQ0EsSUFEQSxDQUNBLFVBQUEsUUFBQSxFQUFBO0FBQ0EsdUJBQUEsU0FBQSxJQUFBO0FBQ0EsYUFIQSxDQUFBO0FBSUE7QUFDQSxlQUFBLE1BQUEsR0FBQSxDQUFBLDZCQUFBLFFBQUEsRUFDQSxJQURBLENBQ0EsVUFBQSxrQkFBQSxFQUFBO0FBQ0EsbUJBQUEsbUJBQUEsSUFBQTtBQUNBLFNBSEEsQ0FBQTtBQUlBLEtBWkE7O0FBY0EsV0FBQTtBQUNBLCtCQUFBO0FBREEsS0FBQTtBQUdBLENBekJBOztBQ0FBLElBQUEsTUFBQSxDQUFBLFVBQUEsY0FBQSxFQUFBO0FBQ0EsbUJBQUEsS0FBQSxDQUFBLFVBQUEsRUFBQTtBQUNBLGFBQUEsR0FEQTtBQUVBLHFCQUFBLDJCQUZBO0FBR0Esb0JBQUE7QUFIQSxLQUFBO0FBS0EsQ0FOQTtBQ0FBLElBQUEsTUFBQSxDQUFBLFVBQUEsY0FBQSxFQUFBO0FBQ0EsbUJBQUEsS0FBQSxDQUFBLE1BQUEsRUFBQTtBQUNBLGFBQUEsT0FEQTtBQUVBLHFCQUFBO0FBRkEsS0FBQTtB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LEtBQUEsRUFBQTtBQUNBLG9CQUFBLEdBQUEsQ0FBQSxpQ0FBQTtBQUNBLGtCQUFBLFFBQUEsR0FBQSxnQkFBQSxpQkFBQSxFQUFBO0FBQ0E7QUFOQSxLQUFBO0FBU0EsQ0FYQSIsImZpbGUiOiJtYWluLmpzIiwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xud2luZG93LmFwcCA9IGFuZ3VsYXIubW9kdWxlKCdGdWxsc3RhY2tHZW5lcmF0ZWRBcHAnLCBbJ2ZzYVByZUJ1aWx0JywgJ3VpLnJvdXRlcicsICd1aS5ib290c3RyYXAnLCAnbmdBbmltYXRlJ10pO1xuXG5hcHAuY29uZmlnKGZ1bmN0aW9uICgkdXJsUm91dGVyUHJvdmlkZXIsICRsb2NhdGlvblByb3ZpZGVyKSB7XG4gICAgLy8gVGhpcyB0dXJucyBvZmYgaGFzaGJhbmcgdXJscyAoLyNhYm91dCkgYW5kIGNoYW5nZXMgaXQgdG8gc29tZXRoaW5nIG5vcm1hbCAoL2Fib3V0KVxuICAgICRsb2NhdGlvblByb3ZpZGVyLmh0bWw1TW9kZSh0cnVlKTtcbiAgICAvLyBJZiB3ZSBnbyB0byBhIFVSTCB0aGF0IHVpLXJvdXRlciBkb2Vzbid0IGhhdmUgcmVnaXN0ZXJlZCwgZ28gdG8gdGhlIFwiL1wiIHVybC5cbiAgICAkdXJsUm91dGVyUHJvdmlkZXIub3RoZXJ3aXNlKCcvJyk7XG4gICAgLy8gVHJpZ2dlciBwYWdlIHJlZnJlc2ggd2hlbiBhY2Nlc3NpbmcgYW4gT0F1dGggcm91dGVcbiAgICAkdXJsUm91dGVyUHJvdmlkZXIud2hlbignL2F1dGgvOnByb3ZpZGVyJywgZnVuY3Rpb24gKCkge1xuICAgICAgICB3aW5kb3cubG9jYXRpb24ucmVsb2FkKCk7XG4gICAgfSk7XG59KTtcblxuLy8gVGhpcyBhcHAucnVuIGlzIGZvciBjb250cm9sbGluZyBhY2Nlc3MgdG8gc3BlY2lmaWMgc3RhdGVzLlxuYXBwLnJ1bihmdW5jdGlvbiAoJHJvb3RTY29wZSwgQXV0aFNlcnZpY2UsICRzdGF0ZSkge1xuXG4gICAgLy8gVGhlIGdpdmVuIHN0YXRlIHJlcXVpcmVzIGFuIGF1dGhlbnRpY2F0ZWQgdXNlci5cbiAgICB2YXIgZGVzdGluYXRpb25TdGF0ZVJlcXVpcmVzQXV0aCA9IGZ1bmN0aW9uIChzdGF0ZSkge1xuICAgICAgICByZXR1cm4gc3RhdGUuZGF0YSAmJiBzdGF0ZS5kYXRhLmF1dGhlbnRpY2F0ZTtcbiAgICB9O1xuXG4gICAgLy8gJHN0YXRlQ2hhbmdlU3RhcnQgaXMgYW4gZXZlbnQgZmlyZWRcbiAgICAvLyB3aGVuZXZlciB0aGUgcHJvY2VzcyBvZiBjaGFuZ2luZyBhIHN0YXRlIGJlZ2lucy5cbiAgICAkcm9vdFNjb3BlLiRvbignJHN0YXRlQ2hhbmdlU3RhcnQnLCBmdW5jdGlvbiAoZXZlbnQsIHRvU3RhdGUsIHRvUGFyYW1zKSB7XG5cbiAgICAgICAgaWYgKCFkZXN0aW5hdGlvblN0YXRlUmVxdWlyZXNBdXRoKHRvU3RhdGUpKSB7XG4gICAgICAgICAgICAvLyBUaGUgZGVzdGluYXRpb24gc3RhdGUgZG9lcyBub3QgcmVxdWlyZSBhdXRoZW50aWNhdGlvblxuICAgICAgICAgICAgLy8gU2hvcnQgY2lyY3VpdCB3aXRoIHJldHVybi5cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChBdXRoU2VydmljZS5pc0F1dGhlbnRpY2F0ZWQoKSkge1xuICAgICAgICAgICAgLy8gVGhlIHVzZXIgaXMgYXV0aGVudGljYXRlZC5cbiAgICAgICAgICAgIC8vIFNob3J0IGNpcmN1aXQgd2l0aCByZXR1cm4uXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDYW5jZWwgbmF2aWdhdGluZyB0byBuZXcgc3RhdGUuXG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgICAgICAgICAgLy8gSWYgYSB1c2VyIGlzIHJldHJpZXZlZCwgdGhlbiByZW5hdmlnYXRlIHRvIHRoZSBkZXN0aW5hdGlvblxuICAgICAgICAgICAgLy8gKHRoZSBzZWNvbmQgdGltZSwgQXV0aFNlcnZpY2UuaXNBdXRoZW50aWNhdGVkKCkgd2lsbCB3b3JrKVxuICAgICAgICAgICAgLy8gb3RoZXJ3aXNlLCBpZiBubyB1c2VyIGlzIGxvZ2dlZCBpbiwgZ28gdG8gXCJsb2dpblwiIHN0YXRlLlxuICAgICAgICAgICAgaWYgKHVzZXIpIHtcbiAgICAgICAgICAgICAgICAkc3RhdGUuZ28odG9TdGF0ZS5uYW1lLCB0b1BhcmFtcyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICRzdGF0ZS5nbygnbG9naW4nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICB9KTtcblxufSk7XG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuXG4gICAgLy8gUmVnaXN0ZXIgb3VyICphYm91dCogc3RhdGUuXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2Fib3V0Jywge1xuICAgICAgICB1cmw6ICcvYWJvdXQnLFxuICAgICAgICBjb250cm9sbGVyOiAnQWJvdXRDb250cm9sbGVyJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9hYm91dC9hYm91dC5odG1sJ1xuICAgIH0pO1xuXG59KTtcblxuYXBwLmNvbnRyb2xsZXIoJ0Fib3V0Q29udHJvbGxlcicsIGZ1bmN0aW9uICgkc2NvcGUsIEZ1bGxzdGFja1BpY3MpIHtcblxuICAgIC8vIEltYWdlcyBvZiBiZWF1dGlmdWwgRnVsbHN0YWNrIHBlb3BsZS5cbiAgICAkc2NvcGUuaW1hZ2VzID0gXy5zaHVmZmxlKEZ1bGxzdGFja1BpY3MpO1xuXG59KTsiLCJhcHAuY29udHJvbGxlcignQ2FydEN0cmwnLCBmdW5jdGlvbigkc2NvcGUsICRzdGF0ZVBhcmFtcywgQ2FydCwgUHJvZHVjdCl7XHRcblxuXHQkc2NvcGUuY2FydEl0ZW1zID0gW107XG5cdCRzY29wZS5lbXB0eUNhcnQgPSB0cnVlO1xuXG5cdHZhciBjYXJ0S2V5cyA9IE9iamVjdC5rZXlzKENhcnQuZ2V0KCkpO1xuXG5cdGlmKGNhcnRLZXlzLmxlbmd0aCA+IDApe1xuXHRcdCRzY29wZS5lbXB0eUNhcnQgPSBmYWxzZTtcblx0XHRjYXJ0S2V5cy5mb3JFYWNoKGZ1bmN0aW9uKHByb2R1Y3RJZCl7XG5cdFx0XHRjb25zb2xlLmxvZyhcIkN1cnJlbnQgUHJvZHVjdElkIG9uIENhcnQgaXM6IFwiLCBwcm9kdWN0SWQpO1xuXHRcdFx0cmV0dXJuIFByb2R1Y3QuZ2V0T25lUHJvZHVjdChwcm9kdWN0SWQpXG5cdFx0XHQudGhlbihmdW5jdGlvbihwcm9kdWN0KXtcblx0XHRcdFx0dmFyIHF1YW50aXR5ID0gbG9jYWxTdG9yYWdlW3Byb2R1Y3RJZF07XG5cdFx0XHRcdGNvbnNvbGUubG9nKFwiUHJvZHVjdCBmb3VuZCwgcXVhbnRpdHkgaXM6IFwiLCBxdWFudGl0eSwgXCIgYW5kIGl0ZW0gaXM6IFwiLCBwcm9kdWN0KTtcblx0XHRcdFx0JHNjb3BlLmNhcnRJdGVtcy5wdXNoKHtcblx0XHRcdFx0XHRxdWFudGl0eTogcXVhbnRpdHksXG5cdFx0XHRcdFx0cHJvZHVjdDogcHJvZHVjdFxuXHRcdFx0XHR9KTtcblx0XHRcdH0pO1xuXHRcdH0pO1xuXHR9XG5cblx0Ly8gTGV0IGNoZWNrb3V0YWRkcmVzcyBkZWZhdWx0IHRvIHVzZXIncyBhZGRyZXNzXG5cdCRzY29wZS5kZWZhdWx0QWRkcmVzcyA9ICcnO1xuXHRDYXJ0LmNoZWNrb3V0QWRkcmVzcygpXG5cdC50aGVuKGZ1bmN0aW9uKHVzZXJBZGRyZXNzKXtcblx0XHQkc2NvcGUuZGVmYXVsdEFkZHJlc3MgPSB1c2VyQWRkcmVzc1xuXHR9KTtcblxuXG5cdC8vIGNoZWNrb3V0IGZvcm0gaGFzIG5nLW1vZGVsPSd0eXBlZEFkZHJlc3MnXG5cdCRzY29wZS5jaGVja291dCA9IGZ1bmN0aW9uICgpIHtcblx0XHQvLyBDb252ZXJ0cyBjYXJ0SXRlbXMgKGFycmF5IG9mIG9ianMpIGludG8gY2FydElkcyAoYXJyYXkgb2YgUHJvZCBpZHMpXG5cdFx0dmFyIGNhcnRJZHMgPSBbXTtcblx0XHQkc2NvcGUuY2FydEl0ZW1zLmZvckVhY2goZnVuY3Rpb24oaXRlbSl7XG5cdFx0XHRmb3IodmFyIGkgPSAwOyBpIDwgaXRlbS5xdWFudGl0eTsgaSsrKXtcblx0XHRcdFx0Y2FydElkcy5wdXNoKGl0ZW0ucHJvZHVjdC5pZCk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0JHNjb3BlLmNhcnRJdGVtcyA9IFtdO1xuXHRcdENhcnQuZW1wdHkoKVxuXHRcdHJldHVybiBDYXJ0LmNoZWNrb3V0KCRzY29wZS50eXBlZEFkZHJlc3MsIGNhcnRJZHMpO1xuXHR9O1xuXHRcbn0pO1xuXG4iLCJhcHAuZmFjdG9yeSgnQ2FydCcsIGZ1bmN0aW9uICgkc3RhdGUsICRodHRwLCBQcm9kdWN0KSB7XG4gICAgdmFyIENhcnRGYWN0b3J5ID0ge31cbiAgICAvL2NhcnQgPSB7cHJvZHVjdEtleTE6IHF1YW50aXR5MSwgcHJvZHVjdEtleTI6IHF1YW50aXR5Mi4uLiB9XG5cbiAgICBDYXJ0RmFjdG9yeS5hZGQgPSBmdW5jdGlvbiAocHJvZHVjdElkLCBxdWFudGl0eSkge1xuICAgICAgICBsZXQgbnVtYmVyID0gTnVtYmVyKGxvY2FsU3RvcmFnZS5nZXRJdGVtKHByb2R1Y3RJZCkpICsgTnVtYmVyKHF1YW50aXR5KSB8fCBOdW1iZXIocXVhbnRpdHkpO1xuICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShwcm9kdWN0SWQsIG51bWJlcik7XG4gICAgfVxuXG4gICAgQ2FydEZhY3RvcnkucmVtb3ZlID0gZnVuY3Rpb24gKHByb2R1Y3RJZCkge1xuICAgICAgICBsb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbShwcm9kdWN0SWQpO1xuICAgIH1cblxuICAgIENhcnRGYWN0b3J5LmVtcHR5ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBsb2NhbFN0b3JhZ2UuY2xlYXIoKTtcbiAgICB9XG4gICAgXG4gICAgQ2FydEZhY3RvcnkuZ2V0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZihsb2NhbFN0b3JhZ2VbbGVuZ3RoXSkgZGVsZXRlIGxvY2FsU3RvcmFnZSgnbGVuZ3RoJyk7IFxuICAgICAgICByZXR1cm4gbG9jYWxTdG9yYWdlO1xuICAgIH1cblxuICAgIENhcnRGYWN0b3J5LmNoZWNrb3V0ID0gZnVuY3Rpb24gKGFkZHJlc3MsIGNhcnRJZHMpIHtcbiAgICAgICRzdGF0ZS5nbygnaG9tZScpO1xuICAgICAgcmV0dXJuICRodHRwLnBvc3QoJy9hcGkvb3JkZXJzL2NoZWNrb3V0LycgKyBhZGRyZXNzLCBjYXJ0SWRzKTtcbiAgICB9XG5cbiAgICBDYXJ0RmFjdG9yeS5jaGVja291dEFkZHJlc3MgPSBmdW5jdGlvbiAoKXtcbiAgICAgIHJldHVybiAkaHR0cC5nZXQoJ2FwaS9hY2NvdW50JylcbiAgICAgIC50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKXtcbiAgICAgICAgcmV0dXJuIHJlc3BvbnNlLmRhdGFcbiAgICAgIH0pXG4gICAgICAudGhlbihmdW5jdGlvbih1c2VyKXtcbiAgICAgICAgaWYoIXVzZXIpIHJldHVybiAnJztcbiAgICAgICAgcmV0dXJuIHVzZXIuYWRkcmVzc1xuICAgICAgfSlcbiAgICB9XG5cbiAgICByZXR1cm4gQ2FydEZhY3Rvcnk7XG59KTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2NhcnQnLCB7XG4gICAgICAgIHVybDogJy9jYXJ0JyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9jYXJ0L2NhcnQuaHRtbCcsXG4gICBcdFx0ICBjb250cm9sbGVyOiAnQ2FydEN0cmwnXG4gICAgfSk7XG59KTtcblxuIiwiKGZ1bmN0aW9uICgpIHtcblxuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIC8vIEhvcGUgeW91IGRpZG4ndCBmb3JnZXQgQW5ndWxhciEgRHVoLWRveS5cbiAgICBpZiAoIXdpbmRvdy5hbmd1bGFyKSB0aHJvdyBuZXcgRXJyb3IoJ0kgY2FuXFwndCBmaW5kIEFuZ3VsYXIhJyk7XG5cbiAgICB2YXIgYXBwID0gYW5ndWxhci5tb2R1bGUoJ2ZzYVByZUJ1aWx0JywgW10pO1xuXG4gICAgYXBwLmZhY3RvcnkoJ1NvY2tldCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKCF3aW5kb3cuaW8pIHRocm93IG5ldyBFcnJvcignc29ja2V0LmlvIG5vdCBmb3VuZCEnKTtcbiAgICAgICAgcmV0dXJuIHdpbmRvdy5pbyh3aW5kb3cubG9jYXRpb24ub3JpZ2luKTtcbiAgICB9KTtcblxuICAgIC8vIEFVVEhfRVZFTlRTIGlzIHVzZWQgdGhyb3VnaG91dCBvdXIgYXBwIHRvXG4gICAgLy8gYnJvYWRjYXN0IGFuZCBsaXN0ZW4gZnJvbSBhbmQgdG8gdGhlICRyb290U2NvcGVcbiAgICAvLyBmb3IgaW1wb3J0YW50IGV2ZW50cyBhYm91dCBhdXRoZW50aWNhdGlvbiBmbG93LlxuICAgIGFwcC5jb25zdGFudCgnQVVUSF9FVkVOVFMnLCB7XG4gICAgICAgIGxvZ2luU3VjY2VzczogJ2F1dGgtbG9naW4tc3VjY2VzcycsXG4gICAgICAgIGxvZ2luRmFpbGVkOiAnYXV0aC1sb2dpbi1mYWlsZWQnLFxuICAgICAgICBsb2dvdXRTdWNjZXNzOiAnYXV0aC1sb2dvdXQtc3VjY2VzcycsXG4gICAgICAgIHNlc3Npb25UaW1lb3V0OiAnYXV0aC1zZXNzaW9uLXRpbWVvdXQnLFxuICAgICAgICBub3RBdXRoZW50aWNhdGVkOiAnYXV0aC1ub3QtYXV0aGVudGljYXRlZCcsXG4gICAgICAgIG5vdEF1dGhvcml6ZWQ6ICdhdXRoLW5vdC1hdXRob3JpemVkJ1xuICAgIH0pO1xuXG4gICAgYXBwLmZhY3RvcnkoJ0F1dGhJbnRlcmNlcHRvcicsIGZ1bmN0aW9uICgkcm9vdFNjb3BlLCAkcSwgQVVUSF9FVkVOVFMpIHtcbiAgICAgICAgdmFyIHN0YXR1c0RpY3QgPSB7XG4gICAgICAgICAgICA0MDE6IEFVVEhfRVZFTlRTLm5vdEF1dGhlbnRpY2F0ZWQsXG4gICAgICAgICAgICA0MDM6IEFVVEhfRVZFTlRTLm5vdEF1dGhvcml6ZWQsXG4gICAgICAgICAgICA0MTk6IEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0LFxuICAgICAgICAgICAgNDQwOiBBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dFxuICAgICAgICB9O1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVzcG9uc2VFcnJvcjogZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KHN0YXR1c0RpY3RbcmVzcG9uc2Uuc3RhdHVzXSwgcmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3QocmVzcG9uc2UpXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfSk7XG5cbiAgICBhcHAuY29uZmlnKGZ1bmN0aW9uICgkaHR0cFByb3ZpZGVyKSB7XG4gICAgICAgICRodHRwUHJvdmlkZXIuaW50ZXJjZXB0b3JzLnB1c2goW1xuICAgICAgICAgICAgJyRpbmplY3RvcicsXG4gICAgICAgICAgICBmdW5jdGlvbiAoJGluamVjdG9yKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICRpbmplY3Rvci5nZXQoJ0F1dGhJbnRlcmNlcHRvcicpO1xuICAgICAgICAgICAgfVxuICAgICAgICBdKTtcbiAgICB9KTtcblxuICAgIGFwcC5zZXJ2aWNlKCdBdXRoU2VydmljZScsIGZ1bmN0aW9uICgkaHR0cCwgU2Vzc2lvbiwgJHJvb3RTY29wZSwgQVVUSF9FVkVOVFMsICRxKSB7XG5cbiAgICAgICAgZnVuY3Rpb24gb25TdWNjZXNzZnVsTG9naW4ocmVzcG9uc2UpIHtcbiAgICAgICAgICAgIHZhciBkYXRhID0gcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgICAgIFNlc3Npb24uY3JlYXRlKGRhdGEuaWQsIGRhdGEudXNlcik7XG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoQVVUSF9FVkVOVFMubG9naW5TdWNjZXNzKTtcbiAgICAgICAgICAgIHJldHVybiBkYXRhLnVzZXI7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVc2VzIHRoZSBzZXNzaW9uIGZhY3RvcnkgdG8gc2VlIGlmIGFuXG4gICAgICAgIC8vIGF1dGhlbnRpY2F0ZWQgdXNlciBpcyBjdXJyZW50bHkgcmVnaXN0ZXJlZC5cbiAgICAgICAgdGhpcy5pc0F1dGhlbnRpY2F0ZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gISFTZXNzaW9uLnVzZXI7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5nZXRMb2dnZWRJblVzZXIgPSBmdW5jdGlvbiAoZnJvbVNlcnZlcikge1xuXG4gICAgICAgICAgICAvLyBJZiBhbiBhdXRoZW50aWNhdGVkIHNlc3Npb24gZXhpc3RzLCB3ZVxuICAgICAgICAgICAgLy8gcmV0dXJuIHRoZSB1c2VyIGF0dGFjaGVkIHRvIHRoYXQgc2Vzc2lvblxuICAgICAgICAgICAgLy8gd2l0aCBhIHByb21pc2UuIFRoaXMgZW5zdXJlcyB0aGF0IHdlIGNhblxuICAgICAgICAgICAgLy8gYWx3YXlzIGludGVyZmFjZSB3aXRoIHRoaXMgbWV0aG9kIGFzeW5jaHJvbm91c2x5LlxuXG4gICAgICAgICAgICAvLyBPcHRpb25hbGx5LCBpZiB0cnVlIGlzIGdpdmVuIGFzIHRoZSBmcm9tU2VydmVyIHBhcmFtZXRlcixcbiAgICAgICAgICAgIC8vIHRoZW4gdGhpcyBjYWNoZWQgdmFsdWUgd2lsbCBub3QgYmUgdXNlZC5cblxuICAgICAgICAgICAgaWYgKHRoaXMuaXNBdXRoZW50aWNhdGVkKCkgJiYgZnJvbVNlcnZlciAhPT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAkcS53aGVuKFNlc3Npb24udXNlcik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIE1ha2UgcmVxdWVzdCBHRVQgL3Nlc3Npb24uXG4gICAgICAgICAgICAvLyBJZiBpdCByZXR1cm5zIGEgdXNlciwgY2FsbCBvblN1Y2Nlc3NmdWxMb2dpbiB3aXRoIHRoZSByZXNwb25zZS5cbiAgICAgICAgICAgIC8vIElmIGl0IHJldHVybnMgYSA0MDEgcmVzcG9uc2UsIHdlIGNhdGNoIGl0IGFuZCBpbnN0ZWFkIHJlc29sdmUgdG8gbnVsbC5cbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9zZXNzaW9uJykudGhlbihvblN1Y2Nlc3NmdWxMb2dpbikuY2F0Y2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmxvZ2luID0gZnVuY3Rpb24gKGNyZWRlbnRpYWxzKSB7XG4gICAgICAgICAgICByZXR1cm4gJGh0dHAucG9zdCgnL2xvZ2luJywgY3JlZGVudGlhbHMpXG4gICAgICAgICAgICAgICAgLnRoZW4ob25TdWNjZXNzZnVsTG9naW4pXG4gICAgICAgICAgICAgICAgLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRxLnJlamVjdCh7IG1lc3NhZ2U6ICdJbnZhbGlkIGxvZ2luIGNyZWRlbnRpYWxzLicgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5sb2dvdXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvbG9nb3V0JykudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgU2Vzc2lvbi5kZXN0cm95KCk7XG4gICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KEFVVEhfRVZFTlRTLmxvZ291dFN1Y2Nlc3MpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICB9KTtcblxuICAgIGFwcC5zZXJ2aWNlKCdTZXNzaW9uJywgZnVuY3Rpb24gKCRyb290U2NvcGUsIEFVVEhfRVZFTlRTKSB7XG5cbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLm5vdEF1dGhlbnRpY2F0ZWQsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNlbGYuZGVzdHJveSgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc2VsZi5kZXN0cm95KCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuaWQgPSBudWxsO1xuICAgICAgICB0aGlzLnVzZXIgPSBudWxsO1xuXG4gICAgICAgIHRoaXMuY3JlYXRlID0gZnVuY3Rpb24gKHNlc3Npb25JZCwgdXNlcikge1xuICAgICAgICAgICAgdGhpcy5pZCA9IHNlc3Npb25JZDtcbiAgICAgICAgICAgIHRoaXMudXNlciA9IHVzZXI7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5kZXN0cm95ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5pZCA9IG51bGw7XG4gICAgICAgICAgICB0aGlzLnVzZXIgPSBudWxsO1xuICAgICAgICB9O1xuXG4gICAgfSk7XG5cbn0pKCk7XG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdob21lJywge1xuICAgICAgdXJsOiAnLycsXG4gICAgICB0ZW1wbGF0ZVVybDogJ2pzL2hvbWUvaG9tZS5odG1sJyxcbiAgIFx0XHRjb250cm9sbGVyOiBmdW5jdGlvbigkc2NvcGUsIGhvbWVwYWdlKXtcbiAgIFx0XHRcdGhvbWVwYWdlLmdldEFsbFByb2R1Y3RzKCkudGhlbihmdW5jdGlvbihhbGxQcm9kdWN0cyl7XG4gICBcdFx0XHRcdCRzY29wZS5wcm9kdWN0cyA9IGFsbFByb2R1Y3RzXG4gICBcdFx0XHR9KVxuICAgXHRcdH0gXG4gICAgfSk7XG59KTtcblxuYXBwLmZhY3RvcnkoJ2hvbWVwYWdlJywgZnVuY3Rpb24oJGh0dHApe1xuICAgIHZhciBnZXRBbGxQcm9kdWN0cyA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9hcGkvcHJvZHVjdHMnKS50aGVuKGZ1bmN0aW9uKHByb2R1Y3RzKXtcbiAgICAgICAgICAgIHJldHVybiBwcm9kdWN0cy5kYXRhO1xuICAgICAgICB9KVxuICAgIH1cblx0cmV0dXJuIHtcbiAgICBnZXRBbGxQcm9kdWN0czogZ2V0QWxsUHJvZHVjdHNcblx0fSAgICBcbn0pIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcblxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdsb2dpbicsIHtcbiAgICAgICAgdXJsOiAnL2xvZ2luJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9sb2dpbi9sb2dpbi5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjogJ0xvZ2luQ3RybCdcbiAgICB9KTtcblxufSk7XG5cbmFwcC5jb250cm9sbGVyKCdMb2dpbkN0cmwnLCBmdW5jdGlvbiAoJHNjb3BlLCBBdXRoU2VydmljZSwgJHN0YXRlKSB7XG5cbiAgICAkc2NvcGUubG9naW4gPSB7fTtcbiAgICAkc2NvcGUuZXJyb3IgPSBudWxsO1xuXG4gICAgJHNjb3BlLnNlbmRMb2dpbiA9IGZ1bmN0aW9uIChsb2dpbkluZm8pIHtcblxuICAgICAgICAkc2NvcGUuZXJyb3IgPSBudWxsO1xuXG4gICAgICAgIEF1dGhTZXJ2aWNlLmxvZ2luKGxvZ2luSW5mbykudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAkc3RhdGUuZ28oJ2hvbWUnKTtcbiAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgJHNjb3BlLmVycm9yID0gJ0ludmFsaWQgbG9naW4gY3JlZGVudGlhbHMuJztcbiAgICAgICAgfSk7XG5cbiAgICB9O1xuXG59KTsiLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ21lbWJlcnNPbmx5Jywge1xuICAgICAgICB1cmw6ICcvYWNjb3VudCcsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvbWVtYmVycy1vbmx5L21lbWJlcnMtb25seS5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjogZnVuY3Rpb24gKCRzY29wZSwgQWNjb3VudCwgJGxvZykge1xuICAgICAgICAgICAgQWNjb3VudC5nZXRBY2NvdW50SW5mbygpLnRoZW4oZnVuY3Rpb24gKHVzZXJBY2NvdW50KSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmFjY291bnQgPSB1c2VyQWNjb3VudDtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuY2F0Y2goJGxvZyk7XG4gICAgICAgIH0sXG4gICAgICAgIC8vIFRoZSBmb2xsb3dpbmcgZGF0YS5hdXRoZW50aWNhdGUgaXMgcmVhZCBieSBhbiBldmVudCBsaXN0ZW5lclxuICAgICAgICAvLyB0aGF0IGNvbnRyb2xzIGFjY2VzcyB0byB0aGlzIHN0YXRlLiBSZWZlciB0byBhcHAuanMuXG4gICAgfSk7XG5cbn0pO1xuXG5hcHAuZmFjdG9yeSgnQWNjb3VudCcsIGZ1bmN0aW9uICgkaHR0cCkge1xuXG4gICAgdmFyIGdldEFjY291bnRJbmZvID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvYXBpL2FjY291bnQnKS50aGVuKGZ1bmN0aW9uIChBY2NvdW50KSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIkhleSB3aGF0J3MgdXBcIiwgQWNjb3VudC5kYXRhKTtcbiAgICAgICAgICAgIHJldHVybiBBY2NvdW50LmRhdGE7XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBnZXRBY2NvdW50SW5mbzogZ2V0QWNjb3VudEluZm9cbiAgICB9O1xuXG59KTtcbiIsImFwcC5jb250cm9sbGVyKCdPcmRlckN0cmwnLCBmdW5jdGlvbigkc2NvcGUsIE9yZGVyKXtcblx0T3JkZXIuc2hvdygpXG5cdC50aGVuKGZ1bmN0aW9uKGFsbE9yZGVycyl7XG5cdFx0JHNjb3BlLm9yZGVycyA9IGFsbE9yZGVycztcblx0fSlcbn0pIiwiYXBwLmZhY3RvcnkoJ09yZGVyJywgZnVuY3Rpb24oJHN0YXRlLCAkaHR0cCl7XG5cdHZhciBPcmRlckZhY3RvcnkgPSB7fTtcblxuXHRPcmRlckZhY3Rvcnkuc2hvdyA9IGZ1bmN0aW9uKCl7XG5cdFx0cmV0dXJuICRodHRwLmdldCgnL2FwaS9vcmRlcnMnKVxuXHRcdC50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKXtcblx0XHRcdGNvbnNvbGUubG9nKCdoZXJlJyxyZXNwb25zZS5kYXRhKVxuXHRcdFx0cmV0dXJuIHJlc3BvbnNlLmRhdGFcblx0XHR9KVxuXHR9XG5cdHJldHVybiBPcmRlckZhY3Rvcnk7XG5cdFxufSkiLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdvcmRlcicsIHtcbiAgICAgICAgdXJsOiAnL29yZGVyJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9vcmRlci9vcmRlci5odG1sJyxcblx0XHRjb250cm9sbGVyOiAnT3JkZXJDdHJsJ1xuICAgIH0pO1xufSk7XG5cbiIsImFwcC5jb250cm9sbGVyKCdQcm9kdWN0Q3RybCcsIGZ1bmN0aW9uKCRzY29wZSwgUHJvZHVjdCwgJHN0YXRlUGFyYW1zLCBDYXJ0KXtcbiAgJHNjb3BlLkNhcnQgPSBDYXJ0O1xuXHRQcm9kdWN0LmdldE9uZVByb2R1Y3QoJHN0YXRlUGFyYW1zLmlkKVxuICAudGhlbihmdW5jdGlvbihwcm9kdWN0KXtcbiAgXHRjb25zb2xlLmxvZyhwcm9kdWN0KVxuXHRcdCRzY29wZS5wcm9kdWN0ID0gcHJvZHVjdDtcblx0fSlcbn0pO1xuXG4iLCJhcHAuZmFjdG9yeSgnUHJvZHVjdCcsIGZ1bmN0aW9uKCRodHRwKXtcblx0bGV0IGdldE9uZVByb2R1Y3QgPSBmdW5jdGlvbihpZCl7XG4gICAgcmV0dXJuICRodHRwLmdldCgnL2FwaS9wcm9kdWN0cy8nKyBpZClcbiAgICAudGhlbihmdW5jdGlvbihwcm9kdWN0KXtcblx0XHQgIHJldHVybiBwcm9kdWN0LmRhdGE7XG5cdFx0fSlcblx0fTtcblxuICByZXR1cm4ge1xuXHQgIGdldE9uZVByb2R1Y3Q6IGdldE9uZVByb2R1Y3RcbiAgfVxufSlcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ3Byb2R1Y3QnLCB7XG4gICAgICAgIHVybDogJy9wcm9kdWN0cy86aWQnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL3Byb2R1Y3QvcHJvZHVjdC5odG1sJyxcbiAgIFx0XHQgIGNvbnRyb2xsZXI6ICdQcm9kdWN0Q3RybCdcbiAgICB9KTtcbn0pO1xuIiwiYXBwLmNvbnRyb2xsZXIoJ1Byb2R1Y3RzQ3RybCcsIGZ1bmN0aW9uKCRzY29wZSwgUHJvZHVjdHMpe1xuXG4gICAgJHNjb3BlLmNhdGVnb3JpZXMgPSBbJ3BhZGRsZXMnLCdiYWxscycsJ2Nhc2VzJywndGFibGVzJywncm9ib3RzJ107XG5cbiAgICAkc2NvcGUuY2F0ZWdvcmllc0Z1bmMgPSBQcm9kdWN0cy5nZXRQcm9kdWN0c2J5Q2F0ZWdvcnk7XG5cbiAgICBQcm9kdWN0cy5nZXRQcm9kdWN0c2J5Q2F0ZWdvcnkoKVxuICAgIC50aGVuKGZ1bmN0aW9uKHByb2R1Y3RzSW5DYXRlZ29yeSl7XG4gICAgICAgICRzY29wZS5wcm9kdWN0cyA9IHByb2R1Y3RzSW5DYXRlZ29yeTtcbiAgICB9KTtcbn0pO1xuIiwiYXBwLmZhY3RvcnkoJ1Byb2R1Y3RzJywgZnVuY3Rpb24oJGh0dHApe1xuICAgIHZhciBnZXRBbGxQcm9kdWN0cyA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9hcGkvcHJvZHVjdHMnKVxuICAgICAgICAudGhlbihmdW5jdGlvbihwcm9kdWN0cyl7XG4gICAgICAgICAgICByZXR1cm4gcHJvZHVjdHMuZGF0YTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIHZhciBnZXRQcm9kdWN0c2J5Q2F0ZWdvcnkgPSBmdW5jdGlvbihjYXRlZ29yeSl7XG4gICAgICAgIGNhdGVnb3J5ID0gY2F0ZWdvcnkgfHwgMDtcbiAgICAgICAgaWYoY2F0ZWdvcnkgPT09IDApe1xuICAgICAgICAgICAgcmV0dXJuICRodHRwLmdldCgnL2FwaS9wcm9kdWN0cycpXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbihwcm9kdWN0cyl7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHByb2R1Y3RzLmRhdGE7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvYXBpL3Byb2R1Y3RzLz9jYXRlZ29yeT0nICsgY2F0ZWdvcnkpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKHByb2R1Y3RzSW5DYXRlZ29yeSl7XG4gICAgICAgICAgICByZXR1cm4gcHJvZHVjdHNJbkNhdGVnb3J5LmRhdGE7XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBnZXRQcm9kdWN0c2J5Q2F0ZWdvcnk6IGdldFByb2R1Y3RzYnlDYXRlZ29yeVxuICAgIH07XG59KVxuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcbsKgwqDCoMKgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ3Byb2R1Y3RzJywge1xuwqDCoMKgwqDCoMKgwqDCoHVybDogJy8nLFxuwqDCoMKgwqDCoMKgwqDCoHRlbXBsYXRlVXJsOiAnanMvcHJvZHVjdHMvcHJvZHVjdHMuaHRtbCcsXG7CoMKgwqDCoMKgwqDCoMKgY29udHJvbGxlcjogJ1Byb2R1Y3RzQ3RybCdcbsKgwqDCoMKgfSk7XG59KTsiLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdkb2NzJywge1xuICAgICAgICB1cmw6ICcvZG9jcycsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvZG9jcy9kb2NzLmh0bWwnXG4gICAgfSk7XG59KTtcbiIsImFwcC5mYWN0b3J5KCdGdWxsc3RhY2tQaWNzJywgZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBbXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQjdnQlh1bENBQUFYUWNFLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL2ZiY2RuLXNwaG90b3MtYy1hLmFrYW1haWhkLm5ldC9ocGhvdG9zLWFrLXhhcDEvdDMxLjAtOC8xMDg2MjQ1MV8xMDIwNTYyMjk5MDM1OTI0MV84MDI3MTY4ODQzMzEyODQxMTM3X28uanBnJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9CLUxLVXNoSWdBRXk5U0suanBnJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9CNzktWDdvQ01BQWt3N3kuanBnJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9CLVVqOUNPSUlBSUZBaDAuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9CNnlJeUZpQ0VBQXFsMTIuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DRS1UNzVsV0FBQW1xcUouanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DRXZaQWctVkFBQWs5MzIuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DRWdOTWVPWElBSWZEaEsuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DRVF5SUROV2dBQXU2MEIuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DQ0YzVDVRVzhBRTJsR0ouanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DQWVWdzVTV29BQUFMc2ouanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DQWFKSVA3VWtBQWxJR3MuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DQVFPdzlsV0VBQVk5RmwuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9CLU9RYlZyQ01BQU53SU0uanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9COWJfZXJ3Q1lBQXdSY0oucG5nOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9CNVBUZHZuQ2NBRUFsNHguanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9CNHF3QzBpQ1lBQWxQR2guanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9CMmIzM3ZSSVVBQTlvMUQuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9Cd3BJd3IxSVVBQXZPMl8uanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9Cc1NzZUFOQ1lBRU9oTHcuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DSjR2TGZ1VXdBQWRhNEwuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DSTd3empFVkVBQU9QcFMuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DSWRIdlQyVXNBQW5uSFYuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DR0NpUF9ZV1lBQW83NVYuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9DSVM0SlBJV0lBSTM3cXUuanBnOmxhcmdlJ1xuICAgIF07XG59KTtcbiIsImFwcC5mYWN0b3J5KCdSYW5kb21HcmVldGluZ3MnLCBmdW5jdGlvbiAoKSB7XG5cbiAgICB2YXIgZ2V0UmFuZG9tRnJvbUFycmF5ID0gZnVuY3Rpb24gKGFycikge1xuICAgICAgICByZXR1cm4gYXJyW01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGFyci5sZW5ndGgpXTtcbiAgICB9O1xuXG4gICAgdmFyIGdyZWV0aW5ncyA9IFtcbiAgICAgICAgJ1dlbGNvbWUgdG8gdGhlIGJlc3QgUGluZy1Qb25nIHN0b3JlIHRoaXMgc2lkZSBvZiB0aGUgQXRsYW50aWMnLFxuICAgICAgICAnWW91IGxvb2sgbGlrZSB5b3UgY291bGQgdXNlIGEgYnJhbmQgc3BhbmtpbmcgbmV3IHBhZGRsZSdcbiAgICBdO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgZ3JlZXRpbmdzOiBncmVldGluZ3MsXG4gICAgICAgIGdldFJhbmRvbUdyZWV0aW5nOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gZ2V0UmFuZG9tRnJvbUFycmF5KGdyZWV0aW5ncyk7XG4gICAgICAgIH1cbiAgICB9O1xuXG59KTtcbiIsImFwcC5kaXJlY3RpdmUoJ2Z1bGxzdGFja0xvZ28nLCBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy9mdWxsc3RhY2stbG9nby9mdWxsc3RhY2stbG9nby5odG1sJ1xuICAgIH07XG59KTsiLCJhcHAuZGlyZWN0aXZlKCduYXZiYXInLCBmdW5jdGlvbiAoJHJvb3RTY29wZSwgQXV0aFNlcnZpY2UsIEFVVEhfRVZFTlRTLCAkc3RhdGUpIHtcblxuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHNjb3BlOiB7fSxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy9uYXZiYXIvbmF2YmFyLmh0bWwnLFxuICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUpIHtcblxuICAgICAgICAgICAgc2NvcGUuaXRlbXMgPSBbXG4gICAgICAgICAgICAgICAgeyBsYWJlbDogJ0Fib3V0Jywgc3RhdGU6ICdhYm91dCcgfSxcbiAgICAgICAgICAgICAgICB7IGxhYmVsOiAnTXkgQ2FydCcsIHN0YXRlOiAnY2FydCcgfSxcbiAgICAgICAgICAgICAgICB7IGxhYmVsOiAnT3JkZXInLCBzdGF0ZTogJ29yZGVyJywgYXV0aDogdHJ1ZX0sXG4gICAgICAgICAgICAgICAgeyBsYWJlbDogJ0FjY291bnQnLCBzdGF0ZTogJ21lbWJlcnNPbmx5JywgYXV0aDogdHJ1ZX1cbiAgICAgICAgICAgIF07XG5cbiAgICAgICAgICAgIHNjb3BlLnVzZXIgPSBudWxsO1xuXG4gICAgICAgICAgICBzY29wZS5pc0xvZ2dlZEluID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBBdXRoU2VydmljZS5pc0F1dGhlbnRpY2F0ZWQoKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHNjb3BlLmxvZ291dCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBBdXRoU2VydmljZS5sb2dvdXQoKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28oJ2hvbWUnKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHZhciBzZXRVc2VyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIEF1dGhTZXJ2aWNlLmdldExvZ2dlZEluVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUudXNlciA9IHVzZXI7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB2YXIgcmVtb3ZlVXNlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBzY29wZS51c2VyID0gbnVsbDtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHNldFVzZXIoKTtcblxuICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMubG9naW5TdWNjZXNzLCBzZXRVc2VyKTtcbiAgICAgICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLmxvZ291dFN1Y2Nlc3MsIHJlbW92ZVVzZXIpO1xuICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMuc2Vzc2lvblRpbWVvdXQsIHJlbW92ZVVzZXIpO1xuXG4gICAgICAgIH1cblxuICAgIH07XG5cbn0pO1xuIiwiYXBwLmRpcmVjdGl2ZSgncmFuZG9HcmVldGluZycsIGZ1bmN0aW9uIChSYW5kb21HcmVldGluZ3MpIHtcblxuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvcmFuZG8tZ3JlZXRpbmcvcmFuZG8tZ3JlZXRpbmcuaHRtbCcsXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSkge1xuICAgICAgICBcdFx0Y29uc29sZS5sb2coXCJyYW5kb0dyZWV0aW5nIGxpbmsgZnVuY3Rpb24gaGl0XCIpO1xuICAgICAgICAgICAgc2NvcGUuZ3JlZXRpbmcgPSBSYW5kb21HcmVldGluZ3MuZ2V0UmFuZG9tR3JlZXRpbmcoKTtcbiAgICAgICAgfVxuICAgIH07XG5cbn0pOyJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
