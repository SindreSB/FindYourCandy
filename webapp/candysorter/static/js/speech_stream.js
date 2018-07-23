class GcpSpeechStreamer {
    constructor(resCallback) {
        this.result_callback = resCallback;
        this.audioContext = new AudioContext();
        this.scriptProcessor = this.audioContext.createScriptProcessor(2048, 1, 1);
        this.audioInput = null;
        this.userMediaStream = null;
        this.recording = false;
        this.socket = null;

    }

    start_recognition() {
        if (!this.recording) {
            this.getUserMedia(this.start_streaming.bind(this), (event) => console.log(event));
            this.recording = true;
        } 
    }

    stop_recognition() {
        if (this.recording) {
            if (this.audioInput) {
                this.audioInput.disconnect();
            }

            if (this.userMediaStream) {
                this.userMediaStream.getTracks().map((track) => {
                    track.stop();
                });
            }

            if (this.socket) {
                this.socket.close();
            }
            this.recording = false;
        }
    }

    isRecording () {
        return this.recording;
    }

    getUserMedia(successFn, failureFn) {
        return navigator.getUserMedia({ audio: true }, successFn, failureFn);
    }

    start_streaming(stream) {
        this.userMediaStream = stream;

        // get all the audio capture, processing and streaming ready to go...
        this.userMediaStream.getTracks().forEach((track) => {
            track.onended = this.onAudioEnd
        });
        this.audioInput = this.audioContext.createMediaStreamSource(this.userMediaStream);
        this.audioInput.connect(this.scriptProcessor);
        this.scriptProcessor.connect(this.audioContext.destination);
        this.scriptProcessor.onaudioprocess = this.processAudioData.bind(this);

        this.setupWebsocketConnection('ws://' + window.location.hostname + ':8765');
        
    };

    setupWebsocketConnection(Uri) {
        this.socket = new WebSocket(Uri);

        // Open connection
        this.socket.addEventListener('open', this.onConnectionOpened.bind(this));

        // Register message handler
        this.socket.addEventListener('message', this.onMessageReceived.bind(this));
    }

    onConnectionOpened(event) {
        // First message to the server should be config data
        this.socket.send(JSON.stringify({
            "sample_rate": 44100,
            "lang": "nb-NO",
            "interim_results": true,
            "phrase_key": "twist",  //"twist" or "box_candy"
            // The following two settings require the features to be turned on in GCP Console
            "use_enhanced": true,
            "model": "command_and_search"
        }));
    }

    onMessageReceived(event) {
        var data = JSON.parse(event.data)

        if (data.event === "end_of_speech") {
            this.stop_recognition();
        }

        this.result_callback(data);
    }

    processAudioData(data) {
        // we're only using one audio channel here...
        let leftChannel = event.inputBuffer.getChannelData(0);
        if (this.socket && this.socket.readyState == 1) {
            this.socket.send(this.convertFloat32ToInt16(leftChannel));
        }
    }

    onAudioEnd() {
        console.log("Audio ended");
    }

    convertFloat32ToInt16(buffer) {
        let l = buffer.length;
        let buf = new Int16Array(l);
        while (l >= 0) {
            buf[l] = Math.min(1, buffer[l]) * 0x7FFF;
            l = l - 1;
        }
        return buf.buffer;
    }
}