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
    var totalPrice = 0;
    if (cartKeys.length > 0) {
        $scope.emptyCart = false;
        cartKeys.forEach(function (productId) {
            console.log("Current ProductId on Cart is: ", productId);
            return Product.getOneProduct(productId).then(function (product) {
                var quantity = localStorage[productId];
                console.log("Product found, quantity is: ", quantity, " and item is: ", product);
                totalPrice += quantity * product.price;
                $scope.cartItems.push({
                    quantity: quantity,
                    product: product
                });
            }).then(function () {
                $scope.totalPrice = totalPrice;
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
        controller: function controller($scope, Home, Cart) {
            $scope.categories = ['Paddle', 'Ball', 'Case', 'Table', 'Robot'];
            $scope.selectedCategory = '';
            $scope.orderOptions = ['price', 'rating'];
            $scope.orderOption = '';
            $scope.finalOrderOption = $scope.ascDesc + $scope.orderOption;

            $scope.ascDescOptions = ['Ascending', 'Descending'];
            $scope.selectedAscDesc = 'Descending';
            $scope.ascDesc = function () {
                if ($scope.selectedAscDesc === 'Ascending') {
                    return false;
                } else return true;
            };

            $scope.Cart = Cart;

            Home.getAllProducts().then(function (allProducts) {
                $scope.products = allProducts;
            });
        }
    });
});

app.factory('Home', function ($http) {
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

app.controller('ProductCtrl', function ($scope, Product, $stateParams, Cart) {
    $scope.Cart = Cart;
    Product.getOneProduct($stateParams.id).then(function (product) {
        console.log(product);
        $scope.product = product;
        product.getReviews().then(function (reviews) {
            $scope.reviews = reviews;
        });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC5qcyIsImFjY291bnQvYWNjb3VudC5qcyIsImFib3V0L2Fib3V0LmpzIiwiY2FydC9jYXJ0LmNvbnRyb2xsZXIuanMiLCJjYXJ0L2NhcnQuZmFjdG9yeS5qcyIsImNhcnQvY2FydC5zdGF0ZS5qcyIsImZzYS9mc2EtcHJlLWJ1aWx0LmpzIiwiaG9tZS9ob21lLmpzIiwibG9naW4vbG9naW4uanMiLCJvcmRlci9vcmRlci5jb250cm9sbGVyLmpzIiwib3JkZXIvb3JkZXIuZmFjdG9yeS5qcyIsIm9yZGVyL29yZGVyLnN0YXRlLmpzIiwicHJvZHVjdC9wcm9kdWN0LmNvbnRyb2xsZXIuanMiLCJwcm9kdWN0L3Byb2R1Y3QuZmFjdG9yeS5qcyIsInByb2R1Y3QvcHJvZHVjdC5zdGF0ZS5qcyIsInByb2R1Y3RzL3Byb2R1Y3RzLmNvbnRyb2xsZXIuanMiLCJwcm9kdWN0cy9wcm9kdWN0cy5mYWN0b3J5LmpzIiwicHJvZHVjdHMvcHJvZHVjdHMuc3RhdGUuanMiLCJzaWdudXAvZG9jcy5qcyIsImNvbW1vbi9mYWN0b3JpZXMvRnVsbHN0YWNrUGljcy5qcyIsImNvbW1vbi9mYWN0b3JpZXMvUmFuZG9tR3JlZXRpbmdzLmpzIiwib3JkZXIvcmV2aWV3L3Jldmlldy5jb250cm9sbGVyLmpzIiwib3JkZXIvcmV2aWV3L3Jldmlldy5mYWN0b3J5LmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvZnVsbHN0YWNrLWxvZ28vZnVsbHN0YWNrLWxvZ28uanMiLCJjb21tb24vZGlyZWN0aXZlcy9uYXZiYXIvbmF2YmFyLmpzIiwiY29tbW9uL2RpcmVjdGl2ZXMvcmFuZG8tZ3JlZXRpbmcvcmFuZG8tZ3JlZXRpbmcuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7O0FBQ0EsT0FBQSxHQUFBLEdBQUEsUUFBQSxNQUFBLENBQUEsdUJBQUEsRUFBQSxDQUFBLGFBQUEsRUFBQSxXQUFBLEVBQUEsY0FBQSxFQUFBLFdBQUEsQ0FBQSxDQUFBOztBQUVBLElBQUEsTUFBQSxD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QUNBLEtBSEE7O0FBTUE7QUFDQSxXQUFBLFFBQUEsR0FBQSxZQUFBO0FBQ0E7QUFDQSxZQUFBLFVBQUEsRUFBQTtBQUNBLGVBQUEsU0FBQSxDQUFBLE9BQUEsQ0FBQSxVQUFBLElBQUEsRUFBQTtBQUNBLGlCQUFBLElBQUEsSUFBQSxDQUFBLEVBQUEsSUFBQSxLQUFBLFFBQUEsRUFBQSxHQUFBLEVBQUE7QUFDQSx3QkFBQSxJQUFBLENBQUEsS0FBQSxPQUFBLENBQUEsRUFBQTtBQUNBO0FBQ0EsU0FKQTtBQUtBLGVBQUEsU0FBQSxHQUFBLEVBQUE7QUFDQSxhQUFBLEtBQUE7QUFDQSxlQUFBLEtBQUEsUUFBQSxDQUFBLE9BQUEsWUFBQSxFQUFBLE9BQUEsQ0FBQTtBQUNBLEtBWEE7QUFhQSxDQWxEQTs7QUNBQSxJQUFBLE9BQUEsQ0FBQSxNQUFBLEVBQUEsVUFBQSxNQUFBLEVBQUEsS0FBQSxFQUFBLE9BQUEsRUFBQTtBQUNBLFFBQUEsY0FBQSxFQUFBO0FBQ0E7O0FBRUEsZ0JBQUEsR0FBQSxHQUFBLFVBQUEsU0FBQSxFQUFBLFFBQUEsRUFBQTtBQUNBLFlBQUEsU0FBQSxPQUFBLGFBQUEsT0FBQSxDQUFBLFNBQUEsQ0FBQSxJQUFBLE9BQUEsUUFBQSxDQUFBLElBQUEsT0FBQSxRQUFBLENBQUE7QUFDQSxxQkFBQSxPQUFBLENBQUEsU0FBQSxFQUFBLE1BQUE7QUFDQSxLQUhBOztBQUtBLGdCQUFBLE1BQUEsR0FBQSxVQUFBLFNBQUEsRUFBQTtBQUNBLHFCQUFBLFVBQUEsQ0FBQSxTQUFBO0FBQ0EsS0FGQTs7QUFJQSxnQkFBQSxLQUFBLEdBQUEsWUFBQTtBQUNBLHFCQUFBLEtBQUE7QUFDQSxLQUZBOztBQUlBLGdCQUFBLEdBQUEsR0FBQSxZQUFBO0FBQ0EsWUFBQSxhQUFBLE1BQUEsQ0FBQSxFQUFBLE9BQUEsYUFBQSxRQUFBLENBQUE7QUFDQSxlQUFBLFlBQUE7QUFDQSxLQUhBOztBQUtBLGdCQUFBLFFBQUEsR0FBQSxVQUFBLE9BQUEsRUFBQSxPQUFBLEVBQUE7QUFDQSxlQUFBLEVBQUEsQ0FB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TUFBQSxlQUFBLElBQUEsRUFBQTtBQUNBLHVCQUFBLEdBQUEsSUFBQSxDQUFBLFFBQUEsSUFBQSxDQUFBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsbUJBQUEsTUFBQSxHQUFBLENBQUEsVUFBQSxFQUFBLElBQUEsQ0FBQSxpQkFBQSxFQUFBLEtBQUEsQ0FBQSxZQUFBO0FBQ0EsdUJBQUEsSUFBQTtBQUNBLGFBRkEsQ0FBQTtBQUlBLFNBckJBOztBQXVCQSxhQUFBLEtBQUEsR0FBQSxVQUFBLFdBQUEsRUFBQTtBQUNBLG1CQUFBLE1BQUEsSUFBQSxDQUFBLFFBQUEsRUFBQSxXQUFBLEVBQ0EsSUFEQSxDQUNBLGlCQURBLEVBRUEsS0FGQSxDQUVBLFlBQUE7QUFDQSx1QkFBQSxHQUFBLE1BQUEsQ0FBQSxFQUFBLFNBQUEsNEJBQUEsRUFBQSxDQUFBO0FBQ0EsYUFKQSxDQUFBO0FBS0EsU0FOQTs7QUFRQSxhQUFBLE1BQUEsR0FBQSxZQUFBO0FBQ0EsbUJBQUEsTUFBQSxHQUFBLENBQUEsU0FBQSxFQUFBLElBQUEsQ0FBQSxZQUFBO0FBQ0Esd0JBQUEsT0FBQTtBQUNBLDJCQUFBLFVBQUEsQ0FBQSxZQUFBLGFBQUE7QUFDQSxhQUhBLENBQUE7QUFJQSxTQUxBO0FBT0EsS0FyREE7O0FBdURBLFFBQUEsT0FBQSxDQUFBLFNBQUEsRUFBQSxVQUFBLFVBQUEsRUFBQSxXQUFBLEVBQUE7O0FBRUEsWUFBQSxPQUFBLElBQUE7O0FBRUEsbUJBQUEsR0FBQSxDQUFBLFlBQUEsZ0JBQUEsRUFBQSxZQUFBO0FBQ0EsaUJBQUEsT0FBQTtBQUNBLFNBRkE7O0FBSUEsbUJBQUEsR0FBQSxDQUFBLFlBQUEsY0FBQSxFQUFBLFlBQUE7QUFDQSxpQkFBQSxPQUFBO0FBQ0EsU0FGQTs7QUFJQSxhQUFBLEVBQUEsR0FBQSxJQUFBO0FBQ0EsYUFBQSxJQUFBLEdBQUEsSUFBQTs7QUFFQSxhQUFBLE1BQUEsR0FBQSxVQUFBLFNBQUEsRUFBQSxJQUFBLEVBQUE7QUFDQSxpQkFBQSxFQUFBLEdBQUEsU0FBQTtBQUNBLGlCQUFB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O0FBNkNBLENBL0NBOztBQ0FBLElBQUEsU0FBQSxDQUFBLGVBQUEsRUFBQSxVQUFBLGVBQUEsRUFBQTs7QUFFQSxXQUFBO0FBQ0Esa0JBQUEsR0FEQTtBQUVBLHFCQUFBLHlEQUZBO0FBR0EsY0FBQSxjQUFBLEtBQUEsRUFBQTtBQUNBLG9CQUFBLEdBQUEsQ0FBQSxpQ0FBQTtBQUNBLGtCQUFBLFFBQUEsR0FBQSxnQkFBQSxpQkFBQSxFQUFBO0FBQ0E7QUFOQSxLQUFBO0FBU0EsQ0FYQSIsImZpbGUiOiJtYWluLmpzIiwic291cmNlc0NvbnRlbnQiOlsiJ3VzZSBzdHJpY3QnO1xud2luZG93LmFwcCA9IGFuZ3VsYXIubW9kdWxlKCdGdWxsc3RhY2tHZW5lcmF0ZWRBcHAnLCBbJ2ZzYVByZUJ1aWx0JywgJ3VpLnJvdXRlcicsICd1aS5ib290c3RyYXAnLCAnbmdBbmltYXRlJ10pO1xuXG5hcHAuY29uZmlnKGZ1bmN0aW9uICgkdXJsUm91dGVyUHJvdmlkZXIsICRsb2NhdGlvblByb3ZpZGVyKSB7XG4gICAgLy8gVGhpcyB0dXJucyBvZmYgaGFzaGJhbmcgdXJscyAoLyNhYm91dCkgYW5kIGNoYW5nZXMgaXQgdG8gc29tZXRoaW5nIG5vcm1hbCAoL2Fib3V0KVxuICAgICRsb2NhdGlvblByb3ZpZGVyLmh0bWw1TW9kZSh0cnVlKTtcbiAgICAvLyBJZiB3ZSBnbyB0byBhIFVSTCB0aGF0IHVpLXJvdXRlciBkb2Vzbid0IGhhdmUgcmVnaXN0ZXJlZCwgZ28gdG8gdGhlIFwiL1wiIHVybC5cbiAgICAkdXJsUm91dGVyUHJvdmlkZXIub3RoZXJ3aXNlKCcvJyk7XG4gICAgLy8gVHJpZ2dlciBwYWdlIHJlZnJlc2ggd2hlbiBhY2Nlc3NpbmcgYW4gT0F1dGggcm91dGVcbiAgICAkdXJsUm91dGVyUHJvdmlkZXIud2hlbignL2F1dGgvOnByb3ZpZGVyJywgZnVuY3Rpb24gKCkge1xuICAgICAgICB3aW5kb3cubG9jYXRpb24ucmVsb2FkKCk7XG4gICAgfSk7XG59KTtcblxuLy8gVGhpcyBhcHAucnVuIGlzIGZvciBjb250cm9sbGluZyBhY2Nlc3MgdG8gc3BlY2lmaWMgc3RhdGVzLlxuYXBwLnJ1bihmdW5jdGlvbiAoJHJvb3RTY29wZSwgQXV0aFNlcnZpY2UsICRzdGF0ZSkge1xuXG4gICAgLy8gVGhlIGdpdmVuIHN0YXRlIHJlcXVpcmVzIGFuIGF1dGhlbnRpY2F0ZWQgdXNlci5cbiAgICB2YXIgZGVzdGluYXRpb25TdGF0ZVJlcXVpcmVzQXV0aCA9IGZ1bmN0aW9uIChzdGF0ZSkge1xuICAgICAgICByZXR1cm4gc3RhdGUuZGF0YSAmJiBzdGF0ZS5kYXRhLmF1dGhlbnRpY2F0ZTtcbiAgICB9O1xuXG4gICAgLy8gJHN0YXRlQ2hhbmdlU3RhcnQgaXMgYW4gZXZlbnQgZmlyZWRcbiAgICAvLyB3aGVuZXZlciB0aGUgcHJvY2VzcyBvZiBjaGFuZ2luZyBhIHN0YXRlIGJlZ2lucy5cbiAgICAkcm9vdFNjb3BlLiRvbignJHN0YXRlQ2hhbmdlU3RhcnQnLCBmdW5jdGlvbiAoZXZlbnQsIHRvU3RhdGUsIHRvUGFyYW1zKSB7XG5cbiAgICAgICAgaWYgKCFkZXN0aW5hdGlvblN0YXRlUmVxdWlyZXNBdXRoKHRvU3RhdGUpKSB7XG4gICAgICAgICAgICAvLyBUaGUgZGVzdGluYXRpb24gc3RhdGUgZG9lcyBub3QgcmVxdWlyZSBhdXRoZW50aWNhdGlvblxuICAgICAgICAgICAgLy8gU2hvcnQgY2lyY3VpdCB3aXRoIHJldHVybi5cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChBdXRoU2VydmljZS5pc0F1dGhlbnRpY2F0ZWQoKSkge1xuICAgICAgICAgICAgLy8gVGhlIHVzZXIgaXMgYXV0aGVudGljYXRlZC5cbiAgICAgICAgICAgIC8vIFNob3J0IGNpcmN1aXQgd2l0aCByZXR1cm4uXG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDYW5jZWwgbmF2aWdhdGluZyB0byBuZXcgc3RhdGUuXG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgQXV0aFNlcnZpY2UuZ2V0TG9nZ2VkSW5Vc2VyKCkudGhlbihmdW5jdGlvbiAodXNlcikge1xuICAgICAgICAgICAgLy8gSWYgYSB1c2VyIGlzIHJldHJpZXZlZCwgdGhlbiByZW5hdmlnYXRlIHRvIHRoZSBkZXN0aW5hdGlvblxuICAgICAgICAgICAgLy8gKHRoZSBzZWNvbmQgdGltZSwgQXV0aFNlcnZpY2UuaXNBdXRoZW50aWNhdGVkKCkgd2lsbCB3b3JrKVxuICAgICAgICAgICAgLy8gb3RoZXJ3aXNlLCBpZiBubyB1c2VyIGlzIGxvZ2dlZCBpbiwgZ28gdG8gXCJsb2dpblwiIHN0YXRlLlxuICAgICAgICAgICAgaWYgKHVzZXIpIHtcbiAgICAgICAgICAgICAgICAkc3RhdGUuZ28odG9TdGF0ZS5uYW1lLCB0b1BhcmFtcyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICRzdGF0ZS5nbygnbG9naW4nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICB9KTtcblxufSk7XG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2FjY291bnQnLCB7XG4gICAgICAgIHVybDogJy9hY2NvdW50JyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9hY2NvdW50L2FjY291bnQuaHRtbCcsXG4gICAgICAgIGNvbnRyb2xsZXI6IGZ1bmN0aW9uICgkc2NvcGUsIEFjY291bnQsICRsb2cpIHtcbiAgICAgICAgICAgIEFjY291bnQuZ2V0QWNjb3VudEluZm8oKS50aGVuKGZ1bmN0aW9uICh1c2VyQWNjb3VudCkge1xuICAgICAgICAgICAgICAgICRzY29wZS5hY2NvdW50ID0gdXNlckFjY291bnQ7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLmNhdGNoKCRsb2cpO1xuXG4gICAgICAgICAgICAkc2NvcGUudXBkYXRlU2V0dGluZ3MgPSBmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICRzY29wZS51cGRhdGVQYXlTZXR0aW5ncyA9ICEkc2NvcGUudXBkYXRlUGF5U2V0dGluZ3M7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICRzY29wZS5zaG93U2V0dGluZ3MgPSBmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgICRzY29wZS5zaG93UGF5U2V0dGluZ3MgPSAhJHNjb3BlLnNob3dQYXlTZXR0aW5nc1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAkc2NvcGUudXBkYXRlUGF5U2V0dGluZ3MgPSBmYWxzZTtcblxuICAgICAgICAgICAgJHNjb3BlLnNob3dQYXlTZXR0aW5ncyA9IGZhbHNlO1xuXG5cbiAgICAgICAgfSxcbiAgICAgICAgLy8gVGhlIGZvbGxvd2luZyBkYXRhLmF1dGhlbnRpY2F0ZSBpcyByZWFkIGJ5IGFuIGV2ZW50IGxpc3RlbmVyXG4gICAgICAgIC8vIHRoYXQgY29udHJvbHMgYWNjZXNzIHRvIHRoaXMgc3RhdGUuIFJlZmVyIHRvIGFwcC5qcy5cbiAgICB9KTtcblxufSk7XG5cbmFwcC5mYWN0b3J5KCdBY2NvdW50JywgZnVuY3Rpb24gKCRodHRwKSB7XG5cbiAgICB2YXIgZ2V0QWNjb3VudEluZm8gPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9hcGkvYWNjb3VudCcpLnRoZW4oZnVuY3Rpb24gKEFjY291bnQpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiSGV5IHdoYXQncyB1cFwiLCBBY2NvdW50LmRhdGEpO1xuICAgICAgICAgICAgcmV0dXJuIEFjY291bnQuZGF0YTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIHZhciB1cGRhdGVJbmZvID0gZnVuY3Rpb24oKXtcbiAgICAgICAgcmV0dXJuICRodHRwLnB1dCgnL2FwaS9hY2NvdW50JywgJHNjb3BlLmFjY291bnQpLnRoZW4oZnVuY3Rpb24oQWNjb3VudCl7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcIlVwZGF0aW5nIGFjY291bnQgaW5mbyFcIik7XG4gICAgICAgICAgICByZXR1cm4gQWNjb3VudC5kYXRhXG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgZ2V0QWNjb3VudEluZm86IGdldEFjY291bnRJbmZvXG4gICAgfTtcblxufSk7XG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuXG4gICAgLy8gUmVnaXN0ZXIgb3VyICphYm91dCogc3RhdGUuXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2Fib3V0Jywge1xuICAgICAgICB1cmw6ICcvYWJvdXQnLFxuICAgICAgICBjb250cm9sbGVyOiAnQWJvdXRDb250cm9sbGVyJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9hYm91dC9hYm91dC5odG1sJ1xuICAgIH0pO1xuXG59KTtcblxuYXBwLmNvbnRyb2xsZXIoJ0Fib3V0Q29udHJvbGxlcicsIGZ1bmN0aW9uICgkc2NvcGUsIEZ1bGxzdGFja1BpY3MpIHtcblxuICAgIC8vIEltYWdlcyBvZiBiZWF1dGlmdWwgRnVsbHN0YWNrIHBlb3BsZS5cbiAgICAkc2NvcGUuaW1hZ2VzID0gXy5zaHVmZmxlKEZ1bGxzdGFja1BpY3MpO1xuXG59KTsiLCJhcHAuY29udHJvbGxlcignQ2FydEN0cmwnLCBmdW5jdGlvbigkc2NvcGUsICRzdGF0ZVBhcmFtcywgQ2FydCwgUHJvZHVjdCl7XHRcblxuXHQkc2NvcGUuY2FydEl0ZW1zID0gW107XG5cdCRzY29wZS5lbXB0eUNhcnQgPSB0cnVlO1xuXG5cdHZhciBjYXJ0S2V5cyA9IE9iamVjdC5rZXlzKENhcnQuZ2V0KCkpO1xuXHR2YXIgdG90YWxQcmljZSA9IDA7XG5cdGlmKGNhcnRLZXlzLmxlbmd0aCA+IDApe1xuXHRcdCRzY29wZS5lbXB0eUNhcnQgPSBmYWxzZTtcblx0XHRjYXJ0S2V5cy5mb3JFYWNoKGZ1bmN0aW9uKHByb2R1Y3RJZCl7XG5cdFx0XHRjb25zb2xlLmxvZyhcIkN1cnJlbnQgUHJvZHVjdElkIG9uIENhcnQgaXM6IFwiLCBwcm9kdWN0SWQpO1xuXHRcdFx0cmV0dXJuIFByb2R1Y3QuZ2V0T25lUHJvZHVjdChwcm9kdWN0SWQpXG5cdFx0XHQudGhlbihmdW5jdGlvbihwcm9kdWN0KXtcblx0XHRcdFx0dmFyIHF1YW50aXR5ID0gbG9jYWxTdG9yYWdlW3Byb2R1Y3RJZF07XG5cdFx0XHRcdGNvbnNvbGUubG9nKFwiUHJvZHVjdCBmb3VuZCwgcXVhbnRpdHkgaXM6IFwiLCBxdWFudGl0eSwgXCIgYW5kIGl0ZW0gaXM6IFwiLCBwcm9kdWN0KTtcblx0XHRcdFx0dG90YWxQcmljZSs9IHF1YW50aXR5KnByb2R1Y3QucHJpY2U7XG5cdFx0XHRcdCRzY29wZS5jYXJ0SXRlbXMucHVzaCh7XG5cdFx0XHRcdFx0cXVhbnRpdHk6IHF1YW50aXR5LFxuXHRcdFx0XHRcdHByb2R1Y3Q6IHByb2R1Y3Rcblx0XHRcdFx0fSk7XG5cdFx0XHR9KVxuXHRcdFx0LnRoZW4oZnVuY3Rpb24oKXtcblx0XHRcdFx0JHNjb3BlLnRvdGFsUHJpY2UgPSB0b3RhbFByaWNlO1xuXHRcdFx0fSlcblx0XHR9KTtcblx0fVxuXHRcblxuXHQvLyBMZXQgY2hlY2tvdXRhZGRyZXNzIGRlZmF1bHQgdG8gdXNlcidzIGFkZHJlc3Ncblx0JHNjb3BlLmRlZmF1bHRBZGRyZXNzID0gJyc7XG5cdENhcnQuY2hlY2tvdXRBZGRyZXNzKClcblx0LnRoZW4oZnVuY3Rpb24odXNlckFkZHJlc3Mpe1xuXHRcdCRzY29wZS5kZWZhdWx0QWRkcmVzcyA9IHVzZXJBZGRyZXNzXG5cdH0pO1xuXG5cblx0Ly8gY2hlY2tvdXQgZm9ybSBoYXMgbmctbW9kZWw9J3R5cGVkQWRkcmVzcydcblx0JHNjb3BlLmNoZWNrb3V0ID0gZnVuY3Rpb24gKCkge1xuXHRcdC8vIENvbnZlcnRzIGNhcnRJdGVtcyAoYXJyYXkgb2Ygb2JqcykgaW50byBjYXJ0SWRzIChhcnJheSBvZiBQcm9kIGlkcylcblx0XHR2YXIgY2FydElkcyA9IFtdO1xuXHRcdCRzY29wZS5jYXJ0SXRlbXMuZm9yRWFjaChmdW5jdGlvbihpdGVtKXtcblx0XHRcdGZvcih2YXIgaSA9IDA7IGkgPCBpdGVtLnF1YW50aXR5OyBpKyspe1xuXHRcdFx0XHRjYXJ0SWRzLnB1c2goaXRlbS5wcm9kdWN0LmlkKTtcblx0XHRcdH1cblx0XHR9KTtcblx0XHQkc2NvcGUuY2FydEl0ZW1zID0gW107XG5cdFx0Q2FydC5lbXB0eSgpXG5cdFx0cmV0dXJuIENhcnQuY2hlY2tvdXQoJHNjb3BlLnR5cGVkQWRkcmVzcywgY2FydElkcyk7XG5cdH07XG5cdFxufSk7XG5cbiIsImFwcC5mYWN0b3J5KCdDYXJ0JywgZnVuY3Rpb24gKCRzdGF0ZSwgJGh0dHAsIFByb2R1Y3QpIHtcbiAgICB2YXIgQ2FydEZhY3RvcnkgPSB7fVxuICAgIC8vY2FydCA9IHtwcm9kdWN0S2V5MTogcXVhbnRpdHkxLCBwcm9kdWN0S2V5MjogcXVhbnRpdHkyLi4uIH1cblxuICAgIENhcnRGYWN0b3J5LmFkZCA9IGZ1bmN0aW9uIChwcm9kdWN0SWQsIHF1YW50aXR5KSB7XG4gICAgICAgIGxldCBudW1iZXIgPSBOdW1iZXIobG9jYWxTdG9yYWdlLmdldEl0ZW0ocHJvZHVjdElkKSkgKyBOdW1iZXIocXVhbnRpdHkpIHx8IE51bWJlcihxdWFudGl0eSk7XG4gICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKHByb2R1Y3RJZCwgbnVtYmVyKTtcbiAgICB9XG5cbiAgICBDYXJ0RmFjdG9yeS5yZW1vdmUgPSBmdW5jdGlvbiAocHJvZHVjdElkKSB7XG4gICAgICAgIGxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtKHByb2R1Y3RJZCk7XG4gICAgfVxuXG4gICAgQ2FydEZhY3RvcnkuZW1wdHkgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGxvY2FsU3RvcmFnZS5jbGVhcigpO1xuICAgIH1cbiAgICBcbiAgICBDYXJ0RmFjdG9yeS5nZXQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmKGxvY2FsU3RvcmFnZVtsZW5ndGhdKSBkZWxldGUgbG9jYWxTdG9yYWdlKCdsZW5ndGgnKTsgXG4gICAgICAgIHJldHVybiBsb2NhbFN0b3JhZ2U7XG4gICAgfVxuXG4gICAgQ2FydEZhY3RvcnkuY2hlY2tvdXQgPSBmdW5jdGlvbiAoYWRkcmVzcywgY2FydElkcykge1xuICAgICAgJHN0YXRlLmdvKCdob21lJyk7XG4gICAgICByZXR1cm4gJGh0dHAucG9zdCgnL2FwaS9vcmRlcnMvY2hlY2tvdXQvJyArIGFkZHJlc3MsIGNhcnRJZHMpO1xuICAgIH1cblxuICAgIENhcnRGYWN0b3J5LmNoZWNrb3V0QWRkcmVzcyA9IGZ1bmN0aW9uICgpe1xuICAgICAgcmV0dXJuICRodHRwLmdldCgnYXBpL2FjY291bnQnKVxuICAgICAgLnRoZW4oZnVuY3Rpb24ocmVzcG9uc2Upe1xuICAgICAgICByZXR1cm4gcmVzcG9uc2UuZGF0YVxuICAgICAgfSlcbiAgICAgIC50aGVuKGZ1bmN0aW9uKHVzZXIpe1xuICAgICAgICBpZighdXNlcikgcmV0dXJuICcnO1xuICAgICAgICByZXR1cm4gdXNlci5hZGRyZXNzXG4gICAgICB9KVxuICAgIH1cblxuICAgIHJldHVybiBDYXJ0RmFjdG9yeTtcbn0pO1xuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnY2FydCcsIHtcbiAgICAgICAgdXJsOiAnL2NhcnQnLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2NhcnQvY2FydC5odG1sJyxcbiAgIFx0XHQgIGNvbnRyb2xsZXI6ICdDYXJ0Q3RybCdcbiAgICB9KTtcbn0pO1xuXG4iLCIoZnVuY3Rpb24gKCkge1xuXG4gICAgJ3VzZSBzdHJpY3QnO1xuXG4gICAgLy8gSG9wZSB5b3UgZGlkbid0IGZvcmdldCBBbmd1bGFyISBEdWgtZG95LlxuICAgIGlmICghd2luZG93LmFuZ3VsYXIpIHRocm93IG5ldyBFcnJvcignSSBjYW5cXCd0IGZpbmQgQW5ndWxhciEnKTtcblxuICAgIHZhciBhcHAgPSBhbmd1bGFyLm1vZHVsZSgnZnNhUHJlQnVpbHQnLCBbXSk7XG5cbiAgICBhcHAuZmFjdG9yeSgnU29ja2V0JywgZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAoIXdpbmRvdy5pbykgdGhyb3cgbmV3IEVycm9yKCdzb2NrZXQuaW8gbm90IGZvdW5kIScpO1xuICAgICAgICByZXR1cm4gd2luZG93LmlvKHdpbmRvdy5sb2NhdGlvbi5vcmlnaW4pO1xuICAgIH0pO1xuXG4gICAgLy8gQVVUSF9FVkVOVFMgaXMgdXNlZCB0aHJvdWdob3V0IG91ciBhcHAgdG9cbiAgICAvLyBicm9hZGNhc3QgYW5kIGxpc3RlbiBmcm9tIGFuZCB0byB0aGUgJHJvb3RTY29wZVxuICAgIC8vIGZvciBpbXBvcnRhbnQgZXZlbnRzIGFib3V0IGF1dGhlbnRpY2F0aW9uIGZsb3cuXG4gICAgYXBwLmNvbnN0YW50KCdBVVRIX0VWRU5UUycsIHtcbiAgICAgICAgbG9naW5TdWNjZXNzOiAnYXV0aC1sb2dpbi1zdWNjZXNzJyxcbiAgICAgICAgbG9naW5GYWlsZWQ6ICdhdXRoLWxvZ2luLWZhaWxlZCcsXG4gICAgICAgIGxvZ291dFN1Y2Nlc3M6ICdhdXRoLWxvZ291dC1zdWNjZXNzJyxcbiAgICAgICAgc2Vzc2lvblRpbWVvdXQ6ICdhdXRoLXNlc3Npb24tdGltZW91dCcsXG4gICAgICAgIG5vdEF1dGhlbnRpY2F0ZWQ6ICdhdXRoLW5vdC1hdXRoZW50aWNhdGVkJyxcbiAgICAgICAgbm90QXV0aG9yaXplZDogJ2F1dGgtbm90LWF1dGhvcml6ZWQnXG4gICAgfSk7XG5cbiAgICBhcHAuZmFjdG9yeSgnQXV0aEludGVyY2VwdG9yJywgZnVuY3Rpb24gKCRyb290U2NvcGUsICRxLCBBVVRIX0VWRU5UUykge1xuICAgICAgICB2YXIgc3RhdHVzRGljdCA9IHtcbiAgICAgICAgICAgIDQwMTogQVVUSF9FVkVOVFMubm90QXV0aGVudGljYXRlZCxcbiAgICAgICAgICAgIDQwMzogQVVUSF9FVkVOVFMubm90QXV0aG9yaXplZCxcbiAgICAgICAgICAgIDQxOTogQVVUSF9FVkVOVFMuc2Vzc2lvblRpbWVvdXQsXG4gICAgICAgICAgICA0NDA6IEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICByZXNwb25zZUVycm9yOiBmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3Qoc3RhdHVzRGljdFtyZXNwb25zZS5zdGF0dXNdLCByZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuICRxLnJlamVjdChyZXNwb25zZSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9KTtcblxuICAgIGFwcC5jb25maWcoZnVuY3Rpb24gKCRodHRwUHJvdmlkZXIpIHtcbiAgICAgICAgJGh0dHBQcm92aWRlci5pbnRlcmNlcHRvcnMucHVzaChbXG4gICAgICAgICAgICAnJGluamVjdG9yJyxcbiAgICAgICAgICAgIGZ1bmN0aW9uICgkaW5qZWN0b3IpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gJGluamVjdG9yLmdldCgnQXV0aEludGVyY2VwdG9yJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIF0pO1xuICAgIH0pO1xuXG4gICAgYXBwLnNlcnZpY2UoJ0F1dGhTZXJ2aWNlJywgZnVuY3Rpb24gKCRodHRwLCBTZXNzaW9uLCAkcm9vdFNjb3BlLCBBVVRIX0VWRU5UUywgJHEpIHtcblxuICAgICAgICBmdW5jdGlvbiBvblN1Y2Nlc3NmdWxMb2dpbihyZXNwb25zZSkge1xuICAgICAgICAgICAgdmFyIGRhdGEgPSByZXNwb25zZS5kYXRhO1xuICAgICAgICAgICAgU2Vzc2lvbi5jcmVhdGUoZGF0YS5pZCwgZGF0YS51c2VyKTtcbiAgICAgICAgICAgICRyb290U2NvcGUuJGJyb2FkY2FzdChBVVRIX0VWRU5UUy5sb2dpblN1Y2Nlc3MpO1xuICAgICAgICAgICAgcmV0dXJuIGRhdGEudXNlcjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVzZXMgdGhlIHNlc3Npb24gZmFjdG9yeSB0byBzZWUgaWYgYW5cbiAgICAgICAgLy8gYXV0aGVudGljYXRlZCB1c2VyIGlzIGN1cnJlbnRseSByZWdpc3RlcmVkLlxuICAgICAgICB0aGlzLmlzQXV0aGVudGljYXRlZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiAhIVNlc3Npb24udXNlcjtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmdldExvZ2dlZEluVXNlciA9IGZ1bmN0aW9uIChmcm9tU2VydmVyKSB7XG5cbiAgICAgICAgICAgIC8vIElmIGFuIGF1dGhlbnRpY2F0ZWQgc2Vzc2lvbiBleGlzdHMsIHdlXG4gICAgICAgICAgICAvLyByZXR1cm4gdGhlIHVzZXIgYXR0YWNoZWQgdG8gdGhhdCBzZXNzaW9uXG4gICAgICAgICAgICAvLyB3aXRoIGEgcHJvbWlzZS4gVGhpcyBlbnN1cmVzIHRoYXQgd2UgY2FuXG4gICAgICAgICAgICAvLyBhbHdheXMgaW50ZXJmYWNlIHdpdGggdGhpcyBtZXRob2QgYXN5bmNocm9ub3VzbHkuXG5cbiAgICAgICAgICAgIC8vIE9wdGlvbmFsbHksIGlmIHRydWUgaXMgZ2l2ZW4gYXMgdGhlIGZyb21TZXJ2ZXIgcGFyYW1ldGVyLFxuICAgICAgICAgICAgLy8gdGhlbiB0aGlzIGNhY2hlZCB2YWx1ZSB3aWxsIG5vdCBiZSB1c2VkLlxuXG4gICAgICAgICAgICBpZiAodGhpcy5pc0F1dGhlbnRpY2F0ZWQoKSAmJiBmcm9tU2VydmVyICE9PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICRxLndoZW4oU2Vzc2lvbi51c2VyKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gTWFrZSByZXF1ZXN0IEdFVCAvc2Vzc2lvbi5cbiAgICAgICAgICAgIC8vIElmIGl0IHJldHVybnMgYSB1c2VyLCBjYWxsIG9uU3VjY2Vzc2Z1bExvZ2luIHdpdGggdGhlIHJlc3BvbnNlLlxuICAgICAgICAgICAgLy8gSWYgaXQgcmV0dXJucyBhIDQwMSByZXNwb25zZSwgd2UgY2F0Y2ggaXQgYW5kIGluc3RlYWQgcmVzb2x2ZSB0byBudWxsLlxuICAgICAgICAgICAgcmV0dXJuICRodHRwLmdldCgnL3Nlc3Npb24nKS50aGVuKG9uU3VjY2Vzc2Z1bExvZ2luKS5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMubG9naW4gPSBmdW5jdGlvbiAoY3JlZGVudGlhbHMpIHtcbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5wb3N0KCcvbG9naW4nLCBjcmVkZW50aWFscylcbiAgICAgICAgICAgICAgICAudGhlbihvblN1Y2Nlc3NmdWxMb2dpbilcbiAgICAgICAgICAgICAgICAuY2F0Y2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gJHEucmVqZWN0KHsgbWVzc2FnZTogJ0ludmFsaWQgbG9naW4gY3JlZGVudGlhbHMuJyB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmxvZ291dCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9sb2dvdXQnKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBTZXNzaW9uLmRlc3Ryb3koKTtcbiAgICAgICAgICAgICAgICAkcm9vdFNjb3BlLiRicm9hZGNhc3QoQVVUSF9FVkVOVFMubG9nb3V0U3VjY2Vzcyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfTtcblxuICAgIH0pO1xuXG4gICAgYXBwLnNlcnZpY2UoJ1Nlc3Npb24nLCBmdW5jdGlvbiAoJHJvb3RTY29wZSwgQVVUSF9FVkVOVFMpIHtcblxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMubm90QXV0aGVudGljYXRlZCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc2VsZi5kZXN0cm95KCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLnNlc3Npb25UaW1lb3V0LCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzZWxmLmRlc3Ryb3koKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgdGhpcy5pZCA9IG51bGw7XG4gICAgICAgIHRoaXMudXNlciA9IG51bGw7XG5cbiAgICAgICAgdGhpcy5jcmVhdGUgPSBmdW5jdGlvbiAoc2Vzc2lvbklkLCB1c2VyKSB7XG4gICAgICAgICAgICB0aGlzLmlkID0gc2Vzc2lvbklkO1xuICAgICAgICAgICAgdGhpcy51c2VyID0gdXNlcjtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmRlc3Ryb3kgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB0aGlzLmlkID0gbnVsbDtcbiAgICAgICAgICAgIHRoaXMudXNlciA9IG51bGw7XG4gICAgICAgIH07XG5cbiAgICB9KTtcblxufSkoKTtcbiIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2hvbWUnLCB7XG4gICAgICB1cmw6ICcvJyxcbiAgICAgIHRlbXBsYXRlVXJsOiAnanMvaG9tZS9ob21lLmh0bWwnLFxuICAgXHRcdGNvbnRyb2xsZXI6IGZ1bmN0aW9uKCRzY29wZSwgSG9tZSwgQ2FydCl7XG4gICAgICAgICRzY29wZS5jYXRlZ29yaWVzID0gWydQYWRkbGUnLCdCYWxsJywnQ2FzZScsXG4gICAgICAgICAgICAgICAgICAgICdUYWJsZScsJ1JvYm90J107XG4gICAgICAgICRzY29wZS5zZWxlY3RlZENhdGVnb3J5ID0gJyc7XG4gICAgICAgICRzY29wZS5vcmRlck9wdGlvbnMgPSBbJ3ByaWNlJywgJ3JhdGluZyddO1xuICAgICAgICAkc2NvcGUub3JkZXJPcHRpb24gPSAnJztcbiAgICAgICAgJHNjb3BlLmZpbmFsT3JkZXJPcHRpb24gPSAkc2NvcGUuYXNjRGVzYyArICRzY29wZS5vcmRlck9wdGlvbjtcblxuICAgICAgICAkc2NvcGUuYXNjRGVzY09wdGlvbnMgPSBbJ0FzY2VuZGluZycsICdEZXNjZW5kaW5nJ11cbiAgICAgICAgJHNjb3BlLnNlbGVjdGVkQXNjRGVzYyA9ICdEZXNjZW5kaW5nJztcbiAgICAgICAgJHNjb3BlLmFzY0Rlc2MgPSBmdW5jdGlvbiAoKXtcbiAgICAgICAgICBpZiAoJHNjb3BlLnNlbGVjdGVkQXNjRGVzYyA9PT0gJ0FzY2VuZGluZycpe1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBlbHNlIHJldHVybiB0cnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgJHNjb3BlLkNhcnQgPSBDYXJ0O1xuXG4gICBcdFx0XHRIb21lLmdldEFsbFByb2R1Y3RzKCkudGhlbihmdW5jdGlvbihhbGxQcm9kdWN0cyl7XG4gICBcdFx0XHRcdCRzY29wZS5wcm9kdWN0cyA9IGFsbFByb2R1Y3RzXG4gICBcdFx0XHR9KVxuICAgXHRcdH0gXG4gICAgfSk7XG59KTtcblxuYXBwLmZhY3RvcnkoJ0hvbWUnLCBmdW5jdGlvbigkaHR0cCl7XG4gICAgdmFyIGdldEFsbFByb2R1Y3RzID0gZnVuY3Rpb24oKXtcbiAgICAgICAgcmV0dXJuICRodHRwLmdldCgnL2FwaS9wcm9kdWN0cycpLnRoZW4oZnVuY3Rpb24ocHJvZHVjdHMpe1xuICAgICAgICAgICAgcmV0dXJuIHByb2R1Y3RzLmRhdGE7XG4gICAgICAgIH0pXG4gICAgfVxuXHRyZXR1cm4ge1xuICAgIGdldEFsbFByb2R1Y3RzOiBnZXRBbGxQcm9kdWN0c1xuXHR9ICAgIFxufSkiLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuXG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2xvZ2luJywge1xuICAgICAgICB1cmw6ICcvbG9naW4nLFxuICAgICAgICB0ZW1wbGF0ZVVybDogJ2pzL2xvZ2luL2xvZ2luLmh0bWwnLFxuICAgICAgICBjb250cm9sbGVyOiAnTG9naW5DdHJsJ1xuICAgIH0pO1xuXG59KTtcblxuYXBwLmNvbnRyb2xsZXIoJ0xvZ2luQ3RybCcsIGZ1bmN0aW9uICgkc2NvcGUsIEF1dGhTZXJ2aWNlLCAkc3RhdGUpIHtcblxuICAgICRzY29wZS5sb2dpbiA9IHt9O1xuICAgICRzY29wZS5lcnJvciA9IG51bGw7XG5cbiAgICAkc2NvcGUuc2VuZExvZ2luID0gZnVuY3Rpb24gKGxvZ2luSW5mbykge1xuXG4gICAgICAgICRzY29wZS5lcnJvciA9IG51bGw7XG5cbiAgICAgICAgQXV0aFNlcnZpY2UubG9naW4obG9naW5JbmZvKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICRzdGF0ZS5nbygnaG9tZScpO1xuICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAkc2NvcGUuZXJyb3IgPSAnSW52YWxpZCBsb2dpbiBjcmVkZW50aWFscy4nO1xuICAgICAgICB9KTtcblxuICAgIH07XG5cbn0pOyIsImFwcC5jb250cm9sbGVyKCdPcmRlckN0cmwnLCBmdW5jdGlvbigkc2NvcGUsIE9yZGVyKXtcblx0T3JkZXIuc2hvdygpXG5cdC50aGVuKGZ1bmN0aW9uKGFsbE9yZGVycyl7XG5cdFx0JHNjb3BlLm9yZGVycyA9IGFsbE9yZGVycztcblx0fSlcbn0pIiwiYXBwLmZhY3RvcnkoJ09yZGVyJywgZnVuY3Rpb24oJHN0YXRlLCAkaHR0cCl7XG5cdHZhciBPcmRlckZhY3RvcnkgPSB7fTtcblxuXHRPcmRlckZhY3Rvcnkuc2hvdyA9IGZ1bmN0aW9uKCl7XG5cdFx0cmV0dXJuICRodHRwLmdldCgnL2FwaS9vcmRlcnMnKVxuXHRcdC50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKXtcblx0XHRcdHJldHVybiByZXNwb25zZS5kYXRhXG5cdFx0fSlcblx0fVxuXHRyZXR1cm4gT3JkZXJGYWN0b3J5O1xuXHRcbn0pIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgnb3JkZXInLCB7XG4gICAgICAgIHVybDogJy9vcmRlcicsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvb3JkZXIvb3JkZXIuaHRtbCcsXG5cdFx0Y29udHJvbGxlcjogJ09yZGVyQ3RybCdcbiAgICB9KTtcblxuICAgICRzdGF0ZVByb3ZpZGVyLnN0YXRlKCduZXdSZXZpZXcnLCB7XG4gICAgXHR1cmw6ICcvb3JkZXIvcmV2aWV3Lzpwcm9kdWN0SWQnLFxuICAgIFx0dGVtcGxhdGVVcmw6ICdqcy9vcmRlci9yZXZpZXcvcmV2aWV3LmZvcm0uaHRtbCcsXG4gICAgXHRjb250cm9sbGVyOiAnUmV2aWV3Rm9ybUN0cmwnXG4gICAgfSk7XG59KTtcblxuIiwiYXBwLmNvbnRyb2xsZXIoJ1Byb2R1Y3RDdHJsJywgZnVuY3Rpb24oJHNjb3BlLCBQcm9kdWN0LCAkc3RhdGVQYXJhbXMsIENhcnQpe1xuICAkc2NvcGUuQ2FydCA9IENhcnQ7XG5cdFByb2R1Y3QuZ2V0T25lUHJvZHVjdCgkc3RhdGVQYXJhbXMuaWQpXG4gIC50aGVuKGZ1bmN0aW9uKHByb2R1Y3Qpe1xuICBcdGNvbnNvbGUubG9nKHByb2R1Y3QpXG5cdFx0JHNjb3BlLnByb2R1Y3QgPSBwcm9kdWN0O1xuXHRcdHByb2R1Y3QuZ2V0UmV2aWV3cygpXG5cdFx0LnRoZW4oZnVuY3Rpb24ocmV2aWV3cyl7XG5cdFx0XHQkc2NvcGUucmV2aWV3cyA9IHJldmlld3M7XG5cdFx0fSlcblx0fSlcblxufSk7XG5cbiIsImFwcC5mYWN0b3J5KCdQcm9kdWN0JywgZnVuY3Rpb24oJGh0dHApe1xuXHRsZXQgZ2V0T25lUHJvZHVjdCA9IGZ1bmN0aW9uKGlkKXtcbiAgICByZXR1cm4gJGh0dHAuZ2V0KCcvYXBpL3Byb2R1Y3RzLycrIGlkKVxuICAgIC50aGVuKGZ1bmN0aW9uKHByb2R1Y3Qpe1xuXHRcdCAgcmV0dXJuIHByb2R1Y3QuZGF0YTtcblx0XHR9KVxuXHR9O1xuXG4gIHJldHVybiB7XG5cdCAgZ2V0T25lUHJvZHVjdDogZ2V0T25lUHJvZHVjdFxuICB9XG59KVxuIiwiYXBwLmNvbmZpZyhmdW5jdGlvbiAoJHN0YXRlUHJvdmlkZXIpIHtcbiAgICAkc3RhdGVQcm92aWRlci5zdGF0ZSgncHJvZHVjdCcsIHtcbiAgICAgICAgdXJsOiAnL3Byb2R1Y3RzLzppZCcsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvcHJvZHVjdC9wcm9kdWN0Lmh0bWwnLFxuICAgXHRcdCAgY29udHJvbGxlcjogJ1Byb2R1Y3RDdHJsJ1xuICAgIH0pO1xufSk7XG4iLCJhcHAuY29udHJvbGxlcignUHJvZHVjdHNDdHJsJywgZnVuY3Rpb24oJHNjb3BlLCBQcm9kdWN0cyl7XG5cbiAgICAkc2NvcGUuY2F0ZWdvcmllcyA9IFsncGFkZGxlcycsJ2JhbGxzJywnY2FzZXMnLCd0YWJsZXMnLCdyb2JvdHMnXTtcblxuICAgICRzY29wZS5jYXRlZ29yaWVzRnVuYyA9IFByb2R1Y3RzLmdldFByb2R1Y3RzYnlDYXRlZ29yeTtcblxuICAgIFByb2R1Y3RzLmdldFByb2R1Y3RzYnlDYXRlZ29yeSgpXG4gICAgLnRoZW4oZnVuY3Rpb24ocHJvZHVjdHNJbkNhdGVnb3J5KXtcbiAgICAgICAgJHNjb3BlLnByb2R1Y3RzID0gcHJvZHVjdHNJbkNhdGVnb3J5O1xuICAgIH0pO1xufSk7XG4iLCJhcHAuZmFjdG9yeSgnUHJvZHVjdHMnLCBmdW5jdGlvbigkaHR0cCl7XG4gICAgdmFyIGdldEFsbFByb2R1Y3RzID0gZnVuY3Rpb24oKXtcbiAgICAgICAgcmV0dXJuICRodHRwLmdldCgnL2FwaS9wcm9kdWN0cycpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKHByb2R1Y3RzKXtcbiAgICAgICAgICAgIHJldHVybiBwcm9kdWN0cy5kYXRhO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgdmFyIGdldFByb2R1Y3RzYnlDYXRlZ29yeSA9IGZ1bmN0aW9uKGNhdGVnb3J5KXtcbiAgICAgICAgY2F0ZWdvcnkgPSBjYXRlZ29yeSB8fCAwO1xuICAgICAgICBpZihjYXRlZ29yeSA9PT0gMCl7XG4gICAgICAgICAgICByZXR1cm4gJGh0dHAuZ2V0KCcvYXBpL3Byb2R1Y3RzJylcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHByb2R1Y3RzKXtcbiAgICAgICAgICAgICAgICByZXR1cm4gcHJvZHVjdHMuZGF0YTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAkaHR0cC5nZXQoJy9hcGkvcHJvZHVjdHMvP2NhdGVnb3J5PScgKyBjYXRlZ29yeSlcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24ocHJvZHVjdHNJbkNhdGVnb3J5KXtcbiAgICAgICAgICAgIHJldHVybiBwcm9kdWN0c0luQ2F0ZWdvcnkuZGF0YTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIHJldHVybiB7XG4gICAgICAgIGdldFByb2R1Y3RzYnlDYXRlZ29yeTogZ2V0UHJvZHVjdHNieUNhdGVnb3J5XG4gICAgfTtcbn0pXG4iLCJhcHAuY29uZmlnKGZ1bmN0aW9uICgkc3RhdGVQcm92aWRlcikge1xuwqDCoMKgwqAkc3RhdGVQcm92aWRlci5zdGF0ZSgncHJvZHVjdHMnLCB7XG7CoMKgwqDCoMKgwqDCoMKgdXJsOiAnLycsXG7CoMKgwqDCoMKgwqDCoMKgdGVtcGxhdGVVcmw6ICdqcy9wcm9kdWN0cy9wcm9kdWN0cy5odG1sJyxcbsKgwqDCoMKgwqDCoMKgwqBjb250cm9sbGVyOiAnUHJvZHVjdHNDdHJsJ1xuwqDCoMKgwqB9KTtcbn0pOyIsImFwcC5jb25maWcoZnVuY3Rpb24gKCRzdGF0ZVByb3ZpZGVyKSB7XG4gICAgJHN0YXRlUHJvdmlkZXIuc3RhdGUoJ2RvY3MnLCB7XG4gICAgICAgIHVybDogJy9kb2NzJyxcbiAgICAgICAgdGVtcGxhdGVVcmw6ICdqcy9kb2NzL2RvY3MuaHRtbCdcbiAgICB9KTtcbn0pO1xuIiwiYXBwLmZhY3RvcnkoJ0Z1bGxzdGFja1BpY3MnLCBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFtcbiAgICAgICAgJ2h0dHBzOi8vcGJzLnR3aW1nLmNvbS9tZWRpYS9CN2dCWHVsQ0FBQVhRY0UuanBnOmxhcmdlJyxcbiAgICAgICAgJ2h0dHBzOi8vZmJjZG4tc3Bob3Rvcy1jLWEuYWthbWFpaGQubmV0L2hwaG90b3MtYWsteGFwMS90MzEuMC04LzEwODYyNDUxXzEwMjA1NjIyOTkwMzU5MjQxXzgwMjcxNjg4NDMzMTI4NDExMzdfby5qcGcnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0ItTEtVc2hJZ0FFeTlTSy5qcGcnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0I3OS1YN29DTUFBa3c3eS5qcGcnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0ItVWo5Q09JSUFJRkFoMC5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0I2eUl5RmlDRUFBcWwxMi5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NFLVQ3NWxXQUFBbXFxSi5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NFdlpBZy1WQUFBazkzMi5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NFZ05NZU9YSUFJZkRoSy5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NFUXlJRE5XZ0FBdTYwQi5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NDRjNUNVFXOEFFMmxHSi5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NBZVZ3NVNXb0FBQUxzai5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NBYUpJUDdVa0FBbElHcy5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NBUU93OWxXRUFBWTlGbC5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0ItT1FiVnJDTUFBTndJTS5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0I5Yl9lcndDWUFBd1JjSi5wbmc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0I1UFRkdm5DY0FFQWw0eC5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0I0cXdDMGlDWUFBbFBHaC5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0IyYjMzdlJJVUFBOW8xRC5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0J3cEl3cjFJVUFBdk8yXy5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0JzU3NlQU5DWUFFT2hMdy5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NKNHZMZnVVd0FBZGE0TC5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NJN3d6akVWRUFBT1BwUy5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NJZEh2VDJVc0FBbm5IVi5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NHQ2lQX1lXWUFBbzc1Vi5qcGc6bGFyZ2UnLFxuICAgICAgICAnaHR0cHM6Ly9wYnMudHdpbWcuY29tL21lZGlhL0NJUzRKUElXSUFJMzdxdS5qcGc6bGFyZ2UnXG4gICAgXTtcbn0pO1xuIiwiYXBwLmZhY3RvcnkoJ1JhbmRvbUdyZWV0aW5ncycsIGZ1bmN0aW9uICgpIHtcblxuICAgIHZhciBnZXRSYW5kb21Gcm9tQXJyYXkgPSBmdW5jdGlvbiAoYXJyKSB7XG4gICAgICAgIHJldHVybiBhcnJbTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogYXJyLmxlbmd0aCldO1xuICAgIH07XG5cbiAgICB2YXIgZ3JlZXRpbmdzID0gW1xuICAgICAgICAnV2VsY29tZSB0byB0aGUgYmVzdCBQaW5nLVBvbmcgc3RvcmUgdGhpcyBzaWRlIG9mIHRoZSBBdGxhbnRpYycsXG4gICAgICAgICdZb3UgbG9vayBsaWtlIHlvdSBjb3VsZCB1c2UgYSBicmFuZCBzcGFua2luZyBuZXcgcGFkZGxlJ1xuICAgIF07XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBncmVldGluZ3M6IGdyZWV0aW5ncyxcbiAgICAgICAgZ2V0UmFuZG9tR3JlZXRpbmc6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHJldHVybiBnZXRSYW5kb21Gcm9tQXJyYXkoZ3JlZXRpbmdzKTtcbiAgICAgICAgfVxuICAgIH07XG5cbn0pO1xuIiwiYXBwLmNvbnRyb2xsZXIoJ1Jldmlld0Zvcm1DdHJsJywgZnVuY3Rpb24oJHNjb3BlLFJldmlld0ZhY3RvcnksQXV0aFNlcnZpY2UsJHN0YXRlUGFyYW1zLCRzdGF0ZSl7XG5cdCRzY29wZS5uZXdSZXZpZXcgPSB7fTtcblx0JHNjb3BlLnN0YXRlID0gJHN0YXRlLmN1cnJlbnQ7XG5cdCRzY29wZS5jcmVhdGVSZXZpZXcgPSBmdW5jdGlvbigpe1xuXHRcdEF1dGhTZXJ2aWNlLmdldExvZ2dlZEluVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgICAgICRzY29wZS5uZXdSZXZpZXcudXNlcklkID0gdXNlci5pZDtcbiAgICAgICAgICAgICRzY29wZS5uZXdSZXZpZXcucHJvZHVjdElkID0gJHN0YXRlUGFyYW1zLnByb2R1Y3RJZDtcbiAgICAgICAgICAgIHJldHVybiAkc2NvcGUubmV3UmV2aWV3XG4gICAgICAgIH0pXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKG5ld1Jldmlldyl7XG4gICAgICAgIFx0UmV2aWV3RmFjdG9yeS5zZXRSZXZpZXcobmV3UmV2aWV3KVxuXHRcdFx0LnRoZW4oZnVuY3Rpb24ocmV2aWV3KXtcblx0XHRcdFx0aWYocmV2aWV3LmNyZWF0ZWQpIGFsZXJ0KCdZb3UgYWxyZWFkeSB3cml0ZSBhIHJldmlldyBmb3IgdGhpcyBvcmRlcicpXG5cdFx0XHRcdGVsc2UgYWxlcnQoJ1RoYW5rcyBmb3IgeW91ciBmZWVkYmFjayEnKVxuXHRcdFx0XHQkc3RhdGUuZ28oJ29yZGVyJyk7XG5cdFx0XHR9KVxuICAgICAgICB9KVxuXHRcdFxuXHR9XG59KSIsImFwcC5mYWN0b3J5KCdSZXZpZXdGYWN0b3J5JywgZnVuY3Rpb24oJHN0YXRlLCAkaHR0cCl7XG5cdHZhciBSZXZpZXdGYWN0b3J5ID0ge307XG5cblx0UmV2aWV3RmFjdG9yeS5zZXRSZXZpZXcgPSBmdW5jdGlvbihyZXZpZXcpe1xuXHRcdHJldHVybiAkaHR0cC5wb3N0KCcvYXBpL3Jldmlld3MvJywgcmV2aWV3KVxuXHRcdC50aGVuKGZ1bmN0aW9uKHJlc3BvbnNlKXtcblx0XHRcdHJldHVybiByZXNwb25zZS5kYXRhO1xuXHRcdH0pXG5cdH1cblx0cmV0dXJuIFJldmlld0ZhY3Rvcnk7XG5cdFxufSkiLCJhcHAuZGlyZWN0aXZlKCdmdWxsc3RhY2tMb2dvJywgZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvZnVsbHN0YWNrLWxvZ28vZnVsbHN0YWNrLWxvZ28uaHRtbCdcbiAgICB9O1xufSk7IiwiYXBwLmRpcmVjdGl2ZSgnbmF2YmFyJywgZnVuY3Rpb24gKCRyb290U2NvcGUsIEF1dGhTZXJ2aWNlLCBBVVRIX0VWRU5UUywgJHN0YXRlKSB7XG5cbiAgICByZXR1cm4ge1xuICAgICAgICByZXN0cmljdDogJ0UnLFxuICAgICAgICBzY29wZToge30sXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvbmF2YmFyL25hdmJhci5odG1sJyxcbiAgICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlKSB7XG5cbiAgICAgICAgICAgIHNjb3BlLml0ZW1zID0gW1xuICAgICAgICAgICAgICAgIHsgbGFiZWw6ICdBYm91dCcsIHN0YXRlOiAnYWJvdXQnIH0sXG4gICAgICAgICAgICAgICAgeyBsYWJlbDogJ015IENhcnQnLCBzdGF0ZTogJ2NhcnQnIH0sXG4gICAgICAgICAgICAgICAgeyBsYWJlbDogJ09yZGVyJywgc3RhdGU6ICdvcmRlcicsIGF1dGg6IHRydWV9LFxuICAgICAgICAgICAgICAgIHsgbGFiZWw6ICdBY2NvdW50Jywgc3RhdGU6ICdhY2NvdW50JywgYXV0aDogdHJ1ZX1cbiAgICAgICAgICAgIF07XG5cbiAgICAgICAgICAgIHNjb3BlLnVzZXIgPSBudWxsO1xuXG4gICAgICAgICAgICBzY29wZS5pc0xvZ2dlZEluID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBBdXRoU2VydmljZS5pc0F1dGhlbnRpY2F0ZWQoKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHNjb3BlLmxvZ291dCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBBdXRoU2VydmljZS5sb2dvdXQoKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAkc3RhdGUuZ28oJ2hvbWUnKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHZhciBzZXRVc2VyID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIEF1dGhTZXJ2aWNlLmdldExvZ2dlZEluVXNlcigpLnRoZW4oZnVuY3Rpb24gKHVzZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUudXNlciA9IHVzZXI7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICB2YXIgcmVtb3ZlVXNlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBzY29wZS51c2VyID0gbnVsbDtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHNldFVzZXIoKTtcblxuICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMubG9naW5TdWNjZXNzLCBzZXRVc2VyKTtcbiAgICAgICAgICAgICRyb290U2NvcGUuJG9uKEFVVEhfRVZFTlRTLmxvZ291dFN1Y2Nlc3MsIHJlbW92ZVVzZXIpO1xuICAgICAgICAgICAgJHJvb3RTY29wZS4kb24oQVVUSF9FVkVOVFMuc2Vzc2lvblRpbWVvdXQsIHJlbW92ZVVzZXIpO1xuXG4gICAgICAgIH1cblxuICAgIH07XG5cbn0pO1xuIiwiYXBwLmRpcmVjdGl2ZSgncmFuZG9HcmVldGluZycsIGZ1bmN0aW9uIChSYW5kb21HcmVldGluZ3MpIHtcblxuICAgIHJldHVybiB7XG4gICAgICAgIHJlc3RyaWN0OiAnRScsXG4gICAgICAgIHRlbXBsYXRlVXJsOiAnanMvY29tbW9uL2RpcmVjdGl2ZXMvcmFuZG8tZ3JlZXRpbmcvcmFuZG8tZ3JlZXRpbmcuaHRtbCcsXG4gICAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSkge1xuICAgICAgICBcdFx0Y29uc29sZS5sb2coXCJyYW5kb0dyZWV0aW5nIGxpbmsgZnVuY3Rpb24gaGl0XCIpO1xuICAgICAgICAgICAgc2NvcGUuZ3JlZXRpbmcgPSBSYW5kb21HcmVldGluZ3MuZ2V0UmFuZG9tR3JlZXRpbmcoKTtcbiAgICAgICAgfVxuICAgIH07XG5cbn0pOyJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
