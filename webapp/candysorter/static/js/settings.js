$(function () {
    $("body").removeClass("mode-speech-start");

    // API settings
    var pid = Math.floor(Math.random() * 10000000000000000); // POST ID
    var morUrl = "/api/morphs"; // API for Morphological analysis
    var statUrl = "/api/pickup"; // API for pick up candy
    var robotStatus = false;

    var checkConnection = function() {
        if(navigator.onLine) {
            $(".flex-container div:nth-child(1)").css({
                "background-color": "#49bca1"
            });
        }
    };

    var checkRobot = function() {
        $.ajax({
            type: "POST",
            contentType: "application/json",
            dataType: "json",
            url: statUrl,
            data: JSON.stringify({
                "id": pid
            }),
            error: function (textStatus) {
                console.log(textStatus);
            },
            success: function (data) {
                console.log(data);
                robotStatus = true;
            }
        });
    };

    var checkCam = function() {
        return;
    }

    checkRobot();
    checkConnection();

    setTimeout(function () {
        if(robotStatus) {
            $(".flex-container div:nth-child(2)").css({
                "background-color": "#49bca1"
            });
        }
    },2500);

});
