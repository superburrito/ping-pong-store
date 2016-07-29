app.controller('ProductsCtrl', function($scope, Products){

    $scope.categories = ['paddles','balls','cases','tables','robots'];

    $scope.categoriesFunc = Products.getProductsbyCategory;

    Products.getProductsbyCategory()
    .then(function(productsInCategory){
        $scope.products = productsInCategory;
    });
});
