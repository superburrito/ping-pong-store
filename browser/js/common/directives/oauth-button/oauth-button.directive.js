'use strict';

app.directive('oauthButton', function () {
  return {
    scope: {
      providerName: '@'
    },
    restrict: 'E',
    controller: 'SignUpCtrl',
    templateUrl: 'js/common/directives/oauth-button/oauth-button.html'
  }
});