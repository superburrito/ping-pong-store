app.factory('CreateProduct', function($state, $http){
	var CreateProduct ={};
	
	CreateProduct.create = function(product,category){
		product.category = category;
		return $http.post('/api/products', product)
		.then(function(newProduct){
			console.log(newProduct,' create successfully')
			return newProduct.data;
		})
	}
	return CreateProduct;
})