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
    $stateProvider.state('home', {
        url: '/',
        templateUrl: 'js/home/home.html',
        controller: function controller($scope, homepage) {
            $scope.categories = ['Paddle', 'Ball', 'Case', 'Table', 'Robot'];
            $scope.selectedCategory = '';

            $scope.orderOptions = ['Price', 'Rating'];
            $scope.orderOption = '';
            $scope.finalOrderOption = $scope.ascDesc + $scope.orderOption;

            $scope.ascDescOptions = ['Ascending', 'Descending'];
            $scope.selectedAscDesc = 'Descending';
            $scope.ascDesc = function () {
                if ($scope.selectedAscDesc === 'Ascending') {
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
app.controller('OrderCtrl', function ($scope, Order) {
    Order.show().then(function (allOrders) {
        $scope.orders = allOrders;
    });
});
app.factory('Order', function ($state, $http) {
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
    $scope.createReview = function () {
        AuthService.getLoggedInUser().then(function (user) {
            $scope.newReview.userId = user.id;
            $scope.newReview.productId = $stateParams.productId;
            return $scope.newReview;
        }).then(function (newReview) {
            ReviewFactory.setReview(newReview).then(function (review) {
                if (review.created) alert('You already write a review for this order');else alert('Thanks for your feedback!');
                $state.go('order');
            });
        });
    };
});
app.factory('ReviewFactory', function ($state, $http) {
    var ReviewFactory = {};

    ReviewFactory.setReview = function (review) {
        return $http.post('/api/reviews/', review).then(function (response) {
            return response.data;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImFib3V0L2Fib3V0LmpzIiwiYWNjb3VudC9hY2NvdW50LmpzIiwiY2FydC9jYXJ0LmNvbnRyb2xsZXIuanMiLCJjYXJ0L2NhcnQuZmFjdG9yeS5qcyIsImNhcnQvY2FydC5zdGF0ZS5qcyIsImZzYS9mc2EtcHJlLWJ1aWx0LmpzIiwibG9naW4vbG9naW4uanMiLCJob21lL2hvbWUuanMiLCJvcmRlci9vcmRlci5jb250cm9sbGVyLmpzIiwib3JkZXIvb3JkZXIuZmFjdG9yeS5qcyIsIm9yZGVyL29yZGVyLnN0YXRlLmpzIiwicHJvZHVjdHMvcHJvZHVjdHMuY29udHJvbGxlci5qcyIsInByb2R1Y3RzL3Byb2R1Y3RzLmZhY3RvcnkuanMiLCJwcm9kdWN0cy9wcm9kdWN0cy5zdGF0ZS5qcyIsInByb2R1Y3QvcHJvZHVjdC5jb250cm9sbGVyLmpzIiwicHJvZHVjdC9wcm9kdWN0LmZhY3RvcnkuanMiLCJwcm9kdWN0L3Byb2R1Y3Quc3RhdGUuanMiLCJzaWdudXAvZG9jcy5qcyIsImNvbW1vbi9mYWN0b3JpZXMvRnVsbHN0YWNrUGljcy5qcyIsImNvbW1vbi9mYWN0b3JpZXMvUmFuZG9tR3JlZXRpbmdzLmpzIiwib3JkZXIvcmV2aWV3L3Jldmlldy5jb250cm9sbGVyLmpzIiwib3JkZXIvcmV2aWV3L3Jldmlldy5mYWN0b3J5LmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvZnVsbHN0YWNrLWxvZ28vZnVsbHN0YWNrLWxvZ28uanMiLCJjb21tb24vZGlyZWN0aXZlcy9uYXZiYXIvbmF2YmFyLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvcmFuZG8tZ3JlZXRpbmcvcmFuZG8tZ3JlZXRpbmcuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7O0FBQ0EsT0FBQSxHQUFBLEdBQUEsUUFBQSxNQUFBLENBQUEsdUJBQUEsRUFBQSxDQUFBLGFBQUEsRUFBQSxXQUFBLEVBQUEsY0FBQSxFQUFBLFdBQUEsQ0FBQSxDQUFBOztBQUVBLElBQUEsTUFBQSxDQUFBLFVBQUEsa0JBQUEsRUFBQSxpQkFBQSxFQUFBO0FBQ0E7QUFDQSxzQkFBQSxTQUFBLENBQUEsSUFBQTtBQUNBO0FBQ0EsdUJBQUEsU0FBQSxDQUFBLEdBQUE7QUFDQTtBQUNBLHVCQUFBLElBQUEsQ0FBQSxpQkFBQSxFQUFBLFlBQUE7QUFDQSxlQUFBLFFBQUEsQ0FBQSxNQUFBO0FBQ0EsS0FGQTtBQUdBLENBVEE7O0FBV0E7QUFDQSxJQUFBLEdBQUEsQ0FBQSxVQUFBLFVBQUEsRUFBQSxXQUFBLEVBQUEsTUFBQSxFQUFBOztBQUVBO0FBQ0EsUUFBQSwrQkFBQSxTQUFBLDRCQUFBLENBQUEsS0FBQSxFQUFBO0FBQ0EsZUFBQSxNQUFBLElBQUEsSUFBQSxNQUFBLElBQUEsQ0FBQSxZQUFBO0FBQ0EsS0FGQTs7QUFJQTtBQUNBO0FBQ0EsZUFBQSxHQUFBLENBQUEsbUJBQUEsRUFBQSxVQUFBLEtBQUEsRUFBQSxPQUFBLEVBQUEsUUFBQSxFQUFBOztBQUVBLFlBQUEsQ0FBQSw2QkFBQSxPQUFBLENBQUEsRUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBLFlBQUEsWUFBQSxlQUFBLEVBQUEsRUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0EsY0FBQSxjQUFBOztBQUVBLG9CQUFBLGVBQUEsR0FBQSxJQUFBLENBQUEsVUFBQSxJQUFBLEVBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxnQkFBQSxJQUFBLEVBQUE7QUFDQSx1QkFBQSxFQUFBLENBQUEsUUFBQSxJQUFBLEVBQUEsUUFBQTtBQUNBLGFBRkEsTUFFQTtBQUNBLHVCQUFBLEVBQUEsQ0FBQSxPQUFBO0FBQ0E7QUFDQSxTQVRBO0FBV0EsS0E1QkE7QUE4QkEsQ0F2Q0E7O0FDZkEsSUFBQSxNQUFBLENBQUEsVUFBQSxjQUFBLEVBQUE7O0FBRUE7QUFDQSxtQkFBQSxLQUFBLENBQUEsT0FBQSxFQUFBO0FBQ0EsYUFBQSxRQURBO0FBRUEsb0JBQUEsaUJBRkE7QUFHQSxxQkFBQTtBQUhBLEtBQUE7QUFNQSxDQVRBOztBQVdBLElBQUEsVUFBQSxDQUFBLGlCQUFBLEVBQUEsVUFBQSxNQUFBLEVBQUEsYUFBQSxFQUFBOztBQUVBO0FBQ0EsV0FBQSxNQUFBLEdBQUEsRUFBQSxPQUFBLENBQUEsYUFBQSxDQUFBO0FBRUEsQ0FMQTtBQ1hBLElBQUEsTUFBQSxDQUFBLFVBQUEsY0FBQSxFQUFBOztBQUVBLG1CQUFBLEtBQUEsQ0FBQSxTQUFBLEVBQUE7QUFDQSxhQUFBLFVBREE7QUFFQSxxQkFBQSx5QkFGQTtBQUdBLG9CQUFBLG9CQUFBLE1BQUEsRUFBQSxPQUFBLEVBQUEsSUFBQSxFQUFBO0FBQ0Esb0JBQUEsY0FBQSxHQUFBLElBQUEsQ0FBQSxVQUFBLFdBQUEsRUFBQTtBQUNBLHVCQUFBLE9BQUEsR0FBQSxXQUFBO0FBQ0EsYUFGQSxFQUdBLEtBSEEsQ0FHQSxJQUhBOztBQUtBLG1CQUFBLGNBQUEsR0FBQSxZQUFBO0FBQ0EsdUJBQUEsaUJBQUEsR0FBQSxDQUFBLE9BQUEsaUJBQUE7QUFDQSxhQUZBOztBQUlBLG1CQUFBLFlBQUEsR0FBQSxZQUFBO0FBQ0EsdUJBQUEsZUFBQSxHQUFBLENBQUEsT0FBQSxlQUFBO0FBQ0EsYUFGQTs7QUFJQSxtQkFBQSxpQkFBQSxHQUFBLEtBQUE7O0FBRUEsbUJBQUEsZUFBQSxHQUFBLEtBQUE7QUFHQTtBQXRCQSxLQUFBO0FBMkJBLENBN0JBOztBQStCQSxJQUFBLE9BQUEsQ0FBQSxTQUFBLEVBQUEsVUFBQSxLQUFBLEVBQUE7O0FBRUEsUUFBQSxpQkFBQSxTQUFBLGNBQUEsR0FBQTtBQUNBLGVBQUEsTUFBQSxHQUFBLENBQUEsY0FBQSxFQUFBLElBQUEsQ0FBQSxVQUFBLE9BQUEsRUFBQTtBQUNBLG9CQUFBLEdBQUEsQ0FBQSxlQUFBLEVBQUEsUUFBQSxJQUFBO0FBQ0EsbUJBQUEsUUFBQSxJQUFBO0FBQ0EsU0FIQSxDQUFBO0FBSUEsS0FMQTs7QUFPQSxRQUFBLGFBQUEsU0FBQSxVQUFBLEdBQUE7QUFDQSxlQUFBLE1BQUEsR0FBQSxDQUFBLGNBQUEsRUFBQSxPQUFBLE9BQUEsRUFBQSxJQUFBLENBQUEsVUFBQSxPQUFBLEVBQUE7QUFDQSxvQkFBQSxHQUFBLENBQUEsd0JBQUE7QUFDQSxtQkFBQSxRQUFBLElBQUE7QUFDQSxTQUhBLENBQUE7QUFJQSxLQUxBOztBQU9BLFdBQUE7QUFDQSx3QkFBQTtBQURBLEtBQUE7QUFJQSxDQXBCQTs7QUMvQkEsSUFBQSxVQUFBLENBQUEsVUFBQSxFQUFBLFVBQUEsTUFBQSxFQUFBLFlBQUEsRUFBQSxJQUFBLEVBQUEsT0FBQSxFQUFBOztBQUVBLFdBQUEsU0FBQSxHQUFBLEVBQUE7QUFDQSxXQUFBLFNBQUEsR0FBQSxJQUFBOztBQUVBLFFBQUEsV0FBQSxPQUFBLElBQUEsQ0FBQSxLQUFBLEdBQUEsRUFBQSxDQUFBOztBQUVBLFFBQUEsU0FBQSxNQUFBLEdBQUEsQ0FBQSxFQUFBO0FBQ0EsZUFBQSxTQUFBLEdBQUEsS0FBQTtBQUNBLGlCQUFBLE9BQUEsQ0FBQSxVQUFBLFNBQUEsRUFBQTtBQUNBLG9CQUFBLEdBQUEsQ0FBQSxnQ0FBQSxFQUFBLFNBQUE7QUFDQSxtQkFBQSxRQUFBLGFBQUEsQ0FBQSxTQUFBLEVBQ0EsSUFEQSxDQUNBLFVBQUEsT0FBQSxFQUFBO0FBQ0Esb0JBQUEsV0FBQSxhQUFBLFNBQUEsQ0FBQTtBQUNBLHdCQUFBLEdBQUEsQ0FBQSw4QkFBQSxFQUFBLFFBQUEsRUFBQSxnQkFBQSxFQUFBLE9BQUE7QUFDQSx1QkFBQSxTQUFBLENBQUEsSUFBQSxDQUFBO0FBQ0EsOEJBQUEsUUFEQTtBQUVBLDZCQUFBO0FBRkEsaUJBQUE7QUFJQSxhQVJBLENBQUE7QUFTQSxTQVhBO0FBWUE7O0FBRUE7QUFDQSxXQUFBLGNBQUEsR0FBQSxFQUFBO0FBQ0EsU0FBQSxlQUFBLEdBQ0EsSUFEQSxDQUNBLFVBQUEsV0FBQSxFQUFBO0FBQ0EsZUFBQSxjQUFBLEdBQUEsV0FBQTtBQUNBLEtBSEE7O0FBTUE7QUFDQSxXQUFBLFFBQUEsR0FBQSxZQUFBO0FBQ0E7QUFDQSxZQUFBLFVBQUEsRUFBQTtBQUNBLGVBQUEsU0FBQSxDQUFBLE9BQUEsQ0FBQSxVQUFBLElBQUEsRUFBQTtBQUNBLGlCQUFBLElBQUEsSUFBQSxDQUFBLEVBQUEsSUFBQSxLQUFBLFFBQUEsRUFBQSxHQUFBLEVBQUE7QUFDQSx3QkFBQSxJQUFBLENBQUEsS0FBQSxPQUFBLENBQUEsRUFBQTtBQUNBO0FBQ0EsU0FKQTtBQUtBLGVBQUEsU0FBQSxHQUFBLEVBQUE7QUFDQSxhQUFBLEtBQUE7QUFDQSxlQUFBLEtBQUEsUUFBQSxDQUFBLE9BQUEsWUFBQSxFQUFBLE9BQUEsQ0FBQTtBQUNBLEtBWEE7QUFhQSxDQTdDQTs7QUNBQSxJQUFBLE9BQUEsQ0FBQSxNQUFBLEVBQUEsVUFBQSxNQUFBLEVBQUEsS0FBQSxFQUFBLE9BQUEsRUFBQTtBQUNBLFFBQUEsY0FBQSxFQUFBO0FBQ0E7O0FBRUEsZ0JBQUEsR0FBQSxHQUFBLFVBQUEsU0FBQSxFQUFBLFFBQUEsRUFBQTtBQUNBLFlBQUEsU0FBQSxPQUFBLGFBQUEsT0FBQSxDQUFBLFNBQUEsQ0FBQSxJQUFBLE9BQUEsUUFBQSxDQUFBLElBQUEsT0FBQSxRQUFBLENBQUE7QUFDQSxxQkFBQSxPQUFBLENBQUEsU0FBQSxFQUFBLE1BQUE7QUFDQSxLQUhBOztBQUtBLGdCQUFBLE1BQUEsR0FBQSxVQUFBLFNBQUEsRUFBQTtBQUNBLHFCQUFBLFVBQUEsQ0FBQSxTQUFBO0FBQ0EsS0FGQTs7QUFJQSxnQkFBQSxLQUFBLEdBQUEsWUFBQTtBQUNBLHFCQUFBLEtBQUE7QUFDQSxLQUZBOztBQUlBLGdCQUFBLEdBQUEsR0FBQSxZQUFBO0FBQ0EsWUFBQSxhQUFBLE1BQUEsQ0FBQSxFQUFBLE9BQUEsYUFBQSxRQUFBLENBQUE7QUFDQSxlQUFBLFlBQUE7QUFDQSxLQUhBOztBQUtBLGdCQUFBLFFBQUEsR0FBQSxVQUFBLE9BQUEsRUFBQSxPQUFBLEVBQUE7QUFDQSxlQUFBLEVBQUEsQ0FBQSxNQUFBO0FBQ0EsZUFBQSxNQUFBLElBQUEsQ0FBQSwwQkFBQSxPQUFBLEVBQUEsT0FBQSxDQUFBO0FBQ0EsS0FIQTs7QUFLQSxnQkFBQSxlQUFBLEdBQUEsWUFBQTtBQUNBLGVB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ZmlsZSI6Im1haW4uanMiLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCc7XG53aW5kb3cuYXBwID0gYW5ndWxhci5tb2R1bGUoJ0Z1bGxzdGFja0dlbmVyYXRlZEFwcCcsIFsnZnNhUHJlQnVpbHQnLCAndWkucm91dGVyJywgJ3VpLmJvb3RzdHJhcCcsICduZ0FuaW1hdGUnXSk7XG5cbmFwcC5jb25maWcoZnVuY3Rpb24gKCR1cmxSb3V0ZXJQcm92aWRlciwgJGxvY2F0aW9uUHJvdmlkZXIpIHtcbiAgICAvLyBUaGlzIHR1cm5zIG9mZiBoYXNoYmFuZyB1cmxzICgvI2Fib3V0KSBhbmQgY2hhbmdlcyBpdCB0byBzb21ldGhpbmcgbm9ybWFsICgvYWJvdXQpXG4gICAgJGxvY2F0aW9uUHJvdmlkZXIuaHRtbDVNb2RlKHRydWUpO1xuICAgIC8vIElmIHdlIGdvIHRvIGEgVVJMIHRoYXQgdWktcm91dGVyIGRvZXNuJ3QgaGF2ZSByZWdpc3RlcmVkLCBnbyB0byB0aGUgXCIvXCIgdXJsLlxuICAgICR1cmxSb3V0ZXJQcm92aWRlci5vdGhlcndpc2UoJy8nKTtcbiAgICAvLyBUcmlnZ2VyIHBhZ2UgcmVmcmVzaCB3aGVuIGFjY2Vzc2luZyBhbiBPQXV0aCByb3V0ZVxuICAgICR1cmxSb3V0ZXJQcm92aWRlci53aGVuKCcvYXV0aC86cHJvdmlkZXInLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHdpbmRvdy5sb2NhdGlvbi5yZWxvYWQoKTtcbiAgICB9KTtcbn0pO1xuXG4vLyBUaGlzIGFwcC5ydW4gaXMgZm9yIGNvbnRyb2xsaW5nIGFjY2VzcyB0byBzcGVjaWZpYyBzdGF0ZXMuXG5hcHAucnVuKGZ1bmN0aW9uICgkcm9vdFNjb3BlLCBBdXRoU2VydmljZSwgJHN0YXRlKSB7XG5cbiAgICAvLyBUaGUgZ2l2ZW4gc3RhdGUgcmVxdWlyZXMgYW4gYXV0aGVudGljYXRlZCB1c2VyLlxuICAgIHZhciBkZXN0aW5hdGlvblN0YXRlUmVxdWlyZXNBdXRoID0gZnVuY3Rpb24gKHN0YXRlKSB7XG4gICAgICAgIHJldHVybiBzdGF0ZS5kYXRhICYmIHN0YXRlLmRhdGEuYXV0aGVudGljYXRlO1xuICAgIH07XG5cbiAgICAvLyAkc3RhdGVDaGFuZ2VTdGFydCBpcyBhbiBldmVudCBmaXJlZFxuICAgIC8vIHdoZW5ldmVyIHRoZSBwcm9jZXNzIG9mIGNoYW5naW5nIGEgc3RhdGUgYmVnaW5zLlxuICAgICRyb290U2NvcGUuJG9uKCckc3RhdGVDaGFuZ2VTdGFydCcsIGZ1bmN0aW9uIChldmVudCwgdG9TdGF0ZSwgdG9QYXJhbXMpIHtcblxuICAgICAgICBpZiAoIWRlc3RpbmF0aW9uU3RhdGVSZXF1aXJlc0F1dGgodG9TdGF0ZSkpIHtcbiAgICAgICAgICAgIC8vIFRoZSBkZXN0aW5hdGlvbiBzdGF0ZSBkb2VzIG5vdCByZXF1aXJlIGF1dGhlbnRpY2F0aW9uXG4gICAgICAgICAgICAvLyBTaG9ydCBjaXJjdWl0IHdpdGggcmV0dXJuLlxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKEF1dGhTZXJ2aWNlLmlzQXV0aGVudGljYXRlZCgpKSB7XG4gICAgICAgICAgICAvLyBUaGUgdXNlciBpcyBhdXRoZW50aWNhdGVkLlxuICAgICAgICAgICAgLy8gU2hvcnQgY2lyY3VpdCB3aXRoIHJldHVybi5cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENhbmNlbCBuYXZpZ2F0aW5nIHRvIG5ldyBzdGF0ZS5cbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcblxuICAgICAgICBBdXRoU2VydmljZS5nZXRMb2dnZWRJblVzZXIoKS50aGVuKGZ1bmN0aW9uICh1c2VyKSB7XG4gICAgICAgICAgICAvLyBJZiBhIHVzZXIgaXMgcmV0cmlldmVkLCB0aGVuIHJlbmF2aWdhdGUgdG8gdGhlIGRlc3RpbmF0aW9uXG4gICAgICAgICAgICAvLyAodGhlIHNlY29uZCB0aW1lLCBBdXRoU2VydmljZS5pc0F1dGhlbnRpY2F0ZWQoKSB3aWxsIHdvcmspXG4gICAgICAgICAgICAvLyBvdGhlcndpc2UsIGlmIG5vIHVzZXIgaXMgbG9nZ2VkIGluLCBnbyB0byBcImxvZ2luXCIgc3RhdGUuXG4gICAgICAgICAgICBpZiAodXNlcikge1xuICAgICAgICAgICAgICAgICRzdGF0ZS5nbyh0b1N0YXRlLm5hbWUsIHRvUGFyYW1zKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJHN0YXRlLmdvKCdsb2dpbicpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgIH0pO1xuXG59KTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG5cbiAgICAvLyBSZWdpc3RlciBvdXIgKmFib3V0KiBzdGF0ZS5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnYWJvdXQnLCB7XG4gICAgICAgIHVybDogJy9hYm91dCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdBYm91dENvbnRyb2xsZXInLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2Fib3V0L2Fib3V0Lmh0bWwnXG4gICAgfSk7XG5cbn0pO1xuXG5hcHAuY29udHJvbGxlcignQWJvdXRDb250cm9sbGVyJywgZnVuY3Rpb24gKCRzY29wZSwgRnVsbHN0YWNrUGljcykge1xuXG4gICAgLy8gSW1hZ2VzIG9mIGJlYXV0aWZ1bCBGdWxsc3RhY2sgcGVvcGxlLlxuICAgICRzY29wZS5pbWFnZXMgPSBfLnNodWZmbGUoRnVsbHN0YWNrUGljcyk7XG5cbn0pOyIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnYWNjb3VudCcsIHtcbiAgICAgICAgdXJsOiAnL2FjY291bnQnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2FjY291bnQvYWNjb3VudC5odG1sJyxcbiAgICAgICAgY29udHJvbGxlcjogZnVuY3Rpb24gKCRzY29wZSwgQWNjb3VudCwgJGxvZykge1xuICAgICAgICAgICAgQWNjb3VudC5nZXRBY2NvdW50SW5mbygpLnRoZW4oZnVuY3Rpb24gKHVzZXJBY2NvdW50KSB7XG4gICAgICAgICAgICAgICAgJHNjb3BlLmFjY291bnQgPSB1c2VyQWNjb3VudDtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAuY2F0Y2goJGxvZyk7XG5cbiAgICAgICAgICAgICRzY29wZS51cGRhdGVTZXR0aW5ncyA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgJHNjb3BlLnVwZGF0ZVBheVNldHRpbmdzID0gISRzY29wZS51cGRhdGVQYXlTZXR0aW5ncztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgJHNjb3BlLnNob3dTZXR0aW5ncyA9IGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgJHNjb3BlLnNob3dQYXlTZXR0aW5ncyA9ICEkc2NvcGUuc2hvd1BheVNldHRpbmdzXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICRzY29wZS51cGRhdGVQYXlTZXR0aW5ncyA9IGZhbHNlO1xuXG4gICAgICAgICAgICAkc2NvcGUuc2hvd1BheVNldHRpbmdzID0gZmFsc2U7XG5cblxuICAgICAgICB9LFxuICAgICAgICAvLyBUaGUgZm9sbG93aW5nIGRhdGEuYXV0aGVudGljYXRlIGlzIHJlYWQgYnkgYW4gZXZlbnQgbGlzdGVuZXJcbiAgICAgICAgLy8gdGhhdCBjb250cm9scyBhY2Nlc3MgdG8gdGhpcyBzdGF0ZS4gUmVmZXIgdG8gYXBwLmpzLlxuICAgIH0pO1xuXG59KTtcblxuYXBwLmZhY3RvcnkoJ0FjY291bnQnLCBmdW5jdGlvbiAoJGh0dHApIHtcblxuICAgIHZhciBnZXRBY2NvdW50SW5mbyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuICRodHRwLmdldCgnL2FwaS9hY2NvdW50JykudGhlbihmdW5jdGlvbiAoQWNjb3VudCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coXCJIZXkgd2hhdCdzIHVwXCIsIEFjY291bnQuZGF0YSk7XG4gICAgICAgICAgICByZXR1cm4gQWNjb3VudC5kYXRhO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgdmFyIHVwZGF0ZUluZm8gPSBmdW5jdGlvbigpe1xuICAgICAgICByZXR1cm4gJGh0dHAucHV0KCcvYXBpL2FjY291bnQnLCAkc2NvcGUuYWNjb3VudCkudGhlbihmdW5jdGlvbihBY2NvdW50KXtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiVXBkYXRpbmcgYWNjb3VudCBpbmZvIVwiKTtcbiAgICAgICAgICAgIHJldHVybiBBY2NvdW50LmRhdGFcbiAgICAgICAgfSlcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBnZXRBY2NvdW50SW5mbzogZ2V0QWNjb3VudEluZm9cbiAgICB9O1xuXG59KTtcbiIsImFwcC5jb250cm9sbGVyKCdDYXJ0Q3RybCcsIGZ1bmN0aW9uKCRzY29wZSwgJHN0YXRlUGFyYW1zLCBDYXJ0LCBQcm9kdWN0KXtcdFxuXG5cdCRzY29wZS5jYXJ0SXRlbXMgPSBbXTtcblx0JHNjb3BlLmVtcHR5Q2FydCA9IHRydWU7XG5cblx0dmFyIGNhcnRLZXlzID0gT2JqZWN0LmtleXMoQ2FydC5nZXQoKSk7XG5cblx0aWYoY2FydEtleXMubGVuZ3RoID4gMCl7XG5cdFx0JHNjb3BlLmVtcHR5Q2FydCA9IGZhbHNlO1xuXHRcdGNhcnRLZXlzLmZvckVhY2goZnVuY3Rpb24ocHJvZHVjdElkKXtcblx0XHRcdGNvbnNvbGUubG9nKFwiQ3VycmVudCBQcm9kdWN0SWQgb24gQ2FydCBpczogXCIsIHByb2R1Y3RJZCk7XG5cdFx0XHRyZXR1cm4gUHJvZHVjdC5nZXRPbmVQcm9kdWN0KHByb2R1Y3RJZClcblx0XHRcdC50aGVuKGZ1bmN0aW9uKHByb2R1Y3Qpe1xuXHRcdFx0XHR2YXIgcXVhbnRpdHkgPSBsb2NhbFN0b3JhZ2VbcHJvZHVjdElkXTtcblx0XHRcdFx0Y29uc29sZS5sb2coXCJQcm9kdWN0IGZvdW5kLCBxdWFudGl0eSBpczogXCIsIHF1YW50aXR5LCBcIiBhbmQgaXRlbSBpczogXCIsIHByb2R1Y3QpO1xuXHRcdFx0XHQkc2NvcGUuY2FydEl0ZW1zLnB1c2goe1xuXHRcdFx0XHRcdHF1YW50aXR5OiBxdWFudGl0eSxcblx0XHRcdFx0XHRwcm9kdWN0OiBwcm9kdWN0XG5cdFx0XHRcdH0pO1xuXHRcdFx0fSk7XG5cdFx0fSk7XG5cdH1cblxuXHQvLyBMZXQgY2hlY2tvdXRhZGRyZXNzIGRlZmF1bHQgdG8gdXNlcidzIGFkZHJlc3Ncblx0JHNjb3BlLmRlZmF1bHRBZGRyZXNzID0gJyc7XG5cdENhcnQuY2hlY2tvdXRBZGRyZXNzKClcblx0LnRoZW4oZnVuY3Rpb24odXNlckFkZHJlc3Mpe1xuXHRcdCRzY29wZS5kZWZhdWx0QWRkcmVzcyA9IHVzZXJBZGRyZXNzXG5cdH0pO1xuXG5cblx0Ly8gY2hlY2tvdXQgZm9ybSBoYXMgbmctbW9kZWw9J3R5cGVkQWRkcmVzcydcblx0JHNjb3BlLmNoZWNrb3V0ID0gZnVuY3Rpb24gKCkge1xuXHRcdC8vIENvbnZlcnRzIGNhcnRJdGVtcyAoYXJyYXkgb2Ygb2JqcykgaW50byBjYXJ0SWRzIChhcnJheSBvZiBQcm9kIGlkcylcblx0XHR2YXIgY2FydElkcyA9IFtdO1xuXHRcdCRzY29wZS5jYXJ0SXRlbXMuZm9yRWFjaChmdW5jdGlvbihpdGVtKXtcblx0XHRcdGZvcih2YXIgaSA9IDA7IGkgPCBpdGVtLnF1YW50aXR5OyBpKyspe1xuXHRcdFx0XHRjYXJ0SWRzLnB1c2goaXRlbS5wcm9kdWN0LmlkKTtcblx0XHRcdH1cblx0XHR9KTtcblx0XHQkc2NvcGUuY2FydEl0ZW1zID0gW107XG5cdFx0Q2FydC5lbXB0eSgpXG5cdFx0cmV0dXJuIENhcnQuY2hlY2tvdXQoJHNjb3BlLnR5cGVkQWRkcmVzcywgY2FydElkcyk7XG5cdH07XG5cdFxufSk7XG5cbiIsImFwcC5mYWN0b3J5KCdDYXJ0JywgZnVuY3Rpb24gKCRzdGF0ZSwgJGh0dHAsIFByb2R1Y3QpIHtcbiAgICB2YXIgQ2FydEZhY3RvcnkgPSB7fVxuICAgIC8vY2FydCA9IHtwcm9kdWN0S2V5MTogcXVhbnRpdHkxLCBwcm9kdWN0S2V5MjogcXVhbnRpdHkyLi4uIH1cblxuICAgIENhcnRGYWN0b3J5LmFkZCA9IGZ1bmN0aW9uIChwcm9kdWN0SWQsIHF1YW50aXR5KSB7XG4gICAgICAgIGxldCBudW1iZXIgPSBOdW1iZXIobG9jYWxTdG9yYWdlLmdldEl0ZW0ocHJvZHVjdElkKSkgKyBOdW1iZXIocXVhbnRpdHkpIHx8IE51bWJlcihxdWFudGl0eSk7XG4gICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKHByb2R1Y3RJZCwgbnVtYmVyKTtcbiAgICB9XG5cbiAgICBDYXJ0RmFjdG9yeS5yZW1vdmUgPSBmdW5jdGlvbiAocHJvZHVjdElkKSB7XG4gICAgICAgIGxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtKHByb2R1Y3RJZCk7XG4gICAgfVxuXG4gICAgQ2FydEZhY3RvcnkuZW1wdHkgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGxvY2FsU3RvcmFnZS5jbGVhcigpO1xuICAgIH1cbiAgICBcbiAgICBDYXJ0RmFjdG9yeS5nZXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmKGxvY2FsU3RvcmFnZVtsZW5ndGhdKSBkZWxldGUgbG9jYWxTdG9yYWdlKCdsZW5ndGgnKTsgXG4gICAgICAgIHJldHVybiBsb2NhbFN0b3JhZ2U7XG4gICAgfVxuXG4gICAgQ2FydEZhY3RvcnkuY2hlY2tvdXQgPSBmdW5jdGlvbiAoYWRkcmVzcywgY2FydElkcykge1xuICAgICAgJHN0YXRlLmdvKCdob21lJyk7XG4gICAgICByZXR1cm4gJGh0dHAucG9zdCgnL2FwaS9vcmRlcnMvY2hlY2tvdXQvJyArIGFkZHJlc3MsIGNhcnRJZHMpO1xuICAgIH1cblxuICAgIENhcnRGYWN0b3J5LmNoZWNrb3V0QWRkcmVzcyA9IGZ1bmN0aW9uICgpe1xuICAgICAgcmV0dXJuICRodHRwLmdldCgnYXBpL2FjY291bnQnKVxuICAgICAgLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2Upe1xuICAgICAgICByZXR1cm4gcmVzcG9uc2UuZGF0YVxuICAgICAgfSlcbiAgICAgIC50aGVuKGZ1bmN0aW9uKHVzZXIpe1xuICAgICAgICBpZighdXNlcikgcmV0dXJuICcnO1xuICAgICAgICByZXR1cm4gdXNlci5hZGRyZXNzXG4gICAgICB9KVxuICAgIH1cblxuICAgIHJldHVybiBDYXJ0RmFjdG9yeTtcbn0pO1xuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnY2FydCcsIHtcbiAgICAgICAgdXJsOiAnL2NhcnQnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NhcnQvY2FydC5odG1sJyxcbiAgIFx0XHQgIGNvbnRyb2xsZXI6ICdDYXJ0Q3RybCdcbiAgICB9KTtcbn0pO1xuXG4iLCIoZnVuY3Rpb24gKCkge1xuXG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgLy8gSG9wZSB5b3UgZGlkbid0IGZvcmdldCBBbmd1bGFyISBEdWgtZG95LlxuICAgIGlmICghd2luZG93LmFuZ3VsYXIpIHRocm93IG5ldyBFcnJvcignSSBjYW5cXCd0IGZpbmQgQW5ndWxhciEnKTtcblxuICAgIHZhciBhcHAgPSBhbmd1bGFyLm1vZHVsZSgnZnNhUHJlQnVpbHQnLCBbXSk7XG5cbiAgICBhcHAuZmFjdG9yeSgnU29ja2V0JywgZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoIXdpbmRvdy5pbykgdGhyb3cgbmV3IEVycm9yKCdzb2NrZXQuaW8gbm90IGZvdW5kIScpO1xuICAgICAgICByZXR1cm4gd2luZG93LmlvKHdpbmRvdy5sb2NhdGlvbi5vcmlnaW4pO1xuICAgIH0pO1xuXG4gICAgLy8gQVVUSF9FVkVOVFMgaXMgdXNlZCB0aHJvdWdob3V0IG91ciBhcHAgdG9cbiAgICAvLyBicm9hZGNhc3QgYW5kIGxpc3RlbiBmcm9tIGFuZCB0byB0aGUgJHJvb3RTY29wZVxuICAgIC8vIGZvciBpbXBvcnRhbnQgZXZlbnRzIGFib3V0IGF1dGhlbnRpY2F0aW9uIGZsb3cuXG4gICAgYXBwLmNvbnN0YW50KCdBVVRIX0VWRU5UUycsIHtcbiAgICAgICAgbG9naW5TdWNjZXNzOiAnYXV0aC1sb2dpbi1zdWNjZXNzJyxcbiAgICAgICAgbG9naW5GYWlsZWQ6ICdhdXRoLWxvZ2luLWZhaWxlZCcsXG4gICAgICAgIGxvZ291dFN1Y2Nlc3M6ICdhdXRoLWxvZ291dC1zdWNjZXNzJyxcbiAgICAgICAgc2Vzc2lvblRpbWVvdXQ6ICdhdXRoLXNlc3Npb24tdGltZW91dCcsXG4gICAgICAgIG5vdEF1dGhlbnRpY2F0ZWQ6ICdhdXRoLW5vdC1hdXRoZW50aWNhdGVkJyxcbiAgICAgICAgbm90QXV0aG9yaXplZDogJ2F1dGgtbm90LWF1dGhvcml6ZWQnXG4gICAgfSk7XG5cbiAgICBhcHAuZmFjdG9yeSgnQXV0aEludGVyY2VwdG9yJywgZnVuY3Rpb24gKCRyb290U2NvcGUsICRxLCBBVVRIX0VWRU5UUykge1xuICAgICAgICB2YXIgc3RhdHVzRGljdCA9IHtcbiAgICAgICAgICAgIDQwMTogQVVUSF9FVkVOVFMubm90QXV0aGVudGljYXRlZCxcbiAgICAgICAgICAgIDQwMzogQVVUSF9FVkVOVFMubm90QXV0aG9yaXplZCxcbiAgICAgICAgICAgIDQxOTogQVVUSF9FVkVOVFMuc2Vzc2lvblRpbWVvdXQsXG4gICAgICAgICAgICA0NDA6IEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICByZXNwb25zZUVycm9yOiBmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3Qoc3RhdHVzRGljdFtyZXNwb25zZS5zdGF0dXNdLCByZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuICRxLnJlamVjdChyZXNwb25zZSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9KTtcblxuICAgIGFwcC5jb25maWcoZnVuY3Rpb24gKCRodHRwUHJvdmlkZXIpIHtcbiAgICAgICAgJGh0dHBQcm92aWRlci5pbnRlcmNlcHRvcnMucHVzaChbXG4gICAgICAgICAgICAnJGluamVjdG9yJyxcbiAgICAgICAgICAgIGZ1bmN0aW9uICgkaW5qZWN0b3IpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJGluamVjdG9yLmdldCgnQXV0aEludGVyY2VwdG9yJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIF0pO1xuICAgIH0pO1xuXG4gICAgYXBwLnNlcnZpY2UoJ0F1dGhTZXJ2aWNlJywgZnVuY3Rpb24gKCRodHRwLCBTZXNzaW9uLCAkcm9vdFNjb3BlLCBBVVRIX0VWRU5UUywgJHEpIHtcblxuICAgICAgICBmdW5jdGlvbiBvblN1Y2Nlc3NmdWxMb2dpbihyZXNwb25zZSkge1xuICAgICAgICAgICAgdmFyIGRhdGEgPSByZXNwb25zZS5kYXRhO1xuICAgICAgICAgICAgU2Vzc2lvbi5jcmVhdGUoZGF0YS5pZCwgZGF0YS51c2VyKTtcbiAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdChBVVRIX0VWRU5UUy5sb2dpblN1Y2Nlc3MpO1xuICAgICAgICAgICAgcmV0dXJuIGRhdGEudXNlcjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVzZXMgdGhlIHNlc3Npb24gZmFjdG9yeSB0byBzZWUgaWYgYW5cbiAgICAgICAgLy8gYXV0aGVudGljYXRlZCB1c2VyIGlzIGN1cnJlbnRseSByZWdpc3RlcmVkLlxuICAgICAgICB0aGlzLmlzQXV0aGVudGljYXRlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiAhIVNlc3Npb24udXNlcjtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmdldExvZ2dlZEluVXNlciA9IGZ1bmN0aW9uIChmcm9tU2VydmVyKSB7XG5cbiAgICAgICAgICAgIC8vIElmIGFuIGF1dGhlbnRpY2F0ZWQgc2Vzc2lvbiBleGlzdHMsIHdlXG4gICAgICAgICAgICAvLyByZXR1cm4gdGhlIHVzZXIgYXR0YWNoZWQgdG8gdGhhdCBzZXNzaW9uXG4gICAgICAgICAgICAvLyB3aXRoIGEgcHJvbWlzZS4gVGhpcyBlbnN1cmVzIHRoYXQgd2UgY2FuXG4gICAgICAgICAgICAvLyBhbHdheXMgaW50ZXJmYWNlIHdpdGggdGhpcyBtZXRob2QgYXN5bmNocm9ub3VzbHkuXG5cbiAgICAgICAgICAgIC8vIE9wdGlvbmFsbHksIGlmIHRydWUgaXMgZ2l2ZW4gYXMgdGhlIGZyb21TZXJ2ZXIgcGFyYW1ldGVyLFxuICAgICAgICAgICAgLy8gdGhlbiB0aGlzIGNhY2hlZCB2YWx1ZSB3aWxsIG5vdCBiZSB1c2VkLlxuXG4gICAgICAgICAgICBpZiAodGhpcy5pc0F1dGhlbnRpY2F0ZWQoKSAmJiBmcm9tU2VydmVyICE9PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICRxLndoZW4oU2Vzc2lvbi51c2VyKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gTWFrZSByZXF1ZXN0IEdFVCAvc2Vzc2lvbi5cbiAgICAgICAgICAgIC8vIElmIGl0IHJldHVybnMgYSB1c2VyLCBjYWxsIG9uU3VjY2Vzc2Z1bExvZ2luIHdpdGggdGhlIHJlc3BvbnNlLlxuICAgICAgICAgICAgLy8gSWYgaXQgcmV0dXJucyBhIDQwMSByZXNwb25zZSwgd2UgY2F0Y2ggaXQgYW5kIGluc3RlYWQgcmVzb2x2ZSB0byBudWxsLlxuICAgICAgICAgICAgcmV0dXJuICRodHRwLmdldCgnL3Nlc3Npb24nKS50aGVuKG9uU3VjY2Vzc2Z1bExvZ2luKS5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMubG9naW4gPSBmdW5jdGlvbiAoY3JlZGVudGlhbHMpIHtcbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5wb3N0KCcvbG9naW4nLCBjcmVkZW50aWFscylcbiAgICAgICAgICAgICAgICAudGhlbihvblN1Y2Nlc3NmdWxMb2dpbilcbiAgICAgICAgICAgICAgICAuY2F0Y2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gJHEucmVqZWN0KHsgbWVzc2FnZTogJ0ludmFsaWQgbG9naW4gY3JlZGVudGlhbHMuJyB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmxvZ291dCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9sb2dvdXQnKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBTZXNzaW9uLmRlc3Ryb3koKTtcbiAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoQVVUSF9FVkVOVFMubG9nb3V0U3VjY2Vzcyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgIH0pO1xuXG4gICAgYXBwLnNlcnZpY2UoJ1Nlc3Npb24nLCBmdW5jdGlvbiAoJHJvb3RTY29wZSwgQVVUSF9FVkVOVFMpIHtcblxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMubm90QXV0aGVudGljYXRlZCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc2VsZi5kZXN0cm95KCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0LCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzZWxmLmRlc3Ryb3koKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5pZCA9IG51bGw7XG4gICAgICAgIHRoaXMudXNlciA9IG51bGw7XG5cbiAgICAgICAgdGhpcy5jcmVhdGUgPSBmdW5jdGlvbiAoc2Vzc2lvbklkLCB1c2VyKSB7XG4gICAgICAgICAgICB0aGlzLmlkID0gc2Vzc2lvbklkO1xuICAgICAgICAgICAgdGhpcy51c2VyID0gdXNlcjtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmRlc3Ryb3kgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLmlkID0gbnVsbDtcbiAgICAgICAgICAgIHRoaXMudXNlciA9IG51bGw7XG4gICAgICAgIH07XG5cbiAgICB9KTtcblxufSkoKTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG5cbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnbG9naW4nLCB7XG4gICAgICAgIHVybDogJy9sb2dpbicsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvbG9naW4vbG9naW4uaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6ICdMb2dpbkN0cmwnXG4gICAgfSk7XG5cbn0pO1xuXG5hcHAuY29udHJvbGxlcignTG9naW5DdHJsJywgZnVuY3Rpb24gKCRzY29wZSwgQXV0aFNlcnZpY2UsICRzdGF0ZSkge1xuXG4gICAgJHNjb3BlLmxvZ2luID0ge307XG4gICAgJHNjb3BlLmVycm9yID0gbnVsbDtcblxuICAgICRzY29wZS5zZW5kTG9naW4gPSBmdW5jdGlvbiAobG9naW5JbmZvKSB7XG5cbiAgICAgICAgJHNjb3BlLmVycm9yID0gbnVsbDtcblxuICAgICAgICBBdXRoU2VydmljZS5sb2dpbihsb2dpbkluZm8pLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgJHN0YXRlLmdvKCdob21lJyk7XG4gICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICRzY29wZS5lcnJvciA9ICdJbnZhbGlkIGxvZ2luIGNyZWRlbnRpYWxzLic7XG4gICAgICAgIH0pO1xuXG4gICAgfTtcblxufSk7IiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnaG9tZScsIHtcbiAgICAgIHVybDogJy8nLFxuICAgICAgdGVtcGxhdGVVcmw6ICdqcy9ob21lL2hvbWUuaHRtbCcsXG4gICBcdFx0Y29udHJvbGxlcjogZnVuY3Rpb24oJHNjb3BlLCBob21lcGFnZSl7XG4gICAgICAgICRzY29wZS5jYXRlZ29yaWVzID0gWydQYWRkbGUnLCdCYWxsJywnQ2FzZScsXG4gICAgICAgICAgICAgICAgICAgICdUYWJsZScsJ1JvYm90J107XG4gICAgICAgICRzY29wZS5zZWxlY3RlZENhdGVnb3J5ID0gJyc7XG5cbiAgICAgICAgJHNjb3BlLm9yZGVyT3B0aW9ucyA9IFsnUHJpY2UnLCAnUmF0aW5nJ107XG4gICAgICAgICRzY29wZS5vcmRlck9wdGlvbiA9ICcnO1xuICAgICAgICAkc2NvcGUuZmluYWxPcmRlck9wdGlvbiA9ICRzY29wZS5hc2NEZXNjICsgJHNjb3BlLm9yZGVyT3B0aW9uO1xuXG4gICAgICAgICRzY29wZS5hc2NEZXNjT3B0aW9ucyA9IFsnQXNjZW5kaW5nJywgJ0Rlc2NlbmRpbmcnXVxuICAgICAgICAkc2NvcGUuc2VsZWN0ZWRBc2NEZXNjID0gJ0Rlc2NlbmRpbmcnO1xuICAgICAgICAkc2NvcGUuYXNjRGVzYyA9IGZ1bmN0aW9uICgpe1xuICAgICAgICAgIGlmICgkc2NvcGUuc2VsZWN0ZWRBc2NEZXNjID09PSAnQXNjZW5kaW5nJyl7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2UgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cblxuXG4gICBcdFx0XHRob21lcGFnZS5nZXRBbGxQcm9kdWN0cygpLnRoZW4oZnVuY3Rpb24oYWxsUHJvZHVjdHMpe1xuICAgXHRcdFx0XHQkc2NvcGUucHJvZHVjdHMgPSBhbGxQcm9kdWN0c1xuICAgXHRcdFx0fSlcbiAgIFx0XHR9IFxuICAgIH0pO1xufSk7XG5cbmFwcC5mYWN0b3J5KCdob21lcGFnZScsIGZ1bmN0aW9uKCRodHRwKXtcbiAgICB2YXIgZ2V0QWxsUHJvZHVjdHMgPSBmdW5jdGlvbigpe1xuICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvYXBpL3Byb2R1Y3RzJykudGhlbihmdW5jdGlvbihwcm9kdWN0cyl7XG4gICAgICAgICAgICByZXR1cm4gcHJvZHVjdHMuZGF0YTtcbiAgICAgICAgfSlcbiAgICB9XG5cdHJldHVybiB7XG4gICAgZ2V0QWxsUHJvZHVjdHM6IGdldEFsbFByb2R1Y3RzXG5cdH0gICAgXG59KSIsImFwcC5jb250cm9sbGVyKCdPcmRlckN0cmwnLCBmdW5jdGlvbigkc2NvcGUsIE9yZGVyKXtcblx0T3JkZXIuc2hvdygpXG5cdC50aGVuKGZ1bmN0aW9uKGFsbE9yZGVycyl7XG5cdFx0JHNjb3BlLm9yZGVycyA9IGFsbE9yZGVycztcblx0fSlcbn0pIiwiYXBwLmZhY3RvcnkoJ09yZGVyJywgZnVuY3Rpb24oJHN0YXRlLCAkaHR0cCl7XG5cdHZhciBPcmRlckZhY3RvcnkgPSB7fTtcblxuXHRPcmRlckZhY3Rvcnkuc2hvdyA9IGZ1bmN0aW9uKCl7XG5cdFx0cmV0dXJuICRodHRwLmdldCgnL2FwaS9vcmRlcnMnKVxuXHRcdC50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKXtcblx0XHRcdHJldHVybiByZXNwb25zZS5kYXRhXG5cdFx0fSlcblx0fVxuXHRyZXR1cm4gT3JkZXJGYWN0b3J5O1xuXHRcbn0pIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnb3JkZXInLCB7XG4gICAgICAgIHVybDogJy9vcmRlcicsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvb3JkZXIvb3JkZXIuaHRtbCcsXG5cdFx0Y29udHJvbGxlcjogJ09yZGVyQ3RybCdcbiAgICB9KTtcblxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCduZXdSZXZpZXcnLCB7XG4gICAgXHR1cmw6ICcvb3JkZXIvcmV2aWV3Lzpwcm9kdWN0SWQnLFxuICAgIFx0dGVtcGxhdGVVcmw6ICdqcy9vcmRlci9yZXZpZXcvcmV2aWV3LmZvcm0uaHRtbCcsXG4gICAgXHRjb250cm9sbGVyOiAnUmV2aWV3Rm9ybUN0cmwnXG4gICAgfSk7XG59KTtcblxuIiwiYXBwLmNvbnRyb2xsZXIoJ1Byb2R1Y3RzQ3RybCcsIGZ1bmN0aW9uKCRzY29wZSwgUHJvZHVjdHMpe1xuXG4gICAgJHNjb3BlLmNhdGVnb3JpZXMgPSBbJ3BhZGRsZXMnLCdiYWxscycsJ2Nhc2VzJywndGFibGVzJywncm9ib3RzJ107XG5cbiAgICAkc2NvcGUuY2F0ZWdvcmllc0Z1bmMgPSBQcm9kdWN0cy5nZXRQcm9kdWN0c2J5Q2F0ZWdvcnk7XG5cbiAgICBQcm9kdWN0cy5nZXRQcm9kdWN0c2J5Q2F0ZWdvcnkoKVxuICAgIC50aGVuKGZ1bmN0aW9uKHByb2R1Y3RzSW5DYXRlZ29yeSl7XG4gICAgICAgICRzY29wZS5wcm9kdWN0cyA9IHByb2R1Y3RzSW5DYXRlZ29yeTtcbiAgICB9KTtcbn0pO1xuIiwiYXBwLmZhY3RvcnkoJ1Byb2R1Y3RzJywgZnVuY3Rpb24oJGh0dHApe1xuICAgIHZhciBnZXRBbGxQcm9kdWN0cyA9IGZ1bmN0aW9uKCl7XG4gICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9hcGkvcHJvZHVjdHMnKVxuICAgICAgICAudGhlbihmdW5jdGlvbihwcm9kdWN0cyl7XG4gICAgICAgICAgICByZXR1cm4gcHJvZHVjdHMuZGF0YTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIHZhciBnZXRQcm9kdWN0c2J5Q2F0ZWdvcnkgPSBmdW5jdGlvbihjYXRlZ29yeSl7XG4gICAgICAgIGNhdGVnb3J5ID0gY2F0ZWdvcnkgfHwgMDtcbiAgICAgICAgaWYoY2F0ZWdvcnkgPT09IDApe1xuICAgICAgICAgICAgcmV0dXJuICRodHRwLmdldCgnL2FwaS9wcm9kdWN0cycpXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbihwcm9kdWN0cyl7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHByb2R1Y3RzLmRhdGE7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvYXBpL3Byb2R1Y3RzLz9jYXRlZ29yeT0nICsgY2F0ZWdvcnkpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKHByb2R1Y3RzSW5DYXRlZ29yeSl7XG4gICAgICAgICAgICByZXR1cm4gcHJvZHVjdHNJbkNhdGVnb3J5LmRhdGE7XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBnZXRQcm9kdWN0c2J5Q2F0ZWdvcnk6IGdldFByb2R1Y3RzYnlDYXRlZ29yeVxuICAgIH07XG59KVxuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcbsKgwqDCoMKgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ3Byb2R1Y3RzJywge1xuwqDCoMKgwqDCoMKgwqDCoHVybDogJy8nLFxuwqDCoMKgwqDCoMKgwqDCoHRlbXBsYXRlVXJsOiAnanMvcHJvZHVjdHMvcHJvZHVjdHMuaHRtbCcsXG7CoMKgwqDCoMKgwqDCoMKgY29udHJvbGxlcjogJ1Byb2R1Y3RzQ3RybCdcbsKgwqDCoMKgfSk7XG59KTsiLCJhcHAuY29udHJvbGxlcignUHJvZHVjdEN0cmwnLCBmdW5jdGlvbigkc2NvcGUsIFByb2R1Y3QsICRzdGF0ZVBhcmFtcywgQ2FydCl7XG4gICRzY29wZS5DYXJ0ID0gQ2FydDtcblx0UHJvZHVjdC5nZXRPbmVQcm9kdWN0KCRzdGF0ZVBhcmFtcy5pZClcbiAgLnRoZW4oZnVuY3Rpb24ocHJvZHVjdCl7XG4gIFx0Y29uc29sZS5sb2cocHJvZHVjdClcblx0XHQkc2NvcGUucHJvZHVjdCA9IHByb2R1Y3Q7XG5cdH0pXG59KTtcblxuIiwiYXBwLmZhY3RvcnkoJ1Byb2R1Y3QnLCBmdW5jdGlvbigkaHR0cCl7XG5cdGxldCBnZXRPbmVQcm9kdWN0ID0gZnVuY3Rpb24oaWQpe1xuICAgIHJldHVybiAkaHR0cC5nZXQoJy9hcGkvcHJvZHVjdHMvJysgaWQpXG4gICAgLnRoZW4oZnVuY3Rpb24ocHJvZHVjdCl7XG5cdFx0ICByZXR1cm4gcHJvZHVjdC5kYXRhO1xuXHRcdH0pXG5cdH07XG5cbiAgcmV0dXJuIHtcblx0ICBnZXRPbmVQcm9kdWN0OiBnZXRPbmVQcm9kdWN0XG4gIH1cbn0pXG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCdwcm9kdWN0Jywge1xuICAgICAgICB1cmw6ICcvcHJvZHVjdHMvOmlkJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9wcm9kdWN0L3Byb2R1Y3QuaHRtbCcsXG4gICBcdFx0ICBjb250cm9sbGVyOiAnUHJvZHVjdEN0cmwnXG4gICAgfSk7XG59KTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2RvY3MnLCB7XG4gICAgICAgIHVybDogJy9kb2NzJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9kb2NzL2RvY3MuaHRtbCdcbiAgICB9KTtcbn0pO1xuIiwiYXBwLmZhY3RvcnkoJ0Z1bGxzdGFja1BpY3MnLCBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFtcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9CN2dCWHVsQ0FBQVhRY0UuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vZmJjZG4tc3Bob3Rvcy1jLWEuYWthbWFpaGQubmV0L2hwaG90b3MtYWsteGFwMS90MzEuMC04LzEwODYyNDUxXzEwMjA1NjIyOTkwMzU5MjQxXzgwMjcxNjg4NDMzMTI4NDExMzdfby5qcGcnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0ItTEtVc2hJZ0FFeTlTSy5qcGcnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0I3OS1YN29DTUFBa3c3eS5qcGcnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0ItVWo5Q09JSUFJRkFoMC5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0I2eUl5RmlDRUFBcWwxMi5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NFLVQ3NWxXQUFBbXFxSi5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NFdlpBZy1WQUFBazkzMi5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NFZ05NZU9YSUFJZkRoSy5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NFUXlJRE5XZ0FBdTYwQi5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NDRjNUNVFXOEFFMmxHSi5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NBZVZ3NVNXb0FBQUxzai5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NBYUpJUDdVa0FBbElHcy5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NBUU93OWxXRUFBWTlGbC5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0ItT1FiVnJDTUFBTndJTS5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0I5Yl9lcndDWUFBd1JjSi5wbmc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0I1UFRkdm5DY0FFQWw0eC5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0I0cXdDMGlDWUFBbFBHaC5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0IyYjMzdlJJVUFBOW8xRC5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0J3cEl3cjFJVUFBdk8yXy5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0JzU3NlQU5DWUFFT2hMdy5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NKNHZMZnVVd0FBZGE0TC5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NJN3d6akVWRUFBT1BwUy5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NJZEh2VDJVc0FBbm5IVi5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NHQ2lQX1lXWUFBbzc1Vi5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NJUzRKUElXSUFJMzdxdS5qcGc6bGFyZ2UnXG4gICAgXTtcbn0pO1xuIiwiYXBwLmZhY3RvcnkoJ1JhbmRvbUdyZWV0aW5ncycsIGZ1bmN0aW9uICgpIHtcblxuICAgIHZhciBnZXRSYW5kb21Gcm9tQXJyYXkgPSBmdW5jdGlvbiAoYXJyKSB7XG4gICAgICAgIHJldHVybiBhcnJbTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogYXJyLmxlbmd0aCldO1xuICAgIH07XG5cbiAgICB2YXIgZ3JlZXRpbmdzID0gW1xuICAgICAgICAnV2VsY29tZSB0byB0aGUgYmVzdCBQaW5nLVBvbmcgc3RvcmUgdGhpcyBzaWRlIG9mIHRoZSBBdGxhbnRpYycsXG4gICAgICAgICdZb3UgbG9vayBsaWtlIHlvdSBjb3VsZCB1c2UgYSBicmFuZCBzcGFua2luZyBuZXcgcGFkZGxlJ1xuICAgIF07XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBncmVldGluZ3M6IGdyZWV0aW5ncyxcbiAgICAgICAgZ2V0UmFuZG9tR3JlZXRpbmc6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBnZXRSYW5kb21Gcm9tQXJyYXkoZ3JlZXRpbmdzKTtcbiAgICAgICAgfVxuICAgIH07XG5cbn0pO1xuIiwiYXBwLmNvbnRyb2xsZXIoJ1Jldmlld0Zvcm1DdHJsJywgZnVuY3Rpb24oJHNjb3BlLFJldmlld0ZhY3RvcnksQXV0aFNlcnZpY2UsJHN0YXRlUGFyYW1zLCRzdGF0ZSl7XG5cdCRzY29wZS5uZXdSZXZpZXcgPSB7fTtcblx0JHNjb3BlLnN0YXRlID0gJHN0YXRlLmN1cnJlbnQ7XG5cdCRzY29wZS5jcmVhdGVSZXZpZXcgPSBmdW5jdGlvbigpe1xuXHRcdEF1dGhTZXJ2aWNlLmdldExvZ2dlZEluVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgICAgICRzY29wZS5uZXdSZXZpZXcudXNlcklkID0gdXNlci5pZDtcbiAgICAgICAgICAgICRzY29wZS5uZXdSZXZpZXcucHJvZHVjdElkID0gJHN0YXRlUGFyYW1zLnByb2R1Y3RJZDtcbiAgICAgICAgICAgIHJldHVybiAkc2NvcGUubmV3UmV2aWV3XG4gICAgICAgIH0pXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKG5ld1Jldmlldyl7XG4gICAgICAgIFx0UmV2aWV3RmFjdG9yeS5zZXRSZXZpZXcobmV3UmV2aWV3KVxuXHRcdFx0LnRoZW4oZnVuY3Rpb24ocmV2aWV3KXtcblx0XHRcdFx0aWYocmV2aWV3LmNyZWF0ZWQpIGFsZXJ0KCdZb3UgYWxyZWFkeSB3cml0ZSBhIHJldmlldyBmb3IgdGhpcyBvcmRlcicpXG5cdFx0XHRcdGVsc2UgYWxlcnQoJ1RoYW5rcyBmb3IgeW91ciBmZWVkYmFjayEnKVxuXHRcdFx0XHQkc3RhdGUuZ28oJ29yZGVyJyk7XG5cdFx0XHR9KVxuICAgICAgICB9KVxuXHRcdFxuXHR9XG59KSIsImFwcC5mYWN0b3J5KCdSZXZpZXdGYWN0b3J5JywgZnVuY3Rpb24oJHN0YXRlLCAkaHR0cCl7XG5cdHZhciBSZXZpZXdGYWN0b3J5ID0ge307XG5cblx0UmV2aWV3RmFjdG9yeS5zZXRSZXZpZXcgPSBmdW5jdGlvbihyZXZpZXcpe1xuXHRcdHJldHVybiAkaHR0cC5wb3N0KCcvYXBpL3Jldmlld3MvJywgcmV2aWV3KVxuXHRcdC50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKXtcblx0XHRcdHJldHVybiByZXNwb25zZS5kYXRhO1xuXHRcdH0pXG5cdH1cblx0cmV0dXJuIFJldmlld0ZhY3Rvcnk7XG5cdFxufSkiLCJhcHAuZGlyZWN0aXZlKCdmdWxsc3RhY2tMb2dvJywgZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvZnVsbHN0YWNrLWxvZ28vZnVsbHN0YWNrLWxvZ28uaHRtbCdcbiAgICB9O1xufSk7IiwiYXBwLmRpcmVjdGl2ZSgnbmF2YmFyJywgZnVuY3Rpb24gKCRyb290U2NvcGUsIEF1dGhTZXJ2aWNlLCBBVVRIX0VWRU5UUywgJHN0YXRlKSB7XG5cbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICBzY29wZToge30sXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvbmF2YmFyL25hdmJhci5odG1sJyxcbiAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlKSB7XG5cbiAgICAgICAgICAgIHNjb3BlLml0ZW1zID0gW1xuICAgICAgICAgICAgICAgIHsgbGFiZWw6ICdBYm91dCcsIHN0YXRlOiAnYWJvdXQnIH0sXG4gICAgICAgICAgICAgICAgeyBsYWJlbDogJ015IENhcnQnLCBzdGF0ZTogJ2NhcnQnIH0sXG4gICAgICAgICAgICAgICAgeyBsYWJlbDogJ09yZGVyJywgc3RhdGU6ICdvcmRlcicsIGF1dGg6IHRydWV9LFxuICAgICAgICAgICAgICAgIHsgbGFiZWw6ICdBY2NvdW50Jywgc3RhdGU6ICdhY2NvdW50JywgYXV0aDogdHJ1ZX1cbiAgICAgICAgICAgIF07XG5cbiAgICAgICAgICAgIHNjb3BlLnVzZXIgPSBudWxsO1xuXG4gICAgICAgICAgICBzY29wZS5pc0xvZ2dlZEluID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBBdXRoU2VydmljZS5pc0F1dGhlbnRpY2F0ZWQoKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHNjb3BlLmxvZ291dCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBBdXRoU2VydmljZS5sb2dvdXQoKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28oJ2hvbWUnKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHZhciBzZXRVc2VyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIEF1dGhTZXJ2aWNlLmdldExvZ2dlZEluVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUudXNlciA9IHVzZXI7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB2YXIgcmVtb3ZlVXNlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBzY29wZS51c2VyID0gbnVsbDtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHNldFVzZXIoKTtcblxuICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMubG9naW5TdWNjZXNzLCBzZXRVc2VyKTtcbiAgICAgICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLmxvZ291dFN1Y2Nlc3MsIHJlbW92ZVVzZXIpO1xuICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMuc2Vzc2lvblRpbWVvdXQsIHJlbW92ZVVzZXIpO1xuXG4gICAgICAgIH1cblxuICAgIH07XG5cbn0pO1xuIiwiYXBwLmRpcmVjdGl2ZSgncmFuZG9HcmVldGluZycsIGZ1bmN0aW9uIChSYW5kb21HcmVldGluZ3MpIHtcblxuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvcmFuZG8tZ3JlZXRpbmcvcmFuZG8tZ3JlZXRpbmcuaHRtbCcsXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSkge1xuICAgICAgICBcdFx0Y29uc29sZS5sb2coXCJyYW5kb0dyZWV0aW5nIGxpbmsgZnVuY3Rpb24gaGl0XCIpO1xuICAgICAgICAgICAgc2NvcGUuZ3JlZXRpbmcgPSBSYW5kb21HcmVldGluZ3MuZ2V0UmFuZG9tR3JlZXRpbmcoKTtcbiAgICAgICAgfVxuICAgIH07XG5cbn0pOyJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
