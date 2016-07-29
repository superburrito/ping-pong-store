app.factory('Products', function($http){
    var getAllProducts = function(){
        return $http.get('/api/products')
        .then(function(products){
            return products.data;
        });
    };

    var getProductsbyCategory = function(category){
        category = category || 0;
        if(category === 0){
            return $http.get('/api/products')
            .then(function(products){
                return products.data;
            });
        }
        return $http.get('/api/products/?category=' + category)
        .then(function(productsInCategory){
            return productsInCategory.data;
        });
    };

    return {
        getProductsbyCategory: getProductsbyCategory
    };
})
