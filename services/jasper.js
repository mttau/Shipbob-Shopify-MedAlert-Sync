const axios = require('axios');
const rateLimit = require('axios-rate-limit');

// Create a rate-limited axios instance
const http = rateLimit(axios.create(), { 
    maxRequests: 50,  // Maximum 50 requests
    perMilliseconds: 60000  // Per minute
});

const jasperHttpHeaders = {
    "Content-Type": "application/json",
    Authorization: `Basic ${Buffer.from(
        `${process.env.JASPER_USERNAME}:${process.env.JASPER_API_KEY}`
    ).toString("base64")}`,
};

// Error types for better error handling
class JasperApiError extends Error {
    constructor(message, type, details) {
        super(message);
        this.name = 'JasperApiError';
        this.type = type;
        this.details = details;
    }
}

async function getDeviceDetails(iccid) {
    if (!iccid) {
        throw new JasperApiError('ICCID is required', 'VALIDATION_ERROR');
    }

    try {
        const url = `${process.env.JASPER_API_URL}/rws/api/v1/devices/${iccid}`;
        const response = await http.get(url, { 
            headers: jasperHttpHeaders,
            timeout: 5000 // 5 second timeout
        });
        
        if (!response.data) {
            throw new JasperApiError('No data received from Jasper API', 'NO_DATA');
        }

        if (!response.data.msisdn) {
            return {
                success: false,
                error: 'No MSISDN found for this ICCID',
                type: 'NO_MSISDN'
            };
        }

        // Add '+' prefix to the phone number if it doesn't already have one
        const phoneNumber = response.data.msisdn.startsWith('+') 
            ? response.data.msisdn 
            : `+${response.data.msisdn}`;

        return {
            success: true,
            msisdn: phoneNumber
        };

    } catch (error) {
        // Handle different types of errors
        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            throw new JasperApiError(
                `Jasper API responded with error: ${error.response.status}`,
                'API_ERROR',
                {
                    status: error.response.status,
                    data: error.response.data
                }
            );
        } else if (error.request) {
            // The request was made but no response was received
            throw new JasperApiError(
                'No response received from Jasper API',
                'NO_RESPONSE',
                { request: error.request }
            );
        } else if (error.code === 'ECONNABORTED') {
            // Request timeout
            throw new JasperApiError(
                'Request to Jasper API timed out',
                'TIMEOUT'
            );
        } else {
            // Something happened in setting up the request
            throw new JasperApiError(
                `Error setting up request: ${error.message}`,
                'REQUEST_ERROR'
            );
        }
    }
}

module.exports = { 
    getDeviceDetails,
    JasperApiError 
}; 