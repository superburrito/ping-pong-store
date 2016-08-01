app.factory('Product', function($http){
	var ProductFactory = {};

	ProductFactory.getOneProduct = function(productId){
    return $http.get('/api/products/'+ productId)
    .then(function(product){
		  return product.data;
		})
	};

	ProductFactory.getProductReviews = function(productId){
		return $http.get('/api/products/' + productId + '/reviews')
		.then(function(response){
			return response.data
		})
	};

  return ProductFactory;
})
