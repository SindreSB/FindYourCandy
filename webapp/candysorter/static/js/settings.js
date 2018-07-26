$(function () {
    $("body").removeClass("mode-speech-start");

    // API settings
    var pid = Math.floor(Math.random() * 10000000000000000); // POST ID
    
    var cameraStatusUrl = "/api/status/camera"; // API for Morphological analysis
    var cameraStatus = false;

    var robotStatusUrl = "/api/status/robot"; // Robot status API URL
    var robotStatus = false;

    function checkConnection() {
        updateConnectionStatus(navigator.onLine);
    };

    function checkRobot() {
        $.ajax({
            type: "GET",
            contentType: "application/json",
            dataType: "json",
            url: robotStatusUrl,
            error: function (textStatus) {
                console.log(textStatus);
                updateRobotStatus(false);
            },
            success: function (data) {
                console.log(data);
                updateRobotStatus(true);
                robotStatus = true;
            }
        });
    };

    function checkCam() {
        $.ajax({
            type: "GET",
            contentType: "application/json",
            dataType: "json",
            url: cameraStatusUrl,
            error: function (textStatus) {
                console.log(textStatus);
                updateCameraStatus(false);
            },
            success: function (data) {
                updateCameraStatus(true);
                console.log(data);
                cameraStatus = true;
            }
        });
    }

    checkCam();
    checkRobot();
    checkConnection();


    function updateConnectionStatus(statusOk){
        color = statusOk ? "#49bca1" : "#ff5f63";
        text = statusOk ? "OK" : "Error";

        $(".flex-container div:nth-child(1)").css({
            "background-color": color
        });
        $(".flex-container #OKconn").text(text);
    }

    function updateRobotStatus(statusOk){
        color = statusOk ? "#49bca1" : "#ff5f63";
        text = statusOk ? "OK" : "Error";

        $(".flex-container div:nth-child(2)").css({
            "background-color": color
        });
        $(".flex-container #OKrob").text(text);
    }

    function updateCameraStatus(statusOk){
        color = statusOk ? "#49bca1" : "#ff5f63";
        text = statusOk ? "OK" : "Error";

        $(".flex-container div:nth-child(3)").css({
            "background-color": color
        });
        $(".flex-container #OKcam").text(text);
    }

});
