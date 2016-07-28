app.factory('Product', function($http){
	let getOneProduct = function(id){
    return $http.get('/api/products/'+ id)
    .then(function(product){
		  return product.data;
		})
	};

  return {
	  getOneProduct: getOneProduct
  }
})
