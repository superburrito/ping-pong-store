app.config(function ($stateProvider) {
    $stateProvider.state('home', {
      url: '/',
      templateUrl: 'js/home/home.html',
   		controller: function($scope, Home, Cart){
        $scope.categories = ['Paddle','Ball','Case',
                    'Table','Robot'];
        $scope.selectedCategory = '';
        $scope.orderOptions = ['price', 'rating'];
        $scope.orderOption = '';
        $scope.finalOrderOption = $scope.ascDesc + $scope.orderOption;

        $scope.ascDescOptions = ['Ascending', 'Descending']
        $scope.selectedAscDesc = 'Descending';
        $scope.ascDesc = function (){
          if ($scope.selectedAscDesc === 'Ascending'){
            return false;
          }
          else return true;
        }

        $scope.Cart = Cart;

   			Home.getAllProducts().then(function(allProducts){
   				$scope.products = allProducts
   			})
   		} 
    });
});

app.factory('Home', function($http){
    var getAllProducts = function(){
        return $http.get('/api/products').then(function(products){
            return products.data;
        })
    }
	return {
    getAllProducts: getAllProducts
	}    
})