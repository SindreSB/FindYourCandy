#This Flask application will return static, but valid, data to enable faster setup and development of the UI.

## Setup

Python 3.x is required with flask installed. pip install -r requirements.txt


Usage

*nix (you must be in the correct directory: mock-api)
$ export FLASK_APP=api.py

If you are on Windows, the environment variable syntax depends on command line interpreter.
On Command Prompt:
$ C:\path\to\app>set FLASK_APP=api.py
And on PowerShell:
$ PS C:\path\to\app> $env:FLASK_APP = "api.py"

To run
$ flask run
 * Running on http://127.0.0.1:5000/

 All data and images are hard-coded. The static files are collected from the static folder in candysorter.