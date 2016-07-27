app.config(function ($stateProvider) {

    $stateProvider.state('membersOnly', {
        url: '/members-area',
        template: 'js/members-only/members-only.html',
        controller: function ($scope, Account) {
            Account.getAccountInfo().then(function (userAccount) {
                $scope.account = userAccount;
            });
        },
        // The following data.authenticate is read by an event listener
        // that controls access to this state. Refer to app.js.
        data: {
            authenticate: true
        }
    });

});

app.factory('Account', function ($http) {

    var getAccountInfo = function () {
        return $http.get('/api/users').then(function (Account) {
            return Account.data;
        });
    };

    return {
        getAccountInfo: getAccountInfo
    };

});