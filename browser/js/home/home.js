app.config(function ($stateProvider) {
    $stateProvider.state('home', {
      url: '/',
      templateUrl: 'js/home/home.html',
   		controller: function($scope, homepage){
        $scope.categories = ['Paddle','Ball','Case',
                    'Table','Robot'];
        $scope.selectedCategory = '';

        $scope.orderOptions = ['Price', 'Rating'];
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


   			homepage.getAllProducts().then(function(allProducts){
   				$scope.products = allProducts
   			})
   		} 
    });
});

app.factory('homepage', function($http){
    var getAllProducts = function(){
        return $http.get('/api/products').then(function(products){
            return products.data;
        })
    }
	return {
    getAllProducts: getAllProducts
	}    
})