#!/usr/bin/env python

import asyncio
import websockets

# GCP imports
from google.cloud.speech_v1p1beta1 import enums
from google.cloud.speech_v1p1beta1 import SpeechClient
from google.cloud.speech_v1p1beta1 import types

import queue


def _get_client():
    """
    Helper to return client and config
    """
    client = SpeechClient()
    config = types.StreamingRecognitionConfig(
        config=types.RecognitionConfig(
            encoding=enums.RecognitionConfig.AudioEncoding.LINEAR16,
            sample_rate_hertz=44100,
            language_code='en-US',
        ),
        interim_results=True,
    )

    return client, config


async def consumer_handler(websocket, audio_buffer):
    try:
        async for message in websocket:
            #print("Putting data in buffer")
            print(message)
            audio_buffer.put(message)
    except asyncio.CancelledError:
        # Task requested to terminate, just return
        return
    except Exception:
        # Probably lost connection
        return


def audio_generator(buffer):
    while True:
        """
        A generator that fetches the input audio data from the buffer.
        Copied from google-cloud samples for speech: transcribe_streaming_mic with some alterations
        """
        # Use a blocking get() to ensure there's at least one chunk of
        # data, and stop iteration if the chunk is None, indicating the
        # end of the audio stream.
        #print("About to block from buffer")
        chunk = buffer.get()
        #print("Buffer not empty")
        #print(chunk)
        if chunk is None:
            return
        data = [chunk]

        # Now consume whatever other data's still buffered.
        while True:
            try:
                #print("Non-blocking get")
                chunk = buffer.get(block=False)
                #print(chunk)
                if chunk is None:
                    return
                #print("Appending more data to buffer")
                data.append(chunk)
            except queue.Empty:
                break
        #print("Yielding data")
        yield b''.join(data)


def gcp_handler(audio_buffer):
    # Get the SpeechClient and configuration
    client, config = _get_client()

    # Create requests generator using the audio generator, adapted from transcribe-streaming sample
    requests = (types.StreamingRecognizeRequest(audio_content=content) for content in audio_generator(audio_buffer))
    responses = client.streaming_recognize(config, requests)

    # Go through the responses returned from the streaming client.
    for response in responses:
        # Once the transcription has settled, the first result will contain the
        # is_final result. The other results will be for subsequent portions of
        # the audio.
        for result in response.results:
            #print('Finished: {}'.format(result.is_final))
            #print('Stability: {}'.format(result.stability))
            alternatives = result.alternatives
            # The alternatives are ordered from most likely to least.
            for alternative in alternatives:
                #print('Confidence: {}'.format(alternative.confidence))
                print(u'Transcript: {}'.format(alternative.transcript))

            # Return/terminate if we have received the final result
            if result.is_final:
                #print(alternatives[0].transcript)
                return


async def handler(websocket, path):
    # Create a thread safe buffer for audio data
    audio_buffer = queue.Queue()

    # Get hold of asyncio event loop and create tasks
    loop = asyncio.get_event_loop()
    tasks = [
        loop.create_task(consumer_handler(websocket, audio_buffer)),
        loop.run_in_executor(None, gcp_handler, audio_buffer)
    ]

    # Wait for one to complete. either the consumer completes because of loss of connection,
    # or the final result has been received from GCP
    done, pending = await asyncio.wait(
        tasks,
        return_when=asyncio.FIRST_COMPLETED,
    )

    # Cancel the remaining task. This might not kill the thread?
    for task in pending:
        task.cancel()

    # Debug print only. Should return result
    await websocket.send("Completed")


start_server = websockets.serve(handler, 'localhost', 8765)

asyncio.get_event_loop().run_until_complete(start_server)
asyncio.get_event_loop().run_forever()