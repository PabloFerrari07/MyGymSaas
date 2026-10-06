# WSGI entry point for PythonAnywhere (point the web app's WSGI file at this module's `application`).
from app import create_app

application = create_app()
