app.config(function ($stateProvider) {
    $stateProvider.state('home', {
      url: '/',
      templateUrl: 'js/home/home.html',
   		controller: function($scope, homepage){
        $scope.categories = ['paddle','ball','case',
                    'table','robot'];
        $scope.selectedCategory = '';

        $scope.orderOptions = ['price', 'rating'];
        $scope.orderOption = '';
        $scope.finalOrderOption = $scope.ascDesc + $scope.orderOption;

        $scope.ascDescOptions = ['ascending', 'descending']
        $scope.selectedAscDesc = 'descending';
        $scope.ascDesc = function (){
          if ($scope.selectedAscDesc === 'ascending'){
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