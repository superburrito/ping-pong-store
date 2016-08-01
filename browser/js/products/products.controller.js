app.controller('ProductsCtrl', function($scope, Products){

    $scope.categories = ['Paddles','Balls','Cases','Tables','Robots'];

    $scope.categoriesFunc = Products.getProductsbyCategory;

    Products.getProductsbyCategory()
    .then(function(productsInCategory){
        $scope.products = productsInCategory;
    });
});
