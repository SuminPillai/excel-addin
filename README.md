# Excel Add-in Backend

This is the backend service for the Excel Add-in that provides access to stock data stored in Google Cloud Storage.

## Features

- REST API endpoints for stock data access
- Google Cloud Storage integration
- CORS enabled for Excel Add-in communication
- Cloud Run deployment ready

## API Endpoints

- `GET /stocks` - Get stock data with parameters: symbol, from, to, columns
- `GET /gcs-files` - List files in Google Cloud Storage bucket
- `GET /gcs-file` - Download a specific file from bucket (requires filename parameter)

## Environment Variables

- `PORT` - Server port (default: 8080)
- `GOOGLE_APPLICATION_CREDENTIALS` - Path to service account key file

## Deployment

This service is designed to be deployed on Google Cloud Run.

## Local Development

```bash
npm install
npm start
```

## License

Private - For internal use only 