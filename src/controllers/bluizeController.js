const https = require('https');
const axios = require('axios');

// Create an HTTPS agent with certificate verification disabled
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

const makeApiCall = async () => {
  const data = 'grant_type=password&username=BridgeConnect&password=5n3ZMV_Y26PxApC&client_id=E02635F8-50B0-4C12-A716-0C71F7AC2D1C%7CDaveTest&client_secret=0D9291DF-3324-4B6A-853E-1D2A5DE92A35';
  
  try {
    const response = await axios.post(
      'https://144.6.125.194:18009/bluize/adapter/bridgeconnect/api/token',
      data,
      { httpsAgent }
    );
    return response.data;
  } catch (error) {
    console.error('Error making API call:', error.message);
    throw new Error('Failed to fetch data from the API');
  }
};

module.exports = {
    makeApiCall
  };