# Use an official Python runtime as a parent image
FROM python:3.9-slim

# Set the working directory to the root of the project inside the container
WORKDIR /app

# Copy requirements (they are in the build context root)
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the current directory contents into the container at /app/backend
# This preserves the 'backend' package structure required by imports
COPY . ./backend

# Set Python path to include /app so 'backend' is recognized as a package
ENV PYTHONPATH=/app

# Train the model during the build process
RUN python backend/train_model.py

# Expose port
EXPOSE 8000

# Run server.py from the backend package
CMD ["python", "backend/server.py"]
