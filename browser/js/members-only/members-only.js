app.config(function ($stateProvider) {

    $stateProvider.state('membersOnly', {
        url: '/account',
        templateUrl: 'js/members-only/members-only.html',
        controller: function ($scope, Account, $log) {
            Account.getAccountInfo().then(function (userAccount) {
                $scope.account = userAccount;
            })
            .catch($log);
        },
        // The following data.authenticate is read by an event listener
        // that controls access to this state. Refer to app.js.
    });

});

app.factory('Account', function ($http) {

    var getAccountInfo = function () {
        return $http.get('/api/account').then(function (Account) {
            console.log("Hey what's up", Account.data);
            return Account.data;
        });
    };

    return {
        getAccountInfo: getAccountInfo
    };

});
