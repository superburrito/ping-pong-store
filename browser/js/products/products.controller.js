app.controller('ProductsCtrl', function($scope, Products, AuthService){

	scope.isAdmin = false
	AuthService.getLoggedInUser().then(function (user) {
        if(scope.user.isAdmin) $scope.isAdmin = true;
    });

    $scope.categories = ['Paddles','Balls','Cases','Tables','Robots'];

    $scope.categoriesFunc = Products.getProductsbyCategory;

    Products.getProductsbyCategory()
    .then(function(productsInCategory){
        $scope.products = productsInCategory;
    });
});
