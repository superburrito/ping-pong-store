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

    $stateProvider.state('account', {
        url: '/account',
        templateUrl: 'js/account/account.html',
        controller: function controller($scope, Account, $log) {
            Account.getAccountInfo().then(function (userAccount) {
                $scope.account = userAccount;
            }).catch($log);

            $scope.updateSettings = function () {
                $scope.updatePaySettings = !$scope.updatePaySettings;
            };

            $scope.showSettings = function () {
                $scope.showPaySettings = !$scope.showPaySettings;
            };

            $scope.updatePaySettings = false;

            $scope.showPaySettings = false;
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

    var updateInfo = function updateInfo() {
        return $http.put('/api/account', $scope.account).then(function (Account) {
            console.log("Updating account info!");
            return Account.data;
        });
    };

    return {
        getAccountInfo: getAccountInfo
    };
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
            $scope.categories = ['paddle', 'ball', 'case', 'table', 'robot'];
            $scope.selectedCategory = '';

            $scope.orderOptions = ['price', 'rating'];
            $scope.orderOption = '';
            $scope.finalOrderOption = $scope.ascDesc + $scope.orderOption;

            $scope.ascDescOptions = ['ascending', 'descending'];
            $scope.selectedAscDesc = 'descending';
            $scope.ascDesc = function () {
                if ($scope.selectedAscDesc === 'ascending') {
                    return false;
                } else return true;
            };

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
app.controller('OrderCtrl', function ($scope, OrderFactory) {

    OrderFactory.show().then(function (allOrders) {
        console.log(allOrders);
        $scope.orders = allOrders;
    });
});
app.factory('OrderFactory', function ($state, $http) {
    var OrderFactory = {};

    OrderFactory.show = function () {
        return $http.get('/api/orders').then(function (response) {
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

    $stateProvider.state('newReview', {
        url: '/order/review/:productId',
        templateUrl: 'js/order/review/review.form.html',
        controller: 'ReviewFormCtrl'
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

app.controller('ReviewFormCtrl', function ($scope, ReviewFactory, AuthService, $stateParams, $state) {
    $scope.newReview = {};
    $scope.state = $state.current;
    console.log($stateParams);
    $scope.createReview = function () {
        AuthService.getLoggedInUser().then(function (user) {
            $scope.newReview.userId = user.id;
            $scope.newReview.productId = $stateParams.productId;
            return $scope.newReview;
        }).then(function (newReview) {
            ReviewFactory.setReview(newReview).then(function (review) {
                $state.go('order');
            });
        });
    };
});
app.factory('ReviewFactory', function ($state, $http) {
    var ReviewFactory = {};

    ReviewFactory.setReview = function (review) {
        return $http.post('/api/reviews', review).then(function (response) {
            console.log('----', response);
            return response;
        });
    };
    return ReviewFactory;
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

            scope.items = [{ label: 'About', state: 'about' }, { label: 'My Cart', state: 'cart' }, { label: 'Order', state: 'order', auth: true }, { label: 'Account', state: 'account', auth: true }];

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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImFjY291bnQvYWNjb3VudC5qcyIsImFib3V0L2Fib3V0LmpzIiwiY2FydC9jYXJ0LmNvbnRyb2xsZXIuanMiLCJjYXJ0L2NhcnQuZmFjdG9yeS5qcyIsImNhcnQvY2FydC5zdGF0ZS5qcyIsImZzYS9mc2EtcHJlLWJ1aWx0LmpzIiwiaG9tZS9ob21lLmpzIiwibG9naW4vbG9naW4uanMiLCJvcmRlci9vcmRlci5jb250cm9sbGVyLmpzIiwib3JkZXIvb3JkZXIuZmFjdG9yeS5qcyIsIm9yZGVyL29yZGVyLnN0YXRlLmpzIiwicHJvZHVjdC9wcm9kdWN0LmNvbnRyb2xsZXIuanMiLCJwcm9kdWN0L3Byb2R1Y3QuZmFjdG9yeS5qcyIsInByb2R1Y3QvcHJvZHVjdC5zdGF0ZS5qcyIsInByb2R1Y3RzL3Byb2R1Y3RzLmNvbnRyb2xsZXIuanMiLCJwcm9kdWN0cy9wcm9kdWN0cy5mYWN0b3J5LmpzIiwicHJvZHVjdHMvcHJvZHVjdHMuc3RhdGUuanMiLCJzaWdudXAvZG9jcy5qcyIsImNvbW1vbi9mYWN0b3JpZXMvRnVsbHN0YWNrUGljcy5qcyIsImNvbW1vbi9mYWN0b3JpZXMvUmFuZG9tR3JlZXRpbmdzLmpzIiwib3JkZXIvcmV2aWV3L3Jldmlldy5jb250cm9sbGVyLmpzIiwib3JkZXIvcmV2aWV3L3Jldmlldy5mYWN0b3J5LmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvZnVsbHN0YWNrLWxvZ28vZnVsbHN0YWNrLWxvZ28uanMiLCJjb21tb24vZGlyZWN0aXZlcy9uYXZiYXIvbmF2YmFyLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvcmFuZG8tZ3JlZXRpbmcvcmFuZG8tZ3JlZXRpbmcuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7O0FBQ0EsT0FBQSxHQUFBLEdBQUEsUUFBQSxNQUFBLENBQUEsdUJBQUEsRUFBQSxDQUFBLGFBQUEsRUFBQSxXQUFBLEVBQUEsY0FBQSxFQUFBLFdBQUEsQ0FBQSxDQUFBOztBQUVBLElBQUEsTUFBQSxD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SEEsS0FBQTtBQU1BLENBVEE7O0FBV0EsSUFBQSxVQUFBLENBQUEsaUJBQUEsRUFBQSxVQUFBLE1BQUEsRUFBQSxhQUFBLEVBQUE7O0FBRUE7QUFDQSxXQUFBLE1BQUEsR0FBQSxFQUFBLE9BQUEsQ0FBQSxhQUFBLENBQUE7QUFFQSxDQUxBO0FDWEEsSUFBQSxVQUFBLENBQUEsVUFBQSxFQUFBLFVBQUEsTUFBQSxFQUFBLFlBQUEsRUFBQSxJQUFBLEVBQUEsT0FBQSxFQUFBOztBQUVBLFdBQUEsU0FBQSxHQUFBLEVBQUE7QUFDQSxXQUFBLFNBQUEsR0FBQSxJQUFBOztBQUVBLFFBQUEsV0FBQSxPQUFBLElBQUEsQ0FBQSxLQUFBLEdBQUEsRUFBQSxDQUFBOztBQUVBLFFBQUEsU0FBQSxNQUFBLEdBQUEsQ0FBQSxFQUFBO0FBQ0EsZUFBQSxTQUFBLEdBQUEsS0FBQTtBQUNBLGlCQUFBLE9BQUEsQ0FBQSxVQUFBLFNBQUEsRUFBQTtBQUNBLG9CQUFBLEdBQUEsQ0FBQSxnQ0FBQSxFQUFBLFNBQUE7QUFDQSxtQkFBQSxRQUFBLGFBQUEsQ0FBQSxTQUFBLEVBQ0EsSUFEQSxDQUNBLFVBQUEsT0FBQSxFQUFBO0FBQ0Esb0JBQUEsV0FBQSxhQUFBLFNBQUEsQ0FBQTtBQUNBLHdCQUFBLEdBQUEsQ0FBQSw4QkFBQSxFQUFBLFFBQUEsRUFBQSxnQkFBQSxFQUFBLE9BQUE7QUFDQSx1QkFBQSxTQUFBLENBQUEsSUFBQSxDQUFBO0FBQ0EsOEJBQUEsUUFEQTtBQUVBLDZCQUFBO0FBRkEsaUJBQUE7QUFJQSxhQVJBLENBQUE7QUFTQSxTQVhBO0FBWUE7O0FBRUE7QUFDQSxXQUFBLGNBQUEsR0FBQSxFQUFBO0FBQ0EsU0FBQSxlQUFBLEdBQ0EsSUFEQSxDQUNBLFVBQUEsV0FBQSxFQUFBO0FBQ0EsZUFBQSxjQUFBLEdBQUEsV0FBQTtBQUNBLEtBSEE7O0FBTUE7QUFDQSxXQUFBLFFBQUEsR0FBQSxZQUFBO0FBQ0E7QUFDQSxZQUFBLFVBQUEsRUFBQTtBQUNBLGVBQUEsU0FBQSxDQUFBLE9BQUEsQ0FBQSxVQUFBLElBQUEsRUFBQTtBQUNBLGlCQUFBLElBQUEsSUFBQSxDQUFBLEVBQUEsSUFBQSxLQUFBLFFBQUEsRUFBQSxHQUFBLEVBQUE7QUFDQSx3QkFBQSxJQUFBLENBQUEsS0FBQSxPQUFBLENBQUEsRUFBQTtBQUNBO0FBQ0EsU0FKQTtBQUtBLGVBQUEsU0FBQSxHQUFBLEVBQUE7QUFDQSxhQUFBLEtBQUE7QUFDQSxlQUFBLEtBQUEsUUFBQSxDQUFBLE9BQUEsWUFBQSxFQUFBLE9BQUEsQ0FBQTtBQUNBLEtBWEE7QUFhQSxDQTdDQTs7QUNBQSxJQUFBLE9BQUEsQ0FBQSxNQUFBLEVBQUEsVUFBQSxNQUFBLEVBQUEsS0FBQSxFQUFBLE9BQUEsRUFBQTtBQUNBLFFBQUEsY0FBQSxFQUFBO0FBQ0E7O0FBRUEsZ0JBQUEsR0FBQSxHQUFBLFVBQUEsU0FBQSxFQUFBLFFBQUEsRUFBQTtBQUNBLFlBQUEsU0FBQSxPQUFBLGFBQUEsT0FBQSxDQUFBLFNBQUEsQ0FBQSxJQUFBLE9BQUEsUUFBQSxDQUFBLElBQUEsT0FBQSxRQUFBLENBQUE7QUFDQSxxQkFBQSxPQUFBLENBQUEsU0FBQSxFQUFBLE1BQUE7QUFDQSxLQUhBOztBQUtBLGdCQUFBLE1BQUEsR0FBQSxVQUFBLFNBQUEsRUFBQTtBQUNBLHFCQUFBLFVBQUEsQ0FBQSxTQUFBO0FBQ0EsS0FGQTs7QUFJQSxnQkFBQSxLQUFBLEdBQUEsWUFBQTtBQUNBLHFCQUFBLEtBQUE7QUFDQSxLQUZBOztBQUlBLGdCQUFBLEdBQUEsR0FBQSxZQUFBO0FBQ0EsWUFBQSxhQUFBLE1BQUEsQ0FBQSxFQUFBLE9BQUEsYUFBQSxRQUFBLENBQUE7QUFDQSxlQUFBLFlBQUE7QUFDQSxLQUhBOztBQUtBLGdCQUFBLFFBQUEsR0FBQSxVQUFBLE9BQUEsRUFBQSxPQUFBLEVBQUE7QUFDQSxlQUFBLEVBQUEsQ0FBQSxNQUFBO0FBQ0EsZUFBQSxNQUFBLElBQUEsQ0FBQSwwQkFBQSxPQUFBLEVBQUEsT0FBQSxDQUFBO0FBQ0EsS0FIQTs7QUFLQSxnQkFBQSxlQUFBLEdBQUEsWUFBQTtBQUNBLGVB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QTtBQUNBLFNBSEE7QUFLQSxLQXpCQTtBQTJCQSxDQXBJQTs7QUNBQSxJQUFBLE1BQUEsQ0FBQSxVQUFBLGNBQUEsRUFBQTtBQUNBLG1CQUFBLEtBQUEsQ0FBQSxNQUFBLEVBQUE7QUFDQSxhQUFBLEdBREE7QUFFQSxxQkFBQSxtQkFGQTtBQUdBLG9CQUFBLG9CQUFBLE1BQUEsRUFBQSxRQUFBLEVBQUE7QUFDQSxtQkFBQSxVQUFBLEdBQUEsQ0FBQSxRQUFBLEVBQUEsTUFBQSxFQUFBLE1BQUEsRUFDQSxPQURBLEVBQ0EsT0FEQSxDQUFBO0FBRUEsbUJBQUEsZ0JBQUEsR0FBQSxFQUFBOztBQUVBLG1CQUFBLFlBQUEsR0FBQSxDQUFBLE9BQUEsRUFBQSxRQUFBLENBQUE7QUFDQSxtQkFBQSxXQUFBLEdBQUEsRUFBQTtBQUNBLG1CQUFBLGdCQUFBLEdBQUEsT0FBQSxPQUFBLEdBQUEsT0FBQSxXQUFBOztBQUVBLG1CQUFBLGNBQUEsR0FBQSxDQUFBLFdBQUEsRUFBQSxZQUFBLENBQUE7QUFDQSxtQkFBQSxlQUFBLEdBQUEsWUFBQTtBQUNBLG1CQUFBLE9BQUEsR0FBQSxZQUFBO0FBQ0Esb0JBQUEsT0FBQSxlQUFBLEtBQUEsV0FBQSxFQUFBO0FBQ0EsMkJBQUEsS0FBQTtBQUVBLGlCQUhBLE1BSUEsT0FBQSxJQUFBO0FBQ0EsYUFOQTs7QUFTQSxxQkFBQSxjQUFBLEdBQUEsSUFBQSxDQUFBLFVBQUEsV0FBQSxFQUFBO0FBQ0EsdUJBQUEsUUFBQSxHQUFBLFdBQUE7QUFDQSxhQUZBO0FBR0E7QUExQkEsS0FBQTtBQTRCQSxDQTdCQTs7QUErQkEsSUFBQSxPQUFBLENBQUEsVUFBQSxFQUFBLFVBQUEsS0FBQSxFQUFBO0FBQ0EsUUFBQSxpQkFBQSxTQUFBLGNBQUEsR0FBQTtBQUNBLGVBQUEsTUFBQSxHQUFBLENBQUEsZUFBQSxFQUFBLElBQUEsQ0FBQSxVQUFBLFFBQUEsRUFBQTtBQUNBLG1CQUFBLFNBQUEsSUFBQTtBQUNBLFNBRkEsQ0FBQTtBQUdBLEtBSkE7QUFLQSxXQUFBO0FBQ0Esd0JBQUE7QUFE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Q0E7QUFOQSxLQUFBO0FBU0EsQ0FYQSIsImZpbGUiOiJtYWluLmpzIiwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xud2luZG93LmFwcCA9IGFuZ3VsYXIubW9kdWxlKCdGdWxsc3RhY2tHZW5lcmF0ZWRBcHAnLCBbJ2ZzYVByZUJ1aWx0JywgJ3VpLnJvdXRlcicsICd1aS5ib290c3RyYXAnLCAnbmdBbmltYXRlJ10pO1xuXG5hcHAuY29uZmlnKGZ1bmN0aW9uICgkdXJsUm91dGVyUHJvdmlkZXIsICRsb2NhdGlvblByb3ZpZGVyKSB7XG4gICAgLy8gVGhpcyB0dXJucyBvZmYgaGFzaGJhbmcgdXJscyAoLyNhYm91dCkgYW5kIGNoYW5nZXMgaXQgdG8gc29tZXRoaW5nIG5vcm1hbCAoL2Fib3V0KVxuICAgICRsb2NhdGlvblByb3ZpZGVyLmh0bWw1TW9kZSh0cnVlKTtcbiAgICAvLyBJZiB3ZSBnbyB0byBhIFVSTCB0aGF0IHVpLXJvdXRlciBkb2Vzbid0IGhhdmUgcmVnaXN0ZXJlZCwgZ28gdG8gdGhlIFwiL1wiIHVybC5cbiAgICAkdXJsUm91dGVyUHJvdmlkZXIub3RoZXJ3aXNlKCcvJyk7XG4gICAgLy8gVHJpZ2dlciBwYWdlIHJlZnJlc2ggd2hlbiBhY2Nlc3NpbmcgYW4gT0F1dGggcm91dGVcbiAgICAkdXJsUm91dGVyUHJvdmlkZXIud2hlbignL2F1dGgvOnByb3ZpZGVyJywgZnVuY3Rpb24gKCkge1xuICAgICAgICB3aW5kb3cubG9jYXRpb24ucmVsb2FkKCk7XG4gICAgfSk7XG59KTtcblxuLy8gVGhpcyBhcHAucnVuIGlzIGZvciBjb250cm9sbGluZyBhY2Nlc3MgdG8gc3BlY2lmaWMgc3RhdGVzLlxuYXBwLnJ1bihmdW5jdGlvbiAoJHJvb3RTY29wZSwgQXV0aFNlcnZpY2UsICRzdGF0ZSkge1xuXG4gICAgLy8gVGhlIGdpdmVuIHN0YXRlIHJlcXVpcmVzIGFuIGF1dGhlbnRpY2F0ZWQgdXNlci5cbiAgICB2YXIgZGVzdGluYXRpb25TdGF0ZVJlcXVpcmVzQXV0aCA9IGZ1bmN0aW9uIChzdGF0ZSkge1xuICAgICAgICByZXR1cm4gc3RhdGUuZGF0YSAmJiBzdGF0ZS5kYXRhLmF1dGhlbnRpY2F0ZTtcbiAgICB9O1xuXG4gICAgLy8gJHN0YXRlQ2hhbmdlU3RhcnQgaXMgYW4gZXZlbnQgZmlyZWRcbiAgICAvLyB3aGVuZXZlciB0aGUgcHJvY2VzcyBvZiBjaGFuZ2luZyBhIHN0YXRlIGJlZ2lucy5cbiAgICAkcm9vdFNjb3BlLiRvbignJHN0YXRlQ2hhbmdlU3RhcnQnLCBmdW5jdGlvbiAoZXZlbnQsIHRvU3RhdGUsIHRvUGFyYW1zKSB7XG5cbiAgICAgICAgaWYgKCFkZXN0aW5hdGlvblN0YXRlUmVxdWlyZXNBdXRoKHRvU3RhdGUpKSB7XG4gICAgICAgICAgICAvLyBUaGUgZGVzdGluYXRpb24gc3RhdGUgZG9lcyBub3QgcmVxdWlyZSBhdXRoZW50aWNhdGlvblxuICAgICAgICAgICAgLy8gU2hvcnQgY2lyY3VpdCB3aXRoIHJldHVybi5cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChBdXRoU2VydmljZS5pc0F1dGhlbnRpY2F0ZWQoKSkge1xuICAgICAgICAgICAgLy8gVGhlIHVzZXIgaXMgYXV0aGVudGljYXRlZC5cbiAgICAgICAgICAgIC8vIFNob3J0IGNpcmN1aXQgd2l0aCByZXR1cm4uXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDYW5jZWwgbmF2aWdhdGluZyB0byBuZXcgc3RhdGUuXG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgICAgICAgICAgLy8gSWYgYSB1c2VyIGlzIHJldHJpZXZlZCwgdGhlbiByZW5hdmlnYXRlIHRvIHRoZSBkZXN0aW5hdGlvblxuICAgICAgICAgICAgLy8gKHRoZSBzZWNvbmQgdGltZSwgQXV0aFNlcnZpY2UuaXNBdXRoZW50aWNhdGVkKCkgd2lsbCB3b3JrKVxuICAgICAgICAgICAgLy8gb3RoZXJ3aXNlLCBpZiBubyB1c2VyIGlzIGxvZ2dlZCBpbiwgZ28gdG8gXCJsb2dpblwiIHN0YXRlLlxuICAgICAgICAgICAgaWYgKHVzZXIpIHtcbiAgICAgICAgICAgICAgICAkc3RhdGUuZ28odG9TdGF0ZS5uYW1lLCB0b1BhcmFtcyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICRzdGF0ZS5nbygnbG9naW4nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICB9KTtcblxufSk7XG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2FjY291bnQnLCB7XG4gICAgICAgIHVybDogJy9hY2NvdW50JyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9hY2NvdW50L2FjY291bnQuaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6IGZ1bmN0aW9uICgkc2NvcGUsIEFjY291bnQsICRsb2cpIHtcbiAgICAgICAgICAgIEFjY291bnQuZ2V0QWNjb3VudEluZm8oKS50aGVuKGZ1bmN0aW9uICh1c2VyQWNjb3VudCkge1xuICAgICAgICAgICAgICAgICRzY29wZS5hY2NvdW50ID0gdXNlckFjY291bnQ7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLmNhdGNoKCRsb2cpO1xuXG4gICAgICAgICAgICAkc2NvcGUudXBkYXRlU2V0dGluZ3MgPSBmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICRzY29wZS51cGRhdGVQYXlTZXR0aW5ncyA9ICEkc2NvcGUudXBkYXRlUGF5U2V0dGluZ3M7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICRzY29wZS5zaG93U2V0dGluZ3MgPSBmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICRzY29wZS5zaG93UGF5U2V0dGluZ3MgPSAhJHNjb3BlLnNob3dQYXlTZXR0aW5nc1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAkc2NvcGUudXBkYXRlUGF5U2V0dGluZ3MgPSBmYWxzZTtcblxuICAgICAgICAgICAgJHNjb3BlLnNob3dQYXlTZXR0aW5ncyA9IGZhbHNlO1xuXG5cbiAgICAgICAgfSxcbiAgICAgICAgLy8gVGhlIGZvbGxvd2luZyBkYXRhLmF1dGhlbnRpY2F0ZSBpcyByZWFkIGJ5IGFuIGV2ZW50IGxpc3RlbmVyXG4gICAgICAgIC8vIHRoYXQgY29udHJvbHMgYWNjZXNzIHRvIHRoaXMgc3RhdGUuIFJlZmVyIHRvIGFwcC5qcy5cbiAgICB9KTtcblxufSk7XG5cbmFwcC5mYWN0b3J5KCdBY2NvdW50JywgZnVuY3Rpb24gKCRodHRwKSB7XG5cbiAgICB2YXIgZ2V0QWNjb3VudEluZm8gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9hcGkvYWNjb3VudCcpLnRoZW4oZnVuY3Rpb24gKEFjY291bnQpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiSGV5IHdoYXQncyB1cFwiLCBBY2NvdW50LmRhdGEpO1xuICAgICAgICAgICAgcmV0dXJuIEFjY291bnQuZGF0YTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIHZhciB1cGRhdGVJbmZvID0gZnVuY3Rpb24oKXtcbiAgICAgICAgcmV0dXJuICRodHRwLnB1dCgnL2FwaS9hY2NvdW50JywgJHNjb3BlLmFjY291bnQpLnRoZW4oZnVuY3Rpb24oQWNjb3VudCl7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIlVwZGF0aW5nIGFjY291bnQgaW5mbyFcIik7XG4gICAgICAgICAgICByZXR1cm4gQWNjb3VudC5kYXRhXG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgZ2V0QWNjb3VudEluZm86IGdldEFjY291bnRJbmZvXG4gICAgfTtcblxufSk7XG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuXG4gICAgLy8gUmVnaXN0ZXIgb3VyICphYm91dCogc3RhdGUuXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2Fib3V0Jywge1xuICAgICAgICB1cmw6ICcvYWJvdXQnLFxuICAgICAgICBjb250cm9sbGVyOiAnQWJvdXRDb250cm9sbGVyJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9hYm91dC9hYm91dC5odG1sJ1xuICAgIH0pO1xuXG59KTtcblxuYXBwLmNvbnRyb2xsZXIoJ0Fib3V0Q29udHJvbGxlcicsIGZ1bmN0aW9uICgkc2NvcGUsIEZ1bGxzdGFja1BpY3MpIHtcblxuICAgIC8vIEltYWdlcyBvZiBiZWF1dGlmdWwgRnVsbHN0YWNrIHBlb3BsZS5cbiAgICAkc2NvcGUuaW1hZ2VzID0gXy5zaHVmZmxlKEZ1bGxzdGFja1BpY3MpO1xuXG59KTsiLCJhcHAuY29udHJvbGxlcignQ2FydEN0cmwnLCBmdW5jdGlvbigkc2NvcGUsICRzdGF0ZVBhcmFtcywgQ2FydCwgUHJvZHVjdCl7XHRcblxuXHQkc2NvcGUuY2FydEl0ZW1zID0gW107XG5cdCRzY29wZS5lbXB0eUNhcnQgPSB0cnVlO1xuXG5cdHZhciBjYXJ0S2V5cyA9IE9iamVjdC5rZXlzKENhcnQuZ2V0KCkpO1xuXG5cdGlmKGNhcnRLZXlzLmxlbmd0aCA+IDApe1xuXHRcdCRzY29wZS5lbXB0eUNhcnQgPSBmYWxzZTtcblx0XHRjYXJ0S2V5cy5mb3JFYWNoKGZ1bmN0aW9uKHByb2R1Y3RJZCl7XG5cdFx0XHRjb25zb2xlLmxvZyhcIkN1cnJlbnQgUHJvZHVjdElkIG9uIENhcnQgaXM6IFwiLCBwcm9kdWN0SWQpO1xuXHRcdFx0cmV0dXJuIFByb2R1Y3QuZ2V0T25lUHJvZHVjdChwcm9kdWN0SWQpXG5cdFx0XHQudGhlbihmdW5jdGlvbihwcm9kdWN0KXtcblx0XHRcdFx0dmFyIHF1YW50aXR5ID0gbG9jYWxTdG9yYWdlW3Byb2R1Y3RJZF07XG5cdFx0XHRcdGNvbnNvbGUubG9nKFwiUHJvZHVjdCBmb3VuZCwgcXVhbnRpdHkgaXM6IFwiLCBxdWFudGl0eSwgXCIgYW5kIGl0ZW0gaXM6IFwiLCBwcm9kdWN0KTtcblx0XHRcdFx0JHNjb3BlLmNhcnRJdGVtcy5wdXNoKHtcblx0XHRcdFx0XHRxdWFudGl0eTogcXVhbnRpdHksXG5cdFx0XHRcdFx0cHJvZHVjdDogcHJvZHVjdFxuXHRcdFx0XHR9KTtcblx0XHRcdH0pO1xuXHRcdH0pO1xuXHR9XG5cblx0Ly8gTGV0IGNoZWNrb3V0YWRkcmVzcyBkZWZhdWx0IHRvIHVzZXIncyBhZGRyZXNzXG5cdCRzY29wZS5kZWZhdWx0QWRkcmVzcyA9ICcnO1xuXHRDYXJ0LmNoZWNrb3V0QWRkcmVzcygpXG5cdC50aGVuKGZ1bmN0aW9uKHVzZXJBZGRyZXNzKXtcblx0XHQkc2NvcGUuZGVmYXVsdEFkZHJlc3MgPSB1c2VyQWRkcmVzc1xuXHR9KTtcblxuXG5cdC8vIGNoZWNrb3V0IGZvcm0gaGFzIG5nLW1vZGVsPSd0eXBlZEFkZHJlc3MnXG5cdCRzY29wZS5jaGVja291dCA9IGZ1bmN0aW9uICgpIHtcblx0XHQvLyBDb252ZXJ0cyBjYXJ0SXRlbXMgKGFycmF5IG9mIG9ianMpIGludG8gY2FydElkcyAoYXJyYXkgb2YgUHJvZCBpZHMpXG5cdFx0dmFyIGNhcnRJZHMgPSBbXTtcblx0XHQkc2NvcGUuY2FydEl0ZW1zLmZvckVhY2goZnVuY3Rpb24oaXRlbSl7XG5cdFx0XHRmb3IodmFyIGkgPSAwOyBpIDwgaXRlbS5xdWFudGl0eTsgaSsrKXtcblx0XHRcdFx0Y2FydElkcy5wdXNoKGl0ZW0ucHJvZHVjdC5pZCk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0JHNjb3BlLmNhcnRJdGVtcyA9IFtdO1xuXHRcdENhcnQuZW1wdHkoKVxuXHRcdHJldHVybiBDYXJ0LmNoZWNrb3V0KCRzY29wZS50eXBlZEFkZHJlc3MsIGNhcnRJZHMpO1xuXHR9O1xuXHRcbn0pO1xuXG4iLCJhcHAuZmFjdG9yeSgnQ2FydCcsIGZ1bmN0aW9uICgkc3RhdGUsICRodHRwLCBQcm9kdWN0KSB7XG4gICAgdmFyIENhcnRGYWN0b3J5ID0ge31cbiAgICAvL2NhcnQgPSB7cHJvZHVjdEtleTE6IHF1YW50aXR5MSwgcHJvZHVjdEtleTI6IHF1YW50aXR5Mi4uLiB9XG5cbiAgICBDYXJ0RmFjdG9yeS5hZGQgPSBmdW5jdGlvbiAocHJvZHVjdElkLCBxdWFudGl0eSkge1xuICAgICAgICBsZXQgbnVtYmVyID0gTnVtYmVyKGxvY2FsU3RvcmFnZS5nZXRJdGVtKHByb2R1Y3RJZCkpICsgTnVtYmVyKHF1YW50aXR5KSB8fCBOdW1iZXIocXVhbnRpdHkpO1xuICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShwcm9kdWN0SWQsIG51bWJlcik7XG4gICAgfVxuXG4gICAgQ2FydEZhY3RvcnkucmVtb3ZlID0gZnVuY3Rpb24gKHByb2R1Y3RJZCkge1xuICAgICAgICBsb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbShwcm9kdWN0SWQpO1xuICAgIH1cblxuICAgIENhcnRGYWN0b3J5LmVtcHR5ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBsb2NhbFN0b3JhZ2UuY2xlYXIoKTtcbiAgICB9XG4gICAgXG4gICAgQ2FydEZhY3RvcnkuZ2V0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICBpZihsb2NhbFN0b3JhZ2VbbGVuZ3RoXSkgZGVsZXRlIGxvY2FsU3RvcmFnZSgnbGVuZ3RoJyk7IFxuICAgICAgICByZXR1cm4gbG9jYWxTdG9yYWdlO1xuICAgIH1cblxuICAgIENhcnRGYWN0b3J5LmNoZWNrb3V0ID0gZnVuY3Rpb24gKGFkZHJlc3MsIGNhcnRJZHMpIHtcbiAgICAgICRzdGF0ZS5nbygnaG9tZScpO1xuICAgICAgcmV0dXJuICRodHRwLnBvc3QoJy9hcGkvb3JkZXJzL2NoZWNrb3V0LycgKyBhZGRyZXNzLCBjYXJ0SWRzKTtcbiAgICB9XG5cbiAgICBDYXJ0RmFjdG9yeS5jaGVja291dEFkZHJlc3MgPSBmdW5jdGlvbiAoKXtcbiAgICAgIHJldHVybiAkaHR0cC5nZXQoJ2FwaS9hY2NvdW50JylcbiAgICAgIC50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKXtcbiAgICAgICAgcmV0dXJuIHJlc3BvbnNlLmRhdGFcbiAgICAgIH0pXG4gICAgICAudGhlbihmdW5jdGlvbih1c2VyKXtcbiAgICAgICAgaWYoIXVzZXIpIHJldHVybiAnJztcbiAgICAgICAgcmV0dXJuIHVzZXIuYWRkcmVzc1xuICAgICAgfSlcbiAgICB9XG5cbiAgICByZXR1cm4gQ2FydEZhY3Rvcnk7XG59KTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2NhcnQnLCB7XG4gICAgICAgIHVybDogJy9jYXJ0JyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9jYXJ0L2NhcnQuaHRtbCcsXG4gICBcdFx0ICBjb250cm9sbGVyOiAnQ2FydEN0cmwnXG4gICAgfSk7XG59KTtcblxuIiwiKGZ1bmN0aW9uICgpIHtcblxuICAgICd1c2Ugc3RyaWN0JztcblxuICAgIC8vIEhvcGUgeW91IGRpZG4ndCBmb3JnZXQgQW5ndWxhciEgRHVoLWRveS5cbiAgICBpZiAoIXdpbmRvdy5hbmd1bGFyKSB0aHJvdyBuZXcgRXJyb3IoJ0kgY2FuXFwndCBmaW5kIEFuZ3VsYXIhJyk7XG5cbiAgICB2YXIgYXBwID0gYW5ndWxhci5tb2R1bGUoJ2ZzYVByZUJ1aWx0JywgW10pO1xuXG4gICAgYXBwLmZhY3RvcnkoJ1NvY2tldCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKCF3aW5kb3cuaW8pIHRocm93IG5ldyBFcnJvcignc29ja2V0LmlvIG5vdCBmb3VuZCEnKTtcbiAgICAgICAgcmV0dXJuIHdpbmRvdy5pbyh3aW5kb3cubG9jYXRpb24ub3JpZ2luKTtcbiAgICB9KTtcblxuICAgIC8vIEFVVEhfRVZFTlRTIGlzIHVzZWQgdGhyb3VnaG91dCBvdXIgYXBwIHRvXG4gICAgLy8gYnJvYWRjYXN0IGFuZCBsaXN0ZW4gZnJvbSBhbmQgdG8gdGhlICRyb290U2NvcGVcbiAgICAvLyBmb3IgaW1wb3J0YW50IGV2ZW50cyBhYm91dCBhdXRoZW50aWNhdGlvbiBmbG93LlxuICAgIGFwcC5jb25zdGFudCgnQVVUSF9FVkVOVFMnLCB7XG4gICAgICAgIGxvZ2luU3VjY2VzczogJ2F1dGgtbG9naW4tc3VjY2VzcycsXG4gICAgICAgIGxvZ2luRmFpbGVkOiAnYXV0aC1sb2dpbi1mYWlsZWQnLFxuICAgICAgICBsb2dvdXRTdWNjZXNzOiAnYXV0aC1sb2dvdXQtc3VjY2VzcycsXG4gICAgICAgIHNlc3Npb25UaW1lb3V0OiAnYXV0aC1zZXNzaW9uLXRpbWVvdXQnLFxuICAgICAgICBub3RBdXRoZW50aWNhdGVkOiAnYXV0aC1ub3QtYXV0aGVudGljYXRlZCcsXG4gICAgICAgIG5vdEF1dGhvcml6ZWQ6ICdhdXRoLW5vdC1hdXRob3JpemVkJ1xuICAgIH0pO1xuXG4gICAgYXBwLmZhY3RvcnkoJ0F1dGhJbnRlcmNlcHRvcicsIGZ1bmN0aW9uICgkcm9vdFNjb3BlLCAkcSwgQVVUSF9FVkVOVFMpIHtcbiAgICAgICAgdmFyIHN0YXR1c0RpY3QgPSB7XG4gICAgICAgICAgICA0MDE6IEFVVEhfRVZFTlRTLm5vdEF1dGhlbnRpY2F0ZWQsXG4gICAgICAgICAgICA0MDM6IEFVVEhfRVZFTlRTLm5vdEF1dGhvcml6ZWQsXG4gICAgICAgICAgICA0MTk6IEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0LFxuICAgICAgICAgICAgNDQwOiBBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dFxuICAgICAgICB9O1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcmVzcG9uc2VFcnJvcjogZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KHN0YXR1c0RpY3RbcmVzcG9uc2Uuc3RhdHVzXSwgcmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgIHJldHVybiAkcS5yZWplY3QocmVzcG9uc2UpXG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfSk7XG5cbiAgICBhcHAuY29uZmlnKGZ1bmN0aW9uICgkaHR0cFByb3ZpZGVyKSB7XG4gICAgICAgICRodHRwUHJvdmlkZXIuaW50ZXJjZXB0b3JzLnB1c2goW1xuICAgICAgICAgICAgJyRpbmplY3RvcicsXG4gICAgICAgICAgICBmdW5jdGlvbiAoJGluamVjdG9yKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICRpbmplY3Rvci5nZXQoJ0F1dGhJbnRlcmNlcHRvcicpO1xuICAgICAgICAgICAgfVxuICAgICAgICBdKTtcbiAgICB9KTtcblxuICAgIGFwcC5zZXJ2aWNlKCdBdXRoU2VydmljZScsIGZ1bmN0aW9uICgkaHR0cCwgU2Vzc2lvbiwgJHJvb3RTY29wZSwgQVVUSF9FVkVOVFMsICRxKSB7XG5cbiAgICAgICAgZnVuY3Rpb24gb25TdWNjZXNzZnVsTG9naW4ocmVzcG9uc2UpIHtcbiAgICAgICAgICAgIHZhciBkYXRhID0gcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgICAgIFNlc3Npb24uY3JlYXRlKGRhdGEuaWQsIGRhdGEudXNlcik7XG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoQVVUSF9FVkVOVFMubG9naW5TdWNjZXNzKTtcbiAgICAgICAgICAgIHJldHVybiBkYXRhLnVzZXI7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVc2VzIHRoZSBzZXNzaW9uIGZhY3RvcnkgdG8gc2VlIGlmIGFuXG4gICAgICAgIC8vIGF1dGhlbnRpY2F0ZWQgdXNlciBpcyBjdXJyZW50bHkgcmVnaXN0ZXJlZC5cbiAgICAgICAgdGhpcy5pc0F1dGhlbnRpY2F0ZWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gISFTZXNzaW9uLnVzZXI7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5nZXRMb2dnZWRJblVzZXIgPSBmdW5jdGlvbiAoZnJvbVNlcnZlcikge1xuXG4gICAgICAgICAgICAvLyBJZiBhbiBhdXRoZW50aWNhdGVkIHNlc3Npb24gZXhpc3RzLCB3ZVxuICAgICAgICAgICAgLy8gcmV0dXJuIHRoZSB1c2VyIGF0dGFjaGVkIHRvIHRoYXQgc2Vzc2lvblxuICAgICAgICAgICAgLy8gd2l0aCBhIHByb21pc2UuIFRoaXMgZW5zdXJlcyB0aGF0IHdlIGNhblxuICAgICAgICAgICAgLy8gYWx3YXlzIGludGVyZmFjZSB3aXRoIHRoaXMgbWV0aG9kIGFzeW5jaHJvbm91c2x5LlxuXG4gICAgICAgICAgICAvLyBPcHRpb25hbGx5LCBpZiB0cnVlIGlzIGdpdmVuIGFzIHRoZSBmcm9tU2VydmVyIHBhcmFtZXRlcixcbiAgICAgICAgICAgIC8vIHRoZW4gdGhpcyBjYWNoZWQgdmFsdWUgd2lsbCBub3QgYmUgdXNlZC5cblxuICAgICAgICAgICAgaWYgKHRoaXMuaXNBdXRoZW50aWNhdGVkKCkgJiYgZnJvbVNlcnZlciAhPT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAkcS53aGVuKFNlc3Npb24udXNlcik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIE1ha2UgcmVxdWVzdCBHRVQgL3Nlc3Npb24uXG4gICAgICAgICAgICAvLyBJZiBpdCByZXR1cm5zIGEgdXNlciwgY2FsbCBvblN1Y2Nlc3NmdWxMb2dpbiB3aXRoIHRoZSByZXNwb25zZS5cbiAgICAgICAgICAgIC8vIElmIGl0IHJldHVybnMgYSA0MDEgcmVzcG9uc2UsIHdlIGNhdGNoIGl0IGFuZCBpbnN0ZWFkIHJlc29sdmUgdG8gbnVsbC5cbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9zZXNzaW9uJykudGhlbihvblN1Y2Nlc3NmdWxMb2dpbikuY2F0Y2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmxvZ2luID0gZnVuY3Rpb24gKGNyZWRlbnRpYWxzKSB7XG4gICAgICAgICAgICByZXR1cm4gJGh0dHAucG9zdCgnL2xvZ2luJywgY3JlZGVudGlhbHMpXG4gICAgICAgICAgICAgICAgLnRoZW4ob25TdWNjZXNzZnVsTG9naW4pXG4gICAgICAgICAgICAgICAgLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICRxLnJlamVjdCh7IG1lc3NhZ2U6ICdJbnZhbGlkIGxvZ2luIGNyZWRlbnRpYWxzLicgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5sb2dvdXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvbG9nb3V0JykudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgU2Vzc2lvbi5kZXN0cm95KCk7XG4gICAgICAgICAgICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KEFVVEhfRVZFTlRTLmxvZ291dFN1Y2Nlc3MpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG5cbiAgICB9KTtcblxuICAgIGFwcC5zZXJ2aWNlKCdTZXNzaW9uJywgZnVuY3Rpb24gKCRyb290U2NvcGUsIEFVVEhfRVZFTlRTKSB7XG5cbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLm5vdEF1dGhlbnRpY2F0ZWQsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHNlbGYuZGVzdHJveSgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc2VsZi5kZXN0cm95KCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHRoaXMuaWQgPSBudWxsO1xuICAgICAgICB0aGlzLnVzZXIgPSBudWxsO1xuXG4gICAgICAgIHRoaXMuY3JlYXRlID0gZnVuY3Rpb24gKHNlc3Npb25JZCwgdXNlcikge1xuICAgICAgICAgICAgdGhpcy5pZCA9IHNlc3Npb25JZDtcbiAgICAgICAgICAgIHRoaXMudXNlciA9IHVzZXI7XG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5kZXN0cm95ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdGhpcy5pZCA9IG51bGw7XG4gICAgICAgICAgICB0aGlzLnVzZXIgPSBudWxsO1xuICAgICAgICB9O1xuXG4gICAgfSk7XG5cbn0pKCk7XG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdob21lJywge1xuICAgICAgdXJsOiAnLycsXG4gICAgICB0ZW1wbGF0ZVVybDogJ2pzL2hvbWUvaG9tZS5odG1sJyxcbiAgIFx0XHRjb250cm9sbGVyOiBmdW5jdGlvbigkc2NvcGUsIGhvbWVwYWdlKXtcbiAgICAgICAgJHNjb3BlLmNhdGVnb3JpZXMgPSBbJ3BhZGRsZScsJ2JhbGwnLCdjYXNlJyxcbiAgICAgICAgICAgICAgICAgICAgJ3RhYmxlJywncm9ib3QnXTtcbiAgICAgICAgJHNjb3BlLnNlbGVjdGVkQ2F0ZWdvcnkgPSAnJztcblxuICAgICAgICAkc2NvcGUub3JkZXJPcHRpb25zID0gWydwcmljZScsICdyYXRpbmcnXTtcbiAgICAgICAgJHNjb3BlLm9yZGVyT3B0aW9uID0gJyc7XG4gICAgICAgICRzY29wZS5maW5hbE9yZGVyT3B0aW9uID0gJHNjb3BlLmFzY0Rlc2MgKyAkc2NvcGUub3JkZXJPcHRpb247XG5cbiAgICAgICAgJHNjb3BlLmFzY0Rlc2NPcHRpb25zID0gWydhc2NlbmRpbmcnLCAnZGVzY2VuZGluZyddXG4gICAgICAgICRzY29wZS5zZWxlY3RlZEFzY0Rlc2MgPSAnZGVzY2VuZGluZyc7XG4gICAgICAgICRzY29wZS5hc2NEZXNjID0gZnVuY3Rpb24gKCl7XG4gICAgICAgICAgaWYgKCRzY29wZS5zZWxlY3RlZEFzY0Rlc2MgPT09ICdhc2NlbmRpbmcnKXtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcblxuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIHJldHVybiB0cnVlO1xuICAgICAgICB9XG5cblxuICAgXHRcdFx0aG9tZXBhZ2UuZ2V0QWxsUHJvZHVjdHMoKS50aGVuKGZ1bmN0aW9uKGFsbFByb2R1Y3RzKXtcbiAgIFx0XHRcdFx0JHNjb3BlLnByb2R1Y3RzID0gYWxsUHJvZHVjdHNcbiAgIFx0XHRcdH0pXG4gICBcdFx0fSBcbiAgICB9KTtcbn0pO1xuXG5hcHAuZmFjdG9yeSgnaG9tZXBhZ2UnLCBmdW5jdGlvbigkaHR0cCl7XG4gICAgdmFyIGdldEFsbFByb2R1Y3RzID0gZnVuY3Rpb24oKXtcbiAgICAgICAgcmV0dXJuICRodHRwLmdldCgnL2FwaS9wcm9kdWN0cycpLnRoZW4oZnVuY3Rpb24ocHJvZHVjdHMpe1xuICAgICAgICAgICAgcmV0dXJuIHByb2R1Y3RzLmRhdGE7XG4gICAgICAgIH0pXG4gICAgfVxuXHRyZXR1cm4ge1xuICAgIGdldEFsbFByb2R1Y3RzOiBnZXRBbGxQcm9kdWN0c1xuXHR9ICAgIFxufSkiLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2xvZ2luJywge1xuICAgICAgICB1cmw6ICcvbG9naW4nLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2xvZ2luL2xvZ2luLmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnTG9naW5DdHJsJ1xuICAgIH0pO1xuXG59KTtcblxuYXBwLmNvbnRyb2xsZXIoJ0xvZ2luQ3RybCcsIGZ1bmN0aW9uICgkc2NvcGUsIEF1dGhTZXJ2aWNlLCAkc3RhdGUpIHtcblxuICAgICRzY29wZS5sb2dpbiA9IHt9O1xuICAgICRzY29wZS5lcnJvciA9IG51bGw7XG5cbiAgICAkc2NvcGUuc2VuZExvZ2luID0gZnVuY3Rpb24gKGxvZ2luSW5mbykge1xuXG4gICAgICAgICRzY29wZS5lcnJvciA9IG51bGw7XG5cbiAgICAgICAgQXV0aFNlcnZpY2UubG9naW4obG9naW5JbmZvKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICRzdGF0ZS5nbygnaG9tZScpO1xuICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAkc2NvcGUuZXJyb3IgPSAnSW52YWxpZCBsb2dpbiBjcmVkZW50aWFscy4nO1xuICAgICAgICB9KTtcblxuICAgIH07XG5cbn0pOyIsImFwcC5jb250cm9sbGVyKCdPcmRlckN0cmwnLCBmdW5jdGlvbigkc2NvcGUsIE9yZGVyRmFjdG9yeSl7XG5cblx0T3JkZXJGYWN0b3J5LnNob3coKVxuXHQudGhlbihmdW5jdGlvbihhbGxPcmRlcnMpe1xuXHRcdGNvbnNvbGUubG9nKGFsbE9yZGVycylcblx0XHQkc2NvcGUub3JkZXJzID0gYWxsT3JkZXJzO1xuXHR9KVxuXG59KSIsImFwcC5mYWN0b3J5KCdPcmRlckZhY3RvcnknLCBmdW5jdGlvbigkc3RhdGUsICRodHRwKXtcblx0dmFyIE9yZGVyRmFjdG9yeSA9IHt9O1xuXG5cdE9yZGVyRmFjdG9yeS5zaG93ID0gZnVuY3Rpb24oKXtcblx0XHRyZXR1cm4gJGh0dHAuZ2V0KCcvYXBpL29yZGVycycpXG5cdFx0LnRoZW4oZnVuY3Rpb24ocmVzcG9uc2Upe1xuXHRcdFx0cmV0dXJuIHJlc3BvbnNlLmRhdGFcblx0XHR9KVxuXHR9XG5cdHJldHVybiBPcmRlckZhY3Rvcnk7XG5cdFxufSkiLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdvcmRlcicsIHtcbiAgICAgICAgdXJsOiAnL29yZGVyJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9vcmRlci9vcmRlci5odG1sJyxcblx0XHRjb250cm9sbGVyOiAnT3JkZXJDdHJsJ1xuICAgIH0pO1xuXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ25ld1JldmlldycsIHtcbiAgICBcdHVybDogJy9vcmRlci9yZXZpZXcvOnByb2R1Y3RJZCcsXG4gICAgXHR0ZW1wbGF0ZVVybDogJ2pzL29yZGVyL3Jldmlldy9yZXZpZXcuZm9ybS5odG1sJyxcbiAgICBcdGNvbnRyb2xsZXI6ICdSZXZpZXdGb3JtQ3RybCdcbiAgICB9KTtcbn0pO1xuXG4iLCJhcHAuY29udHJvbGxlcignUHJvZHVjdEN0cmwnLCBmdW5jdGlvbigkc2NvcGUsIFByb2R1Y3QsICRzdGF0ZVBhcmFtcywgQ2FydCl7XG4gICRzY29wZS5DYXJ0ID0gQ2FydDtcblx0UHJvZHVjdC5nZXRPbmVQcm9kdWN0KCRzdGF0ZVBhcmFtcy5pZClcbiAgLnRoZW4oZnVuY3Rpb24ocHJvZHVjdCl7XG4gIFx0Y29uc29sZS5sb2cocHJvZHVjdClcblx0XHQkc2NvcGUucHJvZHVjdCA9IHByb2R1Y3Q7XG5cdH0pXG59KTtcblxuIiwiYXBwLmZhY3RvcnkoJ1Byb2R1Y3QnLCBmdW5jdGlvbigkaHR0cCl7XG5cdGxldCBnZXRPbmVQcm9kdWN0ID0gZnVuY3Rpb24oaWQpe1xuICAgIHJldHVybiAkaHR0cC5nZXQoJy9hcGkvcHJvZHVjdHMvJysgaWQpXG4gICAgLnRoZW4oZnVuY3Rpb24ocHJvZHVjdCl7XG5cdFx0ICByZXR1cm4gcHJvZHVjdC5kYXRhO1xuXHRcdH0pXG5cdH07XG5cbiAgcmV0dXJuIHtcblx0ICBnZXRPbmVQcm9kdWN0OiBnZXRPbmVQcm9kdWN0XG4gIH1cbn0pXG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdwcm9kdWN0Jywge1xuICAgICAgICB1cmw6ICcvcHJvZHVjdHMvOmlkJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9wcm9kdWN0L3Byb2R1Y3QuaHRtbCcsXG4gICBcdFx0ICBjb250cm9sbGVyOiAnUHJvZHVjdEN0cmwnXG4gICAgfSk7XG59KTtcbiIsImFwcC5jb250cm9sbGVyKCdQcm9kdWN0c0N0cmwnLCBmdW5jdGlvbigkc2NvcGUsIFByb2R1Y3RzKXtcblxuICAgICRzY29wZS5jYXRlZ29yaWVzID0gWydwYWRkbGVzJywnYmFsbHMnLCdjYXNlcycsJ3RhYmxlcycsJ3JvYm90cyddO1xuXG4gICAgJHNjb3BlLmNhdGVnb3JpZXNGdW5jID0gUHJvZHVjdHMuZ2V0UHJvZHVjdHNieUNhdGVnb3J5O1xuXG4gICAgUHJvZHVjdHMuZ2V0UHJvZHVjdHNieUNhdGVnb3J5KClcbiAgICAudGhlbihmdW5jdGlvbihwcm9kdWN0c0luQ2F0ZWdvcnkpe1xuICAgICAgICAkc2NvcGUucHJvZHVjdHMgPSBwcm9kdWN0c0luQ2F0ZWdvcnk7XG4gICAgfSk7XG59KTtcbiIsImFwcC5mYWN0b3J5KCdQcm9kdWN0cycsIGZ1bmN0aW9uKCRodHRwKXtcbiAgICB2YXIgZ2V0QWxsUHJvZHVjdHMgPSBmdW5jdGlvbigpe1xuICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvYXBpL3Byb2R1Y3RzJylcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24ocHJvZHVjdHMpe1xuICAgICAgICAgICAgcmV0dXJuIHByb2R1Y3RzLmRhdGE7XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICB2YXIgZ2V0UHJvZHVjdHNieUNhdGVnb3J5ID0gZnVuY3Rpb24oY2F0ZWdvcnkpe1xuICAgICAgICBjYXRlZ29yeSA9IGNhdGVnb3J5IHx8IDA7XG4gICAgICAgIGlmKGNhdGVnb3J5ID09PSAwKXtcbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9hcGkvcHJvZHVjdHMnKVxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24ocHJvZHVjdHMpe1xuICAgICAgICAgICAgICAgIHJldHVybiBwcm9kdWN0cy5kYXRhO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICRodHRwLmdldCgnL2FwaS9wcm9kdWN0cy8/Y2F0ZWdvcnk9JyArIGNhdGVnb3J5KVxuICAgICAgICAudGhlbihmdW5jdGlvbihwcm9kdWN0c0luQ2F0ZWdvcnkpe1xuICAgICAgICAgICAgcmV0dXJuIHByb2R1Y3RzSW5DYXRlZ29yeS5kYXRhO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgZ2V0UHJvZHVjdHNieUNhdGVnb3J5OiBnZXRQcm9kdWN0c2J5Q2F0ZWdvcnlcbiAgICB9O1xufSlcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG7CoMKgwqDCoCRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdwcm9kdWN0cycsIHtcbsKgwqDCoMKgwqDCoMKgwqB1cmw6ICcvJyxcbsKgwqDCoMKgwqDCoMKgwqB0ZW1wbGF0ZVVybDogJ2pzL3Byb2R1Y3RzL3Byb2R1Y3RzLmh0bWwnLFxuwqDCoMKgwqDCoMKgwqDCoGNvbnRyb2xsZXI6ICdQcm9kdWN0c0N0cmwnXG7CoMKgwqDCoH0pO1xufSk7IiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnZG9jcycsIHtcbiAgICAgICAgdXJsOiAnL2RvY3MnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2RvY3MvZG9jcy5odG1sJ1xuICAgIH0pO1xufSk7XG4iLCJhcHAuZmFjdG9yeSgnRnVsbHN0YWNrUGljcycsIGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gW1xuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0I3Z0JYdWxDQUFBWFFjRS5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9mYmNkbi1zcGhvdG9zLWMtYS5ha2FtYWloZC5uZXQvaHBob3Rvcy1hay14YXAxL3QzMS4wLTgvMTA4NjI0NTFfMTAyMDU2MjI5OTAzNTkyNDFfODAyNzE2ODg0MzMxMjg0MTEzN19vLmpwZycsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQi1MS1VzaElnQUV5OVNLLmpwZycsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQjc5LVg3b0NNQUFrdzd5LmpwZycsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQi1VajlDT0lJQUlGQWgwLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQjZ5SXlGaUNFQUFxbDEyLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0UtVDc1bFdBQUFtcXFKLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0V2WkFnLVZBQUFrOTMyLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0VnTk1lT1hJQUlmRGhLLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0VReUlETldnQUF1NjBCLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0NGM1Q1UVc4QUUybEdKLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0FlVnc1U1dvQUFBTHNqLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0FhSklQN1VrQUFsSUdzLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0FRT3c5bFdFQUFZOUZsLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQi1PUWJWckNNQUFOd0lNLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQjliX2Vyd0NZQUF3UmNKLnBuZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQjVQVGR2bkNjQUVBbDR4LmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQjRxd0MwaUNZQUFsUEdoLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQjJiMzN2UklVQUE5bzFELmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQndwSXdyMUlVQUF2TzJfLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQnNTc2VBTkNZQUVPaEx3LmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0o0dkxmdVV3QUFkYTRMLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0k3d3pqRVZFQUFPUHBTLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0lkSHZUMlVzQUFubkhWLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0dDaVBfWVdZQUFvNzVWLmpwZzpsYXJnZScsXG4gICAgICAgICdodHRwczovL3Bicy50d2ltZy5jb20vbWVkaWEvQ0lTNEpQSVdJQUkzN3F1LmpwZzpsYXJnZSdcbiAgICBdO1xufSk7XG4iLCJhcHAuZmFjdG9yeSgnUmFuZG9tR3JlZXRpbmdzJywgZnVuY3Rpb24gKCkge1xuXG4gICAgdmFyIGdldFJhbmRvbUZyb21BcnJheSA9IGZ1bmN0aW9uIChhcnIpIHtcbiAgICAgICAgcmV0dXJuIGFycltNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBhcnIubGVuZ3RoKV07XG4gICAgfTtcblxuICAgIHZhciBncmVldGluZ3MgPSBbXG4gICAgICAgICdXZWxjb21lIHRvIHRoZSBiZXN0IFBpbmctUG9uZyBzdG9yZSB0aGlzIHNpZGUgb2YgdGhlIEF0bGFudGljJyxcbiAgICAgICAgJ1lvdSBsb29rIGxpa2UgeW91IGNvdWxkIHVzZSBhIGJyYW5kIHNwYW5raW5nIG5ldyBwYWRkbGUnXG4gICAgXTtcblxuICAgIHJldHVybiB7XG4gICAgICAgIGdyZWV0aW5nczogZ3JlZXRpbmdzLFxuICAgICAgICBnZXRSYW5kb21HcmVldGluZzogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIGdldFJhbmRvbUZyb21BcnJheShncmVldGluZ3MpO1xuICAgICAgICB9XG4gICAgfTtcblxufSk7XG4iLCJhcHAuY29udHJvbGxlcignUmV2aWV3Rm9ybUN0cmwnLCBmdW5jdGlvbigkc2NvcGUsUmV2aWV3RmFjdG9yeSxBdXRoU2VydmljZSwkc3RhdGVQYXJhbXMsJHN0YXRlKXtcblx0JHNjb3BlLm5ld1JldmlldyA9IHt9O1xuXHQkc2NvcGUuc3RhdGUgPSAkc3RhdGUuY3VycmVudDtcblx0Y29uc29sZS5sb2coJHN0YXRlUGFyYW1zKVxuXHQkc2NvcGUuY3JlYXRlUmV2aWV3ID0gZnVuY3Rpb24oKXtcblx0XHRBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgICAgICAkc2NvcGUubmV3UmV2aWV3LnVzZXJJZCA9IHVzZXIuaWQ7XG4gICAgICAgICAgICAkc2NvcGUubmV3UmV2aWV3LnByb2R1Y3RJZCA9ICRzdGF0ZVBhcmFtcy5wcm9kdWN0SWQ7XG4gICAgICAgICAgICByZXR1cm4gJHNjb3BlLm5ld1Jldmlld1xuICAgICAgICB9KVxuICAgICAgICAudGhlbihmdW5jdGlvbihuZXdSZXZpZXcpe1xuICAgICAgICBcdFJldmlld0ZhY3Rvcnkuc2V0UmV2aWV3KG5ld1Jldmlldylcblx0XHRcdC50aGVuKGZ1bmN0aW9uKHJldmlldyl7XG5cdFx0XHRcdCRzdGF0ZS5nbygnb3JkZXInKTtcblx0XHRcdH0pXG4gICAgICAgIH0pXG5cdFx0XG5cdH1cbn0pIiwiYXBwLmZhY3RvcnkoJ1Jldmlld0ZhY3RvcnknLCBmdW5jdGlvbigkc3RhdGUsICRodHRwKXtcblx0dmFyIFJldmlld0ZhY3RvcnkgPSB7fTtcblxuXHRSZXZpZXdGYWN0b3J5LnNldFJldmlldyA9IGZ1bmN0aW9uKHJldmlldyl7XG5cdFx0cmV0dXJuICRodHRwLnBvc3QoJy9hcGkvcmV2aWV3cycsIHJldmlldylcblx0XHQudGhlbihmdW5jdGlvbihyZXNwb25zZSl7XG5cdFx0XHRjb25zb2xlLmxvZygnLS0tLScscmVzcG9uc2UpXG5cdFx0XHRyZXR1cm4gcmVzcG9uc2U7XG5cdFx0fSlcblx0fVxuXHRyZXR1cm4gUmV2aWV3RmFjdG9yeTtcblx0XG59KSIsImFwcC5kaXJlY3RpdmUoJ2Z1bGxzdGFja0xvZ28nLCBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy9mdWxsc3RhY2stbG9nby9mdWxsc3RhY2stbG9nby5odG1sJ1xuICAgIH07XG59KTsiLCJhcHAuZGlyZWN0aXZlKCduYXZiYXInLCBmdW5jdGlvbiAoJHJvb3RTY29wZSwgQXV0aFNlcnZpY2UsIEFVVEhfRVZFTlRTLCAkc3RhdGUpIHtcblxuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHNjb3BlOiB7fSxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy9uYXZiYXIvbmF2YmFyLmh0bWwnLFxuICAgICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUpIHtcblxuICAgICAgICAgICAgc2NvcGUuaXRlbXMgPSBbXG4gICAgICAgICAgICAgICAgeyBsYWJlbDogJ0Fib3V0Jywgc3RhdGU6ICdhYm91dCcgfSxcbiAgICAgICAgICAgICAgICB7IGxhYmVsOiAnTXkgQ2FydCcsIHN0YXRlOiAnY2FydCcgfSxcbiAgICAgICAgICAgICAgICB7IGxhYmVsOiAnT3JkZXInLCBzdGF0ZTogJ29yZGVyJywgYXV0aDogdHJ1ZX0sXG4gICAgICAgICAgICAgICAgeyBsYWJlbDogJ0FjY291bnQnLCBzdGF0ZTogJ2FjY291bnQnLCBhdXRoOiB0cnVlfVxuICAgICAgICAgICAgXTtcblxuICAgICAgICAgICAgc2NvcGUudXNlciA9IG51bGw7XG5cbiAgICAgICAgICAgIHNjb3BlLmlzTG9nZ2VkSW4gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIEF1dGhTZXJ2aWNlLmlzQXV0aGVudGljYXRlZCgpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgc2NvcGUubG9nb3V0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIEF1dGhTZXJ2aWNlLmxvZ291dCgpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICRzdGF0ZS5nbygnaG9tZScpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgdmFyIHNldFVzZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgICAgICAgICAgICAgICAgICBzY29wZS51c2VyID0gdXNlcjtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHZhciByZW1vdmVVc2VyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHNjb3BlLnVzZXIgPSBudWxsO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgc2V0VXNlcigpO1xuXG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5sb2dpblN1Y2Nlc3MsIHNldFVzZXIpO1xuICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMubG9nb3V0U3VjY2VzcywgcmVtb3ZlVXNlcik7XG4gICAgICAgICAgICAkcm9vdFNjb3BlLiRvbihBVVRIX0VWRU5UUy5zZXNzaW9uVGltZW91dCwgcmVtb3ZlVXNlcik7XG5cbiAgICAgICAgfVxuXG4gICAgfTtcblxufSk7XG4iLCJhcHAuZGlyZWN0aXZlKCdyYW5kb0dyZWV0aW5nJywgZnVuY3Rpb24gKFJhbmRvbUdyZWV0aW5ncykge1xuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgcmVzdHJpY3Q6ICdFJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9jb21tb24vZGlyZWN0aXZlcy9yYW5kby1ncmVldGluZy9yYW5kby1ncmVldGluZy5odG1sJyxcbiAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlKSB7XG4gICAgICAgIFx0XHRjb25zb2xlLmxvZyhcInJhbmRvR3JlZXRpbmcgbGluayBmdW5jdGlvbiBoaXRcIik7XG4gICAgICAgICAgICBzY29wZS5ncmVldGluZyA9IFJhbmRvbUdyZWV0aW5ncy5nZXRSYW5kb21HcmVldGluZygpO1xuICAgICAgICB9XG4gICAgfTtcblxufSk7Il0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
