nextWithTimeout = (nextFunc, timeout) => {
    console.log("Setting paused to false and starting timeout")
    var paused = false;

    var timeout = setTimeout(function() {
        window.document.onkeyup = null;
        nextFunc()
    }, timeout);


    window.document.onkeyup = (event) => {
        console.log("Key pressed")
        if (event.which === 32) {
            if (paused) {
                console.log("Resuming after pause");
                window.document.onkeyup = null;
                nextFunc();
            } else {
                console.log("Clearing timeout and pausing")
                clearTimeout(timeout);
                paused = true;
            }
        }
    };
}