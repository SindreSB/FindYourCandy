from flask import Flask
from flask_sockets import Sockets

# GCP imports
from google.cloud.speech_v1p1beta1 import enums
from google.cloud.speech_v1p1beta1 import SpeechClient
from google.cloud.speech_v1p1beta1 import types

app = Flask(__name__)
sockets = Sockets(app)


@sockets.route('/')
def audio(ws):
    ws.send("Hello")

    def generator():
        while True:
            msg = ws.receive()
            if msg is not None:
                yield(bytes(msg))

    # Get the SpeechClient and configuration
    client = SpeechClient()
    config = types.StreamingRecognitionConfig(
        config=types.RecognitionConfig(
            encoding=enums.RecognitionConfig.AudioEncoding.LINEAR16,
            sample_rate_hertz=16000,
            language_code='en-US',
        ),
        interim_results=True,
    )

    # Create requests using the audio generator, adapted from transcribe-streaming sample
    requests = (types.StreamingRecognizeRequest(audio_content=content) for content in generator())
    responses = client.streaming_recognize(config, requests)

    for response in responses:
        # Once the transcription has settled, the first result will contain the
        # is_final result. The other results will be for subsequent portions of
        # the audio.
        for result in response.results:
            print('Finished: {}'.format(result.is_final))
            print('Stability: {}'.format(result.stability))
            alternatives = result.alternatives
            # The alternatives are ordered from most likely to least.
            for alternative in alternatives:
                print('Confidence: {}'.format(alternative.confidence))
                print(u'Transcript: {}'.format(alternative.transcript))
                ws.send(alternative.transcript)
            # Return/terminate if we have received the final result
            if result.is_final:
                ws.close(1000)
                return


if __name__ == "__main__":
    from gevent import pywsgi
    from geventwebsocket.handler import WebSocketHandler
    server = pywsgi.WSGIServer(('', 5000), app, handler_class=WebSocketHandler)
    server.serve_forever()