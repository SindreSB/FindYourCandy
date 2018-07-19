(function () {
    var audioContext = new AudioContext();
    console.log(audioContext.sampleRate)
    var scriptProcessor = audioContext.createScriptProcessor(2048, 1, 1);
    var audioInput = null;
    var userMediaStream = null;

    var result_callback = null
    var recording = false

    var socket = null

    function onaudioend() {
        console.log("Audio ended")
    }

    function start_streaming(stream) {
        userMediaStream = stream;

        // get all the audio capture, processing and streaming ready to go...
        userMediaStream.getTracks().forEach((track) => {
            track.onended = onaudioend
        });

        audioInput = audioContext.createMediaStreamSource(userMediaStream);
        audioInput.connect(scriptProcessor);
        scriptProcessor.connect(audioContext.destination)
        scriptProcessor.onaudioprocess = (event) => {
            // we're only using one audio channel here...
            let leftChannel = event.inputBuffer.getChannelData(0);
            if (socket && socket.readyState == 1) {
                socket.send(convertFloat32ToInt16(leftChannel));
            }
        }

        socket = new WebSocket('ws://localhost:8765')

        socket.addEventListener('open', function (event) {
            console.log("Connected to server");
            socket.send(JSON.stringify({
                "sample_rate": 44100,
                "lang": "nb-NO",
                "interim_results": true,
            }));
        });

        // Listen for messages
        socket.addEventListener('message', function (event) {
            data = JSON.parse(event.data)
            console.log(data);
            result_callback(data)

            if (data.event === "end_of_speech") {
                console.log("DONE!")
                start_recording(); // Stopp opptak
            }
            else {
                document.getElementById('speech-interim-text').innerHTML = data.transcript
            }
        });
    };

    function start_recognition(callback) {
        if (!recording) {
            getUserMedia(start_streaming, (event) => console.log(event));
            recording = true;
            result_callback = callback
        } else {
            if (audioInput) {
                audioInput.disconnect();
            }

            if (userMediaStream) {
                userMediaStream.getTracks().map((track) => {
                    track.stop();
                });
            }

            if (socket) {
                socket.close();
            }
            recording = false;
        }

    }

    function getUserMedia(successFn, failureFn) {
        let nav = navigator;

        return nav.getUserMedia({ audio: true }, successFn, failureFn);

    }

    function convertFloat32ToInt16(buffer) {
        let l = buffer.length;
        let buf = new Int16Array(l);
        while (l >= 0) {
            buf[l] = Math.min(1, buffer[l]) * 0x7FFF;
            l = l - 1;
        }
        return buf.buffer;
    }

    window.start_recognition = start_recognition
})();