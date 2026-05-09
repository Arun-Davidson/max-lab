#!/bin/bash
echo "Setting up ATS Flask Service with Virtual Environment..."

# Detect stable python version
# if command -v python3.13 &> /dev/null; then
#     PYTHON_BIN="python3.13"
# elif command -v python3.12 &> /dev/null; then
#     PYTHON_BIN="python3.12"
# elif command -v python3.11 &> /dev/null; then
#     PYTHON_BIN="python3.11"
# elif command -v python3.10 &> /dev/null; then
#     PYTHON_BIN="python3.10"
# else
#     PYTHON_BIN="python3"
# fi

# echo "Using $PYTHON_BIN for virtual environment..."

# Remove old venv if it exists and was using a different python
if [ -d "venv" ]; then
    rm -rf venv
fi

$PYTHON_BIN -m venv .venv
echo "Virtual environment created."

# Activate virtual environment
uv venv .venv --python 3.11 
source .venv/bin/activate

echo "Installing requirements..."
# Install dependencies
uv pip install -r requirements.txt

echo "------------------------------------------------"
echo "Setup complete."
echo "------------------------------------------------"

# Run the app
python3 app.py

